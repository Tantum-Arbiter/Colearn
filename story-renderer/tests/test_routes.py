"""
Tests for storyboard API routes.
"""
import pytest
import pytest_asyncio
import tempfile
import shutil
import os
from unittest.mock import MagicMock, AsyncMock, patch

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from storyboard.routes import router
from storyboard.storage import StorageManager
from storyboard.dependencies import get_repos, Repositories
from database.models import Base


@pytest.fixture
def temp_storage():
    """Create temporary storage for tests."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)


@pytest.fixture
def app(temp_storage):
    """Create test FastAPI app with database."""
    import asyncio

    # Create an in-memory SQLite engine for testing
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Create tables synchronously
    async def create_tables():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.get_event_loop().run_until_complete(create_tables())

    # Create session factory
    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    # Override the get_repos dependency
    async def get_test_repos():
        async with async_session() as session:
            try:
                yield Repositories(session)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    # Patch storage
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
        mock_storage_module.save_cms_export = mock_storage.save_cms_export
        mock_storage_module.list_exports = mock_storage.list_exports

        app = FastAPI()
        app.include_router(router)

        # Override the dependency
        app.dependency_overrides[get_repos] = get_test_repos

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
        response = client.get("/v1/storyboard/presets/bluey-cartoon")
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
                "preset_name": "bluey-cartoon"
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
                "preset_name": "bluey-cartoon"
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
            json={"title": "Book", "preset_name": "bluey-cartoon"}
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
            json={"title": "Book", "preset_name": "bluey-cartoon"}
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
            json={"title": "Book", "preset_name": "bluey-cartoon"}
        )
        book_id = book_resp.json()["book"]["id"]

        response = client.get(f"/v1/storyboard/books/{book_id}/assets")
        assert response.status_code == 200
        data = response.json()
        assert "assets" in data
        assert len(data["assets"]) == 0


class TestProjectEndpoints:
    """Tests for project management endpoints."""

    def test_list_projects_empty(self, client):
        """Should return empty list initially."""
        response = client.get("/v1/storyboard/projects")
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data

    def test_create_project(self, client):
        """Should create a new project."""
        response = client.post(
            "/v1/storyboard/projects",
            json={"name": "Test Project", "description": "A test project"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "project" in data
        assert data["project"]["name"] == "Test Project"
        assert data["project"]["description"] == "A test project"

    def test_get_project(self, client):
        """Should get project by ID."""
        # Create a project first
        create_resp = client.post(
            "/v1/storyboard/projects",
            json={"name": "Get Test Project"}
        )
        project_id = create_resp.json()["project"]["id"]

        response = client.get(f"/v1/storyboard/projects/{project_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["project"]["name"] == "Get Test Project"

    def test_get_nonexistent_project(self, client):
        """Should return 404 for nonexistent project."""
        response = client.get("/v1/storyboard/projects/nonexistent-id")
        assert response.status_code == 404

    def test_update_project(self, client):
        """Should update project."""
        create_resp = client.post(
            "/v1/storyboard/projects",
            json={"name": "Old Name"}
        )
        project_id = create_resp.json()["project"]["id"]

        response = client.put(
            f"/v1/storyboard/projects/{project_id}",
            json={"name": "New Name", "description": "Updated description"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["project"]["name"] == "New Name"
        assert data["project"]["description"] == "Updated description"

    def test_delete_project(self, client):
        """Should delete project."""
        create_resp = client.post(
            "/v1/storyboard/projects",
            json={"name": "To Delete"}
        )
        project_id = create_resp.json()["project"]["id"]

        response = client.delete(f"/v1/storyboard/projects/{project_id}")
        assert response.status_code == 200

        # Verify deleted
        get_resp = client.get(f"/v1/storyboard/projects/{project_id}")
        assert get_resp.status_code == 404

    def test_add_book_to_project(self, client):
        """Should add a book to a project."""
        # Create project
        project_resp = client.post(
            "/v1/storyboard/projects",
            json={"name": "Project with Book"}
        )
        project_id = project_resp.json()["project"]["id"]

        # Create book
        book_resp = client.post(
            "/v1/storyboard/books",
            json={"title": "Book to Add", "preset_name": "bluey-cartoon"}
        )
        book_id = book_resp.json()["book"]["id"]

        # Add book to project
        response = client.post(f"/v1/storyboard/projects/{project_id}/books/{book_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "added"


class TestBookEndpointsExtended:
    """Extended tests for book endpoints."""

    def test_get_book(self, client):
        """Should get book by ID."""
        create_resp = client.post(
            "/v1/storyboard/books",
            json={"title": "Get Test Book", "preset_name": "bluey-cartoon"}
        )
        book_id = create_resp.json()["book"]["id"]

        response = client.get(f"/v1/storyboard/books/{book_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["book"]["title"] == "Get Test Book"

    def test_get_nonexistent_book(self, client):
        """Should return 404 for nonexistent book."""
        response = client.get("/v1/storyboard/books/nonexistent-id")
        assert response.status_code == 404

    def test_update_book(self, client):
        """Should update book."""
        create_resp = client.post(
            "/v1/storyboard/books",
            json={"title": "Old Title", "preset_name": "bluey-cartoon"}
        )
        book_id = create_resp.json()["book"]["id"]

        response = client.put(
            f"/v1/storyboard/books/{book_id}",
            json={"title": "New Title", "description": "Updated"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["book"]["title"] == "New Title"

    def test_delete_book(self, client):
        """Should delete book."""
        create_resp = client.post(
            "/v1/storyboard/books",
            json={"title": "To Delete", "preset_name": "bluey-cartoon"}
        )
        book_id = create_resp.json()["book"]["id"]

        response = client.delete(f"/v1/storyboard/books/{book_id}")
        assert response.status_code == 200

        # Verify deleted
        get_resp = client.get(f"/v1/storyboard/books/{book_id}")
        assert get_resp.status_code == 404



class TestPageEndpointsExtended:
    """Extended tests for page endpoints."""

    def test_update_page(self, client):
        """Should update a page."""
        # Create book and page
        book_resp = client.post(
            "/v1/storyboard/books",
            json={"title": "Book", "preset_name": "bluey-cartoon"}
        )
        book_id = book_resp.json()["book"]["id"]

        page_resp = client.post(
            f"/v1/storyboard/books/{book_id}/pages",
            params={"number": 1, "name": "Original Name"}
        )
        page_id = page_resp.json()["page"]["id"]

        # Update page
        response = client.put(
            f"/v1/storyboard/books/{book_id}/pages/{page_id}",
            json={"name": "Updated Name"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["page"]["name"] == "Updated Name"

    def test_delete_page(self, client):
        """Should delete a page."""
        book_resp = client.post(
            "/v1/storyboard/books",
            json={"title": "Book", "preset_name": "bluey-cartoon"}
        )
        book_id = book_resp.json()["book"]["id"]

        page_resp = client.post(
            f"/v1/storyboard/books/{book_id}/pages",
            params={"number": 1}
        )
        page_id = page_resp.json()["page"]["id"]

        response = client.delete(f"/v1/storyboard/books/{book_id}/pages/{page_id}")
        assert response.status_code == 200


class TestWorkspaceEndpoints:
    """Tests for workspace endpoints."""

    def test_list_workspace_empty(self, client):
        """Should return empty workspace list."""
        response = client.get("/v1/storyboard/workspace")
        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data or "dates" in data


class TestThemeEndpoints:
    """Tests for custom theme endpoints."""

    def test_list_themes_empty(self, client):
        """Should return empty themes list."""
        response = client.get("/v1/storyboard/themes")
        assert response.status_code == 200
        data = response.json()
        assert "themes" in data

    def test_get_nonexistent_theme(self, client):
        """Should return 404 for nonexistent theme."""
        response = client.get("/v1/storyboard/themes/nonexistent-id")
        assert response.status_code == 404


class TestAlbumEndpoints:
    """Tests for album endpoints."""

    def test_list_album_empty(self, client):
        """Should return empty album list."""
        response = client.get("/v1/storyboard/album")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data or "assets" in data


class TestJobEndpoints:
    """Tests for job endpoints.

    Note: Job queue is not initialized during tests (it's set in main.py),
    so job-related endpoints that depend on _job_queue will return 500.
    These tests verify the behavior when the queue is unavailable.
    """

    def test_get_job_without_queue(self, client):
        """Should return 500 when job queue is not initialized."""
        response = client.get("/v1/storyboard/jobs/nonexistent-id")
        # Job queue is not initialized in tests, so we get 500
        assert response.status_code == 500
        assert "Job queue not initialized" in response.json()["detail"]


class TestCharacterEndpoints:
    """Tests for character endpoints."""

    def test_create_character(self, client):
        """Should create a character for a book."""
        book_resp = client.post(
            "/v1/storyboard/books",
            json={"title": "Book", "preset_name": "bluey-cartoon"}
        )
        book_id = book_resp.json()["book"]["id"]

        # Character endpoint uses query params, not JSON body
        response = client.post(
            f"/v1/storyboard/books/{book_id}/characters",
            params={
                "name": "Test Character",
                "description": "A friendly test character"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "character" in data
        assert data["character"]["name"] == "Test Character"

