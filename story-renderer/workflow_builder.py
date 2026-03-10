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
# WORKFLOW TYPE: full_page (storybook_full_page_slots_api.json)
# ============================================================

FULL_PAGE_POSITIVE = """Create one cohesive premium children's storybook illustration in a soft painterly picture-book style.

STYLE:
{style}

BACKGROUND:
{background}

MAIN CHARACTER:
Exactly one main character: {main_character}

SECONDARY CHARACTER:
Exactly one secondary character: {secondary_character}

ANIMAL:
Exactly one animal: {animal}

OBJECTS AND PROPS:
{objects}

COMPOSITION:
{composition}

STRICT SCENE RULES:
- all subjects must appear as separate, fully formed individuals
- do not merge characters with animals
- do not merge animals with objects
- each subject must have exactly one head and one body unless explicitly specified otherwise
- keep all limbs natural and anatomically correct for the illustration style
- keep clear spacing between subjects
- maintain consistent scale, lighting, perspective, and color harmony across the whole page
- keep the image clean, readable, and suitable for a premium children's picture book
- no text, no watermark, no logo"""

FULL_PAGE_NEGATIVE = """photorealistic, 3d render, gritty realism, horror, gore, scary, two heads, multiple heads, extra head, three ears, extra ears, fused bodies, conjoined characters, merged animal, merged subject, duplicate character, duplicate animal, extra arms, extra legs, extra fingers, extra eyes, extra tail, malformed hands, malformed paws, distorted anatomy, broken limbs, incorrect proportions, mutation, deformed, cropped subject, cut off head, cut off feet, blurry, muddy colors, washed out image, cluttered composition, random background characters, unreadable scene, text, watermark, logo"""


# ============================================================
# WORKFLOW TYPE: background (storybook_background_only_api.json)
# ============================================================

BACKGROUND_POSITIVE = """Create a premium children's picture-book background only.

STYLE:
{style}

BACKGROUND:
{background}

COMPOSITION:
{composition}

RULES:
- background only
- no main character
- no secondary character
- no foreground animal
- no hero props unless they are background dressing only
- leave clean readable open space for later subject placement
- maintain beautiful lighting, depth, and a polished storybook aesthetic
- no text, no watermark, no logo"""

BACKGROUND_NEGATIVE = """character, person, people, child, boy, girl, rabbit, deer, fox, hero animal, foreground creature, close-up subject, merged subject, duplicate subject, photorealistic, 3d render, text, watermark, logo"""


# ============================================================
# WORKFLOW TYPE: character_ref (storybook_character_reference_api.json)
# ============================================================

CHARACTER_REF_POSITIVE = """Create a premium children's storybook character reference image.

STYLE:
{style}

CHARACTER:
Exactly one subject: {character}

POSE:
{pose}

BACKGROUND:
Simple clean backdrop with minimal distractions for consistency checking.

RULES:
- exactly one subject only
- full body visible if possible
- clear silhouette
- no extra props unless explicitly requested
- no extra animals or background characters
- no text, no watermark, no logo"""

