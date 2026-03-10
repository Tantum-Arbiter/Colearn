"""
Tests for storyboard models.
"""
import pytest
from datetime import datetime

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from storyboard.models import (
    Book, Page, Asset, Character, GenerationPreset,
    AssetType, GenerationStatus, CreateBookRequest,
    VariationRequest, ComposeSceneRequest, PageElement,
    CharacterPoseRequest
)


class TestAsset:
    """Tests for Asset model."""

    def test_asset_creation_with_defaults(self):
        asset = Asset(
            type=AssetType.CHARACTER,
            name="Test Dragon",
            filename="assets/characters/dragon.png"
        )
        assert asset.id is not None
        assert asset.type == AssetType.CHARACTER
        assert asset.name == "Test Dragon"
        assert asset.prompt == ""  # Default empty string
        assert asset.seed is None

    def test_asset_creation_with_all_fields(self):
        asset = Asset(
            type=AssetType.BACKGROUND,
            name="Forest Background",
            description="A magical forest scene",
            filename="assets/backgrounds/forest.png",
            prompt="A dense magical forest with glowing mushrooms",
            seed=12345
        )
        assert asset.type == AssetType.BACKGROUND
        assert asset.name == "Forest Background"
        assert asset.description == "A magical forest scene"
        assert asset.seed == 12345

    def test_asset_types(self):
        assert AssetType.CHARACTER.value == "character"
        assert AssetType.PROP.value == "prop"
        assert AssetType.BACKGROUND.value == "background"
        assert AssetType.FINAL.value == "final"


class TestCharacter:
    """Tests for Character model."""

    def test_character_creation(self):
        char = Character(
            name="Freya",
            description="A friendly purple dragon",
            reference_image="characters/freya_ref.png"
        )
        assert char.id is not None
        assert char.name == "Freya"
        assert char.description == "A friendly purple dragon"
        assert char.reference_image == "characters/freya_ref.png"
        assert char.poses == []


class TestPage:
    """Tests for Page model."""

    def test_page_creation(self):
        page = Page(number=1)
        assert page.id is not None
        assert page.number == 1
        assert page.status == GenerationStatus.PENDING
        assert page.elements == []

    def test_page_status_values(self):
        assert GenerationStatus.PENDING.value == "pending"
        assert GenerationStatus.GENERATING.value == "generating"
        assert GenerationStatus.COMPLETE.value == "complete"
        assert GenerationStatus.FAILED.value == "failed"


class TestGenerationPreset:
    """Tests for GenerationPreset model."""

    def test_preset_defaults(self):
        preset = GenerationPreset(
            name="Test Preset",
            art_style="Test style",
            reference_prompt="Test prompt"
        )
        assert preset.width == 1024
        assert preset.height == 704
        assert preset.steps == 28
        assert preset.cfg == 4.5
        assert preset.negative_prompt == ""  # Default empty string
    
    def test_preset_custom_values(self):
        preset = GenerationPreset(
            name="Custom Preset",
            art_style="Custom style",
            reference_prompt="Custom prompt",
            width=512,
            height=512,
            steps=50,
            cfg=7.0
        )
        assert preset.width == 512
        assert preset.height == 512
        assert preset.steps == 50
        assert preset.cfg == 7.0


class TestBook:
    """Tests for Book model."""
    
    def test_book_creation_minimal(self):
        preset = GenerationPreset(
            name="Test", art_style="Test", reference_prompt="Test"
        )
        book = Book(title="Test Book", preset=preset)
        assert book.id is not None
        assert book.title == "Test Book"
        assert book.pages == []
        assert book.assets == []
        assert book.characters == []
    
    def test_book_with_description(self):
        preset = GenerationPreset(
            name="Test", art_style="Test", reference_prompt="Test"
        )
        book = Book(
            title="Adventure Book",
            description="A story about dragons",
            preset=preset
        )
        assert book.description == "A story about dragons"


class TestRequests:
    """Tests for request models."""

    def test_create_book_request(self):
        req = CreateBookRequest(
            title="New Book",
            preset_name="friendly-dragon"
        )
        assert req.title == "New Book"
        assert req.preset_name == "friendly-dragon"
        assert req.description == ""

    def test_variation_request(self):
        req = VariationRequest(prompt="A dragon flying")
        assert req.prompt == "A dragon flying"
        assert req.negative_prompt == ""  # Default empty string
        assert req.base_seed is None

    def test_compose_scene_request(self):
        elements = [PageElement(asset_id="asset_1", x=0.5, y=0.5)]
        req = ComposeSceneRequest(
            background_id="bg_1",
            elements=elements
        )
        assert req.background_id == "bg_1"
        assert len(req.elements) == 1
        assert req.elements[0].x == 0.5

