"""
Storyboard Creator - API Routes

FastAPI router for storyboard endpoints.
"""
import random
import asyncio
import logging
import base64
import httpx
import uuid
from typing import Optional, List
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Depends
from fastapi.responses import FileResponse

from .models import (
    Book, Page, Asset, Character, AssetType, GenerationStatus,
    CreateBookRequest, VariationRequest, VariationResponse, GenerationMode,
    CharacterPoseRequest, ComposeSceneRequest, PageElement,
    CustomTheme, CustomThemeSource, CustomThemeResponse,
    AnalyzeImageForThemeRequest, AnalyzeTextForThemeRequest, AnalyzeHybridForThemeRequest,
    InpaintRequest, InpaintResponse, SelectionRegion,
    Project, CreateProjectRequest
)
from .presets import get_preset, list_presets, PRESETS
from .storage import storage  # Keep for file operations (image storage)
from .dependencies import Repositories, get_repos
from database import models as db_models

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
# Helper Functions
# ============================================================


def _get_loaded_relationship(obj, attr_name):
    """Safely get a relationship attribute only if it's already loaded.

    In async SQLAlchemy, accessing unloaded relationships triggers lazy loading
    which fails outside of an async context. This helper returns the relationship
    if loaded, or an empty list if not.
    """
    from sqlalchemy import inspect
    try:
        insp = inspect(obj)
        if attr_name in insp.dict:
            # Relationship is loaded in instance dict
            return getattr(obj, attr_name) or []
        # Check if it's in unloaded attributes
        if attr_name in insp.unloaded:
            return []
        # Try to access - may be loaded via other means
        return getattr(obj, attr_name) or []
    except Exception:
        return []


# ============================================================
# Projects
# ============================================================


def _project_to_dict(project: db_models.Project) -> dict:
    """Convert SQLAlchemy Project model to API response dict."""
    # Safely get books relationship only if loaded
    books = _get_loaded_relationship(project, 'books')
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "books": [{"id": b.id, "title": b.title} for b in books],
        "book_count": len(books),
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
    }


@router.get("/projects")
async def list_projects(repos: Repositories = Depends(get_repos)):
    """List all projects with their books"""
    projects = await repos.projects.get_all(
        order_by="updated_at", order_desc=True, load_relations=["books"]
    )
    return {"projects": [_project_to_dict(p) for p in projects]}


@router.post("/projects")
async def create_project(
    request: CreateProjectRequest,
    repos: Repositories = Depends(get_repos)
):
    """Create a new project (container for books)"""
    db_project = db_models.Project(
        id=uuid.uuid4().hex,
        name=request.name,
        description=request.description
    )
    db_project = await repos.projects.create(db_project)
    return {"project": _project_to_dict(db_project)}


@router.get("/projects/{project_id}")
async def get_project(project_id: str, repos: Repositories = Depends(get_repos)):
    """Get a project by ID"""
    project = await repos.projects.get_with_books(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"project": _project_to_dict(project)}


@router.put("/projects/{project_id}")
async def update_project(
    project_id: str,
    updates: dict,
    repos: Repositories = Depends(get_repos)
):
    """Update project properties"""
    project = await repos.projects.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = {}
    if "name" in updates:
        update_data["name"] = updates["name"]
    if "description" in updates:
        update_data["description"] = updates["description"]

    if update_data:
        project = await repos.projects.update(project, update_data)

    # Reload with books for response
    project = await repos.projects.get_with_books(project_id)
    return {"project": _project_to_dict(project)}


