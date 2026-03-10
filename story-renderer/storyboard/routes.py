"""
Storyboard Creator - API Routes

FastAPI router for storyboard endpoints.
"""
import random
import asyncio
import logging
import base64
import httpx
from typing import Optional, List
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse

from .models import (
    Book, Page, Asset, Character, AssetType, GenerationStatus,
    CreateBookRequest, VariationRequest, VariationResponse,
    CharacterPoseRequest, ComposeSceneRequest, PageElement,
    CustomTheme, CustomThemeSource, CustomThemeResponse,
    AnalyzeImageForThemeRequest, AnalyzeTextForThemeRequest, AnalyzeHybridForThemeRequest,
    InpaintRequest, InpaintResponse, SelectionRegion,
    Project, CreateProjectRequest
)
from .presets import get_preset, list_presets, PRESETS
from .storage import storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/storyboard", tags=["storyboard"])


# ============================================================
# Presets
# ============================================================

@router.get("/presets")
async def get_presets():
    """List available generation presets"""
    return {"presets": list_presets()}


@router.get("/presets/{preset_id}")
async def get_preset_detail(preset_id: str):
    """Get full details of a preset"""
    if preset_id not in PRESETS:
        raise HTTPException(status_code=404, detail="Preset not found")
    preset = PRESETS[preset_id]
    return preset.model_dump()


# ============================================================
# Projects
# ============================================================

@router.get("/projects")
async def list_projects():
    """List all projects with their books"""
    return {"projects": storage.list_projects()}


@router.post("/projects")
async def create_project(request: CreateProjectRequest):
    """Create a new project (container for books)"""
    project = Project(
        name=request.name,
        description=request.description
    )
    project = storage.create_project(project)
    return {"project": project.model_dump()}


@router.get("/projects/{project_id}")
async def get_project(project_id: str):
    """Get a project by ID"""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"project": project.model_dump()}


@router.put("/projects/{project_id}")
async def update_project(project_id: str, updates: dict):
    """Update project properties"""
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if "name" in updates:
        project.name = updates["name"]
    if "description" in updates:
        project.description = updates["description"]

    storage.save_project(project)
    return {"project": project.model_dump()}


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, delete_books: bool = False):
    """Delete a project (optionally delete all books in it)"""
    success = storage.delete_project(project_id, delete_books=delete_books)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "deleted"}


@router.post("/projects/{project_id}/books/{book_id}")
async def add_book_to_project(project_id: str, book_id: str):
    """Add an existing book to a project"""
    success = storage.add_book_to_project(project_id, book_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "added"}


@router.delete("/projects/{project_id}/books/{book_id}")
async def remove_book_from_project(project_id: str, book_id: str):
    """Remove a book from a project (doesn't delete the book)"""
    success = storage.remove_book_from_project(project_id, book_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "removed"}


# ============================================================
# Books
# ============================================================

@router.get("/books")
async def list_books():
    """List all books"""
    return {"books": storage.list_books()}


@router.post("/books")
async def create_book(request: CreateBookRequest):
    """Create a new book (optionally within a project)"""
    from .models import GenerationPreset

    # Get preset
    if request.custom_preset:
        preset = request.custom_preset
    elif request.preset_name.startswith("custom:"):
        # Load custom theme and convert to GenerationPreset
        theme_id = request.preset_name[7:]  # Remove "custom:" prefix
        theme = storage.load_custom_theme(theme_id)
        if not theme:
            raise HTTPException(status_code=404, detail="Custom theme not found")
        preset = GenerationPreset(
            name=theme.name,
            art_style=theme.art_style,
            reference_prompt=theme.reference_prompt,
            negative_prompt=theme.negative_prompt,
            width=theme.width,
            height=theme.height,
            steps=theme.steps,
            cfg=theme.cfg
        )
    else:
        preset = get_preset(request.preset_name)

    book = Book(
        title=request.title,
        description=request.description,
        preset=preset
    )
    book = storage.create_book(book)

    # Add to project if specified
    if request.project_id:
        storage.add_book_to_project(request.project_id, book.id)

    return {"book": book.model_dump()}


