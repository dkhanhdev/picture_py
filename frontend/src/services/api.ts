import type { RGBProcessResponse, HealthStatus } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export class ApiService {
  private static baseUrl = API_BASE_URL;

  public static setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  public static getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Kiểm tra tình trạng kết nối backend FastAPI
   */
  public static async checkHealth(): Promise<HealthStatus> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Máy chủ phản hồi mã lỗi: ${response.status}`);
      }
      return await response.json();
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Kết nối tới backend bị quá thời gian (timeout 4s).');
      }
      throw new Error(
        err instanceof Error
          ? err.message
          : 'Không thể kết nối đến máy chủ backend tại ' + this.baseUrl
      );
    }
  }

  /**
   * Gửi ảnh để tách 3 kênh RGB trên backend
   */
  public static async processSplitRGB(file: File): Promise<RGBProcessResponse> {
    // 1. Kiểm tra kích thước ở phía client trước
    const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      throw new Error(
        `Dung lượng ảnh vượt quá giới hạn cho phép (15 MB). Kích thước hiện tại: ${sizeMb} MB.`
      );
    }

    // 2. Kiểm tra định dạng tệp cơ bản
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'bmp'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (ext && !allowedExtensions.includes(ext)) {
      throw new Error(
        `Định dạng tệp '.${ext}' không được hỗ trợ. Vui lòng chọn PNG, JPG, JPEG, WEBP hoặc BMP.`
      );
    }

    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout cho ảnh lớn

    try {
      const response = await fetch(`${this.baseUrl}/process/split-rgb`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorDetail = `Lỗi xử lý (HTTP ${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson && errJson.detail) {
            errorDetail = errJson.detail;
          }
        } catch {
          // Bỏ qua lỗi parse JSON
        }
        throw new Error(errorDetail);
      }

      return await response.json();
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Yêu cầu xử lý ảnh bị quá hạn thời gian (timeout).');
      }
      throw err;
    }
  }

  /**
   * Tạo đường dẫn tải xuống kênh màu
   */
  public static getDownloadChannelUrl(
    imageId: string,
    channel: string,
    mode: 'color' | 'grayscale' = 'color'
  ): string {
    return `${this.baseUrl}/download/${imageId}/${channel}?mode=${mode}`;
  }

  /**
   * Tạo đường dẫn tải xuống toàn bộ kênh (ZIP)
   */
  public static getDownloadAllZipUrl(imageId: string): string {
    return `${this.baseUrl}/download-all/${imageId}`;
  }

  /**
   * Thuật toán tách RGB dự phòng trực tiếp trên trình duyệt bằng Canvas
   * (Đảm bảo trải nghiệm người dùng không bị gián đoạn nếu backend đang khởi động)
   */
  public static async processClientSideFallback(file: File): Promise<RGBProcessResponse> {
    const startTime = performance.now();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Không thể đọc file ảnh từ trình duyệt.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Tệp không thể dựng thành ảnh hợp lệ.'));
        img.onload = () => {
          try {
            const width = img.naturalWidth || img.width;
            const height = img.naturalHeight || img.height;

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw new Error('Không thể khởi tạo Canvas 2D context.');

            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, width, height);
            const data = imgData.data; // RGBA array

            // Các bộ đệm cho R, G, B
            const rHist = new Array(256).fill(0);
            const gHist = new Array(256).fill(0);
            const bHist = new Array(256).fill(0);

            const rValues: number[] = [];
            const gValues: number[] = [];
            const bValues: number[] = [];

            // Canvases cho Color và Grayscale
            const rColorCanvas = document.createElement('canvas');
            rColorCanvas.width = width;
            rColorCanvas.height = height;
            const rColorCtx = rColorCanvas.getContext('2d')!;
            const rColorImgData = rColorCtx.createImageData(width, height);

            const rGrayCanvas = document.createElement('canvas');
            rGrayCanvas.width = width;
            rGrayCanvas.height = height;
            const rGrayCtx = rGrayCanvas.getContext('2d')!;
            const rGrayImgData = rGrayCtx.createImageData(width, height);

            const gColorCanvas = document.createElement('canvas');
            gColorCanvas.width = width;
            gColorCanvas.height = height;
            const gColorCtx = gColorCanvas.getContext('2d')!;
            const gColorImgData = gColorCtx.createImageData(width, height);

            const gGrayCanvas = document.createElement('canvas');
            gGrayCanvas.width = width;
            gGrayCanvas.height = height;
            const gGrayCtx = gGrayCanvas.getContext('2d')!;
            const gGrayImgData = gGrayCtx.createImageData(width, height);

            const bColorCanvas = document.createElement('canvas');
            bColorCanvas.width = width;
            bColorCanvas.height = height;
            const bColorCtx = bColorCanvas.getContext('2d')!;
            const bColorImgData = bColorCtx.createImageData(width, height);

            const bGrayCanvas = document.createElement('canvas');
            bGrayCanvas.width = width;
            bGrayCanvas.height = height;
            const bGrayCtx = bGrayCanvas.getContext('2d')!;
            const bGrayImgData = bGrayCtx.createImageData(width, height);

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              rHist[r]++;
              gHist[g]++;
              bHist[b]++;

              // Sample subset values for stats to avoid memory spikes
              if (rValues.length < 50000 || Math.random() < 0.05) {
                rValues.push(r);
                gValues.push(g);
                bValues.push(b);
              }

              // Red Color [R, 0, 0, 255] & Grayscale [R, R, R, 255]
              rColorImgData.data[i] = r;
              rColorImgData.data[i + 1] = 0;
              rColorImgData.data[i + 2] = 0;
              rColorImgData.data[i + 3] = 255;

              rGrayImgData.data[i] = r;
              rGrayImgData.data[i + 1] = r;
              rGrayImgData.data[i + 2] = r;
              rGrayImgData.data[i + 3] = 255;

              // Green Color [0, G, 0, 255] & Grayscale [G, G, G, 255]
              gColorImgData.data[i] = 0;
              gColorImgData.data[i + 1] = g;
              gColorImgData.data[i + 2] = 0;
              gColorImgData.data[i + 3] = 255;

              gGrayImgData.data[i] = g;
              gGrayImgData.data[i + 1] = g;
              gGrayImgData.data[i + 2] = g;
              gGrayImgData.data[i + 3] = 255;

              // Blue Color [0, 0, B, 255] & Grayscale [B, B, B, 255]
              bColorImgData.data[i] = 0;
              bColorImgData.data[i + 1] = 0;
              bColorImgData.data[i + 2] = b;
              bColorImgData.data[i + 3] = 255;

              bGrayImgData.data[i] = b;
              bGrayImgData.data[i + 1] = b;
              bGrayImgData.data[i + 2] = b;
              bGrayImgData.data[i + 3] = 255;
            }

            rColorCtx.putImageData(rColorImgData, 0, 0);
            rGrayCtx.putImageData(rGrayImgData, 0, 0);
            gColorCtx.putImageData(gColorImgData, 0, 0);
            gGrayCtx.putImageData(gGrayImgData, 0, 0);
            bColorCtx.putImageData(bColorImgData, 0, 0);
            bGrayCtx.putImageData(bGrayImgData, 0, 0);

            const calcStats = (vals: number[]) => {
              const sorted = [...vals].sort((a, b) => a - b);
              const min = sorted[0] ?? 0;
              const max = sorted[sorted.length - 1] ?? 255;
              const sum = sorted.reduce((acc, v) => acc + v, 0);
              const mean = Math.round((sum / sorted.length) * 100) / 100;
              const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
              const variance =
                sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / sorted.length;
              const std_dev = Math.round(Math.sqrt(variance) * 100) / 100;
              return { min, max, mean, std_dev, median };
            };

            const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
            const g = gcd(width, height);
            const aspect_ratio = `${width / g}:${height / g}`;

            const response: RGBProcessResponse = {
              image_id: 'client-' + Math.random().toString(36).substring(2, 9),
              metadata: {
                filename: file.name,
                format: file.name.split('.').pop()?.toUpperCase() || 'PNG',
                width,
                height,
                aspect_ratio,
                aspect_ratio_decimal: Math.round((width / height) * 100) / 100,
                channels: 3,
                color_mode: 'RGB',
                file_size_bytes: file.size,
                file_size_formatted: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
              },
              original_data_url: canvas.toDataURL('image/png'),
              channels: {
                r: {
                  name: 'Red',
                  code: 'r',
                  color_hex: '#EF4444',
                  grayscale_data_url: rGrayCanvas.toDataURL('image/png'),
                  color_data_url: rColorCanvas.toDataURL('image/png'),
                  histogram: rHist,
                  stats: calcStats(rValues),
                },
                g: {
                  name: 'Green',
                  code: 'g',
                  color_hex: '#10B981',
                  grayscale_data_url: gGrayCanvas.toDataURL('image/png'),
                  color_data_url: gColorCanvas.toDataURL('image/png'),
                  histogram: gHist,
                  stats: calcStats(gValues),
                },
                b: {
                  name: 'Blue',
                  code: 'b',
                  color_hex: '#3B82F6',
                  grayscale_data_url: bGrayCanvas.toDataURL('image/png'),
                  color_data_url: bColorCanvas.toDataURL('image/png'),
                  histogram: bHist,
                  stats: calcStats(bValues),
                },
              },
              processing_time_ms: Math.round(performance.now() - startTime),
              message: 'Xử lý hoàn tất qua bộ engine client.',
            };

            resolve(response);
          } catch (e: unknown) {
            reject(
              new Error('Lỗi trong bộ xử lý ảnh phía client: ' + (e instanceof Error ? e.message : ''))
            );
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }
}
