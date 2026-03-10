"""
ComfyUI Client - Translates wrapper API calls to ComfyUI native API
"""
import asyncio
import json
import uuid
import logging
import os
import httpx
import websockets
from typing import Optional, AsyncGenerator
from config import config

logger = logging.getLogger(__name__)


class ComfyUIClient:
    """Client for interacting with ComfyUI's native API"""

    def __init__(self):
        self.base_url = config.comfyui_url
        self.client_id = str(uuid.uuid4())
        logger.info(f"ComfyUI client initialized - target: {self.base_url}")

    async def check_health(self) -> bool:
        """Check if ComfyUI is running and responsive"""
        try:
            logger.debug(f"Checking ComfyUI health at {self.base_url}/system_stats")
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/system_stats")
                if response.status_code == 200:
                    logger.debug("ComfyUI health check: OK")
                    return True
                else:
                    logger.warning(f"ComfyUI health check failed: HTTP {response.status_code}")
                    return False
        except httpx.ConnectError as e:
            logger.error(f"ComfyUI connection failed: {e} - Is ComfyUI running at {self.base_url}?")
            return False
        except Exception as e:
            logger.error(f"ComfyUI health check error: {type(e).__name__}: {e}")
            return False
    
    async def get_models(self) -> list[str]:
        """Get available checkpoint models"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/object_info/CheckpointLoaderSimple")
                if response.status_code == 200:
                    data = response.json()
                    return data.get("CheckpointLoaderSimple", {}).get("input", {}).get("required", {}).get("ckpt_name", [[]])[0]
        except Exception:
            pass
        return []

    async def check_node_exists(self, node_type: str) -> bool:
        """Check if a specific node type is available in ComfyUI"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/object_info/{node_type}")
                if response.status_code == 200:
                    data = response.json()
                    return node_type in data
        except Exception:
            pass
        return False

    async def check_ipadapter_available(self) -> bool:
        """Check if IP-Adapter nodes are installed in ComfyUI"""
        # Check for the unified loader which is the main node we use
        return await self.check_node_exists("IPAdapterUnifiedLoader")

    async def get_queue_status(self) -> dict:
        """Get current queue status"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/queue")
                if response.status_code == 200:
                    return response.json()
        except Exception:
            pass
        return {"queue_running": [], "queue_pending": []}

    async def upload_image(self, image_data: bytes, filename: str, overwrite: bool = True) -> str:
        """
        Upload an image to ComfyUI's input folder.
        Returns the filename that can be used in LoadImage nodes.
        """
        import io

        logger.info(f"Uploading image to ComfyUI: {filename} ({len(image_data)} bytes)")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                files = {
                    'image': (filename, io.BytesIO(image_data), 'image/png')
                }
                data = {
                    'overwrite': 'true' if overwrite else 'false'
                }

                response = await client.post(
                    f"{self.base_url}/upload/image",
                    files=files,
                    data=data
                )

                if response.status_code == 200:
                    result = response.json()
                    uploaded_name = result.get('name', filename)
                    logger.info(f"Image uploaded successfully: {uploaded_name}")
                    return uploaded_name
                else:
                    logger.error(f"Failed to upload image: HTTP {response.status_code} - {response.text}")
                    raise Exception(f"ComfyUI upload failed: {response.status_code} - {response.text}")
        except httpx.ConnectError as e:
            logger.error(f"Failed to connect to ComfyUI for upload: {e}")
            raise Exception(f"Cannot connect to ComfyUI at {self.base_url} for upload")
        except Exception as e:
            logger.error(f"Upload error: {type(e).__name__}: {e}")
            raise
    
    async def submit_prompt(self, workflow: dict) -> Optional[str]:
        """Submit a workflow to ComfyUI, returns prompt_id"""
        payload = {
            "prompt": workflow,
            "client_id": self.client_id
        }

        logger.info(f"Submitting workflow to ComfyUI at {self.base_url}/prompt")
        logger.debug(f"Workflow has {len(workflow)} nodes")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/prompt",
                    json=payload
                )
                if response.status_code == 200:
                    data = response.json()
                    prompt_id = data.get("prompt_id")
                    logger.info(f"Workflow submitted successfully - prompt_id: {prompt_id}")
                    return prompt_id
                else:
                    error_text = response.text
                    logger.error(f"ComfyUI rejected workflow: HTTP {response.status_code} - {error_text}")
                    raise Exception(f"ComfyUI error: {response.status_code} - {error_text}")
        except httpx.ConnectError as e:
            logger.error(f"Failed to connect to ComfyUI at {self.base_url}: {e}")
            raise Exception(f"Cannot connect to ComfyUI at {self.base_url} - Is it running?")
        except httpx.TimeoutException as e:
            logger.error(f"Timeout connecting to ComfyUI: {e}")
            raise Exception(f"Timeout connecting to ComfyUI at {self.base_url}")
    
    async def get_history(self, prompt_id: str) -> Optional[dict]:
        """Get history/result for a prompt"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{self.base_url}/history/{prompt_id}")
            if response.status_code == 200:
                data = response.json()
                return data.get(prompt_id)
        return None
    
    async def get_image(self, filename: str, subfolder: str = "", folder_type: str = "output") -> bytes:
        """Download an image from ComfyUI"""
        params = {
            "filename": filename,
            "subfolder": subfolder,
            "type": folder_type
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{self.base_url}/view", params=params)
            if response.status_code == 200:
                return response.content
            raise Exception(f"Failed to get image: {response.status_code}")
    
    async def cancel_prompt(self, prompt_id: str) -> bool:
        """Cancel a running or queued prompt"""
        # Interrupt current execution
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(f"{self.base_url}/interrupt")
        
        # Remove from queue if pending
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{self.base_url}/queue",
                json={"delete": [prompt_id]}
            )
        return True
    
    async def stream_progress(self, prompt_id: str) -> AsyncGenerator[dict, None]:
        """Stream progress updates via WebSocket"""
        ws_url = f"ws://{config.COMFYUI_HOST}:{config.COMFYUI_PORT}/ws?clientId={self.client_id}"

        try:
            async with websockets.connect(ws_url) as ws:
                async for message in ws:
                    data = json.loads(message)
                    msg_type = data.get("type")

                    if msg_type == "progress":
                        yield {
                            "type": "progress",
                            "phase": "render",
                            "percent": int(data["data"]["value"] / data["data"]["max"] * 100)
                        }
                    elif msg_type == "executing":
                        node = data["data"].get("node")
                        if node is None:  # Execution complete
                            yield {"type": "completed", "prompt_id": prompt_id}
                            return
                    elif msg_type == "execution_error":
                        yield {
                            "type": "failed",
                            "error_code": "EXECUTION_ERROR",
                            "message": str(data.get("data", {}).get("exception_message", "Unknown error"))
                        }
                        return
        except Exception as e:
            yield {"type": "failed", "error_code": "WS_ERROR", "message": str(e)}

    def delete_output_image(self, filename: str, subfolder: str = "") -> bool:
        """
        Delete an image from ComfyUI's output folder.
        Used to clean up failed/intermediate images that didn't pass validation.
        """
        try:
            if subfolder:
                file_path = os.path.join(config.COMFYUI_OUTPUT_DIR, subfolder, filename)
            else:
                file_path = os.path.join(config.COMFYUI_OUTPUT_DIR, filename)

            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Deleted intermediate image: {filename}")
                return True
            else:
                logger.debug(f"Image not found for deletion: {file_path}")
                return False
        except Exception as e:
            logger.warning(f"Failed to delete image {filename}: {e}")
            return False

    def cleanup_job_images(self, filenames: list[str]) -> int:
        """
        Clean up multiple images from a failed job.
        Returns count of successfully deleted files.
        """
        deleted = 0
        for filename in filenames:
            if self.delete_output_image(filename):
                deleted += 1
        return deleted


comfyui_client = ComfyUIClient()

