"""
Tests for storyboard API routes.
"""
import pytest
import tempfile
import shutil
import os
from unittest.mock import MagicMock, AsyncMock, patch

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from fastapi import FastAPI

from storyboard.routes import router
from storyboard.storage import StorageManager


@pytest.fixture
def temp_storage():
    """Create temporary storage for tests."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)


@pytest.fixture
def app(temp_storage):
    """Create test FastAPI app."""
    # Patch storage before importing
    with patch('storyboard.routes.storage') as mock_storage_module:
        mock_storage = StorageManager(root=temp_storage)
        mock_storage_module.__class__ = StorageManager
        mock_storage_module.root = mock_storage.root
        mock_storage_module.get_book_path = mock_storage.get_book_path
        mock_storage_module.create_book = mock_storage.create_book
        mock_storage_module.load_book = mock_storage.load_book
        mock_storage_module.list_books = mock_storage.list_books
        mock_storage_module.save_book = mock_storage.save_book
        mock_storage_module.delete_book = mock_storage.delete_book
        mock_storage_module.save_asset = mock_storage.save_asset
        mock_storage_module.get_asset_path = mock_storage.get_asset_path
        mock_storage_module.save_to_album = mock_storage.save_to_album
        mock_storage_module.list_album = mock_storage.list_album
        
        app = FastAPI()
        app.include_router(router)
        yield app


@pytest.fixture
def client(app):
    """Create test client."""
    return TestClient(app)


class TestPresetsEndpoints:
    """Tests for preset endpoints."""
    
    def test_get_presets(self, client):
        """Should return list of presets."""
        response = client.get("/v1/storyboard/presets")
        assert response.status_code == 200
        data = response.json()
        assert "presets" in data
        assert len(data["presets"]) > 0
    
    def test_get_preset_detail(self, client):
        """Should return preset details."""
        response = client.get("/v1/storyboard/presets/friendly-dragon")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "reference_prompt" in data
    
    def test_get_nonexistent_preset(self, client):
        """Should return 404 for nonexistent preset."""
        response = client.get("/v1/storyboard/presets/nonexistent")
        assert response.status_code == 404


class TestBookEndpoints:
    """Tests for book endpoints."""
    
    def test_list_books_empty(self, client):
        """Should return empty list initially."""
        response = client.get("/v1/storyboard/books")
        assert response.status_code == 200
        data = response.json()
        assert "books" in data
    
    def test_create_book(self, client):
        """Should create a new book."""
        response = client.post(
            "/v1/storyboard/books",
            json={
                "title": "Test Book",
                "preset_name": "friendly-dragon"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "book" in data
        assert data["book"]["title"] == "Test Book"

    def test_create_book_with_description(self, client):
        """Should create book with description."""
        response = client.post(
            "/v1/storyboard/books",
            json={
                "title": "Described Book",
                "description": "A test description",
                "preset_name": "friendly-dragon"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["book"]["description"] == "A test description"


class TestPageEndpoints:
    """Tests for page endpoints."""

    def test_create_page(self, client):
        """Should create a page in a book."""
        # First create a book
        book_resp = client.post(
            "/v1/storyboard/books",
            json={"title": "Book", "preset_name": "friendly-dragon"}
        )
        book_id = book_resp.json()["book"]["id"]

        # Create page - requires number query param
        response = client.post(
            f"/v1/storyboard/books/{book_id}/pages",
            params={"number": 1, "name": "First Page"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "page" in data
        assert data["page"]["number"] == 1

    def test_create_page_increments_number(self, client):
        """Page numbers should increment."""
        book_resp = client.post(
            "/v1/storyboard/books",
            json={"title": "Book", "preset_name": "friendly-dragon"}
        )
        book_id = book_resp.json()["book"]["id"]

        client.post(
            f"/v1/storyboard/books/{book_id}/pages",
            params={"number": 1}
        )
        response = client.post(
            f"/v1/storyboard/books/{book_id}/pages",
            params={"number": 2}
        )

        assert response.json()["page"]["number"] == 2


class TestAssetEndpoints:
    """Tests for asset endpoints."""
    
    def test_list_assets_empty(self, client):
        """Should return empty assets list."""
        book_resp = client.post(
            "/v1/storyboard/books",
            json={"title": "Book", "preset_name": "friendly-dragon"}
        )
        book_id = book_resp.json()["book"]["id"]

        response = client.get(f"/v1/storyboard/books/{book_id}/assets")
        assert response.status_code == 200
        data = response.json()
        assert "assets" in data
        assert len(data["assets"]) == 0

