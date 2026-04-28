"""
Repository unit tests.

Tests all repository classes using an in-memory SQLite database.
"""

import pytest
import pytest_asyncio
from datetime import datetime
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from database.models import (
    Base, Project, Book, Page, Asset, Character, Job, Workspace, CustomTheme, AlbumItem
)
from database.repository import (
    ProjectRepository,
    BookRepository,
    PageRepository,
    AssetRepository,
    CharacterRepository,
    JobRepository,
    WorkspaceRepository,
    CustomThemeRepository,
    AlbumItemRepository,
    get_repositories,
)


def generate_id() -> str:
    """Generate a simple test ID."""
    import uuid
    return uuid.uuid4().hex[:16]


# ============================================================
# Fixtures
# ============================================================


@pytest_asyncio.fixture
async def async_engine():
    """Create an in-memory SQLite engine for testing."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    await engine.dispose()


@pytest_asyncio.fixture
async def async_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create an async session for testing."""
    session_factory = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def sample_project(async_session) -> Project:
    """Create a sample project."""
    project = Project(id=generate_id(), name="Test Project", description="A test project")
    async_session.add(project)
    await async_session.commit()
    await async_session.refresh(project)
    return project


@pytest_asyncio.fixture
async def sample_book(async_session, sample_project) -> Book:
    """Create a sample book."""
    book = Book(
        id=generate_id(),
        project_id=sample_project.id,
        title="Test Book",
        description="A test book",
    )
    async_session.add(book)
    await async_session.commit()
    await async_session.refresh(book)
    return book


# ============================================================
# Project Repository Tests
# ============================================================


class TestProjectRepository:
    """Tests for ProjectRepository."""

    @pytest.mark.asyncio
    async def test_create_project(self, async_session):
        """Test creating a project."""
        repo = ProjectRepository(async_session)
        project = Project(id=generate_id(), name="New Project")
        
        result = await repo.create(project)
        
        assert result.id == project.id
        assert result.name == "New Project"

    @pytest.mark.asyncio
    async def test_get_by_id(self, async_session, sample_project):
        """Test getting a project by ID."""
        repo = ProjectRepository(async_session)
        
        result = await repo.get_by_id(sample_project.id)
        
        assert result is not None
        assert result.id == sample_project.id
        assert result.name == sample_project.name

    @pytest.mark.asyncio
    async def test_get_by_id_not_found(self, async_session):
        """Test getting a non-existent project."""
        repo = ProjectRepository(async_session)
        
        result = await repo.get_by_id("nonexistent")
        
        assert result is None

    @pytest.mark.asyncio
    async def test_get_all(self, async_session):
        """Test getting all projects."""
        repo = ProjectRepository(async_session)
        
        # Create multiple projects
        for i in range(3):
            project = Project(id=generate_id(), name=f"Project {i}")
            await repo.create(project)
        
        result = await repo.get_all()
        
        assert len(result) == 3

    @pytest.mark.asyncio
    async def test_update_project(self, async_session, sample_project):
        """Test updating a project."""
        repo = ProjectRepository(async_session)
        
        result = await repo.update(sample_project, {"name": "Updated Name"})
        
        assert result.name == "Updated Name"

    @pytest.mark.asyncio
    async def test_delete_project(self, async_session, sample_project):
        """Test deleting a project."""
        repo = ProjectRepository(async_session)

        await repo.delete(sample_project)
        result = await repo.get_by_id(sample_project.id)

        assert result is None

    @pytest.mark.asyncio
    async def test_search_projects(self, async_session):
        """Test searching projects by name."""
        repo = ProjectRepository(async_session)

        await repo.create(Project(id=generate_id(), name="Alpha Project"))
        await repo.create(Project(id=generate_id(), name="Beta Book"))
        await repo.create(Project(id=generate_id(), name="Alpha Test"))

        result = await repo.search("Alpha")

        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_count(self, async_session):
        """Test counting projects."""
        repo = ProjectRepository(async_session)

        for i in range(5):
            await repo.create(Project(id=generate_id(), name=f"Project {i}"))

        count = await repo.count()

        assert count == 5

    @pytest.mark.asyncio
    async def test_exists(self, async_session, sample_project):
        """Test checking if project exists."""
        repo = ProjectRepository(async_session)

        assert await repo.exists(sample_project.id) is True
        assert await repo.exists("nonexistent") is False


# ============================================================
# Book Repository Tests
# ============================================================


