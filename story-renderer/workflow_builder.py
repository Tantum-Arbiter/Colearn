"""
Workflow Builder - Creates ComfyUI workflow JSON from job inputs

Supports five workflow types for the storybook production pipeline:
1. full_page - Single-pass page generation (ideation/thumbnails)
2. background - Background-only generation
3. character_ref - Character reference sheet generation
4. inpaint - Subject insertion via inpainting
5. ipadapter - Character-conditioned page generation using IP-Adapter

Production order:
1. Generate approved character reference images (character_ref)
2. Generate the page background (background)
3. Insert subjects one at a time (inpaint) OR use ipadapter for character-conditioned generation
"""
import random
from typing import Optional
from models import JobInputs
from config import config


# ============================================================
# WORKFLOW TYPE: full_page (SETTING ONLY - no characters)
# ============================================================

FULL_PAGE_POSITIVE = """Create a premium children's storybook scene illustration.

STYLE:
{style}

SETTING:
{setting}

ATMOSPHERE:
{atmosphere}

PROPS AND DETAILS:
{props}

COMPOSITION:
{composition}

RULES:
- setting and environment only
- NO characters, NO people, NO animals
- leave clear space for character placement
- maintain beautiful lighting, depth, and atmosphere
- consistent with the specified art style
- no text, no watermark, no logo"""

FULL_PAGE_NEGATIVE = """character, person, people, child, boy, girl, animal, creature, figure, rabbit, deer, fox, bird, photorealistic, 3d render, text, watermark, logo"""


# ============================================================
# WORKFLOW TYPE: background (ENVIRONMENT ONLY - no characters)
# ============================================================

BACKGROUND_POSITIVE = """Create a premium children's picture-book background.

STYLE:
{style}

BACKGROUND:
{background}

LIGHTING:
{lighting}

COMPOSITION:
{composition}

RULES:
- background and environment only
- NO characters, NO people, NO animals
- leave clean readable open space for character placement
- maintain beautiful lighting, depth, and atmosphere
- consistent with the specified art style
- no text, no watermark, no logo"""

BACKGROUND_NEGATIVE = """character, person, people, child, boy, girl, animal, creature, figure, rabbit, deer, fox, bird, photorealistic, 3d render, text, watermark, logo"""


# ============================================================
# WORKFLOW TYPE: character_ref (storybook_character_reference_api.json)
# ============================================================

CHARACTER_REF_POSITIVE = """Create a character reference sheet for a children's storybook.

STYLE:
{style}

CHARACTER:
{character}

POSE:
{pose}

BACKGROUND:
Plain white or neutral solid color backdrop only, NO environment, NO scene, NO landscape, NO setting, NO props, completely isolated character on empty background.

RULES:
- ONLY ONE character, no scene, no environment
- Character isolated on plain background
- No props, no floor details, no sky
- exactly one subject only
- full body visible if possible
- clear silhouette
- no extra props unless explicitly requested
- no extra animals or background characters
- no text, no watermark, no logo"""

CHARACTER_REF_NEGATIVE = """background, environment, scene, landscape, forest, sky, grass, floor, ground, setting, props, furniture, trees, buildings, nature, outdoor, indoor, two heads, multiple heads, extra head, three ears, extra ears, extra eyes, extra tail, duplicate subject, extra limbs, malformed anatomy, mutation, deformed, cropped body, cut off feet, cut off head, cluttered background, multiple characters, photorealistic, 3d render, text, watermark, logo"""


# ============================================================
# WORKFLOW TYPE: prop (ISOLATED OBJECT - no characters, no background)
# ============================================================

PROP_POSITIVE = """Create a single prop/object illustration for a children's storybook.

STYLE:
{style}

OBJECT:
{prop}

DETAILS:
{details}

BACKGROUND:
Plain white background, solid neutral color, completely empty backdrop, no environment, no scene, no shadows on ground.

RULES:
- EXACTLY ONE object/prop only
- Object fully visible, not cropped
- Plain white or light gray background ONLY
- NO environment, NO scene, NO characters
- Object isolated for easy extraction
- Consistent with the specified art style
- No text, no watermark, no logo"""

PROP_NEGATIVE = """background, environment, scene, landscape, character, person, people, animal, hand holding, multiple objects, group, pile, collection, photorealistic, 3d render, text, watermark, logo"""


# ============================================================
# WORKFLOW TYPE: inpaint (storybook_subject_insert_inpaint_api.json)
# ============================================================

INPAINT_POSITIVE = """Insert exactly one subject into the masked region of the existing children's storybook page.

STYLE:
{style}

SUBJECT:
{subject}

PLACEMENT:
{placement}

CONSISTENCY REFERENCE:
Match the existing page's lighting, palette, brush texture, scale, and perspective. The new subject must belong naturally in the scene.

RULES:
- modify only the masked area
- exactly one subject in the masked area
- do not create extra subjects
- do not change unmasked areas
- keep the result suitable for a premium children's picture book
- no text, no watermark, no logo"""

