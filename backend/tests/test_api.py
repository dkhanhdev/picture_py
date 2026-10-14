import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image
import numpy as np

from app.main import app

client = TestClient(app)

def create_test_image_file() -> tuple[str, io.BytesIO, str]:
    """Tạo một file ảnh PNG đơn giản trong bộ nhớ để upload."""
    arr = np.array([
        [[255, 0, 0], [0, 255, 0]],
        [[0, 0, 255], [255, 255, 0]]
    ], dtype=np.uint8)
    img = Image.fromarray(arr, mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return "sample.png", buf, "image/png"

def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "allowed_formats" in data

def test_api_upload_preview():
    filename, buf, mime = create_test_image_file()
    response = client.post(
        "/api/upload",
        files={"file": (filename, buf, mime)}
    )
    assert response.status_code == 200
    data = response.json()
    assert "metadata" in data
    assert data["metadata"]["width"] == 2
    assert data["metadata"]["height"] == 2
    assert "preview_data_url" in data
    assert data["preview_data_url"].startswith("data:image/png;base64,")

def test_api_split_rgb():
    filename, buf, mime = create_test_image_file()
    response = client.post(
        "/api/process/split-rgb",
        files={"file": (filename, buf, mime)}
    )
    assert response.status_code == 200
    data = response.json()
    assert "image_id" in data
    assert "channels" in data
    assert "r" in data["channels"]
    assert "g" in data["channels"]
    assert "b" in data["channels"]
    
    # Kênh Red
    r_chan = data["channels"]["r"]
    assert r_chan["name"] == "Red"
    assert len(r_chan["histogram"]) == 256
    assert r_chan["color_data_url"].startswith("data:image/png;base64,")
    assert r_chan["grayscale_data_url"].startswith("data:image/png;base64,")

    # Thử tải xuống kênh màu
    image_id = data["image_id"]
    dl_resp = client.get(f"/api/download/{image_id}/r?mode=color")
    assert dl_resp.status_code == 200
    assert dl_resp.headers["content-type"] == "image/png"

    # Thử tải xuống file ZIP tất cả kênh
    zip_resp = client.get(f"/api/download-all/{image_id}")
    assert zip_resp.status_code == 200
    assert zip_resp.headers["content-type"] == "application/zip"

def test_api_invalid_file_format():
    buf = io.BytesIO(b"this is a text file not an image")
    response = client.post(
        "/api/upload",
        files={"file": ("notes.txt", buf, "text/plain")}
    )
    assert response.status_code == 400
    data = response.json()
    assert "không được hỗ trợ" in data["detail"]

def test_api_corrupted_image():
    buf = io.BytesIO(b"\x89PNG\r\n\x1a\nCorruptedHeaderData")
    response = client.post(
        "/api/upload",
        files={"file": ("corrupt.png", buf, "image/png")}
    )
    assert response.status_code == 400
    data = response.json()
    assert "không phải là ảnh hợp lệ" in data["detail"] or "bị lỗi" in data["detail"]