class TestBookRepository:
    """Tests for BookRepository."""

    @pytest.mark.asyncio
    async def test_create_book(self, async_session, sample_project):
        """Test creating a book."""
        repo = BookRepository(async_session)
        book = Book(
            id=generate_id(),
            project_id=sample_project.id,
            title="New Book",
        )

        result = await repo.create(book)

        assert result.id == book.id
        assert result.title == "New Book"

    @pytest.mark.asyncio
    async def test_get_by_project(self, async_session, sample_project):
        """Test getting books by project."""
        repo = BookRepository(async_session)

        for i in range(3):
            book = Book(
                id=generate_id(),
                project_id=sample_project.id,
                title=f"Book {i}",
            )
            await repo.create(book)

        result = await repo.get_by_project(sample_project.id)

        assert len(result) == 3

    @pytest.mark.asyncio
    async def test_get_with_pages(self, async_session, sample_book):
        """Test getting book with pages loaded."""
        # Add pages to the book
        for i in range(2):
            page = Page(
                id=generate_id(),
                book_id=sample_book.id,
                name=f"Page {i}",
                page_number=i + 1,
            )
            async_session.add(page)
        await async_session.commit()

        repo = BookRepository(async_session)
        result = await repo.get_with_pages(sample_book.id)

        assert result is not None
        assert len(result.pages) == 2


# ============================================================
# Page Repository Tests
# ============================================================


class TestPageRepository:
    """Tests for PageRepository."""

    @pytest.mark.asyncio
    async def test_create_page(self, async_session, sample_book):
        """Test creating a page."""
        repo = PageRepository(async_session)
        page = Page(
            id=generate_id(),
            book_id=sample_book.id,
            name="New Page",
            page_number=1,
        )

        result = await repo.create(page)

        assert result.name == "New Page"
        assert result.page_number == 1

    @pytest.mark.asyncio
    async def test_get_by_book_ordered(self, async_session, sample_book):
        """Test getting pages ordered by page number."""
        repo = PageRepository(async_session)

        # Create pages out of order
        await repo.create(Page(id=generate_id(), book_id=sample_book.id, name="Page 3", page_number=3))
        await repo.create(Page(id=generate_id(), book_id=sample_book.id, name="Page 1", page_number=1))
        await repo.create(Page(id=generate_id(), book_id=sample_book.id, name="Page 2", page_number=2))

        result = await repo.get_by_book(sample_book.id)

        assert len(result) == 3
        assert result[0].page_number == 1
        assert result[1].page_number == 2
        assert result[2].page_number == 3

    @pytest.mark.asyncio
    async def test_get_by_book_and_number(self, async_session, sample_book):
        """Test getting a specific page by number."""
        repo = PageRepository(async_session)

        await repo.create(Page(id=generate_id(), book_id=sample_book.id, name="Target", page_number=5))

        result = await repo.get_by_book_and_number(sample_book.id, 5)

        assert result is not None
        assert result.name == "Target"

    @pytest.mark.asyncio
    async def test_count_by_book(self, async_session, sample_book):
        """Test counting pages in a book."""
        repo = PageRepository(async_session)

        for i in range(4):
            await repo.create(Page(id=generate_id(), book_id=sample_book.id, name=f"Page {i}", page_number=i))

        count = await repo.count_by_book(sample_book.id)

        assert count == 4

    @pytest.mark.asyncio
    async def test_reorder_pages(self, async_session, sample_book):
        """Test reordering pages."""
        repo = PageRepository(async_session)

        page1 = await repo.create(Page(id=generate_id(), book_id=sample_book.id, name="A", page_number=1))
        page2 = await repo.create(Page(id=generate_id(), book_id=sample_book.id, name="B", page_number=2))
        page3 = await repo.create(Page(id=generate_id(), book_id=sample_book.id, name="C", page_number=3))

        # Reorder: B, C, A
        await repo.reorder_pages(sample_book.id, [page2.id, page3.id, page1.id])

        result = await repo.get_by_book(sample_book.id)

        assert result[0].name == "B"
        assert result[1].name == "C"
        assert result[2].name == "A"


# ============================================================
# Asset Repository Tests
# ============================================================


