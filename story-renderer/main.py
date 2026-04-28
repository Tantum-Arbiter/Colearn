"""
Story Renderer API - FastAPI wrapper for ComfyUI
Run with: uvicorn main:app --host 127.0.0.1 --port 8000
"""
import asyncio
import os
import logging
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Header, Response
from fastapi.responses import StreamingResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
import aiofiles
import httpx
import shutil

from config import config
from models import (
    Job, JobStatus, JobProgress, OutputFile,
    JobCreateRequest, JobCreateResponse, JobResponse,
    HealthResponse, CapabilitiesResponse, ValidationOptions,
    VisionAnalyzeRequest, VisionAnalyzeResponse,
    VisionCompareRequest, VisionCompareResponse,
    VisionChatRequest, VisionChatResponse
)
from job_queue import job_queue
from comfyui_client import comfyui_client
from workflow_builder import build_workflow
from validator import validate_image, ValidationResult

# Storyboard module
from storyboard.routes import router as storyboard_router, set_dependencies as set_storyboard_deps

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure output directory exists
os.makedirs(config.OUTPUT_DIR, exist_ok=True)


async def generate_single_image(job: Job, uploaded_files: dict, attempt: int = 1) -> tuple[bytes, str]:
    """
    Generate a single image via ComfyUI.
    Returns (image_data, filename) tuple.
    """
    # Vary seed on retries for different results
    if attempt > 1 and job.inputs.seed is not None:
        job.inputs.seed = job.inputs.seed + attempt
        logger.info(f"  Retry {attempt}: using seed {job.inputs.seed}")

    # Build workflow
    workflow = build_workflow(job.inputs, job.workflow_type.value, uploaded_files)

    # Submit to ComfyUI
    prompt_id = await comfyui_client.submit_prompt(workflow)
    if not prompt_id:
        raise Exception("Failed to submit workflow to ComfyUI")

    job.comfyui_prompt_id = prompt_id

    # Wait for completion
    max_wait = 300
    poll_interval = 1
    elapsed = 0

    while elapsed < max_wait:
        history = await comfyui_client.get_history(prompt_id)

        if history and "outputs" in history:
            for node_id, output in history["outputs"].items():
                if "images" in output:
                    for img_info in output["images"]:
                        filename = img_info["filename"]
                        subfolder = img_info.get("subfolder", "")
                        image_data = await comfyui_client.get_image(
                            filename, subfolder, img_info.get("type", "output")
                        )
                        return image_data, filename

        await asyncio.sleep(poll_interval)
        elapsed += poll_interval

    raise Exception("Job timed out waiting for ComfyUI")