@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    delete_books: bool = False,
    repos: Repositories = Depends(get_repos)
):
    """Delete a project (optionally delete all books in it)"""
    project = await repos.projects.get_with_books(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if delete_books:
        # Delete all books in the project
        for book in project.books:
            await repos.books.delete(book)

    await repos.projects.delete(project)
    return {"status": "deleted"}


@router.post("/projects/{project_id}/books/{book_id}")
async def add_book_to_project(
    project_id: str,
    book_id: str,
    repos: Repositories = Depends(get_repos)
):
    """Add an existing book to a project"""
    project = await repos.projects.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Update book's project_id
    await repos.books.update(book, {"project_id": project_id})
    return {"status": "added"}


@router.delete("/projects/{project_id}/books/{book_id}")
async def remove_book_from_project(
    project_id: str,
    book_id: str,
    repos: Repositories = Depends(get_repos)
):
    """Remove a book from a project (doesn't delete the book)"""
    book = await repos.books.get_by_id(book_id)
    if not book or book.project_id != project_id:
        raise HTTPException(status_code=404, detail="Book not found in project")

    # Create a new "orphan" project or set to null
    # For now, we'll keep the book but clear the project_id
    # Note: Database schema requires project_id, so we need a default project
    await repos.books.update(book, {"project_id": None})
    return {"status": "removed"}


# ============================================================
# Books
# ============================================================


def _book_to_dict(book: db_models.Book) -> dict:
    """Convert SQLAlchemy Book model to API response dict matching legacy format."""
    # Safely get relationships that may not be loaded
    pages = _get_loaded_relationship(book, 'pages')
    assets = _get_loaded_relationship(book, 'assets')
    characters = _get_loaded_relationship(book, 'characters')

    return {
        "id": book.id,
        "title": book.title,
        "description": book.description,
        "project_id": book.project_id,
        "width": book.width,
        "height": book.height,
        "cover_image": book.cover_image,
        "preset": {
            "name": book.preset_name,
            "art_style": book.art_style,
            "reference_prompt": book.reference_prompt,
            "negative_prompt": book.negative_prompt,
            "width": book.width,
            "height": book.height,
            "steps": book.default_steps,
            "cfg": book.default_cfg,
            "model": book.default_model,
        } if book.preset_name else None,
        "pages": [_page_to_dict(p) for p in pages],
        "assets": [_asset_to_dict(a) for a in assets],
        "characters": [_character_to_dict(c) for c in characters],
        "created_at": book.created_at.isoformat() if book.created_at else None,
        "updated_at": book.updated_at.isoformat() if book.updated_at else None,
    }


def _page_to_dict(page: db_models.Page) -> dict:
    """Convert SQLAlchemy Page model to API response dict."""
    return {
        "id": page.id,
        "name": page.name,
        "number": page.page_number,
        "text": page.text_content,
        "background": page.image_path,
        "elements": page.overlays if page.overlays else [],
        "status": page.status,
    }


def _asset_to_dict(asset: db_models.Asset) -> dict:
    """Convert SQLAlchemy Asset model to API response dict."""
    return {
        "id": asset.id,
        "type": asset.asset_type,
        "name": asset.name,
        "description": asset.description,
        "filename": asset.image_path,
        "prompt": asset.prompt,
        "seed": asset.seed,
        "tags": asset.tags if asset.tags else [],
    }


def _character_to_dict(character: db_models.Character) -> dict:
    """Convert SQLAlchemy Character model to API response dict."""
    return {
        "id": character.id,
        "name": character.name,
        "description": character.description,
        "reference_image": character.reference_image_path,
        "seed": character.seed,
        "features": character.features,
        "poses": [],  # Poses are generated on-demand
    }


def _album_item_to_dict(item: db_models.AlbumItem) -> dict:
    """Convert SQLAlchemy AlbumItem model to API response dict."""
    return {
        "id": item.id,
        "type": item.type,
        "name": item.name,
        "filename": item.image_path,
        "prompt": item.prompt or "",
        "seed": item.seed or 0,
        "tags": item.tags if item.tags else [],
    }


def _workspace_to_dict(workspace: db_models.Workspace) -> dict:
    """Convert SQLAlchemy Workspace model to API response dict."""
    return {
        "session_id": workspace.id,
        "date": workspace.session_date,
        "prompt": workspace.prompt or "",
        "preset_name": workspace.preset_name or "",
        "book_id": workspace.book_id,
        "images": workspace.images if workspace.images else [],
    }


@router.get("/books")
async def list_books(repos: Repositories = Depends(get_repos)):
    """List all books"""
    books = await repos.books.get_all(
        order_by="updated_at", order_desc=True, load_relations=["pages", "assets", "characters"]
    )
    return {"books": [_book_to_dict(b) for b in books]}


@router.post("/books")
async def create_book(
    request: CreateBookRequest,
    repos: Repositories = Depends(get_repos)
):
    """Create a new book (optionally within a project)"""
    from .models import GenerationPreset

    # Get preset configuration
    preset_name = request.preset_name
    art_style = ""
    reference_prompt = ""
    negative_prompt = ""
    width = 1080
    height = 704
    steps = 35
    cfg = 5.5
    model = None

    if request.custom_preset:
        preset = request.custom_preset
        preset_name = preset.name
        art_style = preset.art_style
        reference_prompt = preset.reference_prompt
        negative_prompt = preset.negative_prompt
        width = preset.width
        height = preset.height
        steps = preset.steps
        cfg = preset.cfg
        model = preset.model
    elif request.preset_name.startswith("custom:"):
        # Load custom theme from database
        theme_id = request.preset_name[7:]
        theme = await repos.themes.get_by_id(theme_id)
        if not theme:
            raise HTTPException(status_code=404, detail="Custom theme not found")
        preset_name = theme.name
        art_style = theme.art_style or ""
        reference_prompt = theme.reference_prompt or ""
        negative_prompt = theme.negative_prompt or ""
        width = theme.width or 1080
        height = theme.height or 704
        steps = theme.steps or 35
        cfg = theme.cfg or 5.5
    else:
        preset = get_preset(request.preset_name)
        preset_name = preset.name
        art_style = preset.art_style
        reference_prompt = preset.reference_prompt
        negative_prompt = preset.negative_prompt
        width = preset.width
        height = preset.height
        steps = preset.steps
        cfg = preset.cfg
        model = preset.model

    # Ensure project exists if specified
    project_id = request.project_id
    if project_id:
        project = await repos.projects.get_by_id(project_id)
        if not project:
            # Create a default project if not found
            project = db_models.Project(
                id=project_id,
                name="Default Project",
                description="Auto-created project"
            )
            await repos.projects.create(project)

    # Create the book
    db_book = db_models.Book(
        id=uuid.uuid4().hex,
        project_id=project_id or uuid.uuid4().hex,  # Must have a project
        title=request.title,
        description=request.description,
        width=width,
        height=height,
        preset_name=preset_name,
        art_style=art_style,
        reference_prompt=reference_prompt,
        negative_prompt=negative_prompt,
        default_steps=steps,
        default_cfg=cfg,
        default_model=model,
    )

    # If no project_id, create a project for this book
    if not request.project_id:
        project = db_models.Project(
            id=db_book.project_id,
            name=request.title,
            description=f"Project for: {request.title}"
        )
        await repos.projects.create(project)

    db_book = await repos.books.create(db_book)

    # Ensure storage directory for assets
    storage.get_book_path(db_book.id)

    return {"book": _book_to_dict(db_book)}


@router.get("/books/{book_id}")
async def get_book(book_id: str, repos: Repositories = Depends(get_repos)):
    """Get a book by ID"""
    book = await repos.books.get_with_all_relations(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return {"book": _book_to_dict(book)}


@router.put("/books/{book_id}")
async def update_book(
    book_id: str,
    updates: dict,
    repos: Repositories = Depends(get_repos)
):
    """Update book properties"""
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    update_data = {}
    if "title" in updates:
        update_data["title"] = updates["title"]
    if "description" in updates:
        update_data["description"] = updates["description"]

    if update_data:
        book = await repos.books.update(book, update_data)

    # Reload with relations
    book = await repos.books.get_with_all_relations(book_id)
    return {"book": _book_to_dict(book)}


@router.delete("/books/{book_id}")
async def delete_book(book_id: str, repos: Repositories = Depends(get_repos)):
    """Delete a book and all its files"""
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Delete file storage
    storage.delete_book(book_id)

    # Delete from database
    await repos.books.delete(book)
    return {"deleted": True}


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


# ============================================================
# Job Status Routes (proxied from shared job queue)
# ============================================================

@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get job status - proxies to shared job queue"""
    if not _job_queue:
        raise HTTPException(status_code=500, detail="Job queue not initialized")

    job = _job_queue.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    return job.to_response()


@router.delete("/jobs/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a job"""
    if not _job_queue:
        raise HTTPException(status_code=500, detail="Job queue not initialized")

    job = _job_queue.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    success = await _job_queue.cancel_job(job_id)

    if success and job.comfyui_prompt_id and _comfyui_client:
        await _comfyui_client.cancel_prompt(job.comfyui_prompt_id)

    return {"status": "cancelled" if success else "failed", "job_id": job_id}


@router.get("/jobs/{job_id}/image")
async def get_job_image(job_id: str):
    """Get the generated image for a completed job"""
    import os
    from config import config

    if not _job_queue:
        raise HTTPException(status_code=500, detail="Job queue not initialized")

    job = _job_queue.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if not job.outputs:
        raise HTTPException(status_code=404, detail="Job has no outputs yet")

    # Get the first output image
    output = job.outputs[0]
    file_path = os.path.join(config.OUTPUT_DIR, output.filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image file not found")

    return FileResponse(
        file_path,
        media_type="image/png",
        filename=output.filename
    )


@router.post("/books/{book_id}/variations")
async def generate_variations(
    book_id: str,
    request: VariationRequest,
    repos: Repositories = Depends(get_repos)
):
    """Generate 4 variations of an image with different seeds"""
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if not _job_queue:
        raise HTTPException(status_code=500, detail="Job queue not initialized")

    # Generate seeds based on requested number of variations
    num_vars = min(max(request.num_variations, 1), 12)  # Clamp between 1-12
    base_seed = request.base_seed or random.randint(0, 2**31 - num_vars)
    seeds = [base_seed + i for i in range(num_vars)]

    # Build prompt based on generation mode
    mode = request.generation_mode
    logger.info(f"Generation mode: {mode.value}")

    if mode == GenerationMode.SCENE:
        # SCENE: Empty environment only - NO characters
        full_prompt = f"""STYLE: {book.art_style}
SETTING: {request.prompt}
ATMOSPHERE: warm and inviting scene
COMPOSITION: open space for character placement, empty environment
{book.reference_prompt}
empty scene, no characters, no people, no animals, environment only, background illustration"""
        # Block all character/figure terms
        negative = (request.negative_prompt or book.negative_prompt) + ", character, person, people, child, animal, creature, figure, human, face, body, limbs"

    elif mode == GenerationMode.CHARACTER:
        # CHARACTER: Isolated character on simple/transparent background
        char_desc = request.character_prompt or ""
        full_prompt = f"""STYLE: {book.art_style}
{request.prompt}
{char_desc}
{book.reference_prompt}
character design, isolated character, simple gradient background, transparent background style, clean edges, full body, centered, single character, white background, no environment, no scene"""
        negative = (request.negative_prompt or book.negative_prompt) + ", busy background, complex background, scenery, environment, multiple characters, group, crowd"

    elif mode == GenerationMode.OBJECT:
        # OBJECT/PROP: Isolated object on simple/transparent background
        full_prompt = f"""STYLE: {book.art_style}
{request.prompt}
{book.reference_prompt}
single object, isolated prop, transparent background, game asset style, clean edges, centered, white background, no environment, no characters, no people, product shot, clean silhouette"""
        negative = (request.negative_prompt or book.negative_prompt) + ", busy background, complex background, scenery, environment, characters, people, hands, person holding"

    else:
        # SKETCH or fallback
        full_prompt = f"""STYLE: {book.art_style}
{request.prompt}
{book.reference_prompt}"""
        negative = request.negative_prompt or book.negative_prompt

    # Create workspace session in database
    session_id = uuid.uuid4().hex
    session_date = datetime.now().strftime("%Y-%m-%d")

    db_workspace = db_models.Workspace(
        id=session_id,
        session_date=session_date,
        prompt=request.prompt,
        preset_name=book.preset_name or "",
        book_id=book_id
    )
    db_workspace = await repos.workspaces.create(db_workspace)

    # Submit 4 jobs
    job_ids = []
    from models import JobCreateRequest, JobInputs, WorkflowType

    # Use request dimensions if provided, otherwise fall back to book defaults
    img_width = request.width if request.width else book.width
    img_height = request.height if request.height else book.height

    logger.info(f"Generating {mode.value} with dimensions: {img_width}x{img_height}")

    for i, seed in enumerate(seeds):
        from models import Job
        job = Job(JobCreateRequest(
            job_type="variation",
            workflow_type=WorkflowType.FULL_PAGE,
            priority="high",
            inputs=JobInputs(
                prompt=full_prompt,
                negative_prompt=negative,
                width=img_width,
                height=img_height,
                steps=book.default_steps,
                cfg=book.default_cfg,
                seed=seed,
                model=book.model
            ),
            metadata={
                "book_id": book_id,
                "variation_seed": seed,
                "workspace_session": session_id,
                "workspace_date": session_date,
                "workspace_index": i,
                "generation_mode": mode.value,  # Track mode for correct asset saving
                "pose_name": request.pose_name  # For pose-based generation
            }
        ))
        await _job_queue.submit(job)
        job_ids.append(job.job_id)

    return VariationResponse(
        job_ids=job_ids,
        seeds=seeds,
        workspace_session=session_id,
        workspace_date=session_date
    )


@router.post("/books/{book_id}/variations/{job_id}/select")
async def select_variation(
    book_id: str,
    job_id: str,
    asset_type: AssetType = Query(default=AssetType.BACKGROUND),
    name: Optional[str] = Query(default=None),
    repos: Repositories = Depends(get_repos)
):
    """Select a variation and save it as an asset"""
    import os
    from config import config

    logger.info(f"=== SAVE VARIATION ===")
    logger.info(f"  Book ID: {book_id}")
    logger.info(f"  Job ID: {job_id}")
    logger.info(f"  Asset Type: {asset_type.value}")
    logger.info(f"  Name: {name}")

    book = await repos.books.get_by_id(book_id)
    if not book:
        logger.error(f"  ERROR: Book not found: {book_id}")
        raise HTTPException(status_code=404, detail=f"Book not found: {book_id}")

    # Get the job result
    if not _job_queue:
        logger.error("  ERROR: Job queue not initialized")
        raise HTTPException(status_code=500, detail="Job queue not initialized")

    job = _job_queue.get_job(job_id)
    if not job:
        # List available jobs for debugging
        all_jobs = list(_job_queue._jobs.keys()) if hasattr(_job_queue, '_jobs') else []
        logger.error(f"  ERROR: Job not found: {job_id}")
        logger.error(f"  Available jobs: {all_jobs[:10]}...")
        raise HTTPException(
            status_code=404,
            detail=f"Job {job_id} not found. The job may have expired. Available: {len(all_jobs)} jobs"
        )

    logger.info(f"  Job status: {job.status}")
    logger.info(f"  Job outputs: {len(job.outputs) if job.outputs else 0}")

    if not job.outputs or len(job.outputs) == 0:
        raise HTTPException(
            status_code=400,
            detail=f"Job {job_id} has no outputs (status: {job.status}). Wait for generation to complete."
        )

    # Read the image data
    output = job.outputs[0]
    file_path = os.path.join(config.OUTPUT_DIR, output.filename)

    logger.info(f"  Output filename: {output.filename}")
    logger.info(f"  Full path: {file_path}")
    logger.info(f"  File exists: {os.path.exists(file_path)}")

    if not os.path.exists(file_path):
        # Try alternative paths
        alt_paths = [
            output.filename,  # Just filename
            os.path.join("outputs", output.filename),  # Relative outputs
            os.path.join(".", "outputs", output.filename),  # Explicit relative
        ]
        found_path = None
        for alt in alt_paths:
            if os.path.exists(alt):
                found_path = alt
                break

        if found_path:
            file_path = found_path
            logger.info(f"  Found at alternative path: {file_path}")
        else:
            logger.error(f"  ERROR: File not found at any path")
            raise HTTPException(
                status_code=404,
                detail=f"Output file not found: {output.filename}. Tried: {file_path}"
            )

    with open(file_path, "rb") as f:
        image_data = f.read()

    logger.info(f"  Image data size: {len(image_data)} bytes")

    # Create asset with custom name or default
    asset_name = name if name else f"{asset_type.value}_{job_id[:8]}"

    # Use Pydantic Asset for saving file
    pydantic_asset = Asset(
        type=asset_type,
        name=asset_name,
        filename="",  # Will be set by storage.save_asset
        prompt=job.inputs.prompt if job.inputs else "",
        seed=job.inputs.seed if job.inputs else 0
    )

    try:
        # Save image to disk using storage
        saved_pydantic = storage.save_asset(book_id, pydantic_asset, image_data)

        # Create database asset record
        db_asset = db_models.Asset(
            id=saved_pydantic.id,
            book_id=book_id,
            type=asset_type.value,
            name=asset_name,
            image_path=saved_pydantic.filename,
            prompt=job.inputs.prompt if job.inputs else "",
            seed=job.inputs.seed if job.inputs else 0
        )
        db_asset = await repos.assets.create(db_asset)
    except Exception as e:
        logger.error(f"  ERROR saving asset: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save asset: {str(e)}")

    logger.info(f"  SUCCESS: Asset saved as {db_asset.id} ({asset_name})")

    return {"asset": _asset_to_dict(db_asset)}


@router.post("/books/{book_id}/variations/{job_id}/save-to-workspace")
async def save_variation_to_workspace(
    book_id: str,
    job_id: str,
    repos: Repositories = Depends(get_repos)
):
    """Auto-save a completed job to its workspace session"""
    import os
    from config import config

    job = _job_queue.get_job(job_id)
    if not job or not job.outputs:
        raise HTTPException(status_code=404, detail="Job not found or not complete")

    # Get workspace info from job metadata
    metadata = job.request.metadata or {}
    session_id = metadata.get("workspace_session")
    session_date = metadata.get("workspace_date")
    workspace_index = metadata.get("workspace_index", 0)

    if not session_id or not session_date:
        raise HTTPException(status_code=400, detail="Job has no workspace session info")

    # Read the image data
    output = job.outputs[0]
    file_path = os.path.join(config.OUTPUT_DIR, output.filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image file not found")

    with open(file_path, "rb") as f:
        image_data = f.read()

    # Save image to workspace directory on disk
    workspace_dir = Path(storage.root) / "workspace" / session_date / session_id
    workspace_dir.mkdir(parents=True, exist_ok=True)

    seed = job.inputs.seed if job.inputs else 0
    filename = f"var_{workspace_index:02d}_seed{seed}.png"
    image_path = workspace_dir / filename

    with open(image_path, "wb") as f:
        f.write(image_data)

    # Update workspace session in database with new image
    workspace = await repos.workspaces.get_by_id(session_id)
    if workspace:
        images = workspace.images or []
        images.append({
            "filename": filename,
            "index": workspace_index,
            "seed": seed,
            "job_id": job_id
        })
        await repos.workspaces.update(workspace, {"images": images})

    result = {
        "filename": filename,
        "session_id": session_id,
        "date": session_date,
        "index": workspace_index,
        "seed": seed
    }

    logger.info(f"Saved job {job_id} to workspace: {session_id}/{filename}")
    return result


def remove_white_background(image_data: bytes, threshold: int = 240) -> bytes:
    """
    Remove white/light backgrounds from an image, making them transparent.

    Args:
        image_data: Raw PNG/JPEG image bytes
        threshold: Brightness threshold (0-255). Pixels with RGB all above this become transparent.

    Returns:
        PNG image bytes with transparency
    """
    try:
        from PIL import Image
        import io

        # Load image
        img = Image.open(io.BytesIO(image_data))

        # Convert to RGBA if needed
        if img.mode != 'RGBA':
            img = img.convert('RGBA')

        # Get pixel data
        data = img.getdata()

        # Process each pixel
        new_data = []
        for pixel in data:
            r, g, b, a = pixel
            # If pixel is very light (close to white), make transparent
            if r > threshold and g > threshold and b > threshold:
                new_data.append((r, g, b, 0))  # Fully transparent
            else:
                new_data.append(pixel)

        img.putdata(new_data)

        # Save to bytes
        output = io.BytesIO()
        img.save(output, format='PNG')
        return output.getvalue()

    except ImportError:
        logger.warning("Pillow not installed, cannot remove background")
        return image_data
    except Exception as e:
        logger.error(f"Background removal failed: {e}")
        return image_data


@router.post("/v1/remove-background")
async def remove_background_endpoint(
    job_id: Optional[str] = None,
    threshold: int = Query(default=240, ge=200, le=255, description="Brightness threshold for white detection")
):
    """
    Remove white/light background from a job's output image.
    Returns the processed image with transparency.
    """
    import os
    from config import config
    from fastapi.responses import Response

    if not job_id:
        raise HTTPException(status_code=400, detail="job_id required")

    job = _job_queue.get_job(job_id)
    if not job or not job.outputs:
        raise HTTPException(status_code=404, detail="Job not found or not complete")

    # Read the image data
    output = job.outputs[0]
    file_path = os.path.join(config.OUTPUT_DIR, output.filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image file not found")

    with open(file_path, "rb") as f:
        image_data = f.read()

    # Remove background
    processed_data = remove_white_background(image_data, threshold)

    return Response(content=processed_data, media_type="image/png")


@router.post("/books/{book_id}/variations/{job_id}/save-with-transparency")
async def save_variation_with_transparency(
    book_id: str,
    job_id: str,
    asset_type: AssetType = Query(default=AssetType.CHARACTER),
    name: Optional[str] = Query(default=None),
    threshold: int = Query(default=240, ge=200, le=255),
    repos: Repositories = Depends(get_repos)
):
    """
    Save a variation as an asset with transparent background.
    Processes the image to remove white/light backgrounds before saving.
    """
    import os
    from config import config

    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail=f"Book not found: {book_id}")

    job = _job_queue.get_job(job_id)
    if not job or not job.outputs:
        raise HTTPException(status_code=404, detail="Job not found or not complete")

    # Read the image data
    output = job.outputs[0]
    file_path = os.path.join(config.OUTPUT_DIR, output.filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image file not found")

    with open(file_path, "rb") as f:
        image_data = f.read()

    # Remove background
    processed_data = remove_white_background(image_data, threshold)

    # Create asset with custom name or default
    asset_name = name if name else f"{asset_type.value}_{job_id[:8]}_transparent"

    # Use Pydantic Asset for saving file
    pydantic_asset = Asset(
        type=asset_type,
        name=asset_name,
        filename="",
        prompt=job.inputs.prompt if job.inputs else "",
        seed=job.inputs.seed if job.inputs else 0,
        tags=["transparent", "isolated"]
    )

    try:
        # Save image to disk using storage
        saved_pydantic = storage.save_asset(book_id, pydantic_asset, processed_data)

        # Create database asset record
        db_asset = db_models.Asset(
            id=saved_pydantic.id,
            book_id=book_id,
            type=asset_type.value,
            name=asset_name,
            image_path=saved_pydantic.filename,
            prompt=job.inputs.prompt if job.inputs else "",
            seed=job.inputs.seed if job.inputs else 0,
            tags=["transparent", "isolated"]
        )
        db_asset = await repos.assets.create(db_asset)
    except Exception as e:
        logger.error(f"Error saving transparent asset: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save asset: {str(e)}")

    logger.info(f"Saved transparent asset: {db_asset.id} ({asset_name})")
    return {"asset": _asset_to_dict(db_asset), "transparent": True}


@router.post("/books/{book_id}/variations/{job_id}/save-to-album")
async def save_variation_to_album(
    book_id: str,
    job_id: str,
    repos: Repositories = Depends(get_repos)
):
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

    # Save to album directory on disk
    album_dir = Path(storage.root) / "album"
    album_dir.mkdir(parents=True, exist_ok=True)

    asset_id = uuid.uuid4().hex
    filename = f"{asset_id}.png"
    image_path = album_dir / filename

    with open(image_path, "wb") as f:
        f.write(image_data)

    # Create album item in database
    db_album_item = db_models.AlbumItem(
        id=asset_id,
        type="variation",
        name=f"saved_{job_id[:8]}",
        image_path=filename,
        prompt=job.inputs.prompt if job.inputs else "",
        seed=job.inputs.seed if job.inputs else 0,
        tags=["album", "saved"],
        source_book_id=book_id
    )
    db_album_item = await repos.album.create(db_album_item)

    return {"asset": _album_item_to_dict(db_album_item)}


# ============================================================
# Album
# ============================================================

@router.get("/album")
async def list_album(repos: Repositories = Depends(get_repos)):
    """List all saved images in the album"""
    album_items = await repos.album.get_all()
    return {"assets": [_album_item_to_dict(item) for item in album_items]}


@router.get("/album/{asset_id}/image")
async def get_album_image(
    asset_id: str,
    repos: Repositories = Depends(get_repos)
):
    """Get an album image file"""
    item = await repos.album.get_by_id(asset_id)
    if not item:
        raise HTTPException(status_code=404, detail="Image not found")

    path = Path(storage.root) / "album" / item.image_path
    if not path.exists():
        raise HTTPException(status_code=404, detail="Image file not found")

    return FileResponse(path, media_type="image/png")


# ============================================================
# Workspace (Auto-saved generations)
# ============================================================

@router.get("/workspace")
async def list_workspace(repos: Repositories = Depends(get_repos)):
    """List all workspace sessions, grouped by date"""
    workspaces = await repos.workspaces.get_all(order_by="created_at", order_desc=True)

    # Group by date
    dates = list(set(w.session_date for w in workspaces))
    dates.sort(reverse=True)

    return {
        "dates": dates,
        "sessions": [_workspace_to_dict(w) for w in workspaces]
    }


@router.get("/workspace/{date}")
async def list_workspace_by_date(
    date: str,
    repos: Repositories = Depends(get_repos)
):
    """List workspace sessions for a specific date"""
    workspaces = await repos.workspaces.get_by_date(date)
    return {"date": date, "sessions": [_workspace_to_dict(w) for w in workspaces]}


@router.get("/workspace/{date}/{session_id}")
async def get_workspace_session(
    date: str,
    session_id: str,
    repos: Repositories = Depends(get_repos)
):
    """Get details of a specific workspace session"""
    workspace = await repos.workspaces.get_by_id(session_id)
    if not workspace or workspace.session_date != date:
        raise HTTPException(status_code=404, detail="Session not found")
    return _workspace_to_dict(workspace)


@router.get("/workspace/{date}/{session_id}/{filename}")
async def get_workspace_image(date: str, session_id: str, filename: str):
    """Get a workspace image file"""
    path = Path(storage.root) / "workspace" / date / session_id / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path, media_type="image/png")


@router.delete("/workspace/{date}/{session_id}")
async def delete_workspace_session(
    date: str,
    session_id: str,
    repos: Repositories = Depends(get_repos)
):
    """Delete a workspace session and all its images"""
    workspace = await repos.workspaces.get_by_id(session_id)
    if not workspace or workspace.session_date != date:
        raise HTTPException(status_code=404, detail="Session not found")

    # Delete files from disk
    workspace_dir = Path(storage.root) / "workspace" / date / session_id
    if workspace_dir.exists():
        import shutil
        shutil.rmtree(workspace_dir)

    # Delete from database
    await repos.workspaces.delete(workspace)

    return {"status": "deleted", "session_id": session_id}


@router.post("/workspace/{date}/{session_id}/save-to-book/{book_id}")
async def save_workspace_to_book(
    date: str,
    session_id: str,
    book_id: str,
    filename: str = Query(...),
    name: str = Query(default=None),
    asset_type: AssetType = Query(default=AssetType.BACKGROUND),
    repos: Repositories = Depends(get_repos)
):
    """Save a workspace image to a book as an asset"""
    # Get the workspace session
    workspace = await repos.workspaces.get_by_id(session_id)
    if not workspace or workspace.session_date != date:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get the image path
    path = Path(storage.root) / "workspace" / date / session_id / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    # Load the book
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Read image data
    with open(path, "rb") as f:
        image_data = f.read()

    # Get prompt and seed from workspace
    prompt = workspace.prompt or ""
    seed = 0
    if workspace.images:
        for img in workspace.images:
            if img.get("filename") == filename:
                seed = img.get("seed", 0)
                break

    # Create and save asset
    asset_name = name or f"workspace_{session_id}_{filename.replace('.png', '')}"

    # Use Pydantic Asset for file saving
    pydantic_asset = Asset(
        type=asset_type,
        name=asset_name,
        filename="",  # Will be set by storage.save_asset
        prompt=prompt,
        seed=seed,
        tags=["workspace", "saved"]
    )
    saved_pydantic = storage.save_asset(book_id, pydantic_asset, image_data)

    # Create database record
    db_asset = db_models.Asset(
        id=saved_pydantic.id,
        book_id=book_id,
        type=asset_type.value,
        name=asset_name,
        image_path=saved_pydantic.filename,
        prompt=prompt,
        seed=seed,
        tags=["workspace", "saved"]
    )
    db_asset = await repos.assets.create(db_asset)

    logger.info(f"Saved workspace image to book: {db_asset.id}")
    return {"asset": _asset_to_dict(db_asset)}


# ============================================================
# Characters
# ============================================================

@router.post("/books/{book_id}/characters")
async def create_character(
    book_id: str,
    name: str,
    description: str,
    repos: Repositories = Depends(get_repos)
):
    """Create a new character (will need reference image)"""
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    db_character = db_models.Character(
        id=uuid.uuid4().hex,
        book_id=book_id,
        name=name,
        description=description,
        reference_image_path=""  # Will be set when reference is generated
    )
    db_character = await repos.characters.create(db_character)

    return {"character": _character_to_dict(db_character)}


@router.post("/books/{book_id}/characters/{char_id}/generate-reference")
async def generate_character_reference(
    book_id: str,
    char_id: str,
    pose: str = "front view, full body",
    repos: Repositories = Depends(get_repos)
):
    """Generate a reference image for a character"""
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    character = await repos.characters.get_by_id(char_id)
    if not character or character.book_id != book_id:
        raise HTTPException(status_code=404, detail="Character not found")

    if not _job_queue:
        raise HTTPException(status_code=500, detail="Job queue not initialized")

    # Build STRUCTURED character reference prompt for parse_prompt_data
    from models import Job, JobCreateRequest, JobInputs, WorkflowType

    # Use structured KEY: value format that workflow_builder.parse_prompt_data expects
    prompt = f"""STYLE: {book.art_style}
CHARACTER: {character.description}, {pose}
BACKGROUND: plain white background, neutral backdrop, no environment
COMPOSITION: character design reference sheet, single character only, centered, full body visible
{book.reference_prompt}"""

    job = Job(JobCreateRequest(
        job_type="character_ref",
        workflow_type=WorkflowType.CHARACTER_REF,
        priority="high",
        inputs=JobInputs(
            prompt=prompt,
            negative_prompt=book.negative_prompt + ", background, environment, scene, landscape, setting",
            width=1024,
            height=1024,
            steps=book.default_steps,
            cfg=book.default_cfg
        ),
        metadata={"book_id": book_id, "character_id": char_id}
    ))
    await _job_queue.submit(job)

    return {"job_id": job.job_id, "character_id": char_id}


@router.post("/books/{book_id}/characters/{char_id}/generate-pose")
async def generate_character_pose(
    book_id: str,
    char_id: str,
    request: CharacterPoseRequest,
    repos: Repositories = Depends(get_repos)
):
    """
    Generate a new pose/variation for a character using Img2Img.

    Note: IP-Adapter is NOT available for SD 3.5 Medium. We use high-denoise
    Img2Img with detailed prompts to create character variations while
    maintaining consistency through exact prompt matching.
    """
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    character = await repos.characters.get_by_id(char_id)
    if not character or character.book_id != book_id or not character.reference_image:
        raise HTTPException(status_code=404, detail="Character not found or no reference image")

    if not _job_queue:
        raise HTTPException(status_code=500, detail="Job queue not initialized")

    # Read reference image for Img2Img base
    ref_path = Path(storage.root) / "books" / book_id / "characters" / character.reference_image
    if not ref_path.exists():
        raise HTTPException(status_code=404, detail="Reference image not found")

    import base64
    with open(ref_path, "rb") as f:
        ref_base64 = base64.b64encode(f.read()).decode()

    from models import Job, JobCreateRequest, JobInputs, WorkflowType

    # Build detailed prompt for character variation via Img2Img
    # The key to consistency is using EXACT same character description
    prompt = f"""STYLE: {book.art_style}

CHARACTER (MUST MATCH EXACTLY):
{character.name}, {character.description}

NEW POSE:
{request.pose_description}

CONSISTENCY RULES:
- Same exact colors, patterns, and features as reference
- Same body proportions and style
- Only the pose and expression should change
- Maintain all distinctive character traits

{book.reference_prompt}"""

    # Use IMG2IMG workflow with high denoise (0.65-0.75) to allow pose change
    # while keeping character features
    job = Job(JobCreateRequest(
        job_type="character_variation",
        workflow_type=WorkflowType.IMG2IMG,
        priority="high",
        inputs=JobInputs(
            prompt=prompt,
            negative_prompt=f"{book.negative_prompt}, different character, wrong colors, inconsistent features",
            width=1024,
            height=1024,
            steps=book.default_steps or 35,
            cfg=book.default_cfg or 5.5,
            seed=request.seed,
            init_image=ref_base64,
            denoise=0.70  # High enough to change pose, low enough to keep features
        ),
        metadata={"book_id": book_id, "character_id": char_id, "pose": request.pose_description}
    ))
    await _job_queue.submit(job)

    return {"job_id": job.job_id, "character_id": char_id}


# ============================================================
# Pages
# ============================================================

@router.post("/books/{book_id}/pages/{page_number}/variations")
async def generate_page_variations(
    book_id: str,
    page_number: int,
    request: VariationRequest,
    repos: Repositories = Depends(get_repos)
):
    """Generate 4 variations for a specific page"""
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if not _job_queue:
        raise HTTPException(status_code=500, detail="Job queue not initialized")

    # Generate 4 seeds
    base_seed = request.base_seed or random.randint(0, 2**31 - 4)
    seeds = [base_seed, base_seed + 1, base_seed + 2, base_seed + 3]

    # Build STRUCTURED prompt for parse_prompt_data (KEY: value format)
    # SCENE ONLY - no characters
    full_prompt = f"""STYLE: {book.art_style}
SETTING: {request.prompt}
ATMOSPHERE: warm and inviting scene
COMPOSITION: open space for character placement
{book.reference_prompt}"""
    # Add character-blocking terms to negative prompt
    negative = (request.negative_prompt or book.negative_prompt) + ", character, person, people, child, animal, creature, figure"

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
                width=book.width,
                height=book.height,
                steps=book.default_steps,
                cfg=book.default_cfg,
                seed=seed,
                model=book.default_model
            ),
            metadata={"book_id": book_id, "page_number": page_number, "variation_seed": seed}
        ))
        await _job_queue.submit(job)
        job_ids.append(job.job_id)

    return VariationResponse(job_ids=job_ids, seeds=seeds)


@router.post("/books/{book_id}/pages")
async def create_page(
    book_id: str,
    number: int,
    name: str = "",
    repos: Repositories = Depends(get_repos)
):
    """Create a new page in the book"""
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    db_page = db_models.Page(
        id=uuid.uuid4().hex,
        book_id=book_id,
        name=name or f"Page {number}",
        page_number=number,
        width=book.width,
        height=book.height,
    )
    db_page = await repos.pages.create(db_page)

    return {"page": _page_to_dict(db_page)}


@router.put("/books/{book_id}/pages/{page_id}")
async def update_page(
    book_id: str,
    page_id: str,
    updates: dict,
    repos: Repositories = Depends(get_repos)
):
    """Update a page"""
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    page = await repos.pages.get_by_id(page_id)
    if not page or page.book_id != book_id:
        raise HTTPException(status_code=404, detail="Page not found")

    update_data = {}
    if "text" in updates:
        update_data["text_content"] = updates["text"]
    if "name" in updates:
        update_data["name"] = updates["name"]
    if "background" in updates:
        # Set background image path from asset ID
        asset = await repos.assets.get_by_id(updates["background"])
        if asset:
            update_data["image_path"] = asset.image_path

    if update_data:
        page = await repos.pages.update(page, update_data)

    return {"page": _page_to_dict(page)}


@router.delete("/books/{book_id}/pages/{page_id}")
async def delete_page(
    book_id: str,
    page_id: str,
    repos: Repositories = Depends(get_repos)
):
    """Delete a page from a book"""
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    page = await repos.pages.get_by_id(page_id)
    if not page or page.book_id != book_id:
        raise HTTPException(status_code=404, detail="Page not found")

    await repos.pages.delete(page)

    return {"success": True, "deleted_page_id": page_id}


@router.post("/books/{book_id}/pages/{page_id}/add-element")
async def add_page_element(
    book_id: str,
    page_id: str,
    element: PageElement,
    repos: Repositories = Depends(get_repos)
):
    """Add a character/prop to a page"""
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    page = await repos.pages.get_by_id(page_id)
    if not page or page.book_id != book_id:
        raise HTTPException(status_code=404, detail="Page not found")

    # Add element to overlays JSON
    overlays = page.overlays or []
    overlays.append(element.model_dump())

    page = await repos.pages.update(page, {"overlays": overlays})

    return {"page": _page_to_dict(page)}


# ============================================================
# Assets
# ============================================================

@router.get("/books/{book_id}/assets")
async def list_assets(
    book_id: str,
    asset_type: Optional[AssetType] = None,
    repos: Repositories = Depends(get_repos)
):
    """List assets in a book"""
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # get_by_book accepts optional asset_type filter
    assets = await repos.assets.get_by_book(
        book_id,
        asset_type=asset_type.value if asset_type else None
    )

    return {"assets": [_asset_to_dict(a) for a in assets]}


@router.get("/books/{book_id}/assets/{asset_id}/image")
async def get_asset_image(
    book_id: str,
    asset_id: str,
    repos: Repositories = Depends(get_repos)
):
    """Get an asset image file"""
    asset = await repos.assets.get_by_id(asset_id)
    if not asset or asset.book_id != book_id:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Use storage to get the full path
    path = Path(storage.root) / "books" / book_id / "assets" / asset.image_path
    if not path.exists():
        # Try direct path if image_path is already full
        path = Path(asset.image_path)
        if not path.exists():
            raise HTTPException(status_code=404, detail="Image file not found")

    return FileResponse(path, media_type="image/png")


# ============================================================
# Scene Composition
# ============================================================

@router.post("/books/{book_id}/pages/{page_id}/compose")
async def compose_scene(
    book_id: str,
    page_id: str,
    request: ComposeSceneRequest,
    repos: Repositories = Depends(get_repos)
):
    """Compose a final scene by combining background with characters/props"""
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    page = await repos.pages.get_by_id(page_id)
    if not page or page.book_id != book_id:
        raise HTTPException(status_code=404, detail="Page not found")

    if not _job_queue:
        raise HTTPException(status_code=500, detail="Job queue not initialized")

    # Get background asset
    bg_asset = await repos.assets.get_by_id(request.background_id)
    if not bg_asset:
        raise HTTPException(status_code=404, detail="Background asset not found")

    # Build prompt with elements
    element_descriptions = []
    for elem in request.elements:
        asset = await repos.assets.get_by_id(elem.asset_id)
        if asset:
            element_descriptions.append(f"{asset.name}: {asset.prompt[:100] if asset.prompt else asset.description}")

    # Read background image
    bg_path = Path(storage.root) / "books" / book_id / "assets" / bg_asset.image_path
    with open(bg_path, "rb") as f:
        bg_base64 = base64.b64encode(f.read()).decode()

    from models import Job, JobCreateRequest, JobInputs, WorkflowType

    # Build STRUCTURED prompt for parse_prompt_data (KEY: value format)
    prompt = f"""STYLE: {book.art_style}
SETTING: {bg_asset.prompt or 'scene background'}
ELEMENTS: {', '.join(element_descriptions) if element_descriptions else 'none specified'}
COMPOSITION: {request.prompt_additions or 'compose elements naturally into the scene'}
{book.reference_prompt}"""

    job = Job(JobCreateRequest(
        job_type="scene_compose",
        workflow_type=WorkflowType.FULL_PAGE,  # Could use inpaint in future
        priority="high",
        inputs=JobInputs(
            prompt=prompt,
            negative_prompt=book.negative_prompt,
            width=book.width,
            height=book.height,
            steps=book.default_steps,
            cfg=book.default_cfg
        ),
        metadata={
            "book_id": book_id,
            "page_id": page_id,
            "composition": True,
            "background_id": request.background_id,
            "element_ids": [e.asset_id for e in request.elements]
        }
    ))
    await _job_queue.submit(job)

    return {"job_id": job.job_id, "page_id": page_id}


@router.post("/books/{book_id}/pages/{page_id}/set-final")
async def set_page_final(
    book_id: str,
    page_id: str,
    job_id: str,
    repos: Repositories = Depends(get_repos)
):
    """Set a completed job's image as the final page image"""
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    page = await repos.pages.get_by_id(page_id)
    if not page or page.book_id != book_id:
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

    # Create final asset in database
    db_asset = db_models.Asset(
        id=uuid.uuid4().hex,
        book_id=book_id,
        name=f"page_{page.page_number}_final",
        asset_type="final",
        image_path="",  # Will be set after save
        prompt=job.inputs.prompt,
        seed=job.inputs.seed
    )

    # Save the image to storage and update path
    pydantic_asset = Asset(
        type=AssetType.FINAL,
        name=db_asset.name,
        filename="",
        prompt=job.inputs.prompt,
        seed=job.inputs.seed
    )
    saved_asset = storage.save_asset(book_id, pydantic_asset, image_data)
    db_asset.image_path = saved_asset.filename

    db_asset = await repos.assets.create(db_asset)

    # Update page
    await repos.pages.update(page, {
        "image_path": db_asset.image_path,
        "status": "complete"
    })

    return {"page": _page_to_dict(page), "asset": _asset_to_dict(db_asset)}


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


def _theme_to_dict(theme: db_models.CustomTheme) -> dict:
    """Convert a DB CustomTheme model to API response dict."""
    return {
        "id": theme.id,
        "name": theme.name,
        "source": theme.source,
        "reference_prompt": theme.reference_prompt,
        "art_style": theme.art_style,
        "analysis": theme.analysis or {},
        "original_text": theme.original_text,
        "reference_image_path": theme.reference_image_path,
        "created_at": theme.created_at.isoformat() if theme.created_at else None,
    }


@router.get("/themes")
async def list_custom_themes(repos: Repositories = Depends(get_repos)):
    """List all custom themes"""
    themes = await repos.themes.get_all()
    return {"themes": [_theme_to_dict(t) for t in themes]}


@router.get("/themes/{theme_id}")
async def get_custom_theme(theme_id: str, repos: Repositories = Depends(get_repos)):
    """Get a specific custom theme"""
    theme = await repos.themes.get_by_id(theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    return _theme_to_dict(theme)


@router.delete("/themes/{theme_id}")
async def delete_custom_theme(theme_id: str, repos: Repositories = Depends(get_repos)):
    """Delete a custom theme"""
    theme = await repos.themes.get_by_id(theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")

    # Delete reference image file if exists
    if theme.reference_image_path:
        path = Path(storage.root) / "themes" / theme.reference_image_path
        if path.exists():
            path.unlink()

    await repos.themes.delete(theme_id)
    return {"success": True}


@router.get("/themes/{theme_id}/image")
async def get_theme_reference_image(theme_id: str, repos: Repositories = Depends(get_repos)):
    """Get the reference image for a custom theme"""
    theme = await repos.themes.get_by_id(theme_id)
    if not theme or not theme.reference_image_path:
        raise HTTPException(status_code=404, detail="Theme image not found")

    path = Path(storage.root) / "themes" / theme.reference_image_path
    if not path.exists():
        raise HTTPException(status_code=404, detail="Theme image not found")

    return FileResponse(path, media_type="image/png")


@router.post("/themes/analyze-image", response_model=CustomThemeResponse)
async def analyze_image_for_theme(
    request: AnalyzeImageForThemeRequest,
    repos: Repositories = Depends(get_repos)
):
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

        # Save the reference image to disk
        image_data = base64.b64decode(request.image)
        theme_id = uuid.uuid4().hex
        image_filename = f"{theme_id}.png"
        themes_dir = Path(storage.root) / "themes"
        themes_dir.mkdir(parents=True, exist_ok=True)
        image_path = themes_dir / image_filename
        with open(image_path, "wb") as f:
            f.write(image_data)

        # Create the theme in database
        db_theme = db_models.CustomTheme(
            id=theme_id,
            name=request.name,
            source="image",
            reference_prompt=analysis_text,
            art_style=analysis.get("medium", "Custom Art Style"),
            analysis=analysis,
            original_text=request.additional_notes or None,
            reference_image_path=image_filename,
        )
        db_theme = await repos.themes.create(db_theme)

        # Generate a sample prompt
        preview_prompt = f"A friendly dragon playing in a garden, {db_theme.reference_prompt}"

        # Convert to Pydantic model for response
        pydantic_theme = CustomTheme(
            id=db_theme.id,
            name=db_theme.name,
            source=CustomThemeSource.IMAGE,
            reference_prompt=db_theme.reference_prompt,
            art_style=db_theme.art_style,
            analysis=db_theme.analysis or {},
            original_text=db_theme.original_text,
        )

        return CustomThemeResponse(
            success=True,
            theme=pydantic_theme,
            preview_prompt=preview_prompt
        )

    except Exception as e:
        logger.error(f"Error analyzing image for theme: {e}")
        return CustomThemeResponse(success=False, error=str(e))


@router.post("/themes/analyze-text", response_model=CustomThemeResponse)
async def analyze_text_for_theme(
    request: AnalyzeTextForThemeRequest,
    repos: Repositories = Depends(get_repos)
):
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

        # Create the theme in database
        db_theme = db_models.CustomTheme(
            id=uuid.uuid4().hex,
            name=request.name,
            source="text",
            reference_prompt=analysis_text,
            art_style=analysis.get("medium", "Custom Art Style"),
            analysis=analysis,
            original_text=request.description,
        )
        db_theme = await repos.themes.create(db_theme)

        preview_prompt = f"A friendly dragon playing in a garden, {db_theme.reference_prompt}"

        # Convert to Pydantic model for response
        pydantic_theme = CustomTheme(
            id=db_theme.id,
            name=db_theme.name,
            source=CustomThemeSource.TEXT,
            reference_prompt=db_theme.reference_prompt,
            art_style=db_theme.art_style,
            analysis=db_theme.analysis or {},
            original_text=db_theme.original_text,
        )

        return CustomThemeResponse(
            success=True,
            theme=pydantic_theme,
            preview_prompt=preview_prompt
        )

    except Exception as e:
        logger.error(f"Error analyzing text for theme: {e}")
        return CustomThemeResponse(success=False, error=str(e))


@router.post("/themes/analyze-hybrid", response_model=CustomThemeResponse)
async def analyze_hybrid_for_theme(
    request: AnalyzeHybridForThemeRequest,
    repos: Repositories = Depends(get_repos)
):
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

        # Save the reference image to disk
        image_data = base64.b64decode(request.image)
        theme_id = uuid.uuid4().hex
        image_filename = f"{theme_id}.png"
        themes_dir = Path(storage.root) / "themes"
        themes_dir.mkdir(parents=True, exist_ok=True)
        image_path = themes_dir / image_filename
        with open(image_path, "wb") as f:
            f.write(image_data)

        # Create the theme in database
        db_theme = db_models.CustomTheme(
            id=theme_id,
            name=request.name,
            source="hybrid",
            reference_prompt=analysis_text,
            art_style=analysis.get("medium", "Custom Art Style"),
            analysis=analysis,
            original_text=request.description,
            reference_image_path=image_filename,
        )
        db_theme = await repos.themes.create(db_theme)

        preview_prompt = f"A friendly dragon playing in a garden, {db_theme.reference_prompt}"

        # Convert to Pydantic model for response
        pydantic_theme = CustomTheme(
            id=db_theme.id,
            name=db_theme.name,
            source=CustomThemeSource.HYBRID,
            reference_prompt=db_theme.reference_prompt,
            art_style=db_theme.art_style,
            analysis=db_theme.analysis or {},
            original_text=db_theme.original_text,
        )

        return CustomThemeResponse(
            success=True,
            theme=pydantic_theme,
            preview_prompt=preview_prompt
        )

    except Exception as e:
        logger.error(f"Error analyzing hybrid input for theme: {e}")
        return CustomThemeResponse(success=False, error=str(e))


# ============================================================
# Production Image Editing - Inpainting
# ============================================================

@router.post("/books/{book_id}/inpaint")
async def inpaint_region(
    book_id: str,
    request: InpaintRequest,
    repos: Repositories = Depends(get_repos)
):
    """
    Inpaint (regenerate) a selected region of an image.
    Creates a mask from the selection coordinates and submits an inpaint job.
    """
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if not _job_queue:
        raise HTTPException(status_code=500, detail="Job queue not initialized")

    try:
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

        unique_id = str(uuid.uuid4())[:8]
        base_filename = f"inpaint_base_{unique_id}.png"
        mask_filename = f"inpaint_mask_{unique_id}.png"

        base_path = os.path.join(temp_dir, base_filename)
        mask_path = os.path.join(temp_dir, mask_filename)

        base_image.save(base_path, "PNG")
        mask.save(mask_path, "PNG")

        # Build prompt with book's art style
        full_prompt = f"{book.reference_prompt}\n\n{request.prompt}"
        negative = book.negative_prompt

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
                steps=book.default_steps,
                cfg=book.default_cfg,
                seed=seed,
                model=book.model
            ),
            prompt_data={
                "base_image": base_path,
                "mask_image": mask_path,
                "style": book.art_style,
                "subject": request.prompt,
                "placement": "in the selected region"
            },
            metadata={
                "book_id": book_id,
                "selection": request.selection.model_dump(),
                "original_prompt": request.prompt
            }
        ))

        await _job_queue.submit(job)

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
async def update_page_story(
    book_id: str,
    page_id: str,
    update: StoryModeUpdate,
    repos: Repositories = Depends(get_repos)
):
    """Update page text and title for story mode"""
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    page = await repos.pages.get_by_id(page_id)
    if not page or page.book_id != book_id:
        raise HTTPException(status_code=404, detail="Page not found")

    # Update page text and name
    updates = {"text": update.text}
    if update.title:
        updates["name"] = update.title

    await repos.pages.update(page, updates)

    return {"success": True, "page": _page_to_dict(page)}


