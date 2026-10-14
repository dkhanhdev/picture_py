import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, AlertTriangle, FileCheck, Sparkles, ShieldCheck } from 'lucide-react';

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
  onLoadPreset: (type: 'prism' | 'sunset' | 'palette') => void;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFileSelected,
  isLoading,
  errorMessage,
  onClearError,
  onLoadPreset,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileSelected(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileSelected(file);
      e.target.value = ''; // Reset input để có thể chọn lại file cùng tên
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Error Message Alert */}
      {errorMessage && (
        <div className="w-full mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 flex items-start justify-between gap-3 shadow-lg shadow-rose-950/30 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-900/50 text-rose-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-rose-300">Không thể xử lý tệp ảnh</h4>
              <p className="text-xs text-rose-200/90 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={onClearError}
            className="text-xs text-rose-400 hover:text-rose-100 hover:underline px-2 py-1"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Main Drag & Drop Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative w-full max-w-3xl p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center group ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-950/20 scale-[1.01] shadow-2xl shadow-indigo-500/20'
            : 'border-[#262c44] hover:border-indigo-500/60 bg-[#111420]/80 hover:bg-[#141826]'
        } ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/bmp"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Floating Halo Glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-rose-500/5 via-emerald-500/5 to-blue-500/5 opacity-50 group-hover:opacity-100 pointer-events-none transition-opacity" />

        {/* Center Icon */}
        <div className="relative mb-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#1a1f33] to-[#121624] border border-[#2e3654] flex items-center justify-center shadow-xl group-hover:scale-105 group-hover:border-indigo-500/50 transition-all">
            {isLoading ? (
              <div className="relative">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
              </div>
            ) : (
              <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-emerald-400" />
          </div>
        </div>

        {/* Instructions */}
        <h3 className="text-base sm:text-lg font-semibold text-slate-100 mb-1 group-hover:text-white transition">
          {isLoading
            ? 'Đang tải lên và phân tích ma trận phổ màu RGB...'
            : 'Kéo và thả ảnh vào đây hoặc nhấp để duyệt tệp'}
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-5 leading-relaxed">
          Tách ma trận 3 kênh Đỏ (R), Xanh lá (G) và Xanh dương (B) nguyên bản với thuật toán xử lý ảnh chuyên sâu.
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171b2b] text-[11px] font-medium text-slate-300 border border-[#29304c]">
            <FileCheck className="w-3.5 h-3.5 text-blue-400" /> Định dạng: PNG, JPG, WEBP, BMP
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171b2b] text-[11px] font-medium text-slate-300 border border-[#29304c]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Giới hạn kích thước: ≤ 15 MB
          </span>
        </div>

        {/* Button to Choose File */}
        <button
          type="button"
          disabled={isLoading}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 transition active:scale-95 flex items-center gap-2"
        >
          <ImageIcon className="w-4 h-4" />
          <span>Chọn ảnh từ thiết bị</span>
        </button>

        {/* Quick Sample Presets Footer */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-8 pt-6 border-t border-[#1e2338] w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Chưa có ảnh sẵn? Thử ngay với ảnh mẫu:
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onLoadPreset('prism')}
              className="px-3 py-1 rounded-lg bg-[#181d2e] hover:bg-[#222942] text-slate-200 border border-[#28304d] hover:border-indigo-500/50 transition font-medium"
            >
              Phổ lăng kính
            </button>
            <button
              onClick={() => onLoadPreset('sunset')}
              className="px-3 py-1 rounded-lg bg-[#181d2e] hover:bg-[#222942] text-slate-200 border border-[#28304d] hover:border-rose-500/50 transition font-medium"
            >
              Hoàng hôn
            </button>
            <button
              onClick={() => onLoadPreset('palette')}
              className="px-3 py-1 rounded-lg bg-[#181d2e] hover:bg-[#222942] text-slate-200 border border-[#28304d] hover:border-emerald-500/50 transition font-medium"
            >
              Bảng màu RGB
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
