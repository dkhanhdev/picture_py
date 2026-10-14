import React, { useState } from 'react';
import type { ChannelData } from '../types';
import { Download, Eye, Maximize2, BarChart2 } from 'lucide-react';

interface ChannelCardProps {
  channel: ChannelData;
  renderMode: 'color' | 'grayscale';
  onDownload: (code: string, mode: 'color' | 'grayscale') => void;
  onFocusChannel: (code: string) => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  renderMode,
  onDownload,
  onFocusChannel,
}) => {
  const [localMode, setLocalMode] = useState<'inherit' | 'color' | 'grayscale'>('inherit');

  const effectiveMode = localMode === 'inherit' ? renderMode : localMode;
  const currentImageUrl =
    effectiveMode === 'color' ? channel.color_data_url : channel.grayscale_data_url;

  // Render Mini Histogram SVG
  const renderMiniHistogram = () => {
    const hist = channel.histogram;
    if (!hist || hist.length === 0) return null;

    const maxVal = Math.max(...hist, 1);
    const svgWidth = 220;
    const svgHeight = 44;

    const points = hist
      .map((val, idx) => {
        const x = (idx / 255) * svgWidth;
        const y = svgHeight - (val / maxVal) * (svgHeight - 4);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return (
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-11 overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`grad-${channel.code}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={channel.color_hex} stopOpacity="0.45" />
            <stop offset="100%" stopColor={channel.color_hex} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${svgHeight} ${points} ${svgWidth},${svgHeight}`}
          fill={`url(#grad-${channel.code})`}
        />
        <polyline
          fill="none"
          stroke={channel.color_hex}
          strokeWidth="1.5"
          points={points}
        />
      </svg>
    );
  };

  const getBorderColor = () => {
    if (channel.code === 'r') return 'border-rose-500/40 hover:border-rose-500/80';
    if (channel.code === 'g') return 'border-emerald-500/40 hover:border-emerald-500/80';
    return 'border-blue-500/40 hover:border-blue-500/80';
  };

  const getBadgeStyle = () => {
    if (channel.code === 'r') return 'bg-rose-950/80 text-rose-300 border-rose-800/60';
    if (channel.code === 'g') return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60';
    return 'bg-blue-950/80 text-blue-300 border-blue-800/60';
  };

  return (
    <div
      className={`bg-[#111420] border ${getBorderColor()} rounded-xl overflow-hidden flex flex-col shadow-xl transition-all duration-200 group`}
    >
      {/* Card Header */}
      <div className="px-4 py-3 bg-[#151928] border-b border-[#202538] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full shadow-sm"
            style={{ backgroundColor: channel.color_hex }}
          />
          <h4 className="text-sm font-bold text-slate-100 tracking-wide">
            Kênh {channel.name} ({channel.code.toUpperCase()})
          </h4>
          <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-md border ${getBadgeStyle()}`}>
            {effectiveMode === 'color' ? 'Màu cô lập' : 'Grayscale'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onFocusChannel(channel.code)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#20263c] transition"
            title="Phóng to kênh này trên không gian chính"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Image Preview Container */}
      <div className="relative aspect-video w-full bg-[#0a0c13] custom-checkerboard overflow-hidden flex items-center justify-center group/preview">
        <img
          src={currentImageUrl}
          alt={`Kênh ${channel.name}`}
          className="w-full h-full object-contain transition-transform duration-300 group-hover/preview:scale-105"
        />

        {/* Quick View Mode Toggle on hover */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#0f121d]/80 backdrop-blur-md p-1 rounded-lg border border-[#242b42] opacity-80 group-hover/preview:opacity-100 transition">
          <button
            onClick={() => setLocalMode('color')}
            className={`px-2 py-0.5 text-[10px] font-medium rounded transition ${
              effectiveMode === 'color'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Màu
          </button>
          <button
            onClick={() => setLocalMode('grayscale')}
            className={`px-2 py-0.5 text-[10px] font-medium rounded transition ${
              effectiveMode === 'grayscale'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Xám
          </button>
        </div>
      </div>

      {/* Mini Histogram Preview */}
      <div className="p-3 bg-[#131625] border-t border-b border-[#202538]">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-mono">
          <span className="flex items-center gap-1">
            <BarChart2 className="w-3 h-3" style={{ color: channel.color_hex }} />
            Phổ tần suất (0-255)
          </span>
          <span className="text-[10px] text-slate-400">Mean: {channel.stats.mean}</span>
        </div>
        <div className="h-11 bg-[#0c0e17] rounded-md p-1 border border-[#1b2033]">
          {renderMiniHistogram()}
        </div>
      </div>

      {/* Numerical Statistics Grid */}
      <div className="p-3 grid grid-cols-5 gap-1 text-center font-mono text-[11px] bg-[#101320]">
        <div className="bg-[#151929] rounded p-1.5 border border-[#1f263d]">
          <span className="block text-[9px] text-slate-400 uppercase">Min</span>
          <span className="font-semibold text-slate-200">{channel.stats.min}</span>
        </div>
        <div className="bg-[#151929] rounded p-1.5 border border-[#1f263d]">
          <span className="block text-[9px] text-slate-400 uppercase">Max</span>
          <span className="font-semibold text-slate-200">{channel.stats.max}</span>
        </div>
        <div className="bg-[#151929] rounded p-1.5 border border-[#1f263d]">
          <span className="block text-[9px] text-slate-400 uppercase">Mean</span>
          <span className="font-semibold text-slate-200">{channel.stats.mean}</span>
        </div>
        <div className="bg-[#151929] rounded p-1.5 border border-[#1f263d]">
          <span className="block text-[9px] text-slate-400 uppercase">StdDev</span>
          <span className="font-semibold text-slate-200">{channel.stats.std_dev}</span>
        </div>
        <div className="bg-[#151929] rounded p-1.5 border border-[#1f263d]">
          <span className="block text-[9px] text-slate-400 uppercase">Median</span>
          <span className="font-semibold text-slate-200">{channel.stats.median}</span>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="p-3 bg-[#131625] border-t border-[#202538] flex items-center justify-between gap-2">
        <button
          onClick={() => onFocusChannel(channel.code)}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-[#1c2236] hover:bg-[#252d47] text-slate-200 hover:text-white transition flex items-center justify-center gap-1.5"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Chi tiết</span>
        </button>

        <button
          onClick={() => onDownload(channel.code, effectiveMode)}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-600/80 hover:bg-indigo-600 text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95"
          title={`Tải xuống ảnh kênh ${channel.name} dạng PNG`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Tải PNG</span>
        </button>
      </div>
    </div>
  );
};