@router.get("/books/{book_id}")
async def get_book(book_id: str):
    """Get a book by ID"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return {"book": book.model_dump()}


@router.put("/books/{book_id}")
async def update_book(book_id: str, updates: dict):
    """Update book properties"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Update allowed fields
    if "title" in updates:
        book.title = updates["title"]
    if "description" in updates:
        book.description = updates["description"]
    
    storage.save_book(book)
    return {"book": book.model_dump()}


@router.delete("/books/{book_id}")
async def delete_book(book_id: str):
    """Delete a book and all its files"""
    if storage.delete_book(book_id):
        return {"deleted": True}
    raise HTTPException(status_code=404, detail="Book not found")


# ============================================================
# Variations Generation
# ============================================================

# This will be set by main.py to reference the job queue
_job_queue = None
_comfyui_client = None


def set_dependencies(job_queue, comfyui_client):
    """Set dependencies from main app"""
    global _job_queue, _comfyui_client
    _job_queue = job_queue
    _comfyui_client = comfyui_client


@router.post("/books/{book_id}/variations")
async def generate_variations(book_id: str, request: VariationRequest):
    """Generate 4 variations of an image with different seeds"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if not _job_queue:
        raise HTTPException(status_code=500, detail="Job queue not initialized")
    
    # Generate 4 seeds
    base_seed = request.base_seed or random.randint(0, 2**31 - 4)
    seeds = [base_seed, base_seed + 1, base_seed + 2, base_seed + 3]
    
    # Build full prompt with preset
    full_prompt = f"{book.preset.reference_prompt}\n\n{request.prompt}"
    negative = request.negative_prompt or book.preset.negative_prompt
    
    # Submit 4 jobs
    job_ids = []
    from models import JobCreateRequest, JobInputs, WorkflowType
    
    for seed in seeds:
        from models import Job
        job = Job(JobCreateRequest(
            job_type="variation",
            workflow_type=WorkflowType.FULL_PAGE,
            priority="high",
            inputs=JobInputs(
                prompt=full_prompt,
                negative_prompt=negative,
                width=book.preset.width,
                height=book.preset.height,
                steps=book.preset.steps,
                cfg=book.preset.cfg,
                seed=seed,
                model=book.preset.model
            ),
            metadata={"book_id": book_id, "variation_seed": seed}
        ))
        await _job_queue.add_job(job)
        job_ids.append(job.job_id)

    return VariationResponse(job_ids=job_ids, seeds=seeds)


@router.post("/books/{book_id}/variations/{job_id}/select")
async def select_variation(book_id: str, job_id: str, asset_type: AssetType = AssetType.BACKGROUND):
    """Select a variation and save it as an asset"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Get the job result
    job = _job_queue.get_job(job_id)
    if not job or not job.outputs:
        raise HTTPException(status_code=404, detail="Job not found or not complete")

    # Read the image data
    import os
    from config import config
    output = job.outputs[0]
    file_path = os.path.join(config.OUTPUT_DIR, output.filename)

    with open(file_path, "rb") as f:
        image_data = f.read()

    # Create asset
    asset = Asset(
        type=asset_type,
        name=f"{asset_type.value}_{job_id[:8]}",
        prompt=job.inputs.prompt,
        seed=job.inputs.seed
    )
    asset = storage.save_asset(book_id, asset, image_data)

    # Add to book
    book.assets.append(asset)
    storage.save_book(book)

    return {"asset": asset.model_dump()}


@router.post("/books/{book_id}/variations/{job_id}/save-to-album")
async def save_variation_to_album(book_id: str, job_id: str):
    """Save a variation to the global album for later use"""
    # Get the job result
    job = _job_queue.get_job(job_id)
    if not job or not job.outputs:
        raise HTTPException(status_code=404, detail="Job not found or not complete")

    # Read the image data
    import os
    from config import config
    output = job.outputs[0]
    file_path = os.path.join(config.OUTPUT_DIR, output.filename)

    with open(file_path, "rb") as f:
        image_data = f.read()

    # Create asset and save to album
    asset = Asset(
        type=AssetType.VARIATION,
        name=f"saved_{job_id[:8]}",
        prompt=job.inputs.prompt,
        seed=job.inputs.seed,
        tags=["album", "saved"]
    )
    asset = storage.save_to_album(asset, image_data)

    return {"asset": asset.model_dump()}