INPAINT_NEGATIVE = """two heads, multiple heads, extra head, three ears, extra ears, extra eyes, extra tail, fused bodies, merged subject, duplicate subject, extra limbs, malformed anatomy, mutation, deformed, incorrect perspective, wrong scale, photorealistic, 3d render, text, watermark, logo"""


# ============================================================
# WORKFLOW TYPE: ipadapter (character-conditioned page generation)
# ============================================================
# Uses IP-Adapter to condition generation on character reference images
# This dramatically improves character consistency across pages

IPADAPTER_POSITIVE = """Create one cohesive premium children's storybook illustration.

STYLE:
{style}

SCENE:
{scene}

CHARACTER CONSISTENCY:
The character in this image MUST match the reference character image exactly.
Same face, same body proportions, same colors, same clothing/fur pattern.

COMPOSITION:
{composition}

RULES:
- the character must look identical to the reference image
- maintain the exact same art style as the reference
- keep anatomically correct proportions
- single cohesive scene with clear composition
- no text, no watermark, no logo"""

IPADAPTER_NEGATIVE = """different character, wrong character, different face, different colors, different proportions, two heads, multiple heads, extra head, three ears, extra ears, fused bodies, conjoined characters, merged subject, duplicate character, extra arms, extra legs, extra fingers, extra eyes, extra tail, malformed hands, malformed paws, distorted anatomy, mutation, deformed, photorealistic, 3d render, text, watermark, logo"""


def get_model_name(model: Optional[str] = None) -> str:
    """Get model filename with .safetensors extension"""
    model = model or config.DEFAULT_MODEL
    if not model.endswith(".safetensors"):
        model = f"{model}.safetensors"
    return model


def build_full_page_workflow(inputs: JobInputs, prompt_data: dict) -> dict:
    """
    Build workflow for SETTING/SCENE generation only.
    No characters - use this to build the environment first.
    Optimized for SD 3.5 Medium: CFG 5.0-6.0, Steps 30-40
    """
    seed = inputs.seed if inputs.seed is not None else random.randint(0, 2**32 - 1)
    model = get_model_name(inputs.model)

    # Fill in prompt template - SETTING ONLY, no characters
    full_prompt = FULL_PAGE_POSITIVE.format(
        style=prompt_data.get("style", ""),  # REQUIRED - user must provide
        setting=prompt_data.get("setting", prompt_data.get("background", "")),
        atmosphere=prompt_data.get("atmosphere", "warm and inviting"),
        props=prompt_data.get("props", prompt_data.get("objects", "")),
        composition=prompt_data.get("composition", "open center for character placement")
    )

    # SD 3.5 Medium optimized defaults
    return {
        "1": {
            "inputs": {
                "seed": seed,
                "steps": inputs.steps or 35,
                "cfg": inputs.cfg or 5.5,
                "sampler_name": "euler",
                "scheduler": "sgm_uniform",
                "denoise": 1,
                "model": ["3", 0],
                "positive": ["5", 0],
                "negative": ["6", 0],
                "latent_image": ["7", 0]
            },
            "class_type": "KSampler",
            "_meta": {"title": "KSampler"}
        },
        "3": {
            "inputs": {"ckpt_name": model},
            "class_type": "CheckpointLoaderSimple",
            "_meta": {"title": "Load Checkpoint"}
        },
        "4": {
            "inputs": {"samples": ["1", 0], "vae": ["3", 2]},
            "class_type": "VAEDecode",
            "_meta": {"title": "VAE Decode"}
        },
        "5": {
            "inputs": {"text": full_prompt, "clip": ["3", 1]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "Positive Prompt"}
        },
        "6": {
            "inputs": {"text": inputs.negative_prompt or FULL_PAGE_NEGATIVE, "clip": ["3", 1]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "Negative Prompt"}
        },
        "7": {
            "inputs": {
                "width": inputs.width or 1024,
                "height": inputs.height or 704,
                "batch_size": inputs.batch_size or 1
            },
            "class_type": "EmptySD3LatentImage",
            "_meta": {"title": "EmptySD3LatentImage"}
        },
        "8": {
            "inputs": {"filename_prefix": "storybook_page", "images": ["4", 0]},
            "class_type": "SaveImage",
            "_meta": {"title": "Save Image"}
        }
    }


