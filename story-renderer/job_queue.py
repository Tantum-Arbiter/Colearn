"""
Job Queue Manager - Single worker, FIFO queue with priority support
"""
import asyncio
from datetime import datetime
from typing import Optional, Callable, Awaitable
from collections import deque
import logging

from models import Job, JobStatus, JobProgress, OutputFile, Priority
from config import config

logger = logging.getLogger(__name__)


class JobQueue:
    """
    Single-worker job queue for GPU-bound rendering tasks.
    
    Policy:
    - 1 active render job at a time
    - Max 20 queued jobs
    - Priority ordering within queue
    """
    
    def __init__(self):
        self._queue: deque[Job] = deque()
        self._jobs: dict[str, Job] = {}  # job_id -> Job
        self._current_job: Optional[Job] = None
        self._worker_task: Optional[asyncio.Task] = None
        self._process_callback: Optional[Callable[[Job], Awaitable[None]]] = None
        self._lock = asyncio.Lock()
        self._job_event = asyncio.Event()
    
    def set_processor(self, callback: Callable[[Job], Awaitable[None]]):
        """Set the callback function that processes jobs"""
        self._process_callback = callback
    
    async def start_worker(self):
        """Start the background worker"""
        if self._worker_task is None:
            self._worker_task = asyncio.create_task(self._worker_loop())
            logger.info("Job queue worker started")
    
    async def stop_worker(self):
        """Stop the background worker"""
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
            self._worker_task = None
            logger.info("Job queue worker stopped")
    
    async def submit(self, job: Job) -> bool:
        """Submit a job to the queue. Returns False if queue is full."""
        async with self._lock:
            if len(self._queue) >= config.JOB_QUEUE_MAX:
                return False
            
            # Insert based on priority
            if job.priority == Priority.HIGH:
                # Find position after other high priority jobs
                pos = 0
                for i, queued_job in enumerate(self._queue):
                    if queued_job.priority != Priority.HIGH:
                        pos = i
                        break
                    pos = i + 1
                self._queue.insert(pos, job)
            elif job.priority == Priority.LOW:
                self._queue.append(job)
            else:  # NORMAL
                # Insert before low priority jobs
                pos = len(self._queue)
                for i in range(len(self._queue) - 1, -1, -1):
                    if self._queue[i].priority != Priority.LOW:
                        pos = i + 1
                        break
                self._queue.insert(pos, job)
            
            self._jobs[job.job_id] = job
            self._update_queue_positions()
            self._job_event.set()
            
            logger.info(f"Job {job.job_id} queued at position {job.queue_position}")
            return True
    
    def _update_queue_positions(self):
        """Update queue position for all queued jobs"""
        for i, job in enumerate(self._queue):
            job.queue_position = i + 1
    
    def get_job(self, job_id: str) -> Optional[Job]:
        """Get a job by ID"""
        return self._jobs.get(job_id)
    
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a job"""
        async with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return False
            
            if job.status == JobStatus.QUEUED:
                self._queue.remove(job)
                job.status = JobStatus.CANCELLED
                job.finished_at = datetime.utcnow()
                self._update_queue_positions()
                return True
            elif job.status == JobStatus.RUNNING:
                # Will need to interrupt ComfyUI
                job.status = JobStatus.CANCELLED
                job.finished_at = datetime.utcnow()
                return True
        
        return False
    
    @property
    def queue_length(self) -> int:
        return len(self._queue)
    
    @property
    def is_processing(self) -> bool:
        return self._current_job is not None
    
    async def _worker_loop(self):
        """Main worker loop - processes one job at a time"""
        while True:
            try:
                # Wait for a job
                await self._job_event.wait()
                
                async with self._lock:
                    if not self._queue:
                        self._job_event.clear()
                        continue
                    
                    # Get next job
                    job = self._queue.popleft()
                    self._current_job = job
                    self._update_queue_positions()
                
                # Process job (outside lock)
                job.status = JobStatus.RUNNING
                job.started_at = datetime.utcnow()
                job.progress = JobProgress(phase="starting", percent=0)
                
                logger.info(f"Processing job {job.job_id}")
                
                try:
                    if self._process_callback:
                        await self._process_callback(job)
                except Exception as e:
                    import traceback
                    error_trace = traceback.format_exc()
                    logger.error(f"Job {job.job_id} failed with {type(e).__name__}: {e}")
                    logger.error(f"Full traceback:\n{error_trace}")
                    job.status = JobStatus.FAILED
                    job.error_code = "PROCESSING_ERROR"
                    job.error_message = f"{type(e).__name__}: {str(e)}"
                finally:
                    job.finished_at = datetime.utcnow()
                    self._current_job = None
                    
                    if job.status == JobStatus.RUNNING:
                        job.status = JobStatus.COMPLETED
                    
                    logger.info(f"Job {job.job_id} finished with status {job.status}")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker error: {e}")
                await asyncio.sleep(1)


# Singleton instance
job_queue = JobQueue()