class TestAssetRepository:
    """Tests for AssetRepository."""

    @pytest.mark.asyncio
    async def test_create_asset(self, async_session, sample_book):
        """Test creating an asset."""
        repo = AssetRepository(async_session)
        asset = Asset(
            id=generate_id(),
            book_id=sample_book.id,
            name="Character Asset",
            asset_type="character",
            image_path="/path/to/image.png",
        )

        result = await repo.create(asset)

        assert result.name == "Character Asset"
        assert result.asset_type == "character"

    @pytest.mark.asyncio
    async def test_get_by_book_with_type_filter(self, async_session, sample_book):
        """Test getting assets filtered by type."""
        repo = AssetRepository(async_session)

        await repo.create(Asset(id=generate_id(), book_id=sample_book.id, name="Char 1", asset_type="character", image_path="/a.png"))
        await repo.create(Asset(id=generate_id(), book_id=sample_book.id, name="Prop 1", asset_type="prop", image_path="/b.png"))
        await repo.create(Asset(id=generate_id(), book_id=sample_book.id, name="Char 2", asset_type="character", image_path="/c.png"))

        result = await repo.get_by_book(sample_book.id, asset_type="character")

        assert len(result) == 2
        assert all(a.asset_type == "character" for a in result)

    @pytest.mark.asyncio
    async def test_get_characters(self, async_session, sample_book):
        """Test getting character assets."""
        repo = AssetRepository(async_session)

        await repo.create(Asset(id=generate_id(), book_id=sample_book.id, name="Hero", asset_type="character", image_path="/hero.png"))
        await repo.create(Asset(id=generate_id(), book_id=sample_book.id, name="BG", asset_type="background", image_path="/bg.png"))

        result = await repo.get_characters(sample_book.id)

        assert len(result) == 1
        assert result[0].name == "Hero"

    @pytest.mark.asyncio
    async def test_search_by_tags(self, async_session, sample_book):
        """Test searching assets by tags."""
        repo = AssetRepository(async_session)

        await repo.create(Asset(id=generate_id(), book_id=sample_book.id, name="Tagged", asset_type="prop", image_path="/a.png", tags=["fantasy", "magic"]))
        await repo.create(Asset(id=generate_id(), book_id=sample_book.id, name="Other", asset_type="prop", image_path="/b.png", tags=["scifi"]))

        result = await repo.search_by_tags(["magic"], book_id=sample_book.id)

        assert len(result) == 1
        assert result[0].name == "Tagged"


# ============================================================
# Character Repository Tests
# ============================================================


class TestCharacterRepository:
    """Tests for CharacterRepository."""

    @pytest.mark.asyncio
    async def test_create_character(self, async_session, sample_book):
        """Test creating a character."""
        repo = CharacterRepository(async_session)
        character = Character(
            id=generate_id(),
            book_id=sample_book.id,
            name="Freya",
            description="A brave girl",
        )

        result = await repo.create(character)

        assert result.name == "Freya"

    @pytest.mark.asyncio
    async def test_get_by_book(self, async_session, sample_book):
        """Test getting characters by book."""
        repo = CharacterRepository(async_session)

        await repo.create(Character(id=generate_id(), book_id=sample_book.id, name="Charlie"))
        await repo.create(Character(id=generate_id(), book_id=sample_book.id, name="Alice"))

        result = await repo.get_by_book(sample_book.id)

        assert len(result) == 2
        # Should be ordered by name
        assert result[0].name == "Alice"
        assert result[1].name == "Charlie"

    @pytest.mark.asyncio
    async def test_get_by_name(self, async_session, sample_book):
        """Test getting character by name."""
        repo = CharacterRepository(async_session)

        await repo.create(Character(id=generate_id(), book_id=sample_book.id, name="Unique"))

        result = await repo.get_by_name(sample_book.id, "Unique")

        assert result is not None
        assert result.name == "Unique"

    @pytest.mark.asyncio
    async def test_search_characters(self, async_session, sample_book):
        """Test searching characters."""
        repo = CharacterRepository(async_session)

        await repo.create(Character(id=generate_id(), book_id=sample_book.id, name="Dragon", description="A fierce beast"))
        await repo.create(Character(id=generate_id(), book_id=sample_book.id, name="Knight", description="A brave warrior"))

        result = await repo.search("fierce", book_id=sample_book.id)

        assert len(result) == 1
        assert result[0].name == "Dragon"


# ============================================================
# Job Repository Tests
# ============================================================