def build_background_workflow(inputs: JobInputs, prompt_data: dict) -> dict:
    """
    Build workflow for ENVIRONMENT/BACKGROUND only.
    No characters - use this to build clean backgrounds for compositing.
    """
    seed = inputs.seed if inputs.seed is not None else random.randint(0, 2**32 - 1)
    model = get_model_name(inputs.model)

    full_prompt = BACKGROUND_POSITIVE.format(
        style=prompt_data.get("style", ""),  # REQUIRED - user must provide
        background=prompt_data.get("background", ""),
        lighting=prompt_data.get("lighting", "soft natural lighting"),
        composition=prompt_data.get("composition", "open center for character placement")
    )

    return {
        "1": {
            "inputs": {
                "seed": seed,
                "steps": inputs.steps or 24,
                "cfg": inputs.cfg or 4.5,
                "sampler_name": "euler",
                "scheduler": "sgm_uniform",
                "denoise": 1,
                "model": ["3", 0],
                "positive": ["5", 0],
                "negative": ["6", 0],
                "latent_image": ["7", 0]
            },
            "class_type": "KSampler",
            "_meta": {"title": "KSampler"}
        },
        "3": {
            "inputs": {"ckpt_name": model},
            "class_type": "CheckpointLoaderSimple",
            "_meta": {"title": "Load Checkpoint"}
        },
        "4": {
            "inputs": {"samples": ["1", 0], "vae": ["3", 2]},
            "class_type": "VAEDecode",
            "_meta": {"title": "VAE Decode"}
        },
        "5": {
            "inputs": {"text": full_prompt, "clip": ["3", 1]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "Positive Prompt"}
        },
        "6": {
            "inputs": {"text": BACKGROUND_NEGATIVE, "clip": ["3", 1]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "Negative Prompt"}
        },
        "7": {
            "inputs": {
                "width": inputs.width or 1024,
                "height": inputs.height or 704,
                "batch_size": 1
            },
            "class_type": "EmptySD3LatentImage",
            "_meta": {"title": "EmptySD3LatentImage"}
        },
        "8": {
            "inputs": {"filename_prefix": "storybook_background", "images": ["4", 0]},
            "class_type": "SaveImage",
            "_meta": {"title": "Save Image"}
        }
    }


def build_character_ref_workflow(inputs: JobInputs, prompt_data: dict) -> dict:
    """
    Build workflow for character reference sheet generation.
    Uses the SAME style as the scene for consistency.
    Optimized for SD 3.5 Medium: CFG 5.0-6.0, Steps 30-40
    """
    seed = inputs.seed if inputs.seed is not None else random.randint(0, 2**32 - 1)
    model = get_model_name(inputs.model)

    # Character uses SAME style as scene for consistency
    full_prompt = CHARACTER_REF_POSITIVE.format(
        style=prompt_data.get("style", ""),  # REQUIRED - must match scene style
        character=prompt_data.get("character", ""),
        pose=prompt_data.get("pose", "standing, three-quarter view")
    )

    # SD 3.5 Medium optimized defaults
    return {
        "1": {
            "inputs": {
                "seed": seed,
                "steps": inputs.steps or 35,
                "cfg": inputs.cfg or 5.5,
                "sampler_name": "euler",
                "scheduler": "sgm_uniform",
                "denoise": 1,
                "model": ["3", 0],
                "positive": ["5", 0],
                "negative": ["6", 0],
                "latent_image": ["7", 0]
            },
            "class_type": "KSampler",
            "_meta": {"title": "KSampler"}
        },
        "3": {
            "inputs": {"ckpt_name": model},
            "class_type": "CheckpointLoaderSimple",
            "_meta": {"title": "Load Checkpoint"}
        },
        "4": {
            "inputs": {"samples": ["1", 0], "vae": ["3", 2]},
            "class_type": "VAEDecode",
            "_meta": {"title": "VAE Decode"}
        },
        "5": {
            "inputs": {"text": full_prompt, "clip": ["3", 1]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "Positive Prompt"}
        },
        "6": {
            "inputs": {"text": CHARACTER_REF_NEGATIVE, "clip": ["3", 1]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "Negative Prompt"}
        },
        "7": {
            "inputs": {
                "width": 832,  # Portrait orientation for character refs
                "height": 1216,
                "batch_size": 1
            },
            "class_type": "EmptySD3LatentImage",
            "_meta": {"title": "EmptySD3LatentImage"}
        },
        "8": {
            "inputs": {"filename_prefix": "storybook_character_ref", "images": ["4", 0]},
            "class_type": "SaveImage",
            "_meta": {"title": "Save Image"}
        }
    }


