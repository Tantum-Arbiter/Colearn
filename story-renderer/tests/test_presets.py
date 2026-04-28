"""
Tests for storyboard presets.
"""
import pytest

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from storyboard.presets import PRESETS, get_preset, list_presets
from storyboard.models import GenerationPreset


class TestPresets:
    """Tests for preset management."""
    
    def test_presets_not_empty(self):
        """Ensure presets dictionary is populated."""
        assert len(PRESETS) > 0
    
    def test_all_presets_are_valid(self):
        """All presets should be GenerationPreset instances."""
        for key, preset in PRESETS.items():
            assert isinstance(preset, GenerationPreset)
            assert preset.name is not None
            assert preset.art_style is not None
            assert preset.reference_prompt is not None
    
    def test_get_preset_valid(self):
        """get_preset should return preset for valid key."""
        preset = get_preset("bluey-cartoon")
        assert preset.name == "Bluey Cartoon"

    def test_get_preset_invalid_returns_default(self):
        """get_preset should return bluey-cartoon for invalid key."""
        preset = get_preset("invalid-preset-xyz")
        assert preset.name == "Bluey Cartoon"
    
    def test_list_presets_format(self):
        """list_presets should return list of dicts with id, name, art_style."""
        presets_list = list_presets()
        assert isinstance(presets_list, list)
        assert len(presets_list) > 0
        
        for item in presets_list:
            assert "id" in item
            assert "name" in item
            assert "art_style" in item
    
    def test_preset_dimensions_valid(self):
        """All presets should have valid dimensions."""
        for key, preset in PRESETS.items():
            assert preset.width > 0
            assert preset.height > 0
            assert preset.width >= 256
            assert preset.height >= 256
    
    def test_preset_generation_params_valid(self):
        """All presets should have valid generation parameters."""
        for key, preset in PRESETS.items():
            assert preset.steps >= 10
            assert preset.steps <= 100
            assert preset.cfg >= 1.0
            assert preset.cfg <= 20.0


class TestSD35MediumPresets:
    """Tests for SD 3.5 Medium optimized presets."""

    def test_bluey_cartoon_exists(self):
        """Bluey-style cartoon preset should exist."""
        assert "bluey-cartoon" in PRESETS
        preset = PRESETS["bluey-cartoon"]
        assert "australian" in preset.reference_prompt.lower()
        assert "medium:" in preset.reference_prompt.lower()

    def test_classic_oil_painting_exists(self):
        """Classic oil painting preset should exist."""
        assert "classic-oil-painting" in PRESETS
        preset = PRESETS["classic-oil-painting"]
        assert "oil painting" in preset.reference_prompt.lower()

    def test_watercolor_storybook_exists(self):
        """Watercolor storybook preset should exist."""
        assert "watercolor-storybook" in PRESETS
        preset = PRESETS["watercolor-storybook"]
        assert "watercolor" in preset.reference_prompt.lower()

    def test_bold_graphic_exists(self):
        """Bold graphic preset should exist."""
        assert "bold-graphic" in PRESETS
        preset = PRESETS["bold-graphic"]
        assert "line work:" in preset.reference_prompt.lower()

    def test_collage_art_exists(self):
        """Collage art preset should exist."""
        assert "collage-art" in PRESETS
        preset = PRESETS["collage-art"]
        assert "collage" in preset.reference_prompt.lower()

    def test_soft_pastel_exists(self):
        """Soft pastel preset should exist."""
        assert "soft-pastel" in PRESETS
        preset = PRESETS["soft-pastel"]
        assert "pastel" in preset.reference_prompt.lower()

    def test_whimsical_line_exists(self):
        """Whimsical line art preset should exist."""
        assert "whimsical-line" in PRESETS
        preset = PRESETS["whimsical-line"]

    def test_anime_cute_exists(self):
        """Anime cute preset should exist."""
        assert "anime-cute" in PRESETS
        preset = PRESETS["anime-cute"]

    def test_peppa_simple_exists(self):
        """Peppa-style simple preset should exist."""
        assert "peppa-simple" in PRESETS

    def test_adventure_cartoon_exists(self):
        """Adventure cartoon preset should exist."""
        assert "adventure-cartoon" in PRESETS
        preset = PRESETS["adventure-cartoon"]
        assert "cartoon" in preset.reference_prompt.lower()

    def test_technical_format_consistency(self):
        """All SD 3.5 Medium presets should follow the technical format with MEDIUM, LINE WORK, etc."""
        sd35_preset_keys = [
            "bluey-cartoon",
            "classic-oil-painting",
            "watercolor-storybook",
            "bold-graphic",
            "collage-art",
            "soft-pastel",
            "whimsical-line",
            "anime-cute",
        ]
        for key in sd35_preset_keys:
            preset = PRESETS[key]
            prompt_lower = preset.reference_prompt.lower()
            assert "medium:" in prompt_lower, f"{key} missing MEDIUM section"
            assert "color palette:" in prompt_lower, f"{key} missing COLOR PALETTE section"
            assert "shading:" in prompt_lower, f"{key} missing SHADING section"


class TestAdditionalPresets:
    """Tests for additional style presets."""

    def test_crayon_kids_exists(self):
        assert "crayon-kids" in PRESETS

    def test_retro_disney_exists(self):
        assert "retro-disney" in PRESETS

    def test_anime_adventure_exists(self):
        assert "anime-adventure" in PRESETS

    def test_kawaii_chibi_exists(self):
        assert "kawaii-chibi" in PRESETS

    def test_retro_comic_exists(self):
        assert "retro-comic" in PRESETS

    def test_claymation_style_exists(self):
        assert "claymation-style" in PRESETS