@router.post("/books/{book_id}/export-cms")
async def export_book_to_cms(
    book_id: str,
    request: ExportCMSRequest,
    repos: Repositories = Depends(get_repos)
):
    """Export book to CMS-ready format (JSON/Markdown)"""
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Get pages for the book
    pages = await repos.pages.get_by_book(book_id)

    # Generate slug from title
    import re
    slug = re.sub(r'[^a-z0-9]+', '-', book.title.lower()).strip('-')

    # Build page content
    pages_content = []
    for page in pages:
        # Get the best available image for this page
        image_filename = page.image_path or ""

        pages_content.append(PageContent(
            page_number=page.page_number,
            title=page.name,
            text=page.text or "",
            image_filename=image_filename,
            image_alt=f"{book.title} - Page {page.page_number}"
        ))

    # Find cover image (first page or first background)
    cover_image = ""
    if pages_content and pages_content[0].image_filename:
        cover_image = pages_content[0].image_filename

    cms_export = CMSExport(
        book_id=book_id,
        title=book.title,
        description=book.description or "",
        author=request.author,
        art_style=book.art_style or "",
        pages=pages_content,
        slug=slug,
        tags=request.tags,
        cover_image=cover_image
    )

    # Save to disk (still uses storage for file operations)
    result = storage.save_cms_export(book_id, cms_export.model_dump(), request.export_format)

    return {
        "success": True,
        "export": cms_export.model_dump(),
        "files": result["files"],
        "export_path": result["export_path"]
    }


@router.get("/books/{book_id}/exports")
async def list_book_exports(
    book_id: str,
    repos: Repositories = Depends(get_repos)
):
    """List all CMS exports for a book"""
    book = await repos.books.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Still use storage for listing exports (file-based)
    return {"exports": storage.list_exports(book_id)}