def build_prop_workflow(inputs: JobInputs, prompt_data: dict) -> dict:
    """
    Build workflow for isolated prop/object generation.
    Props are generated on plain white backgrounds for easy extraction.
    """
    seed = inputs.seed if inputs.seed is not None else random.randint(0, 2**32 - 1)
    model = get_model_name(inputs.model)

    full_prompt = PROP_POSITIVE.format(
        style=prompt_data.get("style", ""),
        prop=prompt_data.get("prop", prompt_data.get("object", "")),
        details=prompt_data.get("details", "detailed, high quality")
    )

    return {
        "1": {
            "inputs": {
                "seed": seed,
                "steps": inputs.steps or 24,
                "cfg": inputs.cfg or 5.0,
                "sampler_name": "euler",
                "scheduler": "sgm_uniform",
                "denoise": 1,
                "model": ["3", 0],
                "positive": ["5", 0],
                "negative": ["6", 0],
                "latent_image": ["7", 0]
            },
            "class_type": "KSampler",
            "_meta": {"title": "KSampler"}
        },
        "3": {
            "inputs": {"ckpt_name": model},
            "class_type": "CheckpointLoaderSimple",
            "_meta": {"title": "Load Checkpoint"}
        },
        "4": {
            "inputs": {"samples": ["1", 0], "vae": ["3", 2]},
            "class_type": "VAEDecode",
            "_meta": {"title": "VAE Decode"}
        },
        "5": {
            "inputs": {"text": full_prompt, "clip": ["3", 1]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "Positive Prompt"}
        },
        "6": {
            "inputs": {"text": PROP_NEGATIVE, "clip": ["3", 1]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "Negative Prompt"}
        },
        "7": {
            "inputs": {
                "width": 768,  # Square for props
                "height": 768,
                "batch_size": 1
            },
            "class_type": "EmptySD3LatentImage",
            "_meta": {"title": "EmptySD3LatentImage"}
        },
        "8": {
            "inputs": {"filename_prefix": "storybook_prop", "images": ["4", 0]},
            "class_type": "SaveImage",
            "_meta": {"title": "Save Image"}
        }
    }


def build_inpaint_workflow(inputs: JobInputs, prompt_data: dict) -> dict:
    """
    Build workflow for subject insertion via inpainting.
    Requires base_image and mask_image paths in prompt_data.

    This is the PRIMARY composition method for SD 3.5 Medium since
    IP-Adapter is not available. Use this instead.

    The mask should be a grayscale or RGBA PNG where white = inpaint area.
    Uses ImageToMask to extract the mask channel properly for VAEEncodeForInpaint.
    Optimized for SD 3.5 Medium: CFG 5.0-6.0, Steps 30-40
    """
    seed = inputs.seed if inputs.seed is not None else random.randint(0, 2**32 - 1)
    model = get_model_name(inputs.model)

    base_image = prompt_data.get("base_image", "page_background.png")
    mask_image = prompt_data.get("mask_image", "mask.png")

    # Inpaint uses SAME style as existing scene
    full_prompt = INPAINT_POSITIVE.format(
        style=prompt_data.get("style", ""),  # REQUIRED - must match scene style
        subject=prompt_data.get("subject", ""),
        placement=prompt_data.get("placement", "naturally integrated into the scene")
    )

    # Node structure:
    # 1: CheckpointLoaderSimple
    # 2: LoadImage (base page)
    # 3: LoadImage (mask image)
    # 4: ImageToMask (convert mask image to proper mask tensor)
    # 5: CLIPTextEncode (positive)
    # 6: CLIPTextEncode (negative)
    # 7: VAEEncodeForInpaint
    # 8: KSampler
    # 9: VAEDecode
    # 10: SaveImage

    return {
        "1": {
            "inputs": {"ckpt_name": model},
            "class_type": "CheckpointLoaderSimple",
            "_meta": {"title": "Load Checkpoint"}
        },
        "2": {
            "inputs": {"image": base_image},
            "class_type": "LoadImage",
            "_meta": {"title": "Load Base Page"}
        },
        "3": {
            "inputs": {"image": mask_image},
            "class_type": "LoadImage",
            "_meta": {"title": "Load Mask Image"}
        },
        "4": {
            "inputs": {
                "channel": "alpha",
                "image": ["3", 0]
            },
            "class_type": "ImageToMask",
            "_meta": {"title": "Extract Mask from Alpha"}
        },
        "5": {
            "inputs": {"text": full_prompt, "clip": ["1", 1]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "Positive Prompt"}
        },
        "6": {
            "inputs": {"text": INPAINT_NEGATIVE, "clip": ["1", 1]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "Negative Prompt"}
        },
        "7": {
            "inputs": {
                "pixels": ["2", 0],
                "vae": ["1", 2],
                "mask": ["4", 0],
                "grow_mask_by": prompt_data.get("grow_mask_by", 16)
            },
            "class_type": "VAEEncodeForInpaint",
            "_meta": {"title": "VAE Encode For Inpaint"}
        },
        "8": {
            "inputs": {
                "seed": seed,
                "steps": inputs.steps or 35,
                "cfg": inputs.cfg or 5.5,
                "sampler_name": "euler",
                "scheduler": "sgm_uniform",
                "denoise": prompt_data.get("denoise", 0.85),
                "model": ["1", 0],
                "positive": ["5", 0],
                "negative": ["6", 0],
                "latent_image": ["7", 0]
            },
            "class_type": "KSampler",
            "_meta": {"title": "KSampler"}
        },
        "9": {
            "inputs": {"samples": ["8", 0], "vae": ["1", 2]},
            "class_type": "VAEDecode",
            "_meta": {"title": "VAE Decode"}
        },
        "10": {
            "inputs": {"filename_prefix": "storybook_inpaint_subject", "images": ["9", 0]},
            "class_type": "SaveImage",
            "_meta": {"title": "Save Image"}
        }
    }