# ============================================================
# Album
# ============================================================

@router.get("/album")
async def list_album():
    """List all saved images in the album"""
    return {"assets": [a.model_dump() for a in storage.list_album()]}


@router.get("/album/{asset_id}/image")
async def get_album_image(asset_id: str):
    """Get an album image file"""
    path = storage.get_album_image_path(asset_id)
    if not path:
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path, media_type="image/png")


# ============================================================
# Characters
# ============================================================

@router.post("/books/{book_id}/characters")
async def create_character(book_id: str, name: str, description: str):
    """Create a new character (will need reference image)"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    character = Character(
        name=name,
        description=description,
        reference_image=""  # Will be set when reference is generated
    )
    book.characters.append(character)
    storage.save_book(book)

    return {"character": character.model_dump()}


@router.post("/books/{book_id}/characters/{char_id}/generate-reference")
async def generate_character_reference(book_id: str, char_id: str, pose: str = "front view, full body"):
    """Generate a reference image for a character"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    character = next((c for c in book.characters if c.id == char_id), None)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    if not _job_queue:
        raise HTTPException(status_code=500, detail="Job queue not initialized")

    # Build character reference prompt
    from models import Job, JobCreateRequest, JobInputs, WorkflowType

    prompt = f"""{book.preset.reference_prompt}

CHARACTER REFERENCE SHEET:
{character.description}
{pose}
Single character only, white/neutral background, character design reference sheet style."""

    job = Job(JobCreateRequest(
        job_type="character_ref",
        workflow_type=WorkflowType.CHARACTER_REF,
        priority="high",
        inputs=JobInputs(
            prompt=prompt,
            negative_prompt=book.preset.negative_prompt,
            width=1024,
            height=1024,
            steps=book.preset.steps,
            cfg=book.preset.cfg
        ),
        metadata={"book_id": book_id, "character_id": char_id}
    ))
    await _job_queue.add_job(job)

    return {"job_id": job.job_id, "character_id": char_id}


@router.post("/books/{book_id}/characters/{char_id}/generate-pose")
async def generate_character_pose(book_id: str, char_id: str, request: CharacterPoseRequest):
    """Generate a new pose for a character using IP-Adapter"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    character = next((c for c in book.characters if c.id == char_id), None)
    if not character or not character.reference_image:
        raise HTTPException(status_code=404, detail="Character not found or no reference image")

    if not _job_queue:
        raise HTTPException(status_code=500, detail="Job queue not initialized")

    # Read reference image
    ref_path = storage.get_book_path(book_id) / character.reference_image
    if not ref_path.exists():
        raise HTTPException(status_code=404, detail="Reference image not found")

    import base64
    with open(ref_path, "rb") as f:
        ref_base64 = base64.b64encode(f.read()).decode()

    from models import Job, JobCreateRequest, JobInputs, WorkflowType

    prompt = f"""{book.preset.reference_prompt}

