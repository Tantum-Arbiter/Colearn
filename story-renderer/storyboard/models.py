"""
Storyboard Creator - Data Models

Models for books, pages, assets, characters, and generation presets.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime
import uuid


class AssetType(str, Enum):
    CHARACTER = "character"
    PROP = "prop"
    BACKGROUND = "background"
    VARIATION = "variation"
    FINAL = "final"


class GenerationStatus(str, Enum):
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETE = "complete"
    FAILED = "failed"


# ============================================================
# Asset Models
# ============================================================

class Asset(BaseModel):
    """A saved image asset (character, prop, background, or variation)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    type: AssetType
    name: str
    description: str = ""
    filename: str  # Relative path from project root
    thumbnail: Optional[str] = None
    prompt: str = ""  # The prompt used to generate this
    seed: Optional[int] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    tags: List[str] = []
    metadata: Dict[str, Any] = {}


class Character(BaseModel):
    """A character with reference image for IP-Adapter consistency"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    description: str  # Visual description for prompts
    reference_image: str  # Path to reference image
    poses: List[Asset] = []  # Generated pose variations
    color_palette: List[str] = []  # Hex colors for consistency
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


# ============================================================
# Page Models
# ============================================================

class PageElement(BaseModel):
    """An element placed on a page (character, prop)"""
    asset_id: str
    x: float = 0.5  # Normalized position (0-1)
    y: float = 0.5
    scale: float = 1.0
    z_index: int = 0


class Page(BaseModel):
    """A page in the storybook"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    number: int
    name: str = ""
    background: Optional[Asset] = None
    elements: List[PageElement] = []
    final_image: Optional[Asset] = None
    text: str = ""
    status: GenerationStatus = GenerationStatus.PENDING


# ============================================================
# Book/Project Models
# ============================================================

class GenerationPreset(BaseModel):
    """Preset rules for image generation"""
    name: str
    art_style: str
    reference_prompt: str  # Full style description prepended to all prompts
    negative_prompt: str = ""
    width: int = 1024
    height: int = 704
    steps: int = 28
    cfg: float = 4.5
    model: Optional[str] = None


class Book(BaseModel):
    """A storybook within a project"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    title: str
    description: str = ""
    preset: GenerationPreset
    pages: List[Page] = []
    characters: List[Character] = []
    assets: List[Asset] = []  # Props, backgrounds, saved variations
    album: List[Asset] = []  # "Save for later" images
    cover_image: Optional[str] = None  # Path to cover image
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class Project(BaseModel):
    """A project containing multiple books (e.g., a book series)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    description: str = ""
    books: List[str] = []  # List of book IDs
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


# ============================================================
# API Request/Response Models
# ============================================================

class CreateProjectRequest(BaseModel):
    name: str
    description: str = ""


class CreateBookRequest(BaseModel):
    title: str
    description: str = ""
    project_id: Optional[str] = None  # Optional: attach to a project
    preset_name: str = "friendly-dragon"  # Use a preset template
    custom_preset: Optional[GenerationPreset] = None


class GenerationMode(str, Enum):
    """Type of content being generated"""
    SCENE = "scene"        # Empty environment/background (full image, no characters)
    CHARACTER = "character"  # Isolated character on transparent/simple background
    OBJECT = "object"      # Isolated prop/object on transparent/simple background
    SKETCH = "sketch"      # Sketch-to-image conversion


class VariationRequest(BaseModel):
    """Request to generate variations"""
    prompt: str
    negative_prompt: str = ""
    base_seed: Optional[int] = None  # If provided, uses seed, seed+1, seed+2, seed+3
    preset_override: Optional[Dict[str, Any]] = None
    width: Optional[int] = None   # Override latent width (for EmptySD3LatentImage)
    height: Optional[int] = None  # Override latent height (for EmptySD3LatentImage)
    generation_mode: GenerationMode = GenerationMode.SCENE  # What type of content
    character_prompt: Optional[str] = None  # Character definition to inject (only for character mode)
    num_variations: int = 4  # Number of variations to generate (1-12)
    pose_name: Optional[str] = None  # Name of pose for pose-based generation


