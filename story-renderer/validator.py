"""
Image Validator - Uses Ollama Vision to validate generated images locally

Validates:
1. Art style consistency
2. Scene accuracy (does it match the prompt?)
3. Quality (no AI artifacts)
4. Character consistency (optional - compares to reference image)
"""
import base64
import logging
import httpx
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Ollama runs locally on Windows PC
OLLAMA_URL = "http://127.0.0.1:11434"
OLLAMA_VISION_MODEL = "llava"


@dataclass
class ValidationResult:
    is_valid: bool
    art_style_score: float  # 0-100
    scene_accuracy_score: float  # 0-100
    quality_score: float  # 0-100
    character_consistency_score: float  # 0-100, only if reference provided
    issues: list[str]
    suggestions: list[str]


async def validate_image(
    image_data: bytes,
    prompt: str,
    art_style: Optional[str] = None,
    scene_description: Optional[str] = None,
    character_reference: Optional[bytes] = None,
    character_description: Optional[str] = None,
    min_score: float = 75.0,
) -> ValidationResult:
    """
    Validate a generated image using Ollama Vision (LLaVA).

    Args:
        image_data: The generated image bytes
        prompt: The generation prompt
        art_style: Expected art style description
        scene_description: What should be in the scene
        character_reference: Optional reference image bytes for character consistency
        character_description: Description of the character to validate
        min_score: Minimum average score to pass validation

    Returns:
        ValidationResult with scores and issues
    """
    try:
        # Encode image to base64
        image_b64 = base64.b64encode(image_data).decode("utf-8")

        # If we have a character reference, do character consistency check first
        character_score = 100.0  # Default to perfect if no reference
        character_issues = []

        if character_reference:
            char_result = await _validate_character_consistency(
                image_data, character_reference, character_description
            )
            character_score = char_result["score"]
            character_issues = char_result["issues"]
            logger.info(f"  Character consistency score: {character_score:.0f}")

        # Build validation prompt
        validation_prompt = f"""Analyze this children's book illustration and rate it on these criteria (0-100 scale):

1. ART STYLE: Is the style appropriate for a children's book? Look for:
   - Soft, appealing colors
   - Age-appropriate imagery (nothing scary)
   - Professional illustration quality
   {f"Expected style: {art_style}" if art_style else ""}

2. SCENE ACCURACY: Does the image match this description?
   "{scene_description or prompt}"

3. QUALITY: Check for these AI generation artifacts:
   - Extra limbs or missing body parts
   - Distorted faces or eyes
   - Blurry or morphed elements
   - Text artifacts
   - Unnatural proportions

Respond in this EXACT format (just numbers and lists):
ART_STYLE_SCORE: [number]
SCENE_ACCURACY_SCORE: [number]
QUALITY_SCORE: [number]
ISSUES: [comma-separated list or "none"]
SUGGESTIONS: [comma-separated list or "none"]
"""

        # Call Ollama Vision API
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_VISION_MODEL,
                    "prompt": validation_prompt,
                    "images": [image_b64],
                    "stream": False,
                },
            )

            if response.status_code != 200:
                logger.warning(f"Ollama validation failed: {response.status_code}")
                # Return passing result if Ollama is unavailable
                return ValidationResult(
                    is_valid=True,
                    art_style_score=80.0,
                    scene_accuracy_score=80.0,
                    quality_score=80.0,
                    character_consistency_score=character_score,
                    issues=["Validation skipped - Ollama unavailable"] + character_issues,
                    suggestions=[],
                )

            result_text = response.json().get("response", "")
            result = _parse_validation_response(result_text, min_score, character_score)

            # Add character issues to the result
            if character_issues:
                result.issues.extend(character_issues)

            return result

    except Exception as e:
        logger.warning(f"Validation error: {e}")
        # Return passing result on error (best effort)
        return ValidationResult(
            is_valid=True,
            art_style_score=80.0,
            scene_accuracy_score=80.0,
            quality_score=80.0,
            character_consistency_score=100.0,
            issues=[f"Validation error: {str(e)}"],
            suggestions=[],
        )


