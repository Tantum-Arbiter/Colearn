"""
Story Renderer Configuration
"""
import os
from dataclasses import dataclass

@dataclass
class Config:
    # Server settings (0.0.0.0 = accessible from network)
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ComfyUI settings
    COMFYUI_HOST: str = "127.0.0.1"
    COMFYUI_PORT: int = 8188
    COMFYUI_OUTPUT_DIR: str = r"C:\ComfyUI\output"  # ComfyUI output folder for cleanup

    # Worker settings
    RENDER_WORKERS: int = 1  # Single GPU critical section
    JOB_QUEUE_MAX: int = 20

    # Authentication
    WORKER_API_KEY: str = ""

    # Output settings
    OUTPUT_DIR: str = "./outputs"

    # Default generation settings (matching user's workflow)
    DEFAULT_MODEL: str = "sd3.5_medium_incl_clips_t5xxlfp8scaled"
    DEFAULT_STEPS: int = 24
    DEFAULT_CFG: float = 4.5
    DEFAULT_WIDTH: int = 1024
    DEFAULT_HEIGHT: int = 704  # Landscape for storybook pages

    # Negative prompt for children's books
    DEFAULT_NEGATIVE_PROMPT: str = "dark horror, gore, violence, scary, text, watermark, logo, nsfw, adult content"

    @property
    def comfyui_url(self) -> str:
        return f"http://{self.COMFYUI_HOST}:{self.COMFYUI_PORT}"

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            HOST=os.getenv("HOST", "0.0.0.0"),
            PORT=int(os.getenv("PORT", "8000")),
            COMFYUI_HOST=os.getenv("COMFYUI_HOST", "127.0.0.1"),
            COMFYUI_PORT=int(os.getenv("COMFYUI_PORT", "8188")),
            COMFYUI_OUTPUT_DIR=os.getenv("COMFYUI_OUTPUT_DIR", r"C:\ComfyUI\output"),
            RENDER_WORKERS=int(os.getenv("RENDER_WORKERS", "1")),
            JOB_QUEUE_MAX=int(os.getenv("JOB_QUEUE_MAX", "20")),
            WORKER_API_KEY=os.getenv("WORKER_API_KEY", ""),
            OUTPUT_DIR=os.getenv("OUTPUT_DIR", "./outputs"),
            DEFAULT_MODEL=os.getenv("DEFAULT_MODEL", "sd3.5-medium-fp8"),
        )

config = Config.from_env()

