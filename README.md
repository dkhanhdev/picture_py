# Chromatica Studio — Phase 1: MVP

> **Ứng dụng phân tích quang phổ số và bóc tách ma trận kênh màu RGB chuyên sâu.**  
> Xây dựng trên nền tảng **React 19 + TypeScript + Vite + Tailwind CSS v4** (Frontend) và **FastAPI + Pillow + NumPy** (Backend).

---

## 🌟 Tổng Quan Giai Đoạn 1 (MVP)

Chromatica Studio Phase 1 mang đến một môi trường kỹ thuật số chuẩn phòng lab (Studio Workspace Dark Theme) phục vụ việc phân tích ảnh:
1. **Tải lên & Tiền kiểm tra (Image Ingestion)**: Kéo-thả ảnh, duyệt file, kiểm tra định dạng (`PNG`, `JPG`, `JPEG`, `WEBP`, `BMP`) và giới hạn dung lượng (`≤ 15 MB`).
2. **Trích xuất Siêu dữ liệu (Metadata Extraction)**: Độ phân giải, tỷ lệ khung hình, số kênh màu, độ sâu bit màu (24-bit TrueColor), kích thước tệp và thời gian xử lý ma trận.
3. **Bóc tách 3 Kênh RGB bằng thuật toán ma trận thực**:
   - Sử dụng **NumPy ndarray** (không dùng bộ lọc CSS giả lập).
   - Tách chính xác từng lát cắt cường độ 2D của kênh **Đỏ (R)**, **Xanh lá (G)**, và **Xanh dương (B)**.
   - Hỗ trợ 2 chế độ hiển thị:
     - **Cô lập màu (Isolated Pure Color)**: Giữ nguyên photon của kênh tương ứng, triệt tiêu 2 kênh còn lại thành 0 (`[R, 0, 0]`, `[0, G, 0]`, `[0, 0, B]`).
     - **Thang độ xám (Grayscale / L-mode)**: Hiển thị mức độ phân bố năng lượng sáng từ `0` đến `255` của từng kênh.
4. **Phân tích Thống kê Định lượng**:
   - Tính toán đầy đủ `Min`, `Max`, `Mean`, `StdDev`, `Median` cho từng kênh.
   - Tính toán **Biểu đồ tần suất Histogram 256 mức độ sáng** (`bincount`).
5. **Biểu đồ Histogram Đa Kênh Tương Tác**:
   - Biểu đồ vector SVG sắc nét với 256 bins chuẩn hóa.
   - Bật/tắt linh hoạt từng đường cong phổ Đỏ, Xanh lá, Xanh dương.
   - Thước soi cường độ thời gian thực (hover để xem chính xác số lượng pixel tại mức sáng tương ứng).
6. **Pixel Eyedropper Sampler**:
   - Rê chuột trên ảnh canvas để hiển thị tọa độ pixel `(X, Y)`, giá trị số của `[R, G, B]` và mã màu Hex tương ứng.
7. **Xuất Bản & Tải Xuống (Export & Download)**:
   - Tải xuống ảnh PNG nguyên bản của từng kênh (dạng cô lập màu hoặc thang độ xám).
   - Đóng gói ZIP tải về toàn bộ 6 biến thể kênh kèm ảnh gốc và báo cáo kỹ thuật `analysis_report.json`.
8. **Động cơ Phục Hồi Ngoại Tuyến (Offline Client Fallback)**:
   - Tự động chuyển tiếp sang thuật toán Canvas HTML5 nếu backend ngoại tuyến, đảm bảo trải nghiệm người dùng không bị gián đoạn.

---

## 📁 Cấu Trúc Thư Mục

```
c:/da_py/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py             # Cấu hình CORS, giới hạn dung lượng, định dạng file
│   │   ├── schemas.py            # Pydantic schemas (Metadata, ChannelStats, RGBProcessResponse)
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── image_processor.py # Thuật toán tách ma trận RGB bằng NumPy, tính histogram, thống kê
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routes.py         # Endpoints: /health, /upload, /process/split-rgb, /download, /download-all
│   │   └── main.py               # Khởi tạo FastAPI app, middleware CORS, error handlers
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_image_processor.py # Unit test thuật toán tách kênh RGB và tính toán thống kê
│   │   └── test_api.py           # Integration test các API endpoints
│   ├── requirements.txt
│   └── run.py                    # Script chạy nhanh backend uvicorn
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx        # Thanh điều hướng, trạng thái API, nạp preset ảnh mẫu
│   │   │   ├── DropZone.tsx      # Khu vực kéo thả ảnh, tiền kiểm tra định dạng và dung lượng
│   │   │   ├── MetadataPanel.tsx # Thẻ hiển thị thông số kỹ thuật ảnh
│   │   │   ├── WorkspaceView.tsx # Canvas làm việc chính (4-Up Grid, Đơn kênh, So sánh đôi, Soi pixel)
│   │   │   ├── ChannelCard.tsx   # Thẻ thông tin chi tiết từng kênh màu + mini histogram
│   │   │   ├── HistogramPanel.tsx# Biểu đồ SVG tần suất RGB tương tác 256 mức
│   │   │   └── Toast.tsx         # Hệ thống thông báo trạng thái
│   │   ├── services/
│   │   │   └── api.ts            # API service kết nối backend + client engine fallback
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript type definitions
│   │   ├── utils/
│   │   │   └── sampleImages.ts   # Bộ sinh ảnh mẫu kiểm thử trực tiếp (Lăng kính, Hoàng hôn, Bảng màu)
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```