CHARACTER: {character.name}
{character.description}
POSE: {request.pose_description}
Same character as reference, consistent appearance."""

    job = Job(JobCreateRequest(
        job_type="character_pose",
        workflow_type=WorkflowType.IPADAPTER,
        priority="high",
        inputs=JobInputs(
            prompt=prompt,
            negative_prompt=book.preset.negative_prompt,
            width=1024,
            height=1024,
            steps=book.preset.steps,
            cfg=book.preset.cfg,
            seed=request.seed,
            character_ref_image=ref_base64,
            ipadapter_weight=0.75
        ),
        metadata={"book_id": book_id, "character_id": char_id, "pose": request.pose_description}
    ))
    await _job_queue.add_job(job)

    return {"job_id": job.job_id, "character_id": char_id}


# ============================================================
# Pages
# ============================================================

@router.post("/books/{book_id}/pages/{page_number}/variations")
async def generate_page_variations(book_id: str, page_number: int, request: VariationRequest):
    """Generate 4 variations for a specific page"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if not _job_queue:
        raise HTTPException(status_code=500, detail="Job queue not initialized")

    # Generate 4 seeds
    base_seed = request.base_seed or random.randint(0, 2**31 - 4)
    seeds = [base_seed, base_seed + 1, base_seed + 2, base_seed + 3]

    # Build full prompt with preset
    full_prompt = f"{book.preset.reference_prompt}\n\n{request.prompt}"
    negative = request.negative_prompt or book.preset.negative_prompt

    # Submit 4 jobs
    job_ids = []
    from models import JobCreateRequest, JobInputs, WorkflowType, Job

    for seed in seeds:
        job = Job(JobCreateRequest(
            job_type="page_variation",
            workflow_type=WorkflowType.FULL_PAGE,
            priority="high",
            inputs=JobInputs(
                prompt=full_prompt,
                negative_prompt=negative,
                width=book.preset.width,
                height=book.preset.height,
                steps=book.preset.steps,
                cfg=book.preset.cfg,
                seed=seed,
                model=book.preset.model
            ),
            metadata={"book_id": book_id, "page_number": page_number, "variation_seed": seed}
        ))
        await _job_queue.add_job(job)
        job_ids.append(job.job_id)

    return VariationResponse(job_ids=job_ids, seeds=seeds)


@router.post("/books/{book_id}/pages")
async def create_page(book_id: str, number: int, name: str = ""):
    """Create a new page in the book"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    page = Page(number=number, name=name or f"Page {number}")
    book.pages.append(page)
    book.pages.sort(key=lambda p: p.number)
    storage.save_book(book)

    return {"page": page.model_dump()}


@router.put("/books/{book_id}/pages/{page_id}")
async def update_page(book_id: str, page_id: str, updates: dict):
    """Update a page"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    page = next((p for p in book.pages if p.id == page_id), None)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    if "text" in updates:
        page.text = updates["text"]
    if "name" in updates:
        page.name = updates["name"]
    if "background" in updates:
        # Set background from asset ID
        asset = next((a for a in book.assets if a.id == updates["background"]), None)
        if asset:
            page.background = asset

    storage.save_book(book)
    return {"page": page.model_dump()}


@router.post("/books/{book_id}/pages/{page_id}/add-element")
async def add_page_element(book_id: str, page_id: str, element: PageElement):
    """Add a character/prop to a page"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    page = next((p for p in book.pages if p.id == page_id), None)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    page.elements.append(element)
    storage.save_book(book)

    return {"page": page.model_dump()}


# ============================================================
# Assets
# ============================================================

@router.get("/books/{book_id}/assets")
async def list_assets(book_id: str, asset_type: Optional[AssetType] = None):
    """List assets in a book"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    assets = book.assets
    if asset_type:
        assets = [a for a in assets if a.type == asset_type]

    return {"assets": [a.model_dump() for a in assets]}


