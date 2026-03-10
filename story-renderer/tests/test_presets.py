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
        preset = get_preset("friendly-dragon")
        assert preset.name == "Friendly Dragon"
    
    def test_get_preset_invalid_returns_default(self):
        """get_preset should return friendly-dragon for invalid key."""
        preset = get_preset("invalid-preset-xyz")
        assert preset.name == "Friendly Dragon"
    
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


class TestModernPresets:
    """Tests for modern style presets (technical descriptions, no copyrighted references)."""

    def test_australian_flat_illustration_exists(self):
        """Australian flat illustration preset should exist."""
        assert "australian-flat-illustration" in PRESETS
        preset = PRESETS["australian-flat-illustration"]
        assert "australian" in preset.reference_prompt.lower()
        assert "medium:" in preset.reference_prompt.lower()

    def test_textured_storybook_illustration_exists(self):
        """Textured storybook illustration preset should exist."""
        assert "textured-storybook-illustration" in PRESETS
        preset = PRESETS["textured-storybook-illustration"]
        assert "gouache" in preset.reference_prompt.lower()

    def test_bold_preschool_flat_exists(self):
        """Bold preschool flat preset should exist."""
        assert "bold-preschool-flat" in PRESETS
        preset = PRESETS["bold-preschool-flat"]
        assert "line work:" in preset.reference_prompt.lower()

    def test_cgi_action_cartoon_exists(self):
        """CGI action cartoon preset should exist."""
        assert "cgi-action-cartoon" in PRESETS
        preset = PRESETS["cgi-action-cartoon"]
        assert "3d" in preset.reference_prompt.lower()

    def test_paper_cutout_geometric_exists(self):
        """Paper cutout geometric preset should exist."""
        assert "paper-cutout-geometric" in PRESETS
        preset = PRESETS["paper-cutout-geometric"]
        assert "geometric" in preset.reference_prompt.lower()

    def test_polynesian_epic_adventure_exists(self):
        """Polynesian epic adventure preset should exist."""
        assert "polynesian-epic-adventure" in PRESETS
        preset = PRESETS["polynesian-epic-adventure"]
        assert "tropical" in preset.reference_prompt.lower()

    def test_japanese_watercolor_fantasy_exists(self):
        """Japanese watercolor fantasy preset should exist."""
        assert "japanese-watercolor-fantasy" in PRESETS
        preset = PRESETS["japanese-watercolor-fantasy"]
        assert "watercolor" in preset.reference_prompt.lower()

    def test_cozy_british_watercolor_exists(self):
        """Cozy British watercolor preset should exist."""
        assert "cozy-british-watercolor" in PRESETS

    def test_painted_paper_collage_exists(self):
        """Painted paper collage preset should exist."""
        assert "painted-paper-collage" in PRESETS
        preset = PRESETS["painted-paper-collage"]
        assert "collage" in preset.reference_prompt.lower()

    def test_classic_pencil_watercolor_exists(self):
        """Classic pencil watercolor preset should exist."""
        assert "classic-pencil-watercolor" in PRESETS

    def test_technical_format_consistency(self):
        """All modern presets should follow the technical format with MEDIUM, LINE WORK, etc."""
        modern_preset_keys = [
            "australian-flat-illustration",
            "textured-storybook-illustration",
            "bold-preschool-flat",
            "cgi-action-cartoon",
            "paper-cutout-geometric",
            "polynesian-epic-adventure",
            "soft-3d-nursery",
            "japanese-watercolor-fantasy",
        ]
        for key in modern_preset_keys:
            preset = PRESETS[key]
            prompt_lower = preset.reference_prompt.lower()
            assert "medium:" in prompt_lower, f"{key} missing MEDIUM section"
            assert "color palette:" in prompt_lower, f"{key} missing COLOR PALETTE section"
            assert "shading:" in prompt_lower, f"{key} missing SHADING section"


class TestOriginalPresets:
    """Tests for original presets."""
    
    def test_friendly_dragon_exists(self):
        assert "friendly-dragon" in PRESETS
    
    def test_watercolor_woodland_exists(self):
        assert "watercolor-woodland" in PRESETS
    
    def test_bright_adventure_exists(self):
        assert "bright-adventure" in PRESETS
    
    def test_cozy_bedtime_exists(self):
        assert "cozy-bedtime" in PRESETS
    
    def test_ocean_adventure_exists(self):
        assert "ocean-adventure" in PRESETS
    
    def test_space_explorer_exists(self):
        assert "space-explorer" in PRESETS

