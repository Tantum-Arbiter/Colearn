"""
FastAPI dependencies for database session and repository injection.

This module provides dependency injection for routes to access the database
through the repository pattern.
"""

from typing import AsyncGenerator, Dict, Any
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database.config import async_session_factory
from database.repository import (
    get_repositories,
    ProjectRepository,
    BookRepository,
    PageRepository,
    AssetRepository,
    CharacterRepository,
    JobRepository,
    WorkspaceRepository,
    CustomThemeRepository,
    AlbumItemRepository,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a database session.
    
    Usage:
        @router.get("/items")
        async def get_items(session: AsyncSession = Depends(get_db_session)):
            ...
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


class Repositories:
    """
    Container for all repositories with a single session.
    
    Usage:
        @router.get("/items")
        async def get_items(repos: Repositories = Depends(get_repos)):
            project = await repos.projects.get_by_id(project_id)
            books = await repos.books.get_by_project(project_id)
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.projects = ProjectRepository(session)
        self.books = BookRepository(session)
        self.pages = PageRepository(session)
        self.assets = AssetRepository(session)
        self.characters = CharacterRepository(session)
        self.jobs = JobRepository(session)
        self.workspaces = WorkspaceRepository(session)
        self.themes = CustomThemeRepository(session)
        self.album = AlbumItemRepository(session)


async def get_repos(
    session: AsyncSession = Depends(get_db_session),
) -> Repositories:
    """
    FastAPI dependency that provides all repositories.
    
    Usage:
        @router.get("/projects")
        async def list_projects(repos: Repositories = Depends(get_repos)):
            return await repos.projects.get_all()
    """
    return Repositories(session)