CHARACTER_REF_NEGATIVE = """two heads, multiple heads, extra head, three ears, extra ears, extra eyes, extra tail, duplicate subject, extra limbs, malformed anatomy, mutation, deformed, cropped body, cut off feet, cut off head, cluttered background, multiple characters, photorealistic, 3d render, text, watermark, logo"""


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
    Build workflow for single-pass full page generation.
    Use for ideation and rough page thumbnails.
    """
    seed = inputs.seed if inputs.seed is not None else random.randint(0, 2**32 - 1)
    model = get_model_name(inputs.model)

    # Fill in prompt template
    full_prompt = FULL_PAGE_POSITIVE.format(
        style=prompt_data.get("style", "soft watercolor children's book illustration"),
        background=prompt_data.get("background", "simple scene background"),
        main_character=prompt_data.get("main_character", "none in this scene"),
        secondary_character=prompt_data.get("secondary_character", "none in this scene"),
        animal=prompt_data.get("animal", "none in this scene"),
        objects=prompt_data.get("objects", "age-appropriate props"),
        composition=prompt_data.get("composition", "balanced child-friendly composition")
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
    Build workflow for background-only generation.
    No characters or foreground subjects.
    """
    seed = inputs.seed if inputs.seed is not None else random.randint(0, 2**32 - 1)
    model = get_model_name(inputs.model)

    full_prompt = BACKGROUND_POSITIVE.format(
        style=prompt_data.get("style", "soft watercolor children's book illustration"),
        background=prompt_data.get("background", "enchanted forest clearing"),
        composition=prompt_data.get("composition", "open center for subject placement")
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
    Creates a single-subject reference image for the character bible.
    """
    seed = inputs.seed if inputs.seed is not None else random.randint(0, 2**32 - 1)
    model = get_model_name(inputs.model)

    full_prompt = CHARACTER_REF_POSITIVE.format(
        style=prompt_data.get("style", "soft watercolor children's book illustration"),
        character=prompt_data.get("character", "a friendly bunny"),
        pose=prompt_data.get("pose", "standing, facing forward, neutral expression")
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


def build_inpaint_workflow(inputs: JobInputs, prompt_data: dict) -> dict:
    """
    Build workflow for subject insertion via inpainting.
    Requires base_image and mask_image paths in prompt_data.

    The mask should be a grayscale or RGBA PNG where white = inpaint area.
    Uses ImageToMask to extract the mask channel properly for VAEEncodeForInpaint.
    """
    seed = inputs.seed if inputs.seed is not None else random.randint(0, 2**32 - 1)
    model = get_model_name(inputs.model)

    base_image = prompt_data.get("base_image", "page_background.png")
    mask_image = prompt_data.get("mask_image", "mask.png")

    full_prompt = INPAINT_POSITIVE.format(
        style=prompt_data.get("style", "matching the existing page style"),
        subject=prompt_data.get("subject", "a friendly character"),
        placement=prompt_data.get("placement", "naturally positioned in the scene")
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
                "steps": inputs.steps or 24,
                "cfg": inputs.cfg or 4.5,
                "sampler_name": "euler",
                "scheduler": "sgm_uniform",
                "denoise": prompt_data.get("denoise", 0.65),
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

    full_prompt = IPADAPTER_POSITIVE.format(
        style=prompt_data.get("style", "soft watercolor children's book illustration"),
        scene=prompt_data.get("scene", prompt_data.get("main_character", "a character in a scene")),
        composition=prompt_data.get("composition", "centered composition, full scene visible")
    )

    # Detect if using SD3 model (use EmptySD3LatentImage) or SDXL/SD1.5 (use EmptyLatentImage)
    is_sd3 = "sd3" in model.lower()
    latent_class = "EmptySD3LatentImage" if is_sd3 else "EmptyLatentImage"

    # Use appropriate scheduler for the model type
    scheduler = "sgm_uniform" if is_sd3 else "normal"
    sampler = "euler" if is_sd3 else "dpmpp_2m_sde"
    cfg = inputs.cfg or (4.5 if is_sd3 else 7.0)
    steps = inputs.steps or (28 if is_sd3 else 30)

    # IP-Adapter workflow (compatible with SDXL and SD3.5)
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

    # If no structured format, use whole prompt as main content
    if not result:
        result["main_character"] = prompt
        result["style"] = "soft watercolor children's book illustration"

    return result


def build_workflow(inputs: JobInputs, workflow_type: str = "full_page", uploaded_files: dict = None) -> dict:
    """
    Build appropriate workflow based on type.

    workflow_type options:
    - "full_page" or "page": Single-pass full page generation
    - "background" or "bg": Background-only generation
    - "character_ref" or "character": Character reference sheet
    - "inpaint" or "insert": Subject insertion via inpainting
    - "ipadapter" or "ip_adapter": Character-conditioned page generation

    uploaded_files: dict with filenames for workflows that require uploaded images:
    - 'base_image' and 'mask_image' for inpaint workflow
    - 'character_ref_image' for ipadapter workflow
    """
    prompt_data = parse_prompt_data(inputs.prompt)
    uploaded_files = uploaded_files or {}

    workflow_type = workflow_type.lower()

    if workflow_type in ["background", "bg"]:
        return build_background_workflow(inputs, prompt_data)
    elif workflow_type in ["character_ref", "character", "ref"]:
        return build_character_ref_workflow(inputs, prompt_data)
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
    else:  # Default: full_page
        return build_full_page_workflow(inputs, prompt_data)

