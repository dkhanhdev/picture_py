import io
import pytest
import numpy as np
from PIL import Image

from app.services.image_processor import ImageProcessorService, image_processor
from app.config import settings

def create_synthetic_rgb_image(width=100, height=100) -> bytes:
    """Tạo một ảnh RGB giả lập với các khối màu thuần: Đỏ, Xanh lá, Xanh dương."""
    arr = np.zeros((height, width, 3), dtype=np.uint8)
    # Khối 1: Đỏ (255, 0, 0)
    arr[0:50, 0:50] = [255, 0, 0]
    # Khối 2: Xanh lá (0, 255, 0)
    arr[0:50, 50:100] = [0, 255, 0]
    # Khối 3: Xanh dương (0, 0, 255)
    arr[50:100, 0:50] = [0, 0, 255]
    # Khối 4: Trắng (255, 255, 255)
    arr[50:100, 50:100] = [255, 255, 255]

    img = Image.fromarray(arr, mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def test_aspect_ratio_calculation():
    service = ImageProcessorService()
    ratio_16_9, dec_1 = service.calculate_aspect_ratio(1920, 1080)
    assert ratio_16_9 == "16:9"
    assert dec_1 == 1.78

    ratio_1_1, dec_2 = service.calculate_aspect_ratio(500, 500)
    assert ratio_1_1 == "1:1"
    assert dec_2 == 1.0

    ratio_4_3, dec_3 = service.calculate_aspect_ratio(800, 600)
    assert ratio_4_3 == "4:3"
    assert dec_3 == 1.33

def test_file_size_formatter():
    assert ImageProcessorService.format_file_size(500) == "500 B"
    assert ImageProcessorService.format_file_size(2048) == "2.0 KB"
    assert ImageProcessorService.format_file_size(5 * 1024 * 1024) == "5.00 MB"

def test_split_rgb_channels_accuracy():
    service = ImageProcessorService()
    img_bytes = create_synthetic_rgb_image(width=100, height=100)

    result = service.process_and_split_rgb(img_bytes, "test_synthetic.png")
    
    assert result.metadata.width == 100
    assert result.metadata.height == 100
    assert result.metadata.color_mode == "RGB"
    assert set(result.channels.keys()) == {"r", "g", "b"}

    # Kiểm tra kênh Red
    r_channel = result.channels["r"]
    assert r_channel.name == "Red"
    assert r_channel.stats.min == 0
    assert r_channel.stats.max == 255
    # Tổng số pixel trong histogram phải bằng 100*100 = 10000
    assert sum(r_channel.histogram) == 10000
    # Khối 1 (2500 px) và Khối 4 (2500 px) có Red = 255 => 5000 pixel có giá trị 255
    assert r_channel.histogram[255] == 5000
    # Khối 2 và 3 có Red = 0 => 5000 pixel có giá trị 0
    assert r_channel.histogram[0] == 5000
    assert r_channel.stats.mean == 127.5

    # Kiểm tra kênh Green
    g_channel = result.channels["g"]
    assert g_channel.name == "Green"
    assert sum(g_channel.histogram) == 10000
    assert g_channel.histogram[255] == 5000
    assert g_channel.histogram[0] == 5000

    # Kiểm tra kênh Blue
    b_channel = result.channels["b"]
    assert b_channel.name == "Blue"
    assert sum(b_channel.histogram) == 10000
    assert b_channel.histogram[255] == 5000
    assert b_channel.histogram[0] == 5000

def test_channel_download_and_zip():
    service = ImageProcessorService()
    img_bytes = create_synthetic_rgb_image(width=60, height=60)
    result = service.process_and_split_rgb(img_bytes, "demo.png")

    # Kiểm tra lấy bytes kênh màu đơn lẻ
    r_color_bytes, r_color_name = service.get_channel_image_bytes(result.image_id, "r", mode="color")
    assert len(r_color_bytes) > 0
    assert "r_isolated.png" in r_color_name

    r_gray_bytes, r_gray_name = service.get_channel_image_bytes(result.image_id, "r", mode="grayscale")
    assert len(r_gray_bytes) > 0
    assert "r_grayscale.png" in r_gray_name

    # Kiểm tra tạo file ZIP chứa tất cả các kênh
    zip_bytes, zip_filename = service.generate_all_channels_zip(result.image_id)
    assert len(zip_bytes) > 0
    assert zip_filename.endswith(".zip")

def test_validation_errors():
    service = ImageProcessorService()
    
    # 1. Tệp rỗng
    with pytest.raises(ValueError, match="rỗng"):
        service.validate_image_bytes(b"", "empty.png")

    # 2. Định dạng không hợp lệ
    with pytest.raises(ValueError, match="không được hỗ trợ"):
        service.validate_image_bytes(b"dummy data", "document.pdf")

    # 3. Dữ liệu ảnh bị hỏng
    with pytest.raises(ValueError, match="không phải là ảnh hợp lệ"):
        service.validate_image_bytes(b"corrupted header bytes", "corrupt.png")
