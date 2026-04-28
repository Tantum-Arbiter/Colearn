"""
Pydantic models for the Story Renderer API
"""
from datetime import datetime
from enum import Enum
from typing import Optional, Literal
from pydantic import BaseModel, Field
import ulid


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobType(str, Enum):
    """Job types for the storybook creation pipeline"""
    # Scene-First Pipeline Jobs
    SCENE = "scene"               # Empty scene/environment generation
    CHARACTER_REF = "character_ref"  # Character reference sheet (isolated)
    PROP = "prop"                 # Prop/object (isolated)
    SCENE_COMPOSE = "scene_compose"  # Place character in scene (IP-Adapter)
    # Legacy/Additional Jobs
    COVER = "cover"
    PAGE = "page"
    SPREAD = "spread"
    CHARACTER = "character"
    CHARACTER_POSE = "character_pose"  # Character pose with IP-Adapter
    VARIATION = "variation"  # Storyboard variation generation
    PAGE_VARIATION = "page_variation"  # Page-specific variation
    INPAINT = "inpaint"  # Inpainting/mirrored change
    FULL_PAGE = "full_page"  # Full page generation


class WorkflowType(str, Enum):
    """ComfyUI workflow type for the render job - SCENE-FIRST PIPELINE"""
    # Step 1: Create Scene (environment only, no characters)
    FULL_PAGE = "full_page"       # Scene/setting generation
    BACKGROUND = "background"     # Background-only generation
    SCENE = "scene"               # Alias for background
    # Step 2: Create Characters (isolated on white)
    CHARACTER_REF = "character_ref"  # Character reference sheet
    # Step 3: Create Props (isolated on white)
    PROP = "prop"                 # Prop/object generation
    # Step 4: Compose (place character in scene)
    IPADAPTER = "ipadapter"       # Character-conditioned composition
    # Step 5: Edit/Refine
    INPAINT = "inpaint"           # Subject insertion via inpainting
    IMG2IMG = "img2img"           # Refine/polish existing image
    CONTROLNET = "controlnet"     # Structure-preserving restyle


class Priority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"


