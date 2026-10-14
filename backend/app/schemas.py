from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class ChannelStats(BaseModel):
    min: int = Field(..., description="Giá trị cường độ nhỏ nhất (0-255)")
    max: int = Field(..., description="Giá trị cường độ lớn nhất (0-255)")
    mean: float = Field(..., description="Giá trị cường độ trung bình")
    std_dev: float = Field(..., description="Độ lệch chuẩn cường độ")
    median: float = Field(..., description="Giá trị trung vị")

class ChannelData(BaseModel):
    name: str = Field(..., description="Tên kênh màu (Red, Green, Blue)")
    code: str = Field(..., description="Mã viết tắt (r, g, b)")
    color_hex: str = Field(..., description="Mã màu đại diện Hex")
    grayscale_data_url: str = Field(..., description="Ảnh kênh dạng Grayscale (Data URL base64)")
    color_data_url: str = Field(..., description="Ảnh kênh đơn sắc tự nhiên (Data URL base64)")
    histogram: List[int] = Field(..., description="Mảng phân bố 256 mức độ sáng")
    stats: ChannelStats = Field(..., description="Thống kê định lượng kênh")

class ImageMetadata(BaseModel):
    filename: str
    format: str
    width: int
    height: int
    aspect_ratio: str
    aspect_ratio_decimal: float
    channels: int
    color_mode: str
    file_size_bytes: int
    file_size_formatted: str

class RGBProcessResponse(BaseModel):
    image_id: str
    metadata: ImageMetadata
    original_data_url: str
    channels: Dict[str, ChannelData]
    processing_time_ms: float
    message: str

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
