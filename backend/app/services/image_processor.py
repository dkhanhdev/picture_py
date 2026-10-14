import io
import math
import uuid
import zipfile
import base64
import time
from typing import Dict, Tuple, Optional
import numpy as np
from PIL import Image

from app.config import settings
from app.schemas import ImageMetadata, ChannelData, ChannelStats, RGBProcessResponse

class ProcessedImageRecord:
    def __init__(
        self,
        image_id: str,
        filename: str,
        original_img: Image.Image,
        metadata: ImageMetadata,
        r_gray: Image.Image,
        r_color: Image.Image,
        g_gray: Image.Image,
        g_color: Image.Image,
        b_gray: Image.Image,
        b_color: Image.Image,
        response_data: RGBProcessResponse,
    ):
        self.image_id = image_id
        self.filename = filename
        self.original_img = original_img
        self.metadata = metadata
        self.r_gray = r_gray
        self.r_color = r_color
        self.g_gray = g_gray
        self.g_color = g_color
        self.b_gray = b_gray
        self.b_color = b_color
        self.response_data = response_data
        self.created_at = time.time()

class ImageProcessorService:
    def __init__(self):
        # In-memory storage for active sessions (LRU-like cache capped at 50 images)
        self._cache: Dict[str, ProcessedImageRecord] = {}
        self._max_cache_size = 50

    def _cleanup_cache_if_needed(self):
        if len(self._cache) > self._max_cache_size:
            # Sort by created_at and drop oldest 10
            sorted_keys = sorted(self._cache.keys(), key=lambda k: self._cache[k].created_at)
            for k in sorted_keys[:10]:
                self._cache.pop(k, None)

    @staticmethod
    def format_file_size(size_bytes: int) -> str:
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        else:
            return f"{size_bytes / (1024 * 1024):.2f} MB"

    @staticmethod
    def calculate_aspect_ratio(width: int, height: int) -> Tuple[str, float]:
        if width <= 0 or height <= 0:
            return "1:1", 1.0
        gcd = math.gcd(width, height)
        w_ratio = width // gcd
        h_ratio = height // gcd
        decimal = round(width / height, 2)
        # Check standard common aspect ratios
        ratio_float = width / height
        if abs(ratio_float - 16 / 9) < 0.02:
            ratio_str = "16:9"
        elif abs(ratio_float - 4 / 3) < 0.02:
            ratio_str = "4:3"
        elif abs(ratio_float - 1.0) < 0.01:
            ratio_str = "1:1"
        elif abs(ratio_float - 3 / 2) < 0.02:
            ratio_str = "3:2"
        elif abs(ratio_float - 9 / 16) < 0.02:
            ratio_str = "9:16"
        else:
            if w_ratio <= 32 and h_ratio <= 32:
                ratio_str = f"{w_ratio}:{h_ratio}"
            else:
                ratio_str = f"{decimal}:1"
        return ratio_str, decimal

    @staticmethod
    def pil_to_data_url(image: Image.Image, format: str = "PNG") -> str:
        buffered = io.BytesIO()
        image.save(buffered, format=format)
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        mime = f"image/{format.lower()}"
        return f"data:{mime};base64,{img_str}"

    @staticmethod
    def pil_to_bytes(image: Image.Image, format: str = "PNG") -> bytes:
        buffered = io.BytesIO()
        image.save(buffered, format=format)
        return buffered.getvalue()

    def validate_image_bytes(
        self, file_bytes: bytes, filename: str, content_type: Optional[str] = None
    ) -> Image.Image:
        if not file_bytes or len(file_bytes) == 0:
            raise ValueError("Tệp tải lên rỗng hoặc không có dữ liệu.")

        size = len(file_bytes)
        if size > settings.MAX_FILE_SIZE_BYTES:
            size_mb = size / (1024 * 1024)
            raise ValueError(
                f"Kích thước tệp vượt quá giới hạn cho phép ({settings.MAX_FILE_SIZE_MB} MB). "
                f"Kích thước hiện tại: {size_mb:.2f} MB."
            )

        # Check extension
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext and ext not in settings.ALLOWED_EXTENSIONS:
            raise ValueError(
                f"Phần mở rộng '{ext}' không được hỗ trợ. Định dạng hợp lệ: {', '.join(settings.ALLOWED_EXTENSIONS)}."
            )

        # Try opening with PIL
        try:
            image = Image.open(io.BytesIO(file_bytes))
            # Verify image integrity
            image.load()
        except Exception as e:
            raise ValueError(f"Tệp không phải là ảnh hợp lệ hoặc dữ liệu ảnh bị lỗi: {str(e)}")

        return image

    def extract_metadata(
        self, image: Image.Image, filename: str, file_size: int
    ) -> ImageMetadata:
        width, height = image.size
        aspect_ratio, aspect_ratio_decimal = self.calculate_aspect_ratio(width, height)
        img_format = (image.format or filename.split(".")[-1].upper()) if filename else "PNG"
        channels = len(image.getbands())

        return ImageMetadata(
            filename=filename,
            format=img_format,
            width=width,
            height=height,
            aspect_ratio=aspect_ratio,
            aspect_ratio_decimal=aspect_ratio_decimal,
            channels=channels,
            color_mode=image.mode,
            file_size_bytes=file_size,
            file_size_formatted=self.format_file_size(file_size),
        )

    def process_and_split_rgb(
        self, file_bytes: bytes, filename: str, content_type: Optional[str] = None
    ) -> RGBProcessResponse:
        start_time = time.perf_counter()

        # Step 1: Validate image
        image = self.validate_image_bytes(file_bytes, filename, content_type)
        metadata = self.extract_metadata(image, filename, len(file_bytes))

        # Step 2: Convert to RGB mode for consistent 3-channel processing
        if image.mode != "RGB":
            rgb_image = image.convert("RGB")
        else:
            rgb_image = image

        # Step 3: Real RGB channel matrix separation via NumPy
        img_array = np.array(rgb_image, dtype=np.uint8)  # Shape (H, W, 3)
        h, w, c = img_array.shape

        channel_configs = [
            ("r", "Red", 0, "#EF4444"),
            ("g", "Green", 1, "#10B981"),
            ("b", "Blue", 2, "#3B82F6"),
        ]

        channels_result: Dict[str, ChannelData] = {}
        cached_pil_images: Dict[str, Image.Image] = {}

        for code, name, idx, color_hex in channel_configs:
            # 2D intensity slice for this channel
            raw_channel = img_array[:, :, idx]

            # 1. Grayscale representation
            gray_img = Image.fromarray(raw_channel, mode="L")
            gray_data_url = self.pil_to_data_url(gray_img, format="PNG")
            cached_pil_images[f"{code}_gray"] = gray_img

            # 2. Isolated Pure Color representation
            isolated_array = np.zeros_like(img_array)
            isolated_array[:, :, idx] = raw_channel
            color_img = Image.fromarray(isolated_array, mode="RGB")
            color_data_url = self.pil_to_data_url(color_img, format="PNG")
            cached_pil_images[f"{code}_color"] = color_img

            # 3. Mathematical Histogram (256 bins for 0-255 intensity)
            hist = np.bincount(raw_channel.ravel(), minlength=256).tolist()

            # 4. Accurate Statistics
            stats = ChannelStats(
                min=int(np.min(raw_channel)),
                max=int(np.max(raw_channel)),
                mean=round(float(np.mean(raw_channel)), 2),
                std_dev=round(float(np.std(raw_channel)), 2),
                median=round(float(np.median(raw_channel)), 2),
            )

            channels_result[code] = ChannelData(
                name=name,
                code=code,
                color_hex=color_hex,
                grayscale_data_url=gray_data_url,
                color_data_url=color_data_url,
                histogram=hist,
                stats=stats,
            )

        original_data_url = self.pil_to_data_url(rgb_image, format="PNG")
        image_id = str(uuid.uuid4())
        processing_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        response = RGBProcessResponse(
            image_id=image_id,
            metadata=metadata,
            original_data_url=original_data_url,
            channels=channels_result,
            processing_time_ms=processing_time_ms,
            message="Xử lý tách kênh RGB thành công.",
        )

        # Cache session in memory
        self._cleanup_cache_if_needed()
        self._cache[image_id] = ProcessedImageRecord(
            image_id=image_id,
            filename=filename,
            original_img=rgb_image,
            metadata=metadata,
            r_gray=cached_pil_images["r_gray"],
            r_color=cached_pil_images["r_color"],
            g_gray=cached_pil_images["g_gray"],
            g_color=cached_pil_images["g_color"],
            b_gray=cached_pil_images["b_gray"],
            b_color=cached_pil_images["b_color"],
            response_data=response,
        )

        return response

    def get_channel_image_bytes(
        self, image_id: str, channel: str, mode: str = "color"
    ) -> Tuple[bytes, str]:
        record = self._cache.get(image_id)
        if not record:
            raise KeyError(f"Không tìm thấy phiên xử lý của ảnh với ID: {image_id}")

        channel = channel.lower()
        if channel not in ("r", "g", "b", "red", "green", "blue"):
            raise ValueError(f"Kênh màu '{channel}' không hợp lệ. Chọn 'r', 'g', hoặc 'b'.")

        c_key = channel[0]
        mode = mode.lower()
        if mode == "grayscale" or mode == "gray":
            img = getattr(record, f"{c_key}_gray")
            filename = f"{record.filename.rsplit('.', 1)[0]}_{c_key}_grayscale.png"
        else:
            img = getattr(record, f"{c_key}_color")
            filename = f"{record.filename.rsplit('.', 1)[0]}_{c_key}_isolated.png"

        return self.pil_to_bytes(img, format="PNG"), filename

    def generate_all_channels_zip(self, image_id: str) -> Tuple[bytes, str]:
        record = self._cache.get(image_id)
        if not record:
            raise KeyError(f"Không tìm thấy phiên xử lý của ảnh với ID: {image_id}")

        base_name = record.filename.rsplit(".", 1)[0]
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            # 1. Original
            zip_file.writestr(
                f"{base_name}_original.png",
                self.pil_to_bytes(record.original_img, format="PNG"),
            )
            # 2. Red channels
            zip_file.writestr(
                f"{base_name}_R_grayscale.png",
                self.pil_to_bytes(record.r_gray, format="PNG"),
            )
            zip_file.writestr(
                f"{base_name}_R_isolated.png",
                self.pil_to_bytes(record.r_color, format="PNG"),
            )
            # 3. Green channels
            zip_file.writestr(
                f"{base_name}_G_grayscale.png",
                self.pil_to_bytes(record.g_gray, format="PNG"),
            )
            zip_file.writestr(
                f"{base_name}_G_isolated.png",
                self.pil_to_bytes(record.g_color, format="PNG"),
            )
            # 4. Blue channels
            zip_file.writestr(
                f"{base_name}_B_grayscale.png",
                self.pil_to_bytes(record.b_gray, format="PNG"),
            )
            zip_file.writestr(
                f"{base_name}_B_isolated.png",
                self.pil_to_bytes(record.b_color, format="PNG"),
            )
            # 5. Metadata JSON summary report
            json_report = record.response_data.model_dump_json(indent=2)
            zip_file.writestr(f"{base_name}_analysis_report.json", json_report)

        zip_buffer.seek(0)
        zip_filename = f"{base_name}_chromatica_rgb_channels.zip"
        return zip_buffer.getvalue(), zip_filename

image_processor = ImageProcessorService()
