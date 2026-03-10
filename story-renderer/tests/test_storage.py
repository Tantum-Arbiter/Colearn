"""
Tests for storyboard storage manager.
"""
import pytest
import tempfile
import shutil
import os
from pathlib import Path

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from storyboard.storage import StorageManager
from storyboard.models import Book, Asset, AssetType, GenerationPreset


@pytest.fixture
def temp_storage():
    """Create a temporary storage directory for tests."""
    temp_dir = tempfile.mkdtemp()
    manager = StorageManager(root=temp_dir)
    yield manager
    # Cleanup
    shutil.rmtree(temp_dir)


@pytest.fixture
def sample_preset():
    """Create a sample preset for testing."""
    return GenerationPreset(
        name="Test Preset",
        art_style="Test style",
        reference_prompt="Test prompt"
    )


@pytest.fixture
def sample_book(sample_preset):
    """Create a sample book for testing."""
    return Book(
        title="Test Book",
        description="A test book",
        preset=sample_preset
    )


class TestStorageManagerInit:
    """Tests for storage manager initialization."""
    
    def test_creates_directories(self, temp_storage):
        """Storage manager should create base directories."""
        assert (Path(temp_storage.root) / "books").exists()
        assert (Path(temp_storage.root) / "album").exists()
        assert (Path(temp_storage.root) / "presets").exists()


class TestBookManagement:
    """Tests for book CRUD operations."""
    
    def test_create_book(self, temp_storage, sample_book):
        """Should create book with directory structure."""
        created = temp_storage.create_book(sample_book)
        
        assert created.id == sample_book.id
        book_path = temp_storage.get_book_path(sample_book.id)
        assert book_path.exists()
        assert (book_path / "book.json").exists()
        assert (book_path / "pages").exists()
        assert (book_path / "assets" / "characters").exists()
        assert (book_path / "assets" / "props").exists()
        assert (book_path / "assets" / "backgrounds").exists()
        assert (book_path / "variations").exists()
    
    def test_load_book(self, temp_storage, sample_book):
        """Should load book from disk."""
        temp_storage.create_book(sample_book)
        loaded = temp_storage.load_book(sample_book.id)
        
        assert loaded is not None
        assert loaded.id == sample_book.id
        assert loaded.title == sample_book.title
    
    def test_load_nonexistent_book(self, temp_storage):
        """Should return None for nonexistent book."""
        loaded = temp_storage.load_book("nonexistent-id")
        assert loaded is None
    
    def test_list_books(self, temp_storage, sample_preset):
        """Should list all books."""
        book1 = Book(title="Book 1", preset=sample_preset)
        book2 = Book(title="Book 2", preset=sample_preset)
        
        temp_storage.create_book(book1)
        temp_storage.create_book(book2)
        
        books = temp_storage.list_books()
        assert len(books) == 2
        titles = [b["title"] for b in books]
        assert "Book 1" in titles
        assert "Book 2" in titles
    
    def test_save_book(self, temp_storage, sample_book):
        """Should save book changes."""
        temp_storage.create_book(sample_book)
        sample_book.description = "Updated description"
        temp_storage.save_book(sample_book)
        
        loaded = temp_storage.load_book(sample_book.id)
        assert loaded.description == "Updated description"
    
    def test_delete_book(self, temp_storage, sample_book):
        """Should delete book and files."""
        temp_storage.create_book(sample_book)
        assert temp_storage.get_book_path(sample_book.id).exists()
        
        result = temp_storage.delete_book(sample_book.id)
        assert result is True
        assert not temp_storage.get_book_path(sample_book.id).exists()
    
    def test_delete_nonexistent_book(self, temp_storage):
        """Should return False for nonexistent book."""
        result = temp_storage.delete_book("nonexistent-id")
        assert result is False


class TestAssetManagement:
    """Tests for asset management."""

    def test_save_character_asset(self, temp_storage, sample_book):
        """Should save character asset to correct location."""
        temp_storage.create_book(sample_book)

        asset = Asset(
            type=AssetType.CHARACTER,
            name="Test Dragon",
            filename="temp.png"  # Will be overwritten by save_asset
        )
        image_data = b"fake image data"

        saved = temp_storage.save_asset(sample_book.id, asset, image_data)

        assert "characters" in saved.filename
        asset_path = temp_storage.get_asset_path(sample_book.id, saved)
        assert asset_path.exists()

    def test_save_background_asset(self, temp_storage, sample_book):
        """Should save background asset to correct location."""
        temp_storage.create_book(sample_book)

        asset = Asset(
            type=AssetType.BACKGROUND,
            name="Forest Background",
            filename="temp.png"  # Will be overwritten by save_asset
        )
        image_data = b"fake background image"

        saved = temp_storage.save_asset(sample_book.id, asset, image_data)

        assert "backgrounds" in saved.filename


class TestAlbum:
    """Tests for album functionality."""

    def test_save_to_album(self, temp_storage):
        """Should save asset to album."""
        asset = Asset(
            type=AssetType.VARIATION,
            name="Saved Image",
            filename="temp.png"  # Will be overwritten by save_to_album
        )
        image_data = b"album image data"

        saved = temp_storage.save_to_album(asset, image_data)

        assert "album" in saved.filename
        path = temp_storage.get_album_image_path(saved.id)
        assert path is not None
        assert path.exists()

