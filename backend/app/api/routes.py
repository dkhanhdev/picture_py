import io
from fastapi import APIRouter, File, UploadFile, HTTPException, Query, Response
from fastapi.responses import StreamingResponse

from app.config import settings
from app.schemas import RGBProcessResponse, ImageMetadata
from app.services.image_processor import image_processor

router = APIRouter(prefix="/api", tags=["Chromatica Studio Core"])

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "max_file_size_mb": settings.MAX_FILE_SIZE_MB,
        "allowed_formats": list(settings.ALLOWED_EXTENSIONS),
    }

@router.post("/upload")
async def upload_image_preview(file: UploadFile = File(...)):
    """
    Tải lên ảnh sơ bộ, kiểm tra định dạng và trích xuất siêu dữ liệu.
    """
    try:
        contents = await file.read()
        image = image_processor.validate_image_bytes(
            contents, file.filename or "unknown.png", file.content_type
        )
        metadata = image_processor.extract_metadata(
            image, file.filename or "unknown.png", len(contents)
        )
        preview_data_url = image_processor.pil_to_data_url(image, format="PNG")
        
        return {
            "metadata": metadata,
            "preview_data_url": preview_data_url,
            "message": "Kiểm tra tệp thành công, sẵn sàng xử lý.",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống khi tải ảnh: {str(e)}")

@router.post("/process/split-rgb", response_model=RGBProcessResponse)
async def split_rgb_endpoint(file: UploadFile = File(...)):
    """
    Tách 3 kênh màu RGB bằng thuật toán ma trận thực,
    tính toán histogram 256 mức và chỉ số thống kê định lượng cho mỗi kênh.
    """
    try:
        contents = await file.read()
        filename = file.filename or "unnamed_image.png"
        response = image_processor.process_and_split_rgb(
            contents, filename, file.content_type
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi trong quá trình xử lý tách kênh: {str(e)}")

@router.get("/download/{image_id}/{channel}")
def download_channel(
    image_id: str,
    channel: str,
    mode: str = Query("color", description="Kiểu hiển thị kênh: 'color' (cô lập màu) hoặc 'grayscale' (thang độ xám)")
):
    """
    Tải xuống ảnh của một kênh màu cụ thể (R, G, hoặc B) dạng tệp PNG nguyên bản.
    """
    try:
        image_bytes, filename = image_processor.get_channel_image_bytes(image_id, channel, mode)
        return StreamingResponse(
            io.BytesIO(image_bytes),
            media_type="image/png",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tải kênh màu: {str(e)}")

@router.get("/download-all/{image_id}")
def download_all_zip(image_id: str):
    """
    Đóng gói tất cả các kênh (cả thang độ xám và cô lập màu) cùng ảnh gốc và báo cáo kỹ thuật vào tệp ZIP.
    """
    try:
        zip_bytes, filename = image_processor.generate_all_channels_zip(image_id)
        return StreamingResponse(
            io.BytesIO(zip_bytes),
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi nén gói tệp: {str(e)}")