# ============================================================
# WORKFLOW TYPE: img2img (variation/refinement from existing image)
# ============================================================

IMG2IMG_POSITIVE = """Refine this children's storybook illustration while maintaining exact composition.

STYLE:
{style}

CHANGES:
{changes}

RULES:
- maintain the exact same composition and layout
- keep all characters in the same positions
- preserve the color palette
- only apply the requested style/detail changes
- no text, no watermark, no logo"""

IMG2IMG_NEGATIVE = """different composition, different layout, different characters, moved subjects, different pose, photorealistic, 3d render, text, watermark, logo"""


def build_img2img_workflow(inputs: JobInputs, prompt_data: dict) -> dict:
    """
    Build workflow for img2img variations/refinements.

    Use this to make small changes while preserving composition:
    - Style refinements (denoise 0.2-0.4)
    - Color adjustments (denoise 0.3-0.5)
    - Detail enhancement (denoise 0.4-0.6)

    Required in prompt_data:
    - source_image: filename of image to refine
    - denoise: strength of changes (0.0-1.0, lower = more similar)
    """
    seed = inputs.seed if inputs.seed is not None else random.randint(0, 2**32 - 1)
    model = get_model_name(inputs.model)

    source_image = prompt_data.get("source_image", "source.png")
    denoise = prompt_data.get("denoise", 0.35)  # Low default for subtle changes

    # Img2img uses SAME style as source image
    full_prompt = IMG2IMG_POSITIVE.format(
        style=prompt_data.get("style", ""),  # REQUIRED - must match scene style
        changes=prompt_data.get("changes", "")
    )

    # Detect if using SD3 model - use optimized settings for SD 3.5 Medium
    is_sd3 = "sd3" in model.lower()
    scheduler = "sgm_uniform" if is_sd3 else "normal"
    sampler = "euler" if is_sd3 else "dpmpp_2m_sde"
    # SD 3.5 Medium optimal: CFG 5.0-6.0, Steps 30-40
    cfg = inputs.cfg or (5.5 if is_sd3 else 7.0)
    steps = inputs.steps or (30 if is_sd3 else 24)

    return {
        "1": {
            "inputs": {"ckpt_name": model},
            "class_type": "CheckpointLoaderSimple",
            "_meta": {"title": "Load Checkpoint"}
        },
        "2": {
            "inputs": {"image": source_image},
            "class_type": "LoadImage",
            "_meta": {"title": "Load Source Image"}
        },
        "3": {
            "inputs": {"pixels": ["2", 0], "vae": ["1", 2]},
            "class_type": "VAEEncode",
            "_meta": {"title": "VAE Encode"}
        },
        "4": {
            "inputs": {"text": full_prompt, "clip": ["1", 1]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "Positive Prompt"}
        },
        "5": {
            "inputs": {"text": IMG2IMG_NEGATIVE, "clip": ["1", 1]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "Negative Prompt"}
        },
        "6": {
            "inputs": {
                "seed": seed,
                "steps": steps,
                "cfg": cfg,
                "sampler_name": sampler,
                "scheduler": scheduler,
                "denoise": denoise,
                "model": ["1", 0],
                "positive": ["4", 0],
                "negative": ["5", 0],
                "latent_image": ["3", 0]
            },
            "class_type": "KSampler",
            "_meta": {"title": "KSampler"}
        },
        "7": {
            "inputs": {"samples": ["6", 0], "vae": ["1", 2]},
            "class_type": "VAEDecode",
            "_meta": {"title": "VAE Decode"}
        },
        "8": {
            "inputs": {"filename_prefix": "storybook_img2img", "images": ["7", 0]},
            "class_type": "SaveImage",
            "_meta": {"title": "Save Image"}
        }
    }


# ============================================================
# WORKFLOW TYPE: controlnet_lineart (structure-preserving generation)
# ============================================================

CONTROLNET_POSITIVE = """Create a children's storybook illustration following the exact structure provided.

STYLE:
{style}

SCENE:
{scene}

RULES:
- follow the lineart/structure guide exactly
- maintain all poses and positions from the reference
- apply the art style while preserving composition
- no text, no watermark, no logo"""

CONTROLNET_NEGATIVE = """different pose, different composition, different layout, anatomical errors, extra limbs, deformed, photorealistic, 3d render, text, watermark, logo"""