class VariationResponse(BaseModel):
    """Response with 4 variations"""
    job_ids: List[str]
    seeds: List[int]
    workspace_session: Optional[str] = None  # Auto-save session ID
    workspace_date: Optional[str] = None  # Date folder (YYYY-MM-DD)


class CharacterPoseRequest(BaseModel):
    """Request to generate a character pose variation"""
    character_id: str
    pose_description: str  # e.g., "sitting, looking left, happy"
    seed: Optional[int] = None


class ComposeSceneRequest(BaseModel):
    """Request to compose a final scene"""
    background_id: str
    elements: List[PageElement]
    prompt_additions: str = ""  # Additional prompt context


# ============================================================
# Custom Theme Models
# ============================================================

class CustomThemeSource(str, Enum):
    """Source type for custom theme creation"""
    TEXT = "text"
    IMAGE = "image"
    HYBRID = "hybrid"  # Both text and image


class CustomTheme(BaseModel):
    """A user-created custom art style theme"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    source: CustomThemeSource

    # The generated structured prompt
    reference_prompt: str
    negative_prompt: str = ""
    art_style: str  # Short description

    # Original inputs for reference
    original_text: Optional[str] = None
    original_image_path: Optional[str] = None  # Path to uploaded reference image

    # Analysis details from vision model
    analysis: Optional[Dict[str, str]] = None  # medium, line_work, colors, etc.

    # Generation settings
    width: int = 1024
    height: int = 704
    steps: int = 28
    cfg: float = 5.0

    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class AnalyzeImageForThemeRequest(BaseModel):
    """Request to analyze an image and extract art style"""
    image: str  # Base64 encoded image
    name: str = "Custom Theme"
    additional_notes: str = ""  # User's notes about what they want


class AnalyzeTextForThemeRequest(BaseModel):
    """Request to convert a text description to a structured theme"""
    description: str  # User's freeform description
    name: str = "Custom Theme"


class AnalyzeHybridForThemeRequest(BaseModel):
    """Request to analyze both image and text for theme"""
    image: str  # Base64 encoded image
    description: str  # User's additional text guidance
    name: str = "Custom Theme"


class CustomThemeResponse(BaseModel):
    """Response containing the generated custom theme"""
    success: bool
    theme: Optional[CustomTheme] = None
    error: Optional[str] = None
    preview_prompt: Optional[str] = None  # Sample prompt using the theme


# ============================================================
# Inpainting Models
# ============================================================

class SelectionRegion(BaseModel):
    """A selected region on an image (in pixels)"""
    x: float
    y: float
    width: float
    height: float


class InpaintRequest(BaseModel):
    """Request to inpaint (regenerate) a region of an image"""
    base_image: str  # Base64 encoded image
    selection: SelectionRegion  # Region to regenerate
    prompt: str  # What to generate in the selected region
    image_width: int  # Original image width
    image_height: int  # Original image height
    preset_id: Optional[str] = None  # Optional preset override
    seed: Optional[int] = None


class InpaintResponse(BaseModel):
    """Response from inpainting"""
    success: bool
    job_id: Optional[str] = None
    error: Optional[str] = None


# ============================================================
# CMS Export Models
# ============================================================

class PageContent(BaseModel):
    """Content for a single page in CMS export"""
    page_number: int
    title: str = ""
    text: str = ""
    image_filename: str = ""
    image_alt: str = ""
    layout: str = "text-below"  # text-below, text-above, text-left, text-right


class CMSExport(BaseModel):
    """Full CMS export for a storybook"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    book_id: str
    title: str
    description: str = ""
    author: str = ""
    art_style: str = ""
    pages: List[PageContent] = []
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    version: str = "1.0"

    # Metadata for CMS integration
    slug: str = ""
    tags: List[str] = []
    cover_image: str = ""
    language: str = "en"


class StoryModeUpdate(BaseModel):
    """Request to update page text in story mode"""
    page_id: str
    text: str
    title: str = ""
    layout: str = "text-below"


class ExportCMSRequest(BaseModel):
    """Request to export book to CMS format"""
    author: str = ""
    tags: List[str] = []
    export_format: str = "json"  # json, markdown, both