@router.get("/books/{book_id}/assets/{asset_id}/image")
async def get_asset_image(book_id: str, asset_id: str):
    """Get an asset image file"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    asset = next((a for a in book.assets if a.id == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    path = storage.get_asset_path(book_id, asset)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Image file not found")

    return FileResponse(path, media_type="image/png")


# ============================================================
# Scene Composition
# ============================================================

@router.post("/books/{book_id}/pages/{page_id}/compose")
async def compose_scene(book_id: str, page_id: str, request: ComposeSceneRequest):
    """Compose a final scene by combining background with characters/props"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    page = next((p for p in book.pages if p.id == page_id), None)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    if not _job_queue:
        raise HTTPException(status_code=500, detail="Job queue not initialized")

    # Get background asset
    bg_asset = next((a for a in book.assets if a.id == request.background_id), None)
    if not bg_asset:
        raise HTTPException(status_code=404, detail="Background asset not found")

    # Build prompt with elements
    element_descriptions = []
    for elem in request.elements:
        asset = next((a for a in book.assets if a.id == elem.asset_id), None)
        if asset:
            element_descriptions.append(f"{asset.name}: {asset.prompt[:100] if asset.prompt else asset.description}")

    # Read background image
    import base64
    bg_path = storage.get_asset_path(book_id, bg_asset)
    with open(bg_path, "rb") as f:
        bg_base64 = base64.b64encode(f.read()).decode()

    from models import Job, JobCreateRequest, JobInputs, WorkflowType

    prompt = f"""{book.preset.reference_prompt}

SCENE COMPOSITION:
Background: {bg_asset.prompt or 'scene background'}
Elements in scene: {', '.join(element_descriptions) if element_descriptions else 'none specified'}
{request.prompt_additions}

Compose these elements naturally into the scene."""

    job = Job(JobCreateRequest(
        job_type="scene_compose",
        workflow_type=WorkflowType.FULL_PAGE,  # Could use inpaint in future
        priority="high",
        inputs=JobInputs(
            prompt=prompt,
            negative_prompt=book.preset.negative_prompt,
            width=book.preset.width,
            height=book.preset.height,
            steps=book.preset.steps,
            cfg=book.preset.cfg
        ),
        metadata={
            "book_id": book_id,
            "page_id": page_id,
            "composition": True,
            "background_id": request.background_id,
            "element_ids": [e.asset_id for e in request.elements]
        }
    ))
    await _job_queue.add_job(job)

    return {"job_id": job.job_id, "page_id": page_id}


@router.post("/books/{book_id}/pages/{page_id}/set-final")
async def set_page_final(book_id: str, page_id: str, job_id: str):
    """Set a completed job's image as the final page image"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    page = next((p for p in book.pages if p.id == page_id), None)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Get the job result
    job = _job_queue.get_job(job_id)
    if not job or not job.outputs:
        raise HTTPException(status_code=404, detail="Job not found or not complete")

    # Read the image data
    import os
    from config import config
    output = job.outputs[0]
    file_path = os.path.join(config.OUTPUT_DIR, output.filename)

    with open(file_path, "rb") as f:
        image_data = f.read()

    # Create final asset
    asset = Asset(
        type=AssetType.FINAL,
        name=f"page_{page.number}_final",
        prompt=job.inputs.prompt,
        seed=job.inputs.seed
    )
    asset = storage.save_asset(book_id, asset, image_data)

    # Update page
    page.final_image = asset
    page.status = GenerationStatus.COMPLETE
    storage.save_book(book)

    return {"page": page.model_dump(), "asset": asset.model_dump()}


# ============================================================
# Custom Themes
# ============================================================

OLLAMA_URL = "http://127.0.0.1:11434"
OLLAMA_VISION_MODEL = "llava"
OLLAMA_TEXT_MODEL = "llama3.2"

# Structured prompt template for theme analysis
THEME_ANALYSIS_PROMPT = """Analyze this image and extract its art style. Provide a technical description in EXACTLY this format:

MEDIUM: [describe the art medium - e.g., digital vector illustration, watercolor painting, 3D CGI render, gouache, pencil sketch]
LINE WORK: [describe outlines - e.g., clean uniform-weight outlines, sketchy varied lines, no outlines, thick black borders]
COLOR PALETTE: [list specific colors and their qualities - e.g., warm pastels (peach, sky blue), vibrant saturated primaries, muted earth tones]
SHADING: [describe shading technique - e.g., flat cel-shading, soft gradient blending, realistic shadows, no shading]
CHARACTERS: [describe character style - e.g., rounded simplified shapes, realistic proportions, chibi/super-deformed, angular geometric]
BACKGROUNDS: [describe background style - e.g., detailed painterly environments, simple flat colors, photorealistic, minimalist]
LIGHTING: [describe lighting - e.g., bright even daylight, dramatic rim lighting, soft diffused, golden hour warm]
COMPOSITION: [describe framing/layout - e.g., centered subjects, dynamic angles, character-focused with negative space]

Be specific and technical. This will be used to guide AI image generation."""

TEXT_TO_THEME_PROMPT = """Convert this user description into a structured art style prompt. The user wants this style:

{description}

Generate a technical description in EXACTLY this format:

MEDIUM: [describe the art medium]
LINE WORK: [describe outlines and line quality]
COLOR PALETTE: [list specific colors and qualities]
SHADING: [describe shading technique]
CHARACTERS: [describe character design style]
BACKGROUNDS: [describe background treatment]
LIGHTING: [describe lighting style]
COMPOSITION: [describe framing/layout approach]

Be specific and technical. Expand vague descriptions into concrete artistic instructions."""


@router.get("/themes")
async def list_custom_themes():
    """List all custom themes"""
    themes = storage.list_custom_themes()
    return {"themes": [t.model_dump() for t in themes]}


@router.get("/themes/{theme_id}")
async def get_custom_theme(theme_id: str):
    """Get a specific custom theme"""
    theme = storage.load_custom_theme(theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    return theme.model_dump()


@router.delete("/themes/{theme_id}")
async def delete_custom_theme(theme_id: str):
    """Delete a custom theme"""
    if not storage.delete_custom_theme(theme_id):
        raise HTTPException(status_code=404, detail="Theme not found")
    return {"success": True}


@router.get("/themes/{theme_id}/image")
async def get_theme_reference_image(theme_id: str):
    """Get the reference image for a custom theme"""
    path = storage.get_custom_theme_image_path(theme_id)
    if not path:
        raise HTTPException(status_code=404, detail="Theme image not found")
    return FileResponse(path, media_type="image/png")


@router.post("/themes/analyze-image", response_model=CustomThemeResponse)
async def analyze_image_for_theme(request: AnalyzeImageForThemeRequest):
    """Analyze an uploaded image and extract art style as a custom theme"""
    try:
        # Call Ollama Vision to analyze the image
        prompt = THEME_ANALYSIS_PROMPT
        if request.additional_notes:
            prompt += f"\n\nUser notes: {request.additional_notes}"

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_VISION_MODEL,
                    "prompt": prompt,
                    "images": [request.image],
                    "stream": False,
                },
            )

            if response.status_code != 200:
                return CustomThemeResponse(
                    success=False,
                    error=f"Vision model error: {response.status_code}"
                )

            result = response.json()
            analysis_text = result.get("response", "")

        # Parse the structured response
        analysis = _parse_theme_analysis(analysis_text)

        # Create the theme
        theme = CustomTheme(
            name=request.name,
            source=CustomThemeSource.IMAGE,
            reference_prompt=analysis_text,
            art_style=analysis.get("medium", "Custom Art Style"),
            analysis=analysis,
            original_text=request.additional_notes or None,
        )

        # Save the theme with the reference image
        image_data = base64.b64decode(request.image)
        theme = storage.save_custom_theme(theme, reference_image_data=image_data)

        # Generate a sample prompt
        preview_prompt = f"A friendly dragon playing in a garden, {theme.reference_prompt}"

        return CustomThemeResponse(
            success=True,
            theme=theme,
            preview_prompt=preview_prompt
        )

    except Exception as e:
        logger.error(f"Error analyzing image for theme: {e}")
        return CustomThemeResponse(success=False, error=str(e))


@router.post("/themes/analyze-text", response_model=CustomThemeResponse)
async def analyze_text_for_theme(request: AnalyzeTextForThemeRequest):
    """Convert a text description into a structured custom theme"""
    try:
        prompt = TEXT_TO_THEME_PROMPT.format(description=request.description)

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_TEXT_MODEL,
                    "prompt": prompt,
                    "stream": False,
                },
            )

            if response.status_code != 200:
                return CustomThemeResponse(
                    success=False,
                    error=f"Text model error: {response.status_code}"
                )

            result = response.json()
            analysis_text = result.get("response", "")

        # Parse the structured response
        analysis = _parse_theme_analysis(analysis_text)

        # Create the theme
        theme = CustomTheme(
            name=request.name,
            source=CustomThemeSource.TEXT,
            reference_prompt=analysis_text,
            art_style=analysis.get("medium", "Custom Art Style"),
            analysis=analysis,
            original_text=request.description,
        )

        # Save the theme
        theme = storage.save_custom_theme(theme)

        preview_prompt = f"A friendly dragon playing in a garden, {theme.reference_prompt}"

        return CustomThemeResponse(
            success=True,
            theme=theme,
            preview_prompt=preview_prompt
        )

    except Exception as e:
        logger.error(f"Error analyzing text for theme: {e}")
        return CustomThemeResponse(success=False, error=str(e))


@router.post("/themes/analyze-hybrid", response_model=CustomThemeResponse)
async def analyze_hybrid_for_theme(request: AnalyzeHybridForThemeRequest):
    """Analyze both image and text to create a custom theme"""
    try:
        # First analyze the image
        image_prompt = THEME_ANALYSIS_PROMPT + f"\n\nUser guidance: {request.description}"

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_VISION_MODEL,
                    "prompt": image_prompt,
                    "images": [request.image],
                    "stream": False,
                },
            )

            if response.status_code != 200:
                return CustomThemeResponse(
                    success=False,
                    error=f"Vision model error: {response.status_code}"
                )

            result = response.json()
            analysis_text = result.get("response", "")

        # Parse the structured response
        analysis = _parse_theme_analysis(analysis_text)

        # Create the theme
        theme = CustomTheme(
            name=request.name,
            source=CustomThemeSource.HYBRID,
            reference_prompt=analysis_text,
            art_style=analysis.get("medium", "Custom Art Style"),
            analysis=analysis,
            original_text=request.description,
        )

        # Save the theme with reference image
        image_data = base64.b64decode(request.image)
        theme = storage.save_custom_theme(theme, reference_image_data=image_data)

        preview_prompt = f"A friendly dragon playing in a garden, {theme.reference_prompt}"

        return CustomThemeResponse(
            success=True,
            theme=theme,
            preview_prompt=preview_prompt
        )

    except Exception as e:
        logger.error(f"Error analyzing hybrid input for theme: {e}")
        return CustomThemeResponse(success=False, error=str(e))


# ============================================================
# Production Image Editing - Inpainting
# ============================================================

@router.post("/books/{book_id}/inpaint")
async def inpaint_region(book_id: str, request: InpaintRequest):
    """
    Inpaint (regenerate) a selected region of an image.
    Creates a mask from the selection coordinates and submits an inpaint job.
    """
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if not _job_queue:
        raise HTTPException(status_code=500, detail="Job queue not initialized")

    try:
        import base64
        import io
        import os
        import tempfile
        from PIL import Image

        # Decode the base image
        image_data = base64.b64decode(request.base_image)
        base_image = Image.open(io.BytesIO(image_data))

        # Ensure image is in RGB mode for saving as PNG
        if base_image.mode != "RGB":
            base_image = base_image.convert("RGB")

        # Create mask image (white = area to inpaint, black = keep)
        mask = Image.new("L", (request.image_width, request.image_height), 0)  # Start black

        # Draw white rectangle in selection area
        from PIL import ImageDraw
        draw = ImageDraw.Draw(mask)
        sel = request.selection
        draw.rectangle(
            [int(sel.x), int(sel.y), int(sel.x + sel.width), int(sel.y + sel.height)],
            fill=255
        )

        # Save images to temp directory for ComfyUI to access
        from config import config
        temp_dir = os.path.join(config.OUTPUT_DIR, "inpaint_temp")
        os.makedirs(temp_dir, exist_ok=True)

        import uuid
        unique_id = str(uuid.uuid4())[:8]
        base_filename = f"inpaint_base_{unique_id}.png"
        mask_filename = f"inpaint_mask_{unique_id}.png"

        base_path = os.path.join(temp_dir, base_filename)
        mask_path = os.path.join(temp_dir, mask_filename)

        base_image.save(base_path, "PNG")
        mask.save(mask_path, "PNG")

        # Build prompt with book's art style
        full_prompt = f"{book.preset.reference_prompt}\n\n{request.prompt}"
        negative = book.preset.negative_prompt

        # Create inpaint job
        from models import JobCreateRequest, JobInputs, WorkflowType, Job

        seed = request.seed if request.seed is not None else random.randint(0, 2**31 - 1)

        job = Job(JobCreateRequest(
            job_type="inpaint",
            workflow_type=WorkflowType.INPAINT,
            priority="high",
            inputs=JobInputs(
                prompt=full_prompt,
                negative_prompt=negative,
                width=request.image_width,
                height=request.image_height,
                steps=book.preset.steps,
                cfg=book.preset.cfg,
                seed=seed,
                model=book.preset.model
            ),
            prompt_data={
                "base_image": base_path,
                "mask_image": mask_path,
                "style": book.preset.art_style,
                "subject": request.prompt,
                "placement": "in the selected region"
            },
            metadata={
                "book_id": book_id,
                "selection": request.selection.model_dump(),
                "original_prompt": request.prompt
            }
        ))

        await _job_queue.add_job(job)

        return InpaintResponse(success=True, job_id=job.job_id)

    except Exception as e:
        logger.error(f"Error processing inpaint request: {e}")
        return InpaintResponse(success=False, error=str(e))


def _parse_theme_analysis(text: str) -> dict:
    """Parse the structured theme analysis into a dictionary"""
    analysis = {}

    sections = [
        "MEDIUM", "LINE WORK", "COLOR PALETTE", "SHADING",
        "CHARACTERS", "BACKGROUNDS", "LIGHTING", "COMPOSITION"
    ]

    for section in sections:
        # Try to find this section in the text
        key = section.lower().replace(" ", "_")

        # Look for "SECTION:" pattern
        import re
        pattern = rf"{section}:\s*(.+?)(?=\n[A-Z]|\n\n|$)"
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)

        if match:
            value = match.group(1).strip()
            # Clean up any trailing sections
            for other in sections:
                if other != section and other + ":" in value:
                    value = value.split(other + ":")[0].strip()
            analysis[key] = value

    return analysis


# ============================================================
# Story Mode & CMS Export
# ============================================================

from .models import StoryModeUpdate, ExportCMSRequest, CMSExport, PageContent


@router.patch("/books/{book_id}/pages/{page_id}/story")
async def update_page_story(book_id: str, page_id: str, update: StoryModeUpdate):
    """Update page text and title for story mode"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    page = next((p for p in book.pages if p.id == page_id), None)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    page.text = update.text
    page.name = update.title or page.name
    storage.save_book(book)

    return {"success": True, "page": page.model_dump()}


