export interface ChannelStats {
  min: number;
  max: number;
  mean: number;
  std_dev: number;
  median: number;
}

export interface ChannelData {
  name: string;
  code: string;
  color_hex: string;
  grayscale_data_url: string;
  color_data_url: string;
  histogram: number[];
  stats: ChannelStats;
}

export interface ImageMetadata {
  filename: string;
  format: string;
  width: number;
  height: number;
  aspect_ratio: string;
  aspect_ratio_decimal: number;
  channels: number;
  color_mode: string;
  file_size_bytes: number;
  file_size_formatted: string;
}

export interface RGBProcessResponse {
  image_id: string;
  metadata: ImageMetadata;
  original_data_url: string;
  channels: {
    r: ChannelData;
    g: ChannelData;
    b: ChannelData;
  };
  processing_time_ms: number;
  message: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  max_file_size_mb: number;
  allowed_formats: string[];
}

export interface ApiError {
  detail: string;
  error_code?: string;
}