def build_controlnet_workflow(inputs: JobInputs, prompt_data: dict) -> dict:
    """
    Build workflow for ControlNet structure-preserving generation.

    Use this when you want to:
    - Change style while keeping exact composition
    - Regenerate with different colors but same poses
    - Convert sketches to full illustrations

    Required in prompt_data:
    - control_image: filename of structure reference (lineart, canny, depth)
    - controlnet_type: "lineart", "canny", or "depth"
    - strength: ControlNet strength (0.0-1.0, default 0.85)
    """
    seed = inputs.seed if inputs.seed is not None else random.randint(0, 2**32 - 1)
    model = get_model_name(inputs.model)

    control_image = prompt_data.get("control_image", "control.png")
    controlnet_type = prompt_data.get("controlnet_type", "lineart")
    strength = prompt_data.get("strength", 0.85)

    # ControlNet uses SAME style as the scene
    full_prompt = CONTROLNET_POSITIVE.format(
        style=prompt_data.get("style", ""),  # REQUIRED - must match scene style
        scene=prompt_data.get("scene", "")
    )

    # ControlNet model mapping (user needs these installed in ComfyUI)
    controlnet_models = {
        "lineart": "control_v11p_sd15_lineart.safetensors",
        "canny": "control_v11p_sd15_canny.safetensors",
        "depth": "control_v11f1p_sd15_depth.safetensors",
        "softedge": "control_v11p_sd15_softedge.safetensors"
    }
    controlnet_model = controlnet_models.get(controlnet_type, controlnet_models["lineart"])

    # Detect if using SD3 model - use optimized settings for SD 3.5 Medium
    # NOTE: ControlNet is NOT available for SD 3.5 Medium (only SD 3.5 Large)
    is_sd3 = "sd3" in model.lower()
    latent_class = "EmptySD3LatentImage" if is_sd3 else "EmptyLatentImage"
    scheduler = "sgm_uniform" if is_sd3 else "normal"
    sampler = "euler" if is_sd3 else "dpmpp_2m_sde"
    # SD 3.5 Medium optimal: CFG 5.0-6.0, Steps 30-40
    cfg = inputs.cfg or (5.5 if is_sd3 else 7.0)
    steps = inputs.steps or (35 if is_sd3 else 24)

    return {
        "1": {
            "inputs": {"ckpt_name": model},
            "class_type": "CheckpointLoaderSimple",
            "_meta": {"title": "Load Checkpoint"}
        },
        "2": {
            "inputs": {"control_net_name": controlnet_model},
            "class_type": "ControlNetLoader",
            "_meta": {"title": "Load ControlNet"}
        },
        "3": {
            "inputs": {"image": control_image},
            "class_type": "LoadImage",
            "_meta": {"title": "Load Control Image"}
        },
        "4": {
            "inputs": {"text": full_prompt, "clip": ["1", 1]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "Positive Prompt"}
        },
        "5": {
            "inputs": {"text": CONTROLNET_NEGATIVE, "clip": ["1", 1]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "Negative Prompt"}
        },
        "6": {
            "inputs": {
                "strength": strength,
                "conditioning": ["4", 0],
                "control_net": ["2", 0],
                "image": ["3", 0]
            },
            "class_type": "ControlNetApply",
            "_meta": {"title": "Apply ControlNet"}
        },
        "7": {
            "inputs": {
                "width": inputs.width or 1024,
                "height": inputs.height or 704,
                "batch_size": 1
            },
            "class_type": latent_class,
            "_meta": {"title": "Empty Latent"}
        },
        "8": {
            "inputs": {
                "seed": seed,
                "steps": steps,
                "cfg": cfg,
                "sampler_name": sampler,
                "scheduler": scheduler,
                "denoise": 1.0,
                "model": ["1", 0],
                "positive": ["6", 0],
                "negative": ["5", 0],
                "latent_image": ["7", 0]
            },
            "class_type": "KSampler",
            "_meta": {"title": "KSampler"}
        },
        "9": {
            "inputs": {"samples": ["8", 0], "vae": ["1", 2]},
            "class_type": "VAEDecode",
            "_meta": {"title": "VAE Decode"}
        },
        "10": {
            "inputs": {"filename_prefix": "storybook_controlnet", "images": ["9", 0]},
            "class_type": "SaveImage",
            "_meta": {"title": "Save Image"}
        }
    }


