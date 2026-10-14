import React from 'react';
import { Layers, RefreshCw, Sparkles, Download, AlertCircle } from 'lucide-react';
import type { HealthStatus } from '../types';

interface HeaderProps {
  health: HealthStatus | null;
  isHealthChecking: boolean;
  onRetryHealth: () => void;
  onLoadPreset: (type: 'prism' | 'sunset' | 'palette') => void;
  onReset: () => void;
  hasActiveImage: boolean;
  onDownloadAll?: () => void;
  isDownloadingZip?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  isHealthChecking,
  onRetryHealth,
  onLoadPreset,
  onReset,
  hasActiveImage,
  onDownloadAll,
  isDownloadingZip,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#0d0f17]/90 backdrop-blur-md border-b border-[#1e2235] px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-emerald-500 to-blue-600 p-[2px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#0d0f17] rounded-[10px] flex items-center justify-center">
              <Layers className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-rose-400 via-emerald-400 to-sky-400 bg-clip-text text-transparent">
                CHROMATICA STUDIO
              </h1>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                Phase 1 MVP
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Chuyên gia phân tích và bóc tách ma trận kênh phổ màu RGB
            </p>
          </div>
        </div>

        {/* Action Controls & Backend Status */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 bg-[#141824] p-1 rounded-lg border border-[#22273d]">
            <span className="text-xs text-slate-400 px-2 font-medium hidden sm:inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Ảnh mẫu:
            </span>
            <button
              onClick={() => onLoadPreset('prism')}
              className="px-2.5 py-1 text-xs rounded-md bg-[#1c2236] text-slate-200 hover:text-white hover:bg-indigo-600/40 transition font-medium"
              title="Tải ảnh mẫu quang phổ lăng kính"
            >
              Lăng kính
            </button>
            <button
              onClick={() => onLoadPreset('sunset')}
              className="px-2.5 py-1 text-xs rounded-md bg-[#1c2236] text-slate-200 hover:text-white hover:bg-rose-600/40 transition font-medium"
              title="Tải ảnh mẫu hoàng hôn Cyberpunk"
            >
              Hoàng hôn
            </button>
            <button
              onClick={() => onLoadPreset('palette')}
              className="px-2.5 py-1 text-xs rounded-md bg-[#1c2236] text-slate-200 hover:text-white hover:bg-emerald-600/40 transition font-medium"
              title="Tải bảng màu chuẩn RGB"
            >
              Bảng màu
            </button>
          </div>

          {/* Download All ZIP if available */}
          {hasActiveImage && onDownloadAll && (
            <button
              onClick={onDownloadAll}
              disabled={isDownloadingZip}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
            >
              {isDownloadingZip ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Tải ZIP tất cả kênh</span>
            </button>
          )}

          {/* Reset Workspace */}
          {hasActiveImage && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 bg-[#141824] border border-[#22273d] hover:border-slate-600 transition"
              title="Làm trống không gian làm việc"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          )}

          {/* Backend Health Status Badge */}
          <div
            onClick={onRetryHealth}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition select-none ${
              health
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40'
                : isHealthChecking
                ? 'bg-blue-950/40 border-blue-800/60 text-blue-300'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/40'
            }`}
            title={health ? `FastAPI ${health.version} đang kết nối trực tiếp` : 'Nhấn để thử kết nối lại'}
          >
            {health ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="hidden sm:inline font-mono">FastAPI Backend: Online</span>
                <span className="sm:hidden font-mono">API: OK</span>
              </>
            ) : isHealthChecking ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                <span className="font-mono">Đang kết nối...</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono">API: Ngoại tuyến (Click thử lại)</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