async def process_job(job: Job):
    """Process a render job with validation and retry logic"""
    logger.info(f"Processing job {job.job_id} - type: {job.workflow_type.value}")
    logger.info(f"  Prompt: {job.inputs.prompt[:100]}..." if len(job.inputs.prompt) > 100 else f"  Prompt: {job.inputs.prompt}")

    try:
        # Get validation options from metadata
        validation = None
        if job.metadata and job.metadata.validation:
            validation = job.metadata.validation
            logger.info(f"  Validation enabled: min_score={validation.min_score}, max_retries={validation.max_retries}")

        # Upload images to ComfyUI based on workflow type
        uploaded_files = {}

        # For inpaint workflow, upload base64 images to ComfyUI first
        if job.workflow_type.value in ["inpaint", "insert"]:
            job.progress = JobProgress(phase="uploading_images", percent=3)

            if job.inputs.base_image:
                logger.info("Uploading base image to ComfyUI...")
                import base64
                base_data = base64.b64decode(job.inputs.base_image)
                base_filename = f"inpaint_base_{job.job_id}.png"
                uploaded_base = await comfyui_client.upload_image(base_data, base_filename)
                uploaded_files["base_image"] = uploaded_base
                logger.info(f"Base image uploaded as: {uploaded_base}")

            if job.inputs.mask_image:
                logger.info("Uploading mask image to ComfyUI...")
                import base64
                mask_data = base64.b64decode(job.inputs.mask_image)
                mask_filename = f"inpaint_mask_{job.job_id}.png"
                uploaded_mask = await comfyui_client.upload_image(mask_data, mask_filename)
                uploaded_files["mask_image"] = uploaded_mask
                logger.info(f"Mask image uploaded as: {uploaded_mask}")

        # For ipadapter workflow, check if IP-Adapter nodes are available and upload character reference
        original_workflow_type = job.workflow_type.value
        if job.workflow_type.value in ["ipadapter", "ip_adapter", "ip-adapter"]:
            job.progress = JobProgress(phase="checking_ipadapter", percent=2)

            # Check if IP-Adapter nodes are installed
            ipadapter_available = await comfyui_client.check_ipadapter_available()

            if not ipadapter_available:
                logger.warning("IP-Adapter nodes not found in ComfyUI! Falling back to full_page workflow.")
                logger.warning("To enable IP-Adapter, install ComfyUI_IPAdapter_plus from: https://github.com/cubiq/ComfyUI_IPAdapter_plus")
                # Fall back to full_page workflow
                from models import WorkflowType
                job.workflow_type = WorkflowType.FULL_PAGE
            elif job.inputs.character_ref_image:
                job.progress = JobProgress(phase="uploading_character_ref", percent=3)
                logger.info("Uploading character reference image to ComfyUI for IP-Adapter...")
                import base64
                ref_data = base64.b64decode(job.inputs.character_ref_image)
                ref_filename = f"charref_{job.job_id}.png"
                uploaded_ref = await comfyui_client.upload_image(ref_data, ref_filename)
                uploaded_files["character_ref_image"] = uploaded_ref
                logger.info(f"Character reference uploaded as: {uploaded_ref}")
            else:
                logger.warning("IP-Adapter workflow requested but no character_ref_image provided!")
                logger.warning("Falling back to full_page workflow.")
                from models import WorkflowType
                job.workflow_type = WorkflowType.FULL_PAGE

        job.progress = JobProgress(phase="building_workflow", percent=5)

        # Generation + Validation loop
        max_retries = validation.max_retries if validation and validation.enabled else 1
        final_image_data = None
        final_filename = None
        failed_images = []  # Track images that failed validation for cleanup

        for attempt in range(1, max_retries + 1):
            job.progress = JobProgress(phase=f"render_attempt_{attempt}", percent=10 + (attempt - 1) * 20)
            logger.info(f"  Generation attempt {attempt}/{max_retries}")

            # Generate image
            image_data, filename = await generate_single_image(job, uploaded_files, attempt)

            # Validate if enabled
            if validation and validation.enabled:
                job.progress = JobProgress(phase=f"validating_{attempt}", percent=50 + (attempt - 1) * 15)
                logger.info(f"  Validating image (attempt {attempt})...")

                result = await validate_image(
                    image_data=image_data,
                    prompt=job.inputs.prompt,
                    art_style=validation.art_style,
                    scene_description=validation.scene_description,
                    min_score=validation.min_score,
                )

                logger.info(f"  Validation: art={result.art_style_score:.0f}, scene={result.scene_accuracy_score:.0f}, quality={result.quality_score:.0f}, valid={result.is_valid}")

                if result.issues:
                    logger.info(f"  Issues: {', '.join(result.issues)}")

                if result.is_valid:
                    final_image_data = image_data
                    final_filename = filename
                    break
                elif attempt < max_retries:
                    # Track failed image for cleanup
                    failed_images.append(filename)
                    logger.info(f"  Validation failed, retrying...")
                else:
                    logger.warning(f"  Max retries reached, using last image")
                    final_image_data = image_data
                    final_filename = filename
            else:
                # No validation, use first result
                final_image_data = image_data
                final_filename = filename
                break

        # Clean up failed intermediate images from ComfyUI output
        if failed_images:
            logger.info(f"  Cleaning up {len(failed_images)} failed intermediate images...")
            deleted = comfyui_client.cleanup_job_images(failed_images)
            logger.info(f"  Deleted {deleted} intermediate images from ComfyUI output")

        # Save final image
        job.progress = JobProgress(phase="saving", percent=95)
        output_filename = f"{job.job_id}_{final_filename}"
        output_path = os.path.join(config.OUTPUT_DIR, output_filename)

        async with aiofiles.open(output_path, "wb") as f:
            await f.write(final_image_data)

        # Add to job outputs
        file_id = f"img_{job.job_id}_{len(job.outputs)}"
        job.outputs.append(OutputFile(
            file_id=file_id,
            filename=output_filename,
            width=job.inputs.width,
            height=job.inputs.height,
            content_type="image/png",
            download_url=f"/v1/files/{file_id}"
        ))

        job.progress = JobProgress(phase="complete", percent=100)
        job.status = JobStatus.COMPLETED
        logger.info(f"  Job completed: {output_filename}")

    except Exception as e:
        job.status = JobStatus.FAILED
        job.error_code = "RENDER_ERROR"
        job.error_message = str(e)
        logger.error(f"  Job failed: {e}")
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    job_queue.set_processor(process_job)
    await job_queue.start_worker()

    # Initialize storyboard dependencies
    set_storyboard_deps(job_queue, comfyui_client)

    logger.info("Story Renderer API started")
    yield
    # Shutdown
    await job_queue.stop_worker()
    logger.info("Story Renderer API stopped")


