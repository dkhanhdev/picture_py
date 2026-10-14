import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "Chromatica Studio API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    MAX_FILE_SIZE_MB: int = 15
    MAX_FILE_SIZE_BYTES: int = 15 * 1024 * 1024
    ALLOWED_EXTENSIONS: set = {"png", "jpg", "jpeg", "webp", "bmp"}
    ALLOWED_MIME_TYPES: set = {
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/bmp",
        "image/x-ms-bmp",
    }
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ]

settings = Settings()
