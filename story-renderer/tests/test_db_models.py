"""
Tests for SQLAlchemy database models.

Uses an in-memory SQLite database for fast, isolated testing.
"""
import pytest
import pytest_asyncio
import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.models import (
    Base, Project, Book, Page, Asset, Character, Job, Workspace, CustomTheme, AlbumItem
)


@pytest_asyncio.fixture
async def async_session():
    """Create an async test database session."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session_factory() as session:
        yield session

    await engine.dispose()


def generate_id() -> str:
    """Generate a short UUID for testing."""
    return uuid.uuid4().hex[:8]


# ============================================================
# Project Tests
# ============================================================


class TestProject:
    """Tests for Project model."""

    @pytest.mark.asyncio
    async def test_project_creation(self, async_session):
        """Test creating a project with minimal fields."""
        project = Project(
            id=generate_id(),
            name="Test Project"
        )
        async_session.add(project)
        await async_session.commit()

        assert project.id is not None
        assert project.name == "Test Project"
        assert project.description is None
        assert project.created_at is not None
        assert project.updated_at is not None

    @pytest.mark.asyncio
    async def test_project_with_description(self, async_session):
        """Test creating a project with all fields."""
        project = Project(
            id=generate_id(),
            name="Full Project",
            description="A complete test project"
        )
        async_session.add(project)
        await async_session.commit()

        assert project.description == "A complete test project"


# ============================================================
# Book Tests
# ============================================================


class TestBook:
    """Tests for Book model."""

    @pytest.mark.asyncio
    async def test_book_creation(self, async_session):
        """Test creating a book within a project."""
        project = Project(id=generate_id(), name="Test Project")
        async_session.add(project)
        await async_session.flush()

        book = Book(
            id=generate_id(),
            project_id=project.id,
            title="Test Book"
        )
        async_session.add(book)
        await async_session.commit()

        assert book.id is not None
        assert book.title == "Test Book"
        assert book.project_id == project.id
        assert book.width == 1080  # Default canvas width
        assert book.height == 704   # Default canvas height

    @pytest.mark.asyncio
    async def test_book_with_preset_settings(self, async_session):
        """Test book with embedded preset settings."""
        project = Project(id=generate_id(), name="Test Project")
        async_session.add(project)
        await async_session.flush()

        book = Book(
            id=generate_id(),
            project_id=project.id,
            title="Styled Book",
            preset_name="friendly-dragon",
            art_style="children's book illustration",
            reference_prompt="A friendly cartoon style...",
            default_steps=35,
            default_cfg=5.5
        )
        async_session.add(book)
        await async_session.commit()

        assert book.preset_name == "friendly-dragon"
        assert book.default_steps == 35
        assert book.default_cfg == 5.5

    @pytest.mark.asyncio
    async def test_book_project_relationship(self, async_session):
        """Test book-project relationship."""
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        project = Project(id=generate_id(), name="Parent Project")
        book = Book(
            id=generate_id(),
            project_id=project.id,
            title="Child Book"
        )
        project.books.append(book)
        async_session.add(project)
        await async_session.commit()

        # Use selectinload to eagerly load the relationship
        result = await async_session.execute(
            select(Project).options(selectinload(Project.books)).where(Project.id == project.id)
        )
        loaded_project = result.scalar_one()
        assert len(loaded_project.books) == 1
        assert loaded_project.books[0].title == "Child Book"


# ============================================================
# Page Tests
# ============================================================


class TestPage:
    """Tests for Page model."""

    @pytest.mark.asyncio
    async def test_page_creation(self, async_session):
        """Test creating a page with defaults."""
        project = Project(id=generate_id(), name="Test Project")
        book = Book(id=generate_id(), project_id=project.id, title="Test Book")
        project.books.append(book)
        async_session.add(project)
        await async_session.flush()

        page = Page(
            id=generate_id(),
            book_id=book.id,
            name="Page 1",
            page_number=1
        )
        async_session.add(page)
        await async_session.commit()

        assert page.id is not None
        assert page.name == "Page 1"
        assert page.page_number == 1
        assert page.width == 1080
        assert page.height == 704
        assert page.status == "pending"
        assert page.text_layout == "text-below"

    @pytest.mark.asyncio
    async def test_page_with_overlays(self, async_session):
        """Test page with layer/overlay data."""
        project = Project(id=generate_id(), name="Test Project")
        book = Book(id=generate_id(), project_id=project.id, title="Test Book")
        project.books.append(book)
        async_session.add(project)
        await async_session.flush()

        overlays_data = [
            {"asset_id": "asset1", "x": 100, "y": 200, "scale": 1.0, "z_index": 0},
            {"asset_id": "asset2", "x": 300, "y": 150, "scale": 0.8, "z_index": 1}
        ]

        page = Page(
            id=generate_id(),
            book_id=book.id,
            name="Composed Page",
            page_number=1,
            overlays=overlays_data
        )
        async_session.add(page)
        await async_session.commit()

        assert page.overlays is not None
        assert len(page.overlays) == 2
        assert page.overlays[0]["asset_id"] == "asset1"


# ============================================================
# Asset Tests
# ============================================================


class TestAsset:
    """Tests for Asset model."""

    @pytest.mark.asyncio
    async def test_asset_creation(self, async_session):
        """Test creating an asset."""
        project = Project(id=generate_id(), name="Test Project")
        book = Book(id=generate_id(), project_id=project.id, title="Test Book")
        project.books.append(book)
        async_session.add(project)
        await async_session.flush()

        asset = Asset(
            id=generate_id(),
            book_id=book.id,
            name="Dragon Character",
            asset_type="character",
            image_path="assets/characters/dragon.png"
        )
        async_session.add(asset)
        await async_session.commit()

        assert asset.id is not None
        assert asset.name == "Dragon Character"
        assert asset.asset_type == "character"
        assert asset.has_transparency is False  # Default

    @pytest.mark.asyncio
    async def test_asset_with_generation_info(self, async_session):
        """Test asset with seed and prompt."""
        asset = Asset(
            id=generate_id(),
            name="Generated Scene",
            asset_type="background",
            image_path="backgrounds/scene.png",
            prompt="A magical forest with glowing mushrooms",
            seed=42,
            tags=["forest", "magical", "night"]
        )
        async_session.add(asset)
        await async_session.commit()

        assert asset.prompt == "A magical forest with glowing mushrooms"
        assert asset.seed == 42
        assert asset.tags == ["forest", "magical", "night"]

    @pytest.mark.asyncio
    async def test_asset_types(self, async_session):
        """Test different asset types."""
        for asset_type in ["character", "prop", "background", "variation", "final"]:
            asset = Asset(
                id=generate_id(),
                name=f"Test {asset_type}",
                asset_type=asset_type,
                image_path=f"assets/{asset_type}.png"
            )
            async_session.add(asset)

        await async_session.commit()


# ============================================================
# Character Tests
# ============================================================


class TestCharacter:
    """Tests for Character model."""

    @pytest.mark.asyncio
    async def test_character_creation(self, async_session):
        """Test creating a character."""
        project = Project(id=generate_id(), name="Test Project")
        book = Book(id=generate_id(), project_id=project.id, title="Test Book")
        project.books.append(book)
        async_session.add(project)
        await async_session.flush()

        character = Character(
            id=generate_id(),
            book_id=book.id,
            name="Freya",
            description="A friendly purple dragon"
        )
        async_session.add(character)
        await async_session.commit()

        assert character.id is not None
        assert character.name == "Freya"
        assert character.description == "A friendly purple dragon"

    @pytest.mark.asyncio
    async def test_character_with_features(self, async_session):
        """Test character with visual features and color palette."""
        project = Project(id=generate_id(), name="Test Project")
        book = Book(id=generate_id(), project_id=project.id, title="Test Book")
        project.books.append(book)
        async_session.add(project)
        await async_session.flush()

        character = Character(
            id=generate_id(),
            book_id=book.id,
            name="Freya",
            description="A friendly dragon",
            features={
                "body_color": "purple",
                "eye_color": "golden",
                "accessories": "small crown"
            },
            color_palette=["#8B5CF6", "#F59E0B", "#FBBF24"],
            seed=12345
        )
        async_session.add(character)
        await async_session.commit()

        assert character.features["body_color"] == "purple"
        assert len(character.color_palette) == 3
        assert character.seed == 12345


# ============================================================
# Job Tests
# ============================================================


class TestJob:
    """Tests for Job model."""

    @pytest.mark.asyncio
    async def test_job_creation(self, async_session):
        """Test creating a generation job."""
        job = Job(
            id=generate_id(),
            job_type="scene",
            prompt="A magical forest"
        )
        async_session.add(job)
        await async_session.commit()

        assert job.id is not None
        assert job.job_type == "scene"
        assert job.status == "pending"  # Default
        assert job.progress == 0.0

    @pytest.mark.asyncio
    async def test_job_status_transitions(self, async_session):
        """Test job status transitions."""
        job = Job(
            id=generate_id(),
            job_type="character",
            status="pending"
        )
        async_session.add(job)
        await async_session.commit()

        # Simulate status transitions
        job.status = "generating"
        job.started_at = datetime.utcnow()
        job.progress = 0.5
        await async_session.commit()

        assert job.status == "generating"
        assert job.started_at is not None

        job.status = "complete"
        job.completed_at = datetime.utcnow()
        job.progress = 1.0
        job.outputs = ["output1.png", "output2.png"]
        await async_session.commit()

        assert job.status == "complete"
        assert job.completed_at is not None
        assert len(job.outputs) == 2

    @pytest.mark.asyncio
    async def test_job_with_generation_params(self, async_session):
        """Test job with all generation parameters."""
        job = Job(
            id=generate_id(),
            job_type="scene",
            prompt="A dragon flying over mountains",
            negative_prompt="blurry, low quality",
            seed=42,
            steps=35,
            cfg_scale=5.5,
            width=1080,
            height=704
        )
        async_session.add(job)
        await async_session.commit()

        assert job.seed == 42
        assert job.steps == 35
        assert job.cfg_scale == 5.5
        assert job.width == 1080
        assert job.height == 704


# ============================================================
# Workspace Tests
# ============================================================


class TestWorkspace:
    """Tests for Workspace model."""

    @pytest.mark.asyncio
    async def test_workspace_creation(self, async_session):
        """Test creating a workspace session."""
        workspace = Workspace(
            id=generate_id(),
            date="2024-03-15",
            prompt="A magical forest scene"
        )
        async_session.add(workspace)
        await async_session.commit()

        assert workspace.id is not None
        assert workspace.date == "2024-03-15"
        assert workspace.status == "generating"  # Default

    @pytest.mark.asyncio
    async def test_workspace_with_images(self, async_session):
        """Test workspace with generated images."""
        images_data = [
            {"filename": "img_001.png", "index": 0, "seed": 42, "job_id": "job1"},
            {"filename": "img_002.png", "index": 1, "seed": 43, "job_id": "job2"}
        ]

        workspace = Workspace(
            id=generate_id(),
            date="2024-03-15",
            prompt="Test generation",
            preset_name="friendly-dragon",
            images=images_data,
            status="complete",
            completed_at=datetime.utcnow()
        )
        async_session.add(workspace)
        await async_session.commit()

        assert len(workspace.images) == 2
        assert workspace.images[0]["seed"] == 42
        assert workspace.status == "complete"


# ============================================================
# CustomTheme Tests
# ============================================================


class TestCustomTheme:
    """Tests for CustomTheme model."""

    @pytest.mark.asyncio
    async def test_custom_theme_text_source(self, async_session):
        """Test custom theme from text description."""
        theme = CustomTheme(
            id=generate_id(),
            name="Watercolor Style",
            source="text",
            reference_prompt="soft watercolor painting style with gentle colors",
            art_style="watercolor",
            original_text="I want a soft watercolor look"
        )
        async_session.add(theme)
        await async_session.commit()

        assert theme.source == "text"
        assert theme.original_text is not None
        assert theme.original_image_path is None

    @pytest.mark.asyncio
    async def test_custom_theme_image_source(self, async_session):
        """Test custom theme from image analysis."""
        theme = CustomTheme(
            id=generate_id(),
            name="Analyzed Style",
            source="image",
            reference_prompt="vibrant digital art with bold outlines",
            art_style="digital art",
            original_image_path="uploads/reference.png",
            analysis={
                "medium": "digital illustration",
                "line_work": "bold outlines",
                "colors": "vibrant, saturated"
            }
        )
        async_session.add(theme)
        await async_session.commit()

        assert theme.source == "image"
        assert theme.analysis["medium"] == "digital illustration"

    @pytest.mark.asyncio
    async def test_custom_theme_generation_settings(self, async_session):
        """Test custom theme with custom generation settings."""
        theme = CustomTheme(
            id=generate_id(),
            name="Custom Settings Theme",
            source="text",
            reference_prompt="test style",
            width=512,
            height=512,
            steps=50,
            cfg=7.0
        )
        async_session.add(theme)
        await async_session.commit()

        assert theme.width == 512
        assert theme.height == 512
        assert theme.steps == 50
        assert theme.cfg == 7.0


# ============================================================
# AlbumItem Tests
# ============================================================


class TestAlbumItem:
    """Tests for AlbumItem model."""

    @pytest.mark.asyncio
    async def test_album_item_creation(self, async_session):
        """Test creating an album item."""
        item = AlbumItem(
            id=generate_id(),
            name="Favorite Dragon",
            image_path="album/dragon.png"
        )
        async_session.add(item)
        await async_session.commit()

        assert item.id is not None
        assert item.name == "Favorite Dragon"

    @pytest.mark.asyncio
    async def test_album_item_with_source_tracking(self, async_session):
        """Test album item with original context."""
        item = AlbumItem(
            id=generate_id(),
            name="Saved Variation",
            image_path="album/variation.png",
            source_book_id="book123",
            source_asset_id="asset456",
            prompt="A dragon in a forest",
            seed=42,
            tags=["dragon", "forest", "favorite"]
        )
        async_session.add(item)
        await async_session.commit()

        assert item.source_book_id == "book123"
        assert item.source_asset_id == "asset456"
        assert len(item.tags) == 3


# ============================================================
# Cascade Delete Tests
# ============================================================


class TestCascadeDeletes:
    """Tests for cascade delete behavior."""

    @pytest.mark.asyncio
    async def test_delete_project_cascades_to_books(self, async_session):
        """Test that deleting a project deletes its books."""
        from sqlalchemy import select

        project = Project(id=generate_id(), name="Project to Delete")
        book1 = Book(id=generate_id(), project_id=project.id, title="Book 1")
        book2 = Book(id=generate_id(), project_id=project.id, title="Book 2")
        project.books.extend([book1, book2])
        async_session.add(project)
        await async_session.commit()

        # Verify books exist
        result = await async_session.execute(select(Book))
        assert len(result.scalars().all()) == 2

        # Delete project
        await async_session.delete(project)
        await async_session.commit()

        # Verify books are deleted
        result = await async_session.execute(select(Book))
        assert len(result.scalars().all()) == 0

    @pytest.mark.asyncio
    async def test_delete_book_cascades_to_pages(self, async_session):
        """Test that deleting a book deletes its pages."""
        from sqlalchemy import select

        project = Project(id=generate_id(), name="Test Project")
        book = Book(id=generate_id(), project_id=project.id, title="Book with Pages")
        project.books.append(book)
        async_session.add(project)
        await async_session.flush()

        page1 = Page(id=generate_id(), book_id=book.id, name="Page 1", page_number=1)
        page2 = Page(id=generate_id(), book_id=book.id, name="Page 2", page_number=2)
        async_session.add_all([page1, page2])
        await async_session.commit()

        # Verify pages exist
        result = await async_session.execute(select(Page))
        assert len(result.scalars().all()) == 2

        # Delete book
        await async_session.delete(book)
        await async_session.commit()

        # Verify pages are deleted
        result = await async_session.execute(select(Page))
        assert len(result.scalars().all()) == 0

    @pytest.mark.asyncio
    async def test_delete_book_cascades_to_characters(self, async_session):
        """Test that deleting a book deletes its characters."""
        from sqlalchemy import select

        project = Project(id=generate_id(), name="Test Project")
        book = Book(id=generate_id(), project_id=project.id, title="Book with Characters")
        project.books.append(book)
        async_session.add(project)
        await async_session.flush()

        char1 = Character(id=generate_id(), book_id=book.id, name="Freya")
        char2 = Character(id=generate_id(), book_id=book.id, name="Spark")
        async_session.add_all([char1, char2])
        await async_session.commit()

        # Delete book (cascades)
        await async_session.delete(book)
        await async_session.commit()

        # Verify characters are deleted
        result = await async_session.execute(select(Character))
        assert len(result.scalars().all()) == 0

    @pytest.mark.asyncio
    async def test_delete_book_cascades_to_assets(self, async_session):
        """Test that deleting a book deletes its assets."""
        from sqlalchemy import select

        project = Project(id=generate_id(), name="Test Project")
        book = Book(id=generate_id(), project_id=project.id, title="Book with Assets")
        project.books.append(book)
        async_session.add(project)
        await async_session.flush()

        asset = Asset(
            id=generate_id(),
            book_id=book.id,
            name="Test Asset",
            asset_type="background",
            image_path="assets/bg.png"
        )
        async_session.add(asset)
        await async_session.commit()

        # Delete book (cascades)
        await async_session.delete(book)
        await async_session.commit()

        # Verify assets are deleted
        result = await async_session.execute(select(Asset))
        assert len(result.scalars().all()) == 0


# ============================================================
# Relationship Tests
# ============================================================


class TestRelationships:
    """Tests for model relationships."""

    @pytest.mark.asyncio
    async def test_book_pages_relationship(self, async_session):
        """Test navigating from book to pages."""
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        project = Project(id=generate_id(), name="Test Project")
        book = Book(id=generate_id(), project_id=project.id, title="Test Book")
        project.books.append(book)

        page1 = Page(id=generate_id(), book_id=book.id, name="Page 1", page_number=1)
        page2 = Page(id=generate_id(), book_id=book.id, name="Page 2", page_number=2)
        book.pages.extend([page1, page2])

        async_session.add(project)
        await async_session.commit()

        # Use selectinload to eagerly load the relationship
        result = await async_session.execute(
            select(Book).options(selectinload(Book.pages)).where(Book.id == book.id)
        )
        loaded_book = result.scalar_one()
        assert len(loaded_book.pages) == 2
        assert loaded_book.pages[0].name == "Page 1"

    @pytest.mark.asyncio
    async def test_page_to_book_relationship(self, async_session):
        """Test navigating from page to book."""
        project = Project(id=generate_id(), name="Test Project")
        book = Book(id=generate_id(), project_id=project.id, title="Test Book")
        project.books.append(book)
        async_session.add(project)
        await async_session.flush()

        page = Page(id=generate_id(), book_id=book.id, name="Page 1", page_number=1)
        async_session.add(page)
        await async_session.commit()

        await async_session.refresh(page)
        assert page.book.title == "Test Book"
        assert page.book.project.name == "Test Project"

    @pytest.mark.asyncio
    async def test_multiple_books_in_project(self, async_session):
        """Test project with multiple books."""
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        project = Project(id=generate_id(), name="Book Series")

        for i in range(5):
            book = Book(
                id=generate_id(),
                project_id=project.id,
                title=f"Volume {i + 1}"
            )
            project.books.append(book)

        async_session.add(project)
        await async_session.commit()

        # Use selectinload to eagerly load the relationship
        result = await async_session.execute(
            select(Project).options(selectinload(Project.books)).where(Project.id == project.id)
        )
        loaded_project = result.scalar_one()
        assert len(loaded_project.books) == 5
        assert loaded_project.books[2].title == "Volume 3"