@router.post("/books/{book_id}/export-cms")
async def export_book_to_cms(book_id: str, request: ExportCMSRequest):
    """Export book to CMS-ready format (JSON/Markdown)"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Generate slug from title
    import re
    slug = re.sub(r'[^a-z0-9]+', '-', book.title.lower()).strip('-')

    # Build page content
    pages_content = []
    for page in book.pages:
        image_filename = ""
        if page.final_image:
            image_filename = page.final_image.filename
        elif page.background:
            image_filename = page.background.filename

        pages_content.append(PageContent(
            page_number=page.number,
            title=page.name,
            text=page.text,
            image_filename=image_filename,
            image_alt=f"{book.title} - Page {page.number}"
        ))

    # Find cover image (first page or first background)
    cover_image = ""
    if pages_content and pages_content[0].image_filename:
        cover_image = pages_content[0].image_filename

    cms_export = CMSExport(
        book_id=book_id,
        title=book.title,
        description=book.description,
        author=request.author,
        art_style=book.preset.art_style if book.preset else "",
        pages=pages_content,
        slug=slug,
        tags=request.tags,
        cover_image=cover_image
    )

    # Save to disk
    result = storage.save_cms_export(book_id, cms_export.model_dump(), request.export_format)

    return {
        "success": True,
        "export": cms_export.model_dump(),
        "files": result["files"],
        "export_path": result["export_path"]
    }


@router.get("/books/{book_id}/exports")
async def list_book_exports(book_id: str):
    """List all CMS exports for a book"""
    book = storage.load_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    return {"exports": storage.list_exports(book_id)}