---

## 🛠️ Hướng Dẫn Cài Đặt và Chạy Trên Windows

### Yêu Cầu Hệ Thống
- **Hệ điều hành**: Windows 10/11
- **Python**: Phiên bản 3.10 trở lên (khuyên dùng Python 3.11 - 3.14)
- **Node.js**: Phiên bản 18 trở lên (khuyên dùng Node 20+)
- **Trình bao**: PowerShell hoặc Command Prompt (CMD)

---

### Bước 1: Chạy Backend FastAPI

Mở terminal PowerShell tại thư mục `c:\da_py\backend`:

```powershell
# Di chuyển vào thư mục backend
cd c:\da_py\backend

# (Tùy chọn) Tạo môi trường ảo venv nếu muốn cô lập
python -m venv venv
.\venv\Scripts\Activate.ps1

# Cài đặt các gói phụ thuộc
python -m pip install -r requirements.txt

# Khởi chạy server FastAPI trên cổng 8000
python run.py
```

Server backend sẽ khởi chạy tại:
- **API URL**: `http://127.0.0.1:8000`
- **Tài liệu Swagger UI**: `http://127.0.0.1:8000/docs`
- **Kiểm tra trạng thái**: `http://127.0.0.1:8000/api/health`

---

### Bước 2: Chạy Frontend React + Vite

Mở một cửa sổ PowerShell mới tại thư mục `c:\da_py\frontend`:

```powershell
# Di chuyển vào thư mục frontend
cd c:\da_py\frontend

# Cài đặt các dependencies qua npm
npm install

# Khởi chạy máy chủ phát triển Vite trên cổng 5173
npm run dev
```

Mở trình duyệt web và truy cập:
👉 **`http://localhost:5173`**

---

### Bước 3: Chạy Kiểm Thử (Tests)

#### 1. Kiểm thử Unit Test & API Backend:
```powershell
cd c:\da_py\backend
python -m pytest tests -v
```
Kết quả kiểm thử bao gồm:
- `test_aspect_ratio_calculation`: Tính toán tỷ lệ khung hình chuẩn xác.
- `test_file_size_formatter`: Định dạng dung lượng tệp.
- `test_split_rgb_channels_accuracy`: Xác thực ma trận phân tách kênh màu Đỏ, Xanh lá, Xanh dương, kiểm tra số lượng pixel trong histogram 256 bins và độ lệch chuẩn.
- `test_channel_download_and_zip`: Tạo ảnh đơn lẻ PNG và gói lưu trữ ZIP.
- `test_validation_errors`: Xử lý tệp rỗng, định dạng sai, và tệp ảnh bị hỏng.
- `test_api_health`: Kiểm tra endpoint sức khỏe hệ thống.
- `test_api_upload_preview`: Kiểm tra upload và preview base64.
- `test_api_split_rgb`: Kiểm tra toàn bộ luồng tách ma trận từ HTTP request.
- `test_api_invalid_file_format`: Kiểm tra từ chối tệp không hợp lệ.
- `test_api_corrupted_image`: Kiểm tra phản hồi mã lỗi 400 đối với ảnh hỏng.

#### 2. Kiểm thử Build Frontend (Typecheck & Bundle):
```powershell
cd c:\da_py\frontend
npm run build
```

---

## 📡 Danh Sách API Endpoints Chính

| Phương Thức | Đường Dẫn | Mô Tả | Tham Số |
|---|---|---|---|
| `GET` | `/api/health` | Kiểm tra trạng thái hoạt động của backend | Không |
| `POST` | `/api/upload` | Tiền kiểm tra tệp ảnh và trích xuất siêu dữ liệu | `file`: Form-data Multipart |
| `POST` | `/api/process/split-rgb` | Bóc tách 3 kênh RGB, tính toán histogram và thống kê | `file`: Form-data Multipart |
| `GET` | `/api/download/{image_id}/{channel}` | Tải xuống tệp PNG nguyên bản của một kênh | `channel` (`r`, `g`, `b`), `mode` (`color`, `grayscale`) |
| `GET` | `/api/download-all/{image_id}` | Tải xuống file ZIP chứa toàn bộ 6 biến thể kênh + báo cáo JSON | `image_id`: UUID của phiên |

---

## 🎨 Điểm Nổi Bật Về Giao Diện & Trải Nghiệm (UX/UI)
- **Studio Obsidian Theme**: Bảng màu tối cao cấp chuẩn ứng dụng đồ họa chuyên nghiệp (Adobe/Figma dark palette).
- **Preset Buttons Tức Thì**: Cho phép chạy thử ngay với 3 preset: *Lăng kính*, *Hoàng hôn*, *Bảng màu* mà không bắt buộc người dùng phải tìm ảnh ngoài.
- **Eyedropper Soi Pixel**: Hiển thị giá trị kênh và mã Hex tương tác theo thời gian thực khi rê chuột.
- **Biểu đồ Histogram Động**: Vẽ đường cong phổ SVG với khả năng bật/tắt từng kênh màu và soi số lượng pixel tại từng mức độ sáng từ 0 đến 255.