def build_ipadapter_workflow(inputs: JobInputs, prompt_data: dict) -> dict:
    """
    Build workflow for character-conditioned page generation using IP-Adapter.

    This workflow uses a character reference image to condition the generation,
    ensuring the character in the output matches the reference exactly.

    Compatible with both SDXL and SD3.5 models. Automatically selects the
    appropriate latent image node based on the model name.

    Required in prompt_data:
    - character_ref_image: filename of the character reference image (uploaded to ComfyUI input/)

    Optional in prompt_data:
    - scene: description of the scene/action
    - style: art style override
    - composition: composition notes
    - ipadapter_weight: how strongly to apply the reference (0.0-1.0, default 0.75)
    """
    seed = inputs.seed if inputs.seed is not None else random.randint(0, 2**32 - 1)
    model = get_model_name(inputs.model)

    character_ref = prompt_data.get("character_ref_image", "character_ref.png")
    ipadapter_weight = prompt_data.get("ipadapter_weight", 0.75)

    # IP-Adapter uses SAME style as the scene for consistency
    full_prompt = IPADAPTER_POSITIVE.format(
        style=prompt_data.get("style", ""),  # REQUIRED - must match scene style
        scene=prompt_data.get("scene", ""),
        composition=prompt_data.get("composition", "")
    )

    # Detect if using SD3 model (use EmptySD3LatentImage) or SDXL/SD1.5 (use EmptyLatentImage)
    # NOTE: IP-Adapter is NOT available for SD 3.5 Medium - this workflow will fail!
    # Use detailed prompts or Img2Img composition instead.
    is_sd3 = "sd3" in model.lower()
    latent_class = "EmptySD3LatentImage" if is_sd3 else "EmptyLatentImage"

    # Use appropriate scheduler for the model type - SD 3.5 Medium optimal: CFG 5.0-6.0, Steps 30-40
    scheduler = "sgm_uniform" if is_sd3 else "normal"
    sampler = "euler" if is_sd3 else "dpmpp_2m_sde"
    cfg = inputs.cfg or (5.5 if is_sd3 else 7.0)
    steps = inputs.steps or (35 if is_sd3 else 30)

    # IP-Adapter workflow (compatible with SDXL and SD1.5, NOT SD 3.5 Medium)
    # Node structure:
    # 1: CheckpointLoaderSimple (load model)
    # 2: CLIPTextEncode (positive prompt)
    # 3: CLIPTextEncode (negative prompt)
    # 4: EmptyLatentImage or EmptySD3LatentImage (latent)
    # 5: LoadImage (character reference)
    # 6: IPAdapterUnifiedLoader (load IP-Adapter model)
    # 7: IPAdapterApply (apply character conditioning)
    # 8: KSampler (sample)
    # 9: VAEDecode (decode)
    # 10: SaveImage (save)

    return {
        "1": {
            "inputs": {"ckpt_name": model},
            "class_type": "CheckpointLoaderSimple",
            "_meta": {"title": "Load Checkpoint"}
        },
        "2": {
            "inputs": {"text": full_prompt, "clip": ["1", 1]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "Positive Prompt"}
        },
        "3": {
            "inputs": {"text": IPADAPTER_NEGATIVE, "clip": ["1", 1]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "Negative Prompt"}
        },
        "4": {
            "inputs": {
                "width": inputs.width or 1024,
                "height": inputs.height or 1024,
                "batch_size": 1
            },
            "class_type": latent_class,
            "_meta": {"title": "Empty Latent"}
        },
        "5": {
            "inputs": {"image": character_ref, "upload": "image"},
            "class_type": "LoadImage",
            "_meta": {"title": "Load Character Reference"}
        },
        "6": {
            "inputs": {
                "preset": "PLUS (high strength)",
                "model": ["1", 0]
            },
            "class_type": "IPAdapterUnifiedLoader",
            "_meta": {"title": "Load IP-Adapter"}
        },
        "7": {
            "inputs": {
                "weight": ipadapter_weight,
                "weight_type": "linear",
                "combine_embeds": "concat",
                "start_at": 0.0,
                "end_at": 1.0,
                "embeds_scaling": "V only",
                "model": ["6", 0],
                "ipadapter": ["6", 1],
                "image": ["5", 0]
            },
            "class_type": "IPAdapterApply",
            "_meta": {"title": "Apply IP-Adapter"}
        },
        "8": {
            "inputs": {
                "seed": seed,
                "steps": steps,
                "cfg": cfg,
                "sampler_name": sampler,
                "scheduler": scheduler,
                "denoise": 1.0,
                "model": ["7", 0],
                "positive": ["2", 0],
                "negative": ["3", 0],
                "latent_image": ["4", 0]
            },
            "class_type": "KSampler",
            "_meta": {"title": "KSampler"}
        },
        "9": {
            "inputs": {"samples": ["8", 0], "vae": ["1", 2]},
            "class_type": "VAEDecode",
            "_meta": {"title": "VAE Decode"}
        },
        "10": {
            "inputs": {"filename_prefix": "storybook_ipadapter", "images": ["9", 0]},
            "class_type": "SaveImage",
            "_meta": {"title": "Save Image"}
        }
    }