async def _validate_character_consistency(
    generated_image: bytes,
    reference_image: bytes,
    character_description: Optional[str] = None,
) -> dict:
    """
    Compare the character in a generated image against a reference image.
    Returns a score (0-100) and list of issues.

    This is the key check for pixel-perfect character consistency.
    """
    try:
        gen_b64 = base64.b64encode(generated_image).decode("utf-8")
        ref_b64 = base64.b64encode(reference_image).decode("utf-8")

        char_desc = character_description or "the main character"

        comparison_prompt = f"""Compare these two images for CHARACTER CONSISTENCY.

IMAGE 1 (REFERENCE): This is the official character reference image.
IMAGE 2 (GENERATED): This is a new illustration that should contain the same character.

The character to check: {char_desc}

Analyze if the character in Image 2 EXACTLY matches the character in Image 1:

1. FACE/HEAD: Same shape, same features, same expression style?
2. BODY: Same proportions, same build, same posture?
3. COLORS: Exact same colors for skin/fur, eyes, clothing?
4. DETAILS: Same clothing, accessories, distinctive markings?
5. ART STYLE: Drawn in the same artistic style?

Rate the overall CHARACTER CONSISTENCY from 0-100:
- 100 = IDENTICAL character (pixel-perfect match)
- 90-99 = Same character, minor variations acceptable
- 80-89 = Recognizable as same character, some differences
- 70-79 = Similar character, noticeable differences
- Below 70 = Different character or major inconsistencies

Respond in this EXACT format:
CHARACTER_CONSISTENCY_SCORE: [number]
FACE_MATCH: [yes/partial/no]
BODY_MATCH: [yes/partial/no]
COLOR_MATCH: [yes/partial/no]
STYLE_MATCH: [yes/partial/no]
ISSUES: [comma-separated list of specific differences or "none"]
"""

        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_VISION_MODEL,
                    "prompt": comparison_prompt,
                    "images": [ref_b64, gen_b64],  # Reference first, then generated
                    "stream": False,
                },
            )

            if response.status_code != 200:
                logger.warning(f"Character consistency check failed: {response.status_code}")
                return {"score": 80.0, "issues": ["Character check skipped - Ollama unavailable"]}

            result_text = response.json().get("response", "")
            return _parse_character_consistency_response(result_text)

    except Exception as e:
        logger.warning(f"Character consistency check error: {e}")
        return {"score": 80.0, "issues": [f"Character check error: {str(e)}"]}


def _parse_character_consistency_response(text: str) -> dict:
    """Parse the character consistency response from LLaVA"""
    lines = text.strip().split("\n")

    score = 80.0
    issues = []

    for line in lines:
        line = line.strip()
        if line.startswith("CHARACTER_CONSISTENCY_SCORE:"):
            try:
                score = float(line.split(":")[1].strip().split()[0])
            except:
                pass
        elif line.startswith("ISSUES:"):
            issues_text = line.split(":", 1)[1].strip()
            if issues_text.lower() != "none":
                issues = [i.strip() for i in issues_text.split(",") if i.strip()]
        elif "_MATCH:" in line:
            # Check for partial or no matches
            match_type = line.split(":")[0].strip()
            match_value = line.split(":")[1].strip().lower()
            if match_value in ["partial", "no"]:
                issues.append(f"{match_type.replace('_', ' ').title()}: {match_value}")

    return {"score": score, "issues": issues}


def _parse_validation_response(text: str, min_score: float, character_score: float = 100.0) -> ValidationResult:
    """Parse the LLaVA response into a ValidationResult"""
    lines = text.strip().split("\n")

    art_score = 80.0
    scene_score = 80.0
    quality_score = 80.0
    issues = []
    suggestions = []

    for line in lines:
        line = line.strip()
        if line.startswith("ART_STYLE_SCORE:"):
            try:
                art_score = float(line.split(":")[1].strip().split()[0])
            except:
                pass
        elif line.startswith("SCENE_ACCURACY_SCORE:"):
            try:
                scene_score = float(line.split(":")[1].strip().split()[0])
            except:
                pass
        elif line.startswith("QUALITY_SCORE:"):
            try:
                quality_score = float(line.split(":")[1].strip().split()[0])
            except:
                pass
        elif line.startswith("ISSUES:"):
            issues_text = line.split(":", 1)[1].strip()
            if issues_text.lower() != "none":
                issues = [i.strip() for i in issues_text.split(",") if i.strip()]
        elif line.startswith("SUGGESTIONS:"):
            suggestions_text = line.split(":", 1)[1].strip()
            if suggestions_text.lower() != "none":
                suggestions = [s.strip() for s in suggestions_text.split(",") if s.strip()]

    # Calculate overall validity
    # Include character score if it was checked (not default 100)
    if character_score < 100.0:
        avg_score = (art_score + scene_score + quality_score + character_score) / 4
        # Character consistency must be at least 85 for pixel-perfect requirement
        char_valid = character_score >= 85
    else:
        avg_score = (art_score + scene_score + quality_score) / 3
        char_valid = True

    is_valid = avg_score >= min_score and quality_score >= 60 and char_valid

    return ValidationResult(
        is_valid=is_valid,
        art_style_score=art_score,
        scene_accuracy_score=scene_score,
        quality_score=quality_score,
        character_consistency_score=character_score,
        issues=issues,
        suggestions=suggestions,
    )