class TestJobRepository:
    """Tests for JobRepository."""

    @pytest.mark.asyncio
    async def test_create_job(self, async_session):
        """Test creating a job."""
        repo = JobRepository(async_session)
        job = Job(
            id=generate_id(),
            job_type="scene",
            status="pending",
            prompt="A beautiful sunset",
        )

        result = await repo.create(job)

        assert result.job_type == "scene"
        assert result.status == "pending"

    @pytest.mark.asyncio
    async def test_get_by_status(self, async_session):
        """Test getting jobs by status."""
        repo = JobRepository(async_session)

        await repo.create(Job(id=generate_id(), job_type="scene", status="pending"))
        await repo.create(Job(id=generate_id(), job_type="scene", status="generating"))
        await repo.create(Job(id=generate_id(), job_type="scene", status="pending"))

        result = await repo.get_by_status("pending")

        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_get_pending_jobs(self, async_session):
        """Test getting pending jobs."""
        repo = JobRepository(async_session)

        await repo.create(Job(id=generate_id(), job_type="scene", status="pending"))
        await repo.create(Job(id=generate_id(), job_type="scene", status="complete"))

        result = await repo.get_pending_jobs()

        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_active_jobs(self, async_session):
        """Test getting active (generating) jobs."""
        repo = JobRepository(async_session)

        await repo.create(Job(id=generate_id(), job_type="scene", status="generating"))
        await repo.create(Job(id=generate_id(), job_type="scene", status="pending"))

        result = await repo.get_active_jobs()

        assert len(result) == 1
        assert result[0].status == "generating"

    @pytest.mark.asyncio
    async def test_update_status(self, async_session):
        """Test updating job status."""
        repo = JobRepository(async_session)

        job = await repo.create(Job(id=generate_id(), job_type="scene", status="pending"))

        result = await repo.update_status(
            job.id,
            "generating",
            progress=0.5,
        )

        assert result.status == "generating"
        assert result.progress == 0.5
        assert result.started_at is not None

    @pytest.mark.asyncio
    async def test_update_status_complete(self, async_session):
        """Test marking job as complete."""
        repo = JobRepository(async_session)

        job = await repo.create(Job(id=generate_id(), job_type="scene", status="generating"))

        result = await repo.update_status(
            job.id,
            "completed",
            outputs=["/output/image.png"],
        )

        assert result.status == "completed"
        assert result.outputs == ["/output/image.png"]
        assert result.completed_at is not None


# ============================================================
# Workspace Repository Tests
# ============================================================


class TestWorkspaceRepository:
    """Tests for WorkspaceRepository."""

    @pytest.mark.asyncio
    async def test_create_workspace(self, async_session):
        """Test creating a workspace."""
        repo = WorkspaceRepository(async_session)
        workspace = Workspace(
            id=generate_id(),
            date="2024-01-15",
            prompt="Test prompt",
            status="generating",
        )

        result = await repo.create(workspace)

        assert result.date == "2024-01-15"
        assert result.status == "generating"

    @pytest.mark.asyncio
    async def test_get_by_date(self, async_session):
        """Test getting workspaces by date."""
        repo = WorkspaceRepository(async_session)

        await repo.create(Workspace(id=generate_id(), date="2024-01-15"))
        await repo.create(Workspace(id=generate_id(), date="2024-01-15"))
        await repo.create(Workspace(id=generate_id(), date="2024-01-16"))

        result = await repo.get_by_date("2024-01-15")

        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_list_dates(self, async_session):
        """Test listing unique workspace dates."""
        repo = WorkspaceRepository(async_session)

        await repo.create(Workspace(id=generate_id(), date="2024-01-10"))
        await repo.create(Workspace(id=generate_id(), date="2024-01-15"))
        await repo.create(Workspace(id=generate_id(), date="2024-01-10"))

        result = await repo.list_dates()

        assert len(result) == 2
        assert "2024-01-15" in result
        assert "2024-01-10" in result

    @pytest.mark.asyncio
    async def test_mark_complete(self, async_session):
        """Test marking workspace as complete."""
        repo = WorkspaceRepository(async_session)

        workspace = await repo.create(Workspace(id=generate_id(), date="2024-01-15", status="generating"))

        result = await repo.mark_complete(workspace.id)

        assert result.status == "complete"
        assert result.completed_at is not None

    @pytest.mark.asyncio
    async def test_add_image(self, async_session):
        """Test adding an image to workspace."""
        repo = WorkspaceRepository(async_session)

        workspace = await repo.create(Workspace(id=generate_id(), date="2024-01-15"))

        result = await repo.add_image(workspace.id, {"filename": "img.png", "index": 0})

        assert len(result.images) == 1
        assert result.images[0]["filename"] == "img.png"


# ============================================================
# CustomTheme Repository Tests
# ============================================================


