import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { RGBProcessResponse } from '../types';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid,
  Square,
  Columns,
  Crosshair,
  Download,
} from 'lucide-react';

interface WorkspaceViewProps {
  data: RGBProcessResponse;
  renderMode: 'color' | 'grayscale';
  onToggleRenderMode: (mode: 'color' | 'grayscale') => void;
  activeFocusCode: string | null;
  onSelectFocusCode: (code: string | null) => void;
  onDownloadChannel: (code: string, mode: 'color' | 'grayscale') => void;
}

type ViewMode = 'grid' | 'single' | 'compare';

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  data,
  renderMode,
  onToggleRenderMode,
  activeFocusCode,
  onSelectFocusCode,
  onDownloadChannel,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>(activeFocusCode ? 'single' : 'grid');
  const [selectedChannelCode, setSelectedChannelCode] = useState<string>(activeFocusCode || 'r');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoverPixel, setHoverPixel] = useState<{
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    hex: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgElementRef = useRef<HTMLImageElement | null>(null);

  // Sync selectedChannelCode when activeFocusCode changes from external trigger
  useEffect(() => {
    if (activeFocusCode) {
      setSelectedChannelCode(activeFocusCode);
      setViewMode('single');
    }
  }, [activeFocusCode]);

  // Hidden offscreen canvas for fast pixel color sampling
  useEffect(() => {
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = data.metadata.width;
    offscreenCanvas.height = data.metadata.height;
    const ctx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      canvasRef.current = offscreenCanvas;
    };
    img.src = data.original_data_url;
  }, [data]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convert to image coordinates
    const naturalWidth = img.naturalWidth || data.metadata.width;
    const naturalHeight = img.naturalHeight || data.metadata.height;

    const x = Math.floor((clientX / rect.width) * naturalWidth);
    const y = Math.floor((clientY / rect.height) * naturalHeight);

    if (x < 0 || x >= naturalWidth || y < 0 || y >= naturalHeight) {
      return;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        try {
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          const r = pixel[0];
          const g = pixel[1];
          const b = pixel[2];
          const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b)
            .toString(16)
            .slice(1)
            .toUpperCase()}`;
          setHoverPixel({ x, y, r, g, b, hex });
        } catch {
          // Ignore sampling errors
        }
      }
    }
  }, [data.metadata.width, data.metadata.height]);

  const handleMouseLeave = () => {
    setHoverPixel(null);
  };

  const getChannel = (code: string) => {
    if (code === 'r') return data.channels.r;
    if (code === 'g') return data.channels.g;
    return data.channels.b;
  };

  const currentChannel = getChannel(selectedChannelCode);
  const currentChannelImg =
    renderMode === 'color' ? currentChannel.color_data_url : currentChannel.grayscale_data_url;

  return (
    <div className="bg-[#0f111a] border border-[#1f253a] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Workspace Toolbar */}
      <div className="px-4 py-3 bg-[#131726] border-b border-[#1f253a] flex flex-wrap items-center justify-between gap-3">
        {/* View Modes */}
        <div className="flex items-center gap-1.5 bg-[#0a0c14] p-1 rounded-xl border border-[#232940]">
          <button
            onClick={() => {
              setViewMode('grid');
              onSelectFocusCode(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              viewMode === 'grid'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>4-Up Grid</span>
          </button>
          <button
            onClick={() => setViewMode('compare')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              viewMode === 'compare'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>So sánh đôi</span>
          </button>
          <button
            onClick={() => setViewMode('single')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              viewMode === 'single'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>Đơn kênh</span>
          </button>
        </div>

        {/* Channel Selection (if single or compare mode) */}
        {(viewMode === 'single' || viewMode === 'compare') && (
          <div className="flex items-center gap-1 bg-[#0a0c14] p-1 rounded-xl border border-[#232940]">
            <span className="text-xs text-slate-400 px-2 font-medium hidden sm:inline">Kênh:</span>
            {(['r', 'g', 'b'] as const).map((code) => {
              const ch = getChannel(code);
              const isSelected = selectedChannelCode === code;
              return (
                <button
                  key={code}
                  onClick={() => {
                    setSelectedChannelCode(code);
                    onSelectFocusCode(code);
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  style={{
                    backgroundColor: isSelected ? ch.color_hex : 'transparent',
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: isSelected ? '#ffffff' : ch.color_hex }}
                  />
                  <span>{ch.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Global Render Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#0a0c14] p-1 rounded-xl border border-[#232940]">
            <button
              onClick={() => onToggleRenderMode('color')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                renderMode === 'color'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cô lập màu
            </button>
            <button
              onClick={() => onToggleRenderMode('grayscale')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                renderMode === 'grayscale'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Thang độ xám
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-[#0a0c14] p-1 rounded-xl border border-[#232940]">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(0.5, prev - 0.25))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2034] transition"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 w-12 text-center select-none">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.25))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2034] transition"
              title="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2034] transition"
              title="Khôi phục kích thước 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative min-h-[460px] max-h-[680px] overflow-auto custom-checkerboard p-4 flex items-center justify-center">
        {/* Mode 1: 4-Up Synchronized Grid */}
        {viewMode === 'grid' && (
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full transition-transform duration-200 origin-center"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Cell 1: Original */}
            <div className="bg-[#111420]/90 border border-[#262c44] rounded-xl overflow-hidden flex flex-col shadow-lg">
              <div className="px-3 py-1.5 bg-[#171b2c] border-b border-[#242a42] flex items-center justify-between text-xs font-semibold text-slate-200">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Ảnh Gốc Nguyên Bản
                </span>
                <span className="text-[10px] text-slate-400 font-mono">RGB Composite</span>
              </div>
              <div className="aspect-video relative overflow-hidden flex items-center justify-center bg-[#07080d]">
                <img
                  src={data.original_data_url}
                  alt="Original"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="w-full h-full object-contain cursor-crosshair"
                />
              </div>
            </div>

            {/* Cell 2: Red */}
            <div className="bg-[#111420]/90 border border-rose-900/40 rounded-xl overflow-hidden flex flex-col shadow-lg">
              <div className="px-3 py-1.5 bg-[#171b2c] border-b border-[#242a42] flex items-center justify-between text-xs font-semibold text-rose-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Kênh Red (Đỏ)
                </span>
                <button
                  onClick={() => onDownloadChannel('r', renderMode)}
                  className="text-[11px] text-rose-400 hover:text-rose-200 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Tải
                </button>
              </div>
              <div className="aspect-video relative overflow-hidden flex items-center justify-center bg-[#07080d]">
                <img
                  src={
                    renderMode === 'color'
                      ? data.channels.r.color_data_url
                      : data.channels.r.grayscale_data_url
                  }
                  alt="Red Channel"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="w-full h-full object-contain cursor-crosshair"
                />
              </div>
            </div>

            {/* Cell 3: Green */}
            <div className="bg-[#111420]/90 border border-emerald-900/40 rounded-xl overflow-hidden flex flex-col shadow-lg">
              <div className="px-3 py-1.5 bg-[#171b2c] border-b border-[#242a42] flex items-center justify-between text-xs font-semibold text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Kênh Green (Xanh lá)
                </span>
                <button
                  onClick={() => onDownloadChannel('g', renderMode)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-200 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Tải
                </button>
              </div>
              <div className="aspect-video relative overflow-hidden flex items-center justify-center bg-[#07080d]">
                <img
                  src={
                    renderMode === 'color'
                      ? data.channels.g.color_data_url
                      : data.channels.g.grayscale_data_url
                  }
                  alt="Green Channel"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="w-full h-full object-contain cursor-crosshair"
                />
              </div>
            </div>

            {/* Cell 4: Blue */}
            <div className="bg-[#111420]/90 border border-blue-900/40 rounded-xl overflow-hidden flex flex-col shadow-lg">
              <div className="px-3 py-1.5 bg-[#171b2c] border-b border-[#242a42] flex items-center justify-between text-xs font-semibold text-blue-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Kênh Blue (Xanh dương)
                </span>
                <button
                  onClick={() => onDownloadChannel('b', renderMode)}
                  className="text-[11px] text-blue-400 hover:text-blue-200 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Tải
                </button>
              </div>
              <div className="aspect-video relative overflow-hidden flex items-center justify-center bg-[#07080d]">
                <img
                  src={
                    renderMode === 'color'
                      ? data.channels.b.color_data_url
                      : data.channels.b.grayscale_data_url
                  }
                  alt="Blue Channel"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="w-full h-full object-contain cursor-crosshair"
                />
              </div>
            </div>
          </div>
        )}

        {/* Mode 2: Side-by-Side Comparison */}
        {viewMode === 'compare' && (
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full transition-transform duration-200 origin-center"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Left: Original */}
            <div className="bg-[#111420]/90 border border-[#262c44] rounded-xl overflow-hidden shadow-lg flex flex-col">
              <div className="px-4 py-2 bg-[#171b2c] border-b border-[#242a42] text-xs font-semibold text-slate-200">
                Ảnh Gốc Tổng Hợp (RGB Full Color)
              </div>
              <div className="aspect-video relative overflow-hidden flex items-center justify-center bg-[#07080d]">
                <img
                  src={data.original_data_url}
                  alt="Original"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="w-full h-full object-contain cursor-crosshair"
                />
              </div>
            </div>

            {/* Right: Selected Channel */}
            <div className="bg-[#111420]/90 border border-[#262c44] rounded-xl overflow-hidden shadow-lg flex flex-col">
              <div className="px-4 py-2 bg-[#171b2c] border-b border-[#242a42] flex items-center justify-between text-xs font-semibold">
                <span style={{ color: currentChannel.color_hex }}>
                  Kênh {currentChannel.name} ({renderMode === 'color' ? 'Màu cô lập' : 'Thang độ xám'})
                </span>
                <button
                  onClick={() => onDownloadChannel(currentChannel.code, renderMode)}
                  className="text-xs text-indigo-400 hover:text-indigo-200 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Tải kênh
                </button>
              </div>
              <div className="aspect-video relative overflow-hidden flex items-center justify-center bg-[#07080d]">
                <img
                  src={currentChannelImg}
                  alt={currentChannel.name}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="w-full h-full object-contain cursor-crosshair"
                />
              </div>
            </div>
          </div>
        )}

        {/* Mode 3: Single Channel Full Focus */}
        {viewMode === 'single' && (
          <div
            className="w-full max-w-4xl transition-transform duration-200 origin-center flex flex-col items-center justify-center"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <div className="w-full bg-[#111420]/90 border border-[#262c44] rounded-xl overflow-hidden shadow-2xl flex flex-col">
              <div className="px-4 py-2 bg-[#171b2c] border-b border-[#242a42] flex items-center justify-between text-xs font-semibold">
                <span style={{ color: currentChannel.color_hex }} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: currentChannel.color_hex }}
                  />
                  Kênh {currentChannel.name} —{' '}
                  {renderMode === 'color' ? 'Tách màu quang phổ cô lập' : 'Thang độ xám độ sâu 8-bit'}
                </span>
                <button
                  onClick={() => onDownloadChannel(currentChannel.code, renderMode)}
                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center gap-1 font-medium transition"
                >
                  <Download className="w-3 h-3" /> Tải ảnh kênh này (PNG)
                </button>
              </div>
              <div className="aspect-video relative overflow-hidden flex items-center justify-center bg-[#07080d]">
                <img
                  ref={imgElementRef}
                  src={currentChannelImg}
                  alt={currentChannel.name}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="w-full h-full object-contain cursor-crosshair"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Real-Time Eyedropper / Pixel Color Inspector Bar */}
      <div className="px-4 py-2.5 bg-[#121522] border-t border-[#1f253a] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] text-slate-400">Điểm lấy mẫu pixel:</span>
          {hoverPixel ? (
            <div className="flex items-center gap-2.5">
              <span className="text-slate-300 font-semibold">
                X: {hoverPixel.x}, Y: {hoverPixel.y}
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#181d2f] border border-[#2a324d]">
                <span
                  className="w-3 h-3 rounded-full border border-white/20 shadow-inner"
                  style={{ backgroundColor: hoverPixel.hex }}
                />
                <span className="text-slate-200 font-bold">{hoverPixel.hex}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-rose-400 font-bold">R:{hoverPixel.r}</span>
                <span className="text-emerald-400 font-bold">G:{hoverPixel.g}</span>
                <span className="text-blue-400 font-bold">B:{hoverPixel.b}</span>
              </div>
            </div>
          ) : (
            <span className="text-slate-400 italic">Rê chuột lên ảnh để soi giá trị ma trận RGB tại tọa độ</span>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          <span>Gốc: {data.metadata.width}×{data.metadata.height}px</span>
          <span>Tỷ lệ: {data.metadata.aspect_ratio}</span>
          <span className="text-emerald-400 font-semibold">{data.message}</span>
        </div>
      </div>
    </div>
  );
};