app = FastAPI(
    title="Story Renderer API",
    version="1.0.0",
    lifespan=lifespan
)

# Get the directory where main.py is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(SCRIPT_DIR, "static")

# Serve static files for GUI
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Include storyboard router
app.include_router(storyboard_router)


# GUI home page
@app.get("/", response_class=HTMLResponse)
async def gui_home():
    """Serve the GUI interface"""
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        async with aiofiles.open(index_path, 'r', encoding='utf-8') as f:
            return await f.read()
    return HTMLResponse("<h1>Story Renderer API</h1><p>GUI not found. API available at /v1/</p>")


@app.get("/storyboard", response_class=HTMLResponse)
async def storyboard_gui():
    """Serve the Storyboard Creator interface"""
    storyboard_path = os.path.join(STATIC_DIR, "storyboard.html")
    if os.path.exists(storyboard_path):
        async with aiofiles.open(storyboard_path, 'r', encoding='utf-8') as f:
            return await f.read()
    return HTMLResponse("<h1>Storyboard Creator</h1><p>Interface not found.</p>")


@app.get("/favicon.ico")
async def favicon():
    """Return empty response for favicon to prevent 404 log spam"""
    return Response(status_code=204)


# Authentication dependency
async def verify_api_key(x_worker_key: Optional[str] = Header(None)):
    """Verify the API key if configured"""
    if config.WORKER_API_KEY:
        if x_worker_key != config.WORKER_API_KEY:
            raise HTTPException(status_code=401, detail="Invalid API key")
    return True