class TestCustomThemeRepository:
    """Tests for CustomThemeRepository."""

    @pytest.mark.asyncio
    async def test_create_theme(self, async_session):
        """Test creating a custom theme."""
        repo = CustomThemeRepository(async_session)
        theme = CustomTheme(
            id=generate_id(),
            name="Watercolor Dreams",
            source="text",
            reference_prompt="soft watercolor painting style",
        )

        result = await repo.create(theme)

        assert result.name == "Watercolor Dreams"
        assert result.source == "text"

    @pytest.mark.asyncio
    async def test_get_by_source(self, async_session):
        """Test getting themes by source type."""
        repo = CustomThemeRepository(async_session)

        await repo.create(CustomTheme(id=generate_id(), name="A", source="text", reference_prompt="p1"))
        await repo.create(CustomTheme(id=generate_id(), name="B", source="image", reference_prompt="p2"))
        await repo.create(CustomTheme(id=generate_id(), name="C", source="text", reference_prompt="p3"))

        result = await repo.get_by_source("text")

        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_get_by_name(self, async_session):
        """Test getting theme by exact name."""
        repo = CustomThemeRepository(async_session)

        await repo.create(CustomTheme(id=generate_id(), name="Unique Style", source="text", reference_prompt="p"))

        result = await repo.get_by_name("Unique Style")

        assert result is not None
        assert result.name == "Unique Style"

    @pytest.mark.asyncio
    async def test_search_themes(self, async_session):
        """Test searching themes."""
        repo = CustomThemeRepository(async_session)

        await repo.create(CustomTheme(id=generate_id(), name="Oil Painting", source="text", reference_prompt="p", art_style="classical"))
        await repo.create(CustomTheme(id=generate_id(), name="Digital Art", source="image", reference_prompt="p", art_style="modern"))

        result = await repo.search("classical")

        assert len(result) == 1
        assert result[0].name == "Oil Painting"


# ============================================================
# AlbumItem Repository Tests
# ============================================================


class TestAlbumItemRepository:
    """Tests for AlbumItemRepository."""

    @pytest.mark.asyncio
    async def test_create_album_item(self, async_session):
        """Test creating an album item."""
        repo = AlbumItemRepository(async_session)
        item = AlbumItem(
            id=generate_id(),
            name="Favorite Image",
            image_path="/album/favorite.png",
        )

        result = await repo.create(item)

        assert result.name == "Favorite Image"

    @pytest.mark.asyncio
    async def test_get_by_source_book(self, async_session, sample_book):
        """Test getting album items by source book."""
        repo = AlbumItemRepository(async_session)

        await repo.create(AlbumItem(id=generate_id(), name="A", image_path="/a.png", source_book_id=sample_book.id))
        await repo.create(AlbumItem(id=generate_id(), name="B", image_path="/b.png", source_book_id=sample_book.id))
        await repo.create(AlbumItem(id=generate_id(), name="C", image_path="/c.png", source_book_id="other"))

        result = await repo.get_by_source_book(sample_book.id)

        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_search_by_tags(self, async_session):
        """Test searching album items by tags."""
        repo = AlbumItemRepository(async_session)

        await repo.create(AlbumItem(id=generate_id(), name="Tagged", image_path="/a.png", tags=["favorite", "hero"]))
        await repo.create(AlbumItem(id=generate_id(), name="Other", image_path="/b.png", tags=["villain"]))

        result = await repo.search_by_tags(["hero"])

        assert len(result) == 1
        assert result[0].name == "Tagged"

    @pytest.mark.asyncio
    async def test_search_album_items(self, async_session):
        """Test searching album items by name/description."""
        repo = AlbumItemRepository(async_session)

        await repo.create(AlbumItem(id=generate_id(), name="Sunset Scene", image_path="/a.png", description="Beautiful sunset"))
        await repo.create(AlbumItem(id=generate_id(), name="Mountain View", image_path="/b.png", description="Rocky mountains"))

        result = await repo.search("sunset")

        assert len(result) == 1
        assert result[0].name == "Sunset Scene"


# ============================================================
# Repository Factory Tests
# ============================================================


class TestGetRepositories:
    """Tests for the get_repositories factory function."""

    @pytest.mark.asyncio
    async def test_get_repositories(self, async_session):
        """Test getting all repositories."""
        repos = get_repositories(async_session)

        assert "projects" in repos
        assert "books" in repos
        assert "pages" in repos
        assert "assets" in repos
        assert "characters" in repos
        assert "jobs" in repos
        assert "workspaces" in repos
        assert "themes" in repos
        assert "album" in repos

        assert isinstance(repos["projects"], ProjectRepository)
        assert isinstance(repos["books"], BookRepository)