def parse_prompt_data(prompt: str) -> dict:
    """
    Parse a structured prompt into components.

    Supports key:value format like:
    STYLE: watercolor
    BACKGROUND: forest
    MAIN_CHARACTER: bunny
    """
    result = {}
    current_key = None
    current_lines = []

    for line in prompt.split('\n'):
        stripped = line.strip()

        # Check for key: value pattern
        if ':' in stripped and not stripped.startswith('-'):
            parts = stripped.split(':', 1)
            key = parts[0].strip().lower().replace(' ', '_')
            value = parts[1].strip()

            # Save previous key if exists
            if current_key:
                result[current_key] = '\n'.join(current_lines).strip()

            current_key = key
            current_lines = [value] if value else []
        elif current_key:
            current_lines.append(line)

    # Save last key
    if current_key:
        result[current_key] = '\n'.join(current_lines).strip()

    # If no structured format, use whole prompt as the main content
    # Do NOT hardcode style - it must come from preset/user input
    if not result:
        result["raw_prompt"] = prompt  # Store original for debugging
        # Try to intelligently assign to most likely field
        if "character" in prompt.lower() or "rabbit" in prompt.lower() or "fox" in prompt.lower():
            result["character"] = prompt
        elif "background" in prompt.lower() or "scene" in prompt.lower() or "forest" in prompt.lower():
            result["setting"] = prompt
        else:
            result["main_content"] = prompt

    return result


def build_workflow(inputs: JobInputs, workflow_type: str = "full_page", uploaded_files: dict = None) -> dict:
    """
    Build appropriate workflow based on type.

    SCENE-FIRST PIPELINE:
    1. "scene" or "background": Empty environment (no characters)
    2. "character_ref" or "character": Isolated character on white
    3. "prop" or "object": Isolated prop/item on white
    4. "ipadapter" or "compose": Place character in scene
    5. "inpaint" or "insert": Insert element into masked area
    6. "img2img" or "refine": Polish/adjust existing image
    7. "controlnet" or "structure": Restyle keeping structure

    workflow_type options:
    - "full_page" or "page": Scene/setting generation (no characters)
    - "background" or "bg" or "scene": Background-only generation
    - "character_ref" or "character": Character reference sheet (isolated)
    - "prop" or "object" or "item": Prop/object (isolated)
    - "inpaint" or "insert": Subject insertion via inpainting
    - "ipadapter" or "ip_adapter": Character-conditioned composition
    - "img2img" or "refine": Subtle refinement of existing image
    - "controlnet" or "structure": Structure-preserving generation

    uploaded_files: dict with filenames for workflows that require uploaded images:
    - 'base_image' and 'mask_image' for inpaint workflow
    - 'character_ref_image' for ipadapter workflow
    - 'source_image' for img2img workflow
    - 'control_image' for controlnet workflow
    """
    prompt_data = parse_prompt_data(inputs.prompt)
    uploaded_files = uploaded_files or {}

    workflow_type = workflow_type.lower()

    if workflow_type in ["background", "bg", "scene"]:
        return build_background_workflow(inputs, prompt_data)
    elif workflow_type in ["character_ref", "character", "ref"]:
        return build_character_ref_workflow(inputs, prompt_data)
    elif workflow_type in ["prop", "object", "item"]:
        return build_prop_workflow(inputs, prompt_data)
    elif workflow_type in ["inpaint", "insert"]:
        # Pass uploaded filenames to inpaint workflow
        if uploaded_files.get("base_image"):
            prompt_data["base_image"] = uploaded_files["base_image"]
        if uploaded_files.get("mask_image"):
            prompt_data["mask_image"] = uploaded_files["mask_image"]
        return build_inpaint_workflow(inputs, prompt_data)
    elif workflow_type in ["ipadapter", "ip_adapter", "ip-adapter"]:
        # Pass uploaded character reference and weight to ipadapter workflow
        if uploaded_files.get("character_ref_image"):
            prompt_data["character_ref_image"] = uploaded_files["character_ref_image"]
        # Pass ipadapter_weight from inputs (if available)
        if hasattr(inputs, 'ipadapter_weight') and inputs.ipadapter_weight is not None:
            prompt_data["ipadapter_weight"] = inputs.ipadapter_weight
        return build_ipadapter_workflow(inputs, prompt_data)
    elif workflow_type in ["img2img", "refine", "variation"]:
        # Pass uploaded source image and denoise for img2img
        if uploaded_files.get("source_image"):
            prompt_data["source_image"] = uploaded_files["source_image"]
        if uploaded_files.get("denoise"):
            prompt_data["denoise"] = uploaded_files["denoise"]
        return build_img2img_workflow(inputs, prompt_data)
    elif workflow_type in ["controlnet", "structure", "lineart", "canny"]:
        # Pass uploaded control image for structure-preserving generation
        if uploaded_files.get("control_image"):
            prompt_data["control_image"] = uploaded_files["control_image"]
        if uploaded_files.get("controlnet_type"):
            prompt_data["controlnet_type"] = uploaded_files["controlnet_type"]
        if uploaded_files.get("strength"):
            prompt_data["strength"] = uploaded_files["strength"]
        return build_controlnet_workflow(inputs, prompt_data)
    else:  # Default: full_page
        return build_full_page_workflow(inputs, prompt_data)