@app.get("/v1/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    comfyui_ok = await comfyui_client.check_health()
    
    return HealthResponse(
        status="ok" if comfyui_ok else "degraded",
        service="story-renderer",
        version="1.0.0",
        gpu={"render_slots": config.RENDER_WORKERS, "comfyui_connected": comfyui_ok}
    )


@app.get("/v1/capabilities", response_model=CapabilitiesResponse)
async def get_capabilities():
    """Get renderer capabilities"""
    # Check if IP-Adapter nodes are installed
    ipadapter_ok = await comfyui_client.check_ipadapter_available()

    return CapabilitiesResponse(
        max_parallel_renders=config.RENDER_WORKERS,
        max_queue_depth=config.JOB_QUEUE_MAX,
        supported_job_types=["cover", "page", "spread", "character"],
        supported_workflow_types=["full_page", "background", "character_ref", "inpaint", "ipadapter"],
        supported_aspect_ratios=["2:3", "3:2", "4:5", "16:9", "1:1"],
        default_model=config.DEFAULT_MODEL,
        ipadapter_available=ipadapter_ok
    )


@app.post("/v1/jobs", response_model=JobCreateResponse, dependencies=[Depends(verify_api_key)])
async def create_job(request: JobCreateRequest):
    """Submit a new render job"""
    job = Job(request)

    success = await job_queue.submit(job)
    if not success:
        raise HTTPException(
            status_code=429,
            detail=f"Queue full. Max {config.JOB_QUEUE_MAX} pending jobs allowed."
        )

    return JobCreateResponse(
        job_id=job.job_id,
        status=job.status,
        position=job.queue_position,
        created_at=job.created_at
    )


@app.get("/v1/jobs/{job_id}", response_model=JobResponse, dependencies=[Depends(verify_api_key)])
async def get_job(job_id: str):
    """Get job status"""
    job = job_queue.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job.to_response()


@app.delete("/v1/jobs/{job_id}", dependencies=[Depends(verify_api_key)])
async def cancel_job(job_id: str):
    """Cancel a job"""
    job = job_queue.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    success = await job_queue.cancel_job(job_id)

    if success and job.comfyui_prompt_id:
        await comfyui_client.cancel_prompt(job.comfyui_prompt_id)

    return {"job_id": job_id, "status": "cancelled"}


@app.get("/v1/jobs/{job_id}/image", dependencies=[Depends(verify_api_key)])
async def get_job_image(job_id: str):
    """Get the generated image for a completed job"""
    job = job_queue.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.outputs:
        raise HTTPException(status_code=404, detail="Job has no outputs yet")

    # Get the first output image
    output = job.outputs[0]
    file_path = os.path.join(config.OUTPUT_DIR, output.filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image file not found on disk")

    async def file_stream():
        async with aiofiles.open(file_path, "rb") as f:
            while chunk := await f.read(8192):
                yield chunk

    return StreamingResponse(
        file_stream(),
        media_type="image/png",
        headers={
            "Content-Disposition": f"inline; filename={output.filename}",
            "Cache-Control": "max-age=3600"
        }
    )


@app.get("/v1/files/{file_id}", dependencies=[Depends(verify_api_key)])
async def download_file(file_id: str):
    """Download a generated image"""
    # Find the job and file
    for job in job_queue._jobs.values():
        for output in job.outputs:
            if output.file_id == file_id:
                file_path = os.path.join(config.OUTPUT_DIR, output.filename)

                if not os.path.exists(file_path):
                    raise HTTPException(status_code=404, detail="File not found on disk")

                async def file_stream():
                    async with aiofiles.open(file_path, "rb") as f:
                        while chunk := await f.read(8192):
                            yield chunk

                return StreamingResponse(
                    file_stream(),
                    media_type=output.content_type,
                    headers={"Content-Disposition": f"attachment; filename={output.filename}"}
                )

    raise HTTPException(status_code=404, detail="File not found")


class FileSaveRequest(BaseModel):
    """Request to save a file to a custom path"""
    path: str  # Directory to save to
    filename: Optional[str] = None  # Optional custom filename


@app.post("/v1/files/{file_id}/save")
async def save_file_to_path(file_id: str, request: FileSaveRequest):
    """Save a generated image to a custom filesystem path"""
    # Find the job and file
    for job in job_queue._jobs.values():
        for output in job.outputs:
            if output.file_id == file_id:
                source_path = os.path.join(config.OUTPUT_DIR, output.filename)

                if not os.path.exists(source_path):
                    raise HTTPException(status_code=404, detail="Source file not found")

                # Ensure destination directory exists
                dest_dir = request.path
                try:
                    os.makedirs(dest_dir, exist_ok=True)
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Cannot create directory: {e}")

                # Determine filename
                dest_filename = request.filename or output.filename
                dest_path = os.path.join(dest_dir, dest_filename)

                # Copy the file
                try:
                    shutil.copy2(source_path, dest_path)
                    logger.info(f"File saved: {dest_path}")
                    return {"saved_path": dest_path, "filename": dest_filename}
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    raise HTTPException(status_code=404, detail="File not found")


@app.get("/v1/jobs/{job_id}/events", dependencies=[Depends(verify_api_key)])
async def job_events(job_id: str):
    """Stream job progress via Server-Sent Events"""
    job = job_queue.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        last_status = None
        last_progress = None

        while True:
            current_job = job_queue.get_job(job_id)
            if not current_job:
                break

            # Send status updates
            if current_job.status != last_status:
                last_status = current_job.status
                yield {
                    "event": "status",
                    "data": {"status": current_job.status.value}
                }

            # Send progress updates
            if current_job.progress and current_job.progress != last_progress:
                last_progress = current_job.progress
                yield {
                    "event": "progress",
                    "data": {
                        "phase": current_job.progress.phase,
                        "percent": current_job.progress.percent
                    }
                }

            # Check if job is done
            if current_job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
                if current_job.status == JobStatus.COMPLETED:
                    yield {
                        "event": "completed",
                        "data": {"file_ids": [o.file_id for o in current_job.outputs]}
                    }
                elif current_job.status == JobStatus.FAILED:
                    yield {
                        "event": "failed",
                        "data": {
                            "error_code": current_job.error_code,
                            "message": current_job.error_message
                        }
                    }
                break

            await asyncio.sleep(0.5)

    return EventSourceResponse(event_generator())


# ============================================================
# VISION API ENDPOINTS
# Routes vision calls through local Ollama so Mac doesn't need
# direct network access to Windows Ollama
# ============================================================

OLLAMA_URL = "http://127.0.0.1:11434"
OLLAMA_VISION_MODEL = "llava"


@app.post("/v1/vision/analyze", response_model=VisionAnalyzeResponse, dependencies=[Depends(verify_api_key)])
async def vision_analyze(request: VisionAnalyzeRequest):
    """
    Analyze a single image using Ollama Vision (LLaVA).
    Used for copyright checks, content validation, etc.
    """
    try:
        model = request.model or OLLAMA_VISION_MODEL

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": request.prompt,
                    "images": [request.image],
                    "stream": False,
                },
            )

            if response.status_code != 200:
                return VisionAnalyzeResponse(
                    success=False,
                    response="",
                    error=f"Ollama returned status {response.status_code}"
                )

            result = response.json()
            return VisionAnalyzeResponse(
                success=True,
                response=result.get("response", "")
            )

    except Exception as e:
        logger.error(f"Vision analyze error: {e}")
        return VisionAnalyzeResponse(
            success=False,
            response="",
            error=str(e)
        )