class JobInputs(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = None
    width: int = 1024
    height: int = 704  # Landscape for storybook pages
    seed: Optional[int] = None
    steps: int = 24
    cfg: float = 4.5
    batch_size: int = 1
    model: Optional[str] = None
    # Inpaint workflow inputs
    base_image: Optional[str] = None  # Base64 encoded image for inpainting
    mask_image: Optional[str] = None  # Base64 encoded RGBA mask for inpainting
    # IP-Adapter workflow inputs (character-conditioned generation)
    character_ref_image: Optional[str] = None  # Base64 encoded character reference image
    ipadapter_weight: float = 0.75  # IP-Adapter strength (0.0-1.0, higher = more like reference)


class JobOutput(BaseModel):
    format: Literal["png", "webp", "jpg"] = "png"
    return_type: Literal["urls", "base64"] = Field(default="urls", alias="return")


class ValidationOptions(BaseModel):
    """Options for local image validation via Ollama Vision"""
    enabled: bool = True  # Whether to validate
    min_score: float = 75.0  # Minimum average score to pass
    max_retries: int = 3  # Max regeneration attempts
    art_style: Optional[str] = None  # Expected art style description
    scene_description: Optional[str] = None  # Scene to validate against


class JobMetadata(BaseModel):
    """Job metadata - allows extra fields for flexibility"""
    model_config = {"extra": "allow"}  # Allow extra fields

    book_id: Optional[str] = None
    page_number: Optional[int] = None
    style_bible: Optional[str] = None
    character_id: Optional[str] = None
    character_name: Optional[str] = None  # Character name for reference sheets
    interactive_state: Optional[str] = None  # 'before' | 'after' for interactive pages
    layer: Optional[str] = None  # Layer type: 'background', 'subject-0', etc.
    validation: Optional[ValidationOptions] = None  # Validation settings
    # Storyboard variation fields
    variation_seed: Optional[int] = None
    workspace_session: Optional[str] = None
    workspace_date: Optional[str] = None
    workspace_index: Optional[int] = None
    generation_mode: Optional[str] = None
    pose_name: Optional[str] = None


class JobCreateRequest(BaseModel):
    job_type: JobType
    workflow_type: WorkflowType = WorkflowType.FULL_PAGE  # Which ComfyUI workflow to use
    client_job_id: Optional[str] = None
    priority: Priority = Priority.NORMAL
    inputs: JobInputs
    output: JobOutput = JobOutput()
    metadata: Optional[JobMetadata] = None


class JobProgress(BaseModel):
    phase: str
    percent: int


class QueueInfo(BaseModel):
    position: int


class OutputFile(BaseModel):
    file_id: str
    filename: str
    width: int
    height: int
    content_type: str
    download_url: str


class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: Optional[JobProgress] = None
    queue: Optional[QueueInfo] = None
    outputs: Optional[list[OutputFile]] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class JobCreateResponse(BaseModel):
    job_id: str
    status: JobStatus
    position: int
    created_at: datetime


class HealthResponse(BaseModel):
    status: str
    service: str = "story-renderer"
    version: str = "1.0.0"
    gpu: dict


class CapabilitiesResponse(BaseModel):
    max_parallel_renders: int
    max_queue_depth: int
    supported_job_types: list[str]
    supported_workflow_types: list[str]
    supported_aspect_ratios: list[str]
    default_model: str
    ipadapter_available: bool = False  # Whether IP-Adapter nodes are installed


# Vision API models (for routing vision calls through renderer)
class VisionAnalyzeRequest(BaseModel):
    """Request to analyze a single image"""
    image: str  # Base64 encoded image
    prompt: str  # Analysis prompt
    model: Optional[str] = None  # Vision model (default: llava)


class VisionAnalyzeResponse(BaseModel):
    """Response from image analysis"""
    success: bool
    response: str  # Raw text response from vision model
    error: Optional[str] = None


class VisionCompareRequest(BaseModel):
    """Request to compare two images"""
    image1: str  # Base64 encoded reference image
    image2: str  # Base64 encoded image to compare
    prompt: str  # Comparison prompt
    model: Optional[str] = None  # Vision model (default: llava)


class VisionCompareResponse(BaseModel):
    """Response from image comparison"""
    success: bool
    response: str  # Raw text response from vision model
    error: Optional[str] = None


class VisionChatRequest(BaseModel):
    """Request for vision-based chat (copyright check, etc.)"""
    messages: list[dict]  # Chat messages with optional images
    model: Optional[str] = None  # Vision model (default: llava)


class VisionChatResponse(BaseModel):
    """Response from vision chat"""
    success: bool
    response: str  # Text response
    error: Optional[str] = None


class Job:
    """Internal job representation"""
    def __init__(self, request: JobCreateRequest):
        self.job_id = f"jr_{ulid.new().str}"
        self.client_job_id = request.client_job_id
        self.job_type = request.job_type
        self.workflow_type = request.workflow_type
        self.priority = request.priority
        self.inputs = request.inputs
        self.output = request.output
        self.metadata = request.metadata
        self.status = JobStatus.QUEUED
        self.progress: Optional[JobProgress] = None
        self.queue_position = 0
        self.outputs: list[OutputFile] = []
        self.error_code: Optional[str] = None
        self.error_message: Optional[str] = None
        self.created_at = datetime.utcnow()
        self.started_at: Optional[datetime] = None
        self.finished_at: Optional[datetime] = None
        self.comfyui_prompt_id: Optional[str] = None
    
    def to_response(self) -> JobResponse:
        return JobResponse(
            job_id=self.job_id,
            status=self.status,
            progress=self.progress,
            queue=QueueInfo(position=self.queue_position) if self.status == JobStatus.QUEUED else None,
            outputs=self.outputs if self.outputs else None,
            error_code=self.error_code,
            error_message=self.error_message,
            created_at=self.created_at,
            started_at=self.started_at,
            finished_at=self.finished_at,
        )

