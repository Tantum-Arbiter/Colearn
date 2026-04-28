"""
Storyboard Creator - Storage Manager

Handles file persistence to D: drive with book/asset organization.
"""
import os
import json
import shutil
import logging
import uuid
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime

from .models import Book, Asset, Character, Page, AssetType, CustomTheme, Project

logger = logging.getLogger(__name__)

# Default storage root - can be overridden via environment
STORAGE_ROOT = os.environ.get("STORYBOARD_STORAGE", "D:/AI/storyboard")


class StorageManager:
    """Manages file storage for storyboard projects"""

    def __init__(self, root: str = STORAGE_ROOT):
        self.root = Path(root)
        self._ensure_dirs()
        logger.info(f"Storage manager initialized at: {self.root}")

    def _ensure_dirs(self):
        """Create base directory structure"""
        (self.root / "projects").mkdir(parents=True, exist_ok=True)
        (self.root / "books").mkdir(parents=True, exist_ok=True)
        (self.root / "album").mkdir(parents=True, exist_ok=True)
        (self.root / "presets").mkdir(parents=True, exist_ok=True)
        (self.root / "workspace").mkdir(parents=True, exist_ok=True)

    # ============================================================
    # Project Management
    # ============================================================

    def get_project_path(self, project_id: str) -> Path:
        """Get the file path for a project"""
        return self.root / "projects" / f"{project_id}.json"

    def create_project(self, project: Project) -> Project:
        """Create a new project"""
        self._save_project_meta(project)
        logger.info(f"Created project: {project.name} ({project.id})")
        return project

    def _save_project_meta(self, project: Project):
        """Save project metadata to JSON"""
        project.updated_at = datetime.now().isoformat()
        project_path = self.get_project_path(project.id)
        with open(project_path, 'w') as f:
            json.dump(project.model_dump(), f, indent=2)

    def load_project(self, project_id: str) -> Optional[Project]:
        """Load a project by ID"""
        project_path = self.get_project_path(project_id)
        if not project_path.exists():
            return None
        with open(project_path) as f:
            return Project(**json.load(f))

    def list_projects(self) -> List[dict]:
        """List all projects with basic info"""
        projects = []
        projects_dir = self.root / "projects"
        if projects_dir.exists():
            for project_file in projects_dir.glob("*.json"):
                with open(project_file) as f:
                    data = json.load(f)
                    # Get book count and titles
                    book_summaries = []
                    for book_id in data.get("books", []):
                        book = self.load_book(book_id)
                        if book:
                            book_summaries.append({
                                "id": book.id,
                                "title": book.title,
                                "pages": len(book.pages)
                            })
                    projects.append({
                        "id": data["id"],
                        "name": data["name"],
                        "description": data.get("description", ""),
                        "books": book_summaries,
                        "book_count": len(book_summaries),
                        "updated_at": data.get("updated_at")
                    })
        return sorted(projects, key=lambda x: x.get("updated_at", ""), reverse=True)

    def save_project(self, project: Project) -> Project:
        """Save project state to disk"""
        self._save_project_meta(project)
        return project

    def delete_project(self, project_id: str, delete_books: bool = False) -> bool:
        """Delete a project (optionally delete its books too)"""
        project = self.load_project(project_id)
        if not project:
            return False

        if delete_books:
            for book_id in project.books:
                self.delete_book(book_id)

        project_path = self.get_project_path(project_id)
        if project_path.exists():
            project_path.unlink()
            logger.info(f"Deleted project: {project_id}")
            return True
        return False

    def add_book_to_project(self, project_id: str, book_id: str) -> bool:
        """Add a book to a project"""
        project = self.load_project(project_id)
        if not project:
            return False
        if book_id not in project.books:
            project.books.append(book_id)
            self.save_project(project)
        return True

    def remove_book_from_project(self, project_id: str, book_id: str) -> bool:
        """Remove a book from a project (doesn't delete the book)"""
        project = self.load_project(project_id)
        if not project:
            return False
        if book_id in project.books:
            project.books.remove(book_id)
            self.save_project(project)
        return True

    # ============================================================
    # Book Management
    # ============================================================
    
    def get_book_path(self, book_id: str) -> Path:
        """Get the directory path for a book"""
        return self.root / "books" / book_id
    
    def create_book(self, book: Book) -> Book:
        """Create a new book with directory structure"""
        book_path = self.get_book_path(book.id)
        book_path.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        (book_path / "pages").mkdir(exist_ok=True)
        (book_path / "assets" / "characters").mkdir(parents=True, exist_ok=True)
        (book_path / "assets" / "props").mkdir(parents=True, exist_ok=True)
        (book_path / "assets" / "backgrounds").mkdir(parents=True, exist_ok=True)
        (book_path / "variations").mkdir(exist_ok=True)
        
        # Save book metadata
        self._save_book_meta(book)
        logger.info(f"Created book: {book.title} ({book.id})")
        return book
    
    def _save_book_meta(self, book: Book):
        """Save book metadata to JSON"""
        book.updated_at = datetime.now().isoformat()
        meta_path = self.get_book_path(book.id) / "book.json"
        with open(meta_path, "w") as f:
            json.dump(book.model_dump(), f, indent=2)
    
    def load_book(self, book_id: str) -> Optional[Book]:
        """Load a book from disk"""
        meta_path = self.get_book_path(book_id) / "book.json"
        if not meta_path.exists():
            return None
        with open(meta_path) as f:
            return Book(**json.load(f))
    
    def list_books(self) -> List[dict]:
        """List all books with basic info"""
        books = []
        books_dir = self.root / "books"
        if books_dir.exists():
            for book_dir in books_dir.iterdir():
                if book_dir.is_dir():
                    meta_path = book_dir / "book.json"
                    if meta_path.exists():
                        with open(meta_path) as f:
                            data = json.load(f)
                            books.append({
                                "id": data["id"],
                                "title": data["title"],
                                "pages": len(data.get("pages", [])),
                                "updated_at": data.get("updated_at")
                            })
        return sorted(books, key=lambda x: x.get("updated_at", ""), reverse=True)
    
    def save_book(self, book: Book) -> Book:
        """Save book state to disk"""
        self._save_book_meta(book)
        return book
    
    def delete_book(self, book_id: str) -> bool:
        """Delete a book and all its files"""
        book_path = self.get_book_path(book_id)
        if book_path.exists():
            shutil.rmtree(book_path)
            logger.info(f"Deleted book: {book_id}")
            return True
        return False
    
    # ============================================================
    # Asset Management
    # ============================================================
    
    def save_asset(self, book_id: str, asset: Asset, image_data: bytes) -> Asset:
        """Save an asset image and metadata"""
        book_path = self.get_book_path(book_id)
        
        # Determine subdirectory based on type
        if asset.type == AssetType.CHARACTER:
            subdir = "assets/characters"
        elif asset.type == AssetType.PROP:
            subdir = "assets/props"
        elif asset.type == AssetType.BACKGROUND:
            subdir = "assets/backgrounds"
        elif asset.type == AssetType.VARIATION:
            subdir = "variations"
        else:
            subdir = "finals"
        
        # Save image
        filename = f"{asset.id}.png"
        asset.filename = f"{subdir}/{filename}"
        file_path = book_path / subdir / filename
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(file_path, "wb") as f:
            f.write(image_data)
        
        logger.info(f"Saved asset: {asset.name} -> {asset.filename}")
        return asset
    
    def get_asset_path(self, book_id: str, asset: Asset) -> Path:
        """Get full path to an asset file"""
        return self.get_book_path(book_id) / asset.filename
    
    # ============================================================
    # Album (Global saved variations)
    # ============================================================
    
    def save_to_album(self, asset: Asset, image_data: bytes) -> Asset:
        """Save an image to the global album"""
        filename = f"{asset.id}.png"
        asset.filename = f"album/{filename}"
        file_path = self.root / "album" / filename
        
        with open(file_path, "wb") as f:
            f.write(image_data)
        
        # Save metadata
        meta_path = self.root / "album" / f"{asset.id}.json"
        with open(meta_path, "w") as f:
            json.dump(asset.model_dump(), f, indent=2)
        
        logger.info(f"Saved to album: {asset.name}")
        return asset

    def list_album(self) -> List[Asset]:
        """List all images in the album"""
        assets = []
        album_dir = self.root / "album"
        if album_dir.exists():
            for meta_file in album_dir.glob("*.json"):
                with open(meta_file) as f:
                    assets.append(Asset(**json.load(f)))
        return sorted(assets, key=lambda x: x.created_at, reverse=True)

    def get_album_image_path(self, asset_id: str) -> Optional[Path]:
        """Get path to an album image"""
        path = self.root / "album" / f"{asset_id}.png"
        return path if path.exists() else None

    # ============================================================
    # Custom Themes
    # ============================================================

    def save_custom_theme(self, theme: CustomTheme, reference_image_data: Optional[bytes] = None) -> CustomTheme:
        """Save a custom theme to disk"""
        themes_dir = self.root / "presets" / "custom"
        themes_dir.mkdir(parents=True, exist_ok=True)

        # Save reference image if provided
        if reference_image_data:
            image_path = themes_dir / f"{theme.id}_reference.png"
            with open(image_path, "wb") as f:
                f.write(reference_image_data)
            theme.original_image_path = str(image_path)

        # Save theme metadata
        meta_path = themes_dir / f"{theme.id}.json"
        with open(meta_path, "w") as f:
            json.dump(theme.model_dump(), f, indent=2)

        logger.info(f"Saved custom theme: {theme.name} ({theme.id})")
        return theme

    def load_custom_theme(self, theme_id: str) -> Optional[CustomTheme]:
        """Load a custom theme by ID"""
        meta_path = self.root / "presets" / "custom" / f"{theme_id}.json"
        if not meta_path.exists():
            return None
        with open(meta_path) as f:
            return CustomTheme(**json.load(f))

    def list_custom_themes(self) -> List[CustomTheme]:
        """List all custom themes"""
        themes = []
        themes_dir = self.root / "presets" / "custom"
        if themes_dir.exists():
            for meta_file in themes_dir.glob("*.json"):
                try:
                    with open(meta_file) as f:
                        themes.append(CustomTheme(**json.load(f)))
                except Exception as e:
                    logger.warning(f"Failed to load theme {meta_file}: {e}")
        return sorted(themes, key=lambda x: x.created_at, reverse=True)

    def delete_custom_theme(self, theme_id: str) -> bool:
        """Delete a custom theme"""
        themes_dir = self.root / "presets" / "custom"
        meta_path = themes_dir / f"{theme_id}.json"
        image_path = themes_dir / f"{theme_id}_reference.png"

        if not meta_path.exists():
            return False

        meta_path.unlink()
        if image_path.exists():
            image_path.unlink()

        logger.info(f"Deleted custom theme: {theme_id}")
        return True

    def get_custom_theme_image_path(self, theme_id: str) -> Optional[Path]:
        """Get path to a custom theme's reference image"""
        path = self.root / "presets" / "custom" / f"{theme_id}_reference.png"
        return path if path.exists() else None

    # ============================================================
    # CMS Export
    # ============================================================

    def save_cms_export(self, book_id: str, cms_data: dict, export_format: str = "json") -> dict:
        """Save CMS export data to disk"""
        from .models import CMSExport

        exports_dir = self.root / "exports" / book_id
        exports_dir.mkdir(parents=True, exist_ok=True)

        export_id = cms_data.get("id", str(datetime.now().timestamp())[:10])
        result = {"export_id": export_id, "files": []}

        # Save JSON format
        if export_format in ("json", "both"):
            json_path = exports_dir / f"{export_id}.json"
            with open(json_path, "w") as f:
                json.dump(cms_data, f, indent=2)
            result["files"].append(str(json_path))
            logger.info(f"CMS export saved: {json_path}")

        # Save Markdown format
        if export_format in ("markdown", "both"):
            md_path = exports_dir / f"{export_id}.md"
            md_content = self._generate_markdown(cms_data)
            with open(md_path, "w") as f:
                f.write(md_content)
            result["files"].append(str(md_path))
            logger.info(f"Markdown export saved: {md_path}")

        # Copy images to exports folder
        book_path = self.get_book_path(book_id)
        images_dir = exports_dir / "images"
        images_dir.mkdir(exist_ok=True)

        for page in cms_data.get("pages", []):
            if page.get("image_filename"):
                src = book_path / page["image_filename"]
                if src.exists():
                    dst = images_dir / Path(page["image_filename"]).name
                    shutil.copy2(src, dst)

        # Copy cover image
        if cms_data.get("cover_image"):
            src = book_path / cms_data["cover_image"]
            if src.exists():
                dst = images_dir / Path(cms_data["cover_image"]).name
                shutil.copy2(src, dst)

        result["export_path"] = str(exports_dir)
        return result

    def _generate_markdown(self, cms_data: dict) -> str:
        """Generate Markdown from CMS data"""
        lines = [
            f"---",
            f"title: \"{cms_data.get('title', 'Untitled')}\"",
            f"description: \"{cms_data.get('description', '')}\"",
            f"author: \"{cms_data.get('author', '')}\"",
            f"art_style: \"{cms_data.get('art_style', '')}\"",
            f"slug: \"{cms_data.get('slug', '')}\"",
            f"tags: {cms_data.get('tags', [])}",
            f"language: \"{cms_data.get('language', 'en')}\"",
            f"created_at: \"{cms_data.get('created_at', '')}\"",
            f"cover_image: \"images/{Path(cms_data.get('cover_image', '')).name}\"" if cms_data.get('cover_image') else "",
            f"---",
            f"",
            f"# {cms_data.get('title', 'Untitled')}",
            f"",
            f"{cms_data.get('description', '')}",
            f"",
        ]

        for page in cms_data.get("pages", []):
            lines.extend([
                f"## Page {page.get('page_number', '')}",
                f"",
            ])
            if page.get("title"):
                lines.append(f"### {page['title']}")
                lines.append("")
            if page.get("image_filename"):
                img_name = Path(page["image_filename"]).name
                alt = page.get("image_alt", f"Page {page.get('page_number', '')}")
                lines.append(f"![{alt}](images/{img_name})")
                lines.append("")
            if page.get("text"):
                lines.append(page["text"])
                lines.append("")

        return "\n".join(lines)

    def list_exports(self, book_id: str) -> List[dict]:
        """List all exports for a book"""
        exports_dir = self.root / "exports" / book_id
        if not exports_dir.exists():
            return []

        exports = []
        for json_file in exports_dir.glob("*.json"):
            try:
                with open(json_file) as f:
                    data = json.load(f)
                exports.append({
                    "id": json_file.stem,
                    "title": data.get("title", ""),
                    "created_at": data.get("created_at", ""),
                    "pages": len(data.get("pages", []))
                })
            except Exception as e:
                logger.warning(f"Failed to read export {json_file}: {e}")

        return sorted(exports, key=lambda x: x.get("created_at", ""), reverse=True)

    # ============================================================
    # Workspace (Auto-saved generations)
    # ============================================================

    def create_workspace_session(self, prompt: str, preset_name: str = "", book_id: str = "") -> Dict[str, Any]:
        """Create a new workspace session for a generation batch"""
        today = datetime.now().strftime("%Y-%m-%d")
        session_id = f"gen_{uuid.uuid4().hex[:8]}"

        session_dir = self.root / "workspace" / today / session_id
        session_dir.mkdir(parents=True, exist_ok=True)

        session_meta = {
            "id": session_id,
            "date": today,
            "created_at": datetime.now().isoformat(),
            "prompt": prompt,
            "preset_name": preset_name,
            "book_id": book_id,
            "images": [],
            "status": "generating"
        }

        meta_path = session_dir / "session.json"
        with open(meta_path, "w") as f:
            json.dump(session_meta, f, indent=2)

        logger.info(f"Created workspace session: {session_id}")
        return {"session_id": session_id, "date": today, "path": str(session_dir)}

    def save_workspace_image(self, session_id: str, date: str, image_data: bytes,
                             index: int, seed: int = 0, job_id: str = "") -> Dict[str, Any]:
        """Save a generated image to a workspace session"""
        session_dir = self.root / "workspace" / date / session_id

        if not session_dir.exists():
            raise ValueError(f"Session not found: {session_id}")

        # Save image
        filename = f"img_{index:03d}.png"
        image_path = session_dir / filename
        with open(image_path, "wb") as f:
            f.write(image_data)

        # Update session metadata
        meta_path = session_dir / "session.json"
        with open(meta_path) as f:
            session_meta = json.load(f)

        image_info = {
            "filename": filename,
            "index": index,
            "seed": seed,
            "job_id": job_id,
            "saved_at": datetime.now().isoformat()
        }
        session_meta["images"].append(image_info)
        session_meta["updated_at"] = datetime.now().isoformat()

        with open(meta_path, "w") as f:
            json.dump(session_meta, f, indent=2)

        logger.info(f"Saved workspace image: {session_id}/{filename}")
        return {
            "filename": filename,
            "path": str(image_path),
            "session_id": session_id,
            "url": f"/api/storyboard/workspace/{date}/{session_id}/{filename}"
        }

    def complete_workspace_session(self, session_id: str, date: str):
        """Mark a workspace session as complete"""
        session_dir = self.root / "workspace" / date / session_id
        meta_path = session_dir / "session.json"

        if not meta_path.exists():
            return

        with open(meta_path) as f:
            session_meta = json.load(f)

        session_meta["status"] = "complete"
        session_meta["completed_at"] = datetime.now().isoformat()

        with open(meta_path, "w") as f:
            json.dump(session_meta, f, indent=2)

    def list_workspace_dates(self) -> List[str]:
        """List all dates that have workspace sessions"""
        workspace_dir = self.root / "workspace"
        if not workspace_dir.exists():
            return []

        dates = []
        for date_dir in workspace_dir.iterdir():
            if date_dir.is_dir() and len(date_dir.name) == 10:  # YYYY-MM-DD format
                dates.append(date_dir.name)

        return sorted(dates, reverse=True)

    def list_workspace_sessions(self, date: str = None) -> List[Dict[str, Any]]:
        """List all workspace sessions, optionally filtered by date"""
        workspace_dir = self.root / "workspace"
        sessions = []

        if date:
            date_dirs = [workspace_dir / date] if (workspace_dir / date).exists() else []
        else:
            date_dirs = [d for d in workspace_dir.iterdir() if d.is_dir()]

        for date_dir in date_dirs:
            for session_dir in date_dir.iterdir():
                if session_dir.is_dir():
                    meta_path = session_dir / "session.json"
                    if meta_path.exists():
                        try:
                            with open(meta_path) as f:
                                meta = json.load(f)
                            # Add thumbnail info
                            if meta.get("images"):
                                first_img = meta["images"][0]["filename"]
                                meta["thumbnail_url"] = f"/v1/storyboard/workspace/{meta['date']}/{meta['id']}/{first_img}"
                            meta["image_count"] = len(meta.get("images", []))
                            sessions.append(meta)
                        except Exception as e:
                            logger.warning(f"Failed to read session {session_dir}: {e}")

        return sorted(sessions, key=lambda x: x.get("created_at", ""), reverse=True)

    def get_workspace_session(self, session_id: str, date: str) -> Optional[Dict[str, Any]]:
        """Get a specific workspace session"""
        session_dir = self.root / "workspace" / date / session_id
        meta_path = session_dir / "session.json"

        if not meta_path.exists():
            return None

        with open(meta_path) as f:
            meta = json.load(f)

        # Add full URLs for all images
        for img in meta.get("images", []):
            img["url"] = f"/v1/storyboard/workspace/{date}/{session_id}/{img['filename']}"

        return meta

    def get_workspace_image_path(self, session_id: str, date: str, filename: str) -> Optional[Path]:
        """Get the path to a workspace image"""
        image_path = self.root / "workspace" / date / session_id / filename
        return image_path if image_path.exists() else None

    def delete_workspace_session(self, session_id: str, date: str) -> bool:
        """Delete a workspace session and all its files"""
        session_dir = self.root / "workspace" / date / session_id
        if session_dir.exists():
            shutil.rmtree(session_dir)
            logger.info(f"Deleted workspace session: {session_id}")
            return True
        return False


# Global storage instance
storage = StorageManager()