@app.post("/v1/vision/compare", response_model=VisionCompareResponse, dependencies=[Depends(verify_api_key)])
async def vision_compare(request: VisionCompareRequest):
    """
    Compare two images using Ollama Vision (LLaVA).
    Used for character consistency checks, before/after comparison, etc.
    """
    try:
        model = request.model or OLLAMA_VISION_MODEL

        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": request.prompt,
                    "images": [request.image1, request.image2],
                    "stream": False,
                },
            )

            if response.status_code != 200:
                return VisionCompareResponse(
                    success=False,
                    response="",
                    error=f"Ollama returned status {response.status_code}"
                )

            result = response.json()
            return VisionCompareResponse(
                success=True,
                response=result.get("response", "")
            )

    except Exception as e:
        logger.error(f"Vision compare error: {e}")
        return VisionCompareResponse(
            success=False,
            response="",
            error=str(e)
        )


@app.post("/v1/vision/chat", response_model=VisionChatResponse, dependencies=[Depends(verify_api_key)])
async def vision_chat(request: VisionChatRequest):
    """
    Vision-based chat using Ollama Vision (LLaVA).
    Used for multi-turn conversations about images (copyright analysis, etc.)
    """
    try:
        model = request.model or OLLAMA_VISION_MODEL

        # Ollama chat API format
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": model,
                    "messages": request.messages,
                    "stream": False,
                },
            )

            if response.status_code != 200:
                return VisionChatResponse(
                    success=False,
                    response="",
                    error=f"Ollama returned status {response.status_code}"
                )

            result = response.json()
            message = result.get("message", {})
            return VisionChatResponse(
                success=True,
                response=message.get("content", "")
            )

    except Exception as e:
        logger.error(f"Vision chat error: {e}")
        return VisionChatResponse(
            success=False,
            response="",
            error=str(e)
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.HOST, port=config.PORT)

