import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { MetadataPanel } from './components/MetadataPanel';
import { WorkspaceView } from './components/WorkspaceView';
import { ChannelCard } from './components/ChannelCard';
import { HistogramPanel } from './components/HistogramPanel';
import { Toast, type ToastMessage } from './components/Toast';
import { ApiService } from './services/api';
import type { RGBProcessResponse, HealthStatus } from './types';
import { generateSampleImage } from './utils/sampleImages';
import { Layers, Sparkles, Cpu, Sliders } from 'lucide-react';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isHealthChecking, setIsHealthChecking] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processedData, setProcessedData] = useState<RGBProcessResponse | null>(null);
  const [renderMode, setRenderMode] = useState<'color' | 'grayscale'>('color');
  const [activeFocusCode, setActiveFocusCode] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);

  // Toast Helpers
  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Health check on mount
  const checkBackendHealth = useCallback(async () => {
    setIsHealthChecking(true);
    try {
      const res = await ApiService.checkHealth();
      setHealth(res);
      addToast('success', `FastAPI backend đã sẵn sàng (${res.service} v${res.version})`);
    } catch {
      setHealth(null);
      // Don't show toast error immediately on initial load to avoid alarm, status badge in header will show
    } finally {
      setIsHealthChecking(false);
    }
  }, [addToast]);

  useEffect(() => {
    checkBackendHealth();
  }, [checkBackendHealth]);

  // Handle file processing
  const handleProcessFile = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      let result: RGBProcessResponse;

      if (health) {
        // Run with high-performance FastAPI + NumPy backend
        try {
          result = await ApiService.processSplitRGB(file);
          addToast('success', `Đã bóc tách ma trận RGB thành công (${result.processing_time_ms} ms)`);
        } catch (apiErr: unknown) {
          // Fallback to client engine if backend fails unexpectedly
          console.warn('Backend API error, falling back to client canvas engine:', apiErr);
          result = await ApiService.processClientSideFallback(file);
          addToast('info', 'Máy chủ bận, hệ thống đã chuyển sang động cơ client để hoàn thành xử lý.');
        }
      } else {
        // Backend currently offline: process client-side
        result = await ApiService.processClientSideFallback(file);
        addToast('info', 'Xử lý qua bộ engine client (Backend ngoại tuyến)');
      }

      setProcessedData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đã có lỗi xảy ra trong quá trình xử lý ảnh.';
      setErrorMessage(msg);
      addToast('error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Preset sample loader
  const handleLoadPreset = (type: 'prism' | 'sunset' | 'palette') => {
    const file = generateSampleImage(type);
    handleProcessFile(file);
  };

  // Workspace reset
  const handleResetWorkspace = () => {
    setProcessedData(null);
    setActiveFocusCode(null);
    setErrorMessage(null);
    addToast('info', 'Không gian làm việc đã được đặt lại.');
  };

  // Single channel download
  const handleDownloadChannel = (code: string, mode: 'color' | 'grayscale') => {
    if (!processedData) return;

    if (health && !processedData.image_id.startsWith('client-')) {
      // Direct stream download from backend
      const url = ApiService.getDownloadChannelUrl(processedData.image_id, code, mode);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${processedData.metadata.filename.split('.')[0]}_${code}_${mode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addToast('success', `Đang tải xuống tệp ảnh kênh ${code.toUpperCase()} (${mode})...`);
    } else {
      // Download from client data URL
      const channel =
        code === 'r'
          ? processedData.channels.r
          : code === 'g'
          ? processedData.channels.g
          : processedData.channels.b;
      const dataUrl = mode === 'color' ? channel.color_data_url : channel.grayscale_data_url;
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${processedData.metadata.filename.split('.')[0]}_${code}_${mode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addToast('success', `Đã tải xuống ảnh kênh ${channel.name} (${mode})`);
    }
  };

  // Download all channels as ZIP
  const handleDownloadAllZip = async () => {
    if (!processedData) return;

    if (health && !processedData.image_id.startsWith('client-')) {
      setIsDownloadingZip(true);
      try {
        const url = ApiService.getDownloadAllZipUrl(processedData.image_id);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${processedData.metadata.filename.split('.')[0]}_chromatica_rgb.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        addToast('success', 'Đã tạo gói ZIP chứa 6 biến thể kênh và báo cáo phân tích!');
      } catch (e) {
        addToast('error', 'Không thể tải tệp ZIP từ máy chủ.');
      } finally {
        setIsDownloadingZip(false);
      }
    } else {
      // In client mode, download the 3 channels individually
      addToast('info', 'Đang tải xuống các kênh ảnh...');
      handleDownloadChannel('r', renderMode);
      setTimeout(() => handleDownloadChannel('g', renderMode), 400);
      setTimeout(() => handleDownloadChannel('b', renderMode), 800);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b12] text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Header */}
      <Header
        health={health}
        isHealthChecking={isHealthChecking}
        onRetryHealth={checkBackendHealth}
        onLoadPreset={handleLoadPreset}
        onReset={handleResetWorkspace}
        hasActiveImage={!!processedData}
        onDownloadAll={handleDownloadAllZip}
        isDownloadingZip={isDownloadingZip}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 flex flex-col gap-6">
        {!processedData ? (
          /* Empty / Upload View */
          <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-12">
            {/* Hero Banner */}
            <div className="text-center max-w-2xl mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-700/50 text-indigo-300 text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Không Gian Làm Việc Xử Lý Ảnh Kỹ Thuật Số</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
                Bóc Tách Ma Trận RGB Nguyên Bản
              </h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Phân tích quang phổ, cô lập photon màu thuần, tính toán biểu đồ tần suất 256 mức
                và trích xuất dữ liệu định lượng chính xác từng pixel với thuật toán xử lý ảnh chuyên sâu.
              </p>
            </div>

            {/* Upload DropZone */}
            <DropZone
              onFileSelected={handleProcessFile}
              isLoading={isLoading}
              errorMessage={errorMessage}
              onClearError={() => setErrorMessage(null)}
              onLoadPreset={handleLoadPreset}
            />

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl w-full mt-12">
              <div className="bg-[#101320] border border-[#1e2338] rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Bóc tách 3 Kênh RGB</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Trích xuất kênh Đỏ, Xanh lá, Xanh dương ở cả dạng quang phổ cô lập và thang độ xám (L-mode).
                  </p>
                </div>
              </div>

              <div className="bg-[#101320] border border-[#1e2338] rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Động cơ NumPy & FastAPI</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Thực thi thuật toán ma trận trên không gian bộ nhớ C-level, độ trễ xử lý tính bằng mili-giây.
                  </p>
                </div>
              </div>

              <div className="bg-[#101320] border border-[#1e2338] rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Soi Pixel & Histogram</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Công cụ Eyedropper soi tọa độ pixel thời gian thực và biểu đồ tần suất 256 bins chuẩn hóa.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Active Image Studio View */
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Metadata Summary Banner */}
            <MetadataPanel
              metadata={processedData.metadata}
              processingTimeMs={processedData.processing_time_ms}
            />

            {/* Central Workspace Canvas with 4-up grid / zoom / eyedropper */}
            <WorkspaceView
              data={processedData}
              renderMode={renderMode}
              onToggleRenderMode={setRenderMode}
              activeFocusCode={activeFocusCode}
              onSelectFocusCode={setActiveFocusCode}
              onDownloadChannel={handleDownloadChannel}
            />

            {/* 3 Channel Cards (Red, Green, Blue) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-200 tracking-wide flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Chi Tiết Ba Kênh Màu Độc Lập</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Hiển thị: {renderMode === 'color' ? 'Màu quang phổ cô lập' : 'Thang độ xám 8-bit'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <ChannelCard
                  channel={processedData.channels.r}
                  renderMode={renderMode}
                  onDownload={handleDownloadChannel}
                  onFocusChannel={(code) => setActiveFocusCode(code)}
                />
                <ChannelCard
                  channel={processedData.channels.g}
                  renderMode={renderMode}
                  onDownload={handleDownloadChannel}
                  onFocusChannel={(code) => setActiveFocusCode(code)}
                />
                <ChannelCard
                  channel={processedData.channels.b}
                  renderMode={renderMode}
                  onDownload={handleDownloadChannel}
                  onFocusChannel={(code) => setActiveFocusCode(code)}
                />
              </div>
            </div>

            {/* Interactive Histogram Analysis Panel */}
            <HistogramPanel
              channels={processedData.channels}
              totalPixels={processedData.metadata.width * processedData.metadata.height}
            />
          </div>
        )}
      </main>

      {/* Studio Footer */}
      <footer className="border-t border-[#171a29] bg-[#0a0c14] py-4 px-4 text-center text-xs text-slate-400 font-mono">
        Chromatica Studio MVP (Giai đoạn 1) • React 19 + TypeScript + Vite + Tailwind CSS • FastAPI + Pillow + NumPy
      </footer>

      {/* Floating Toast System */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
