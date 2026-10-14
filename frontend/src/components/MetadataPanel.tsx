import React from 'react';
import type { ImageMetadata } from '../types';
import { Image as ImageIcon, Maximize2, HardDrive, Cpu, Layers, Clock } from 'lucide-react';

interface MetadataPanelProps {
  metadata: ImageMetadata;
  processingTimeMs: number;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({ metadata, processingTimeMs }) => {
  const megapixels = ((metadata.width * metadata.height) / 1000000).toFixed(2);

  return (
    <div className="bg-[#111420] border border-[#202538] rounded-xl p-4 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between border-b border-[#1f253a] pb-3 mb-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-100 truncate max-w-[220px]" title={metadata.filename}>
              {metadata.filename}
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              {metadata.format} • {metadata.color_mode}
            </span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 text-[10px] font-mono font-medium flex items-center gap-1">
          <Clock className="w-3 h-3" /> {processingTimeMs} ms
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Độ phân giải */}
        <div className="bg-[#151928] rounded-lg p-2.5 border border-[#242b42]">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
            <Maximize2 className="w-3 h-3 text-sky-400" />
            <span>Độ phân giải</span>
          </div>
          <div className="text-xs font-semibold text-slate-200 font-mono">
            {metadata.width} × {metadata.height}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            {megapixels} MP ({metadata.aspect_ratio})
          </div>
        </div>

        {/* Dung lượng file */}
        <div className="bg-[#151928] rounded-lg p-2.5 border border-[#242b42]">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
            <HardDrive className="w-3 h-3 text-amber-400" />
            <span>Dung lượng</span>
          </div>
          <div className="text-xs font-semibold text-slate-200 font-mono">
            {metadata.file_size_formatted}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            {metadata.file_size_bytes.toLocaleString()} bytes
          </div>
        </div>

        {/* Cấu trúc kênh */}
        <div className="bg-[#151928] rounded-lg p-2.5 border border-[#242b42]">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
            <Layers className="w-3 h-3 text-purple-400" />
            <span>Kênh màu</span>
          </div>
          <div className="text-xs font-semibold text-slate-200 font-mono">
            {metadata.channels} Channels
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            24-bit TrueColor
          </div>
        </div>

        {/* Bộ xử lý */}
        <div className="bg-[#151928] rounded-lg p-2.5 border border-[#242b42]">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
            <Cpu className="w-3 h-3 text-emerald-400" />
            <span>Động cơ ma trận</span>
          </div>
          <div className="text-xs font-semibold text-slate-200 font-mono">
            NumPy Array
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            uint8 (0-255)
          </div>
        </div>
      </div>
    </div>
  );
};
