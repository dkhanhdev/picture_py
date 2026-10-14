import React, { useState, useMemo } from 'react';
import type { ChannelData } from '../types';
import { BarChart3 } from 'lucide-react';

interface HistogramPanelProps {
  channels: {
    r: ChannelData;
    g: ChannelData;
    b: ChannelData;
  };
  totalPixels: number;
}

export const HistogramPanel: React.FC<HistogramPanelProps> = ({ channels, totalPixels }) => {
  const [showRed, setShowRed] = useState(true);
  const [showGreen, setShowGreen] = useState(true);
  const [showBlue, setShowBlue] = useState(true);
  const [fillArea, setFillArea] = useState(true);
  const [hoverBin, setHoverBin] = useState<number | null>(null);

  // Tính giá trị cực đại của cả 3 kênh để chuẩn hóa trục tung (Y)
  const maxIntensityValue = useMemo(() => {
    let max = 1;
    if (showRed) max = Math.max(max, ...channels.r.histogram);
    if (showGreen) max = Math.max(max, ...channels.g.histogram);
    if (showBlue) max = Math.max(max, ...channels.b.histogram);
    return max;
  }, [channels, showRed, showGreen, showBlue]);

  const svgWidth = 800;
  const svgHeight = 220;

  // Tạo đường dẫn SVG cho từng kênh
  const generatePathData = (hist: number[]) => {
    return hist
      .map((val, idx) => {
        const x = (idx / 255) * svgWidth;
        const y = svgHeight - (val / maxIntensityValue) * (svgHeight - 15);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const rPoints = useMemo(() => generatePathData(channels.r.histogram), [channels.r.histogram, maxIntensityValue]);
  const gPoints = useMemo(() => generatePathData(channels.g.histogram), [channels.g.histogram, maxIntensityValue]);
  const bPoints = useMemo(() => generatePathData(channels.b.histogram), [channels.b.histogram, maxIntensityValue]);

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clientX / rect.width));
    const bin = Math.round(ratio * 255);
    setHoverBin(bin);
  };

  const handleSvgMouseLeave = () => {
    setHoverBin(null);
  };

  return (
    <div className="bg-[#111420] border border-[#202538] rounded-xl p-5 shadow-xl flex flex-col">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#1f253a]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-wide">
              Phổ Tần Suất Kênh Màu (RGB Histogram Analysis)
            </h3>
            <p className="text-[11px] text-slate-400">
              Phân bố số lượng pixel trên dải cường độ từ 0 (Tối nhất) đến 255 (Sáng nhất)
            </p>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setShowRed(!showRed)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
              showRed
                ? 'bg-rose-950/80 text-rose-300 border-rose-800/80 shadow-sm'
                : 'bg-[#151928] text-slate-400 border-[#262c44]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Kênh Đỏ</span>
          </button>
          <button
            onClick={() => setShowGreen(!showGreen)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
              showGreen
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80 shadow-sm'
                : 'bg-[#151928] text-slate-400 border-[#262c44]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Kênh Xanh Lá</span>
          </button>
          <button
            onClick={() => setShowBlue(!showBlue)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
              showBlue
                ? 'bg-blue-950/80 text-blue-300 border-blue-800/80 shadow-sm'
                : 'bg-[#151928] text-slate-400 border-[#262c44]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Kênh Xanh Dương</span>
          </button>
          <button
            onClick={() => setFillArea(!fillArea)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#161a29] text-slate-300 hover:text-white border border-[#272e45] transition"
          >
            {fillArea ? 'Đường viền đơn' : 'Đổ bóng dải'}
          </button>
        </div>
      </div>

      {/* Main SVG Histogram Chart */}
      <div className="relative w-full bg-[#0a0c13] rounded-lg p-3 border border-[#1c2236] overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-48 sm:h-56 cursor-crosshair overflow-visible"
          preserveAspectRatio="none"
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={handleSvgMouseLeave}
        >
          <defs>
            <linearGradient id="hist-grad-r" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="hist-grad-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="hist-grad-b" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1={svgHeight / 4} x2={svgWidth} y2={svgHeight / 4} stroke="#1b2033" strokeDasharray="4 4" />
          <line x1="0" y1={svgHeight / 2} x2={svgWidth} y2={svgHeight / 2} stroke="#1b2033" strokeDasharray="4 4" />
          <line x1="0" y1={(3 * svgHeight) / 4} x2={svgWidth} y2={(3 * svgHeight) / 4} stroke="#1b2033" strokeDasharray="4 4" />
          <line x1={svgWidth / 4} y1="0" x2={svgWidth / 4} y2={svgHeight} stroke="#1b2033" strokeDasharray="4 4" />
          <line x1={svgWidth / 2} y1="0" x2={svgWidth / 2} y2={svgHeight} stroke="#1b2033" strokeDasharray="4 4" />
          <line x1={(3 * svgWidth) / 4} y1="0" x2={(3 * svgWidth) / 4} y2={svgHeight} stroke="#1b2033" strokeDasharray="4 4" />

          {/* Red Channel Curve */}
          {showRed && fillArea && (
            <polygon
              points={`0,${svgHeight} ${rPoints} ${svgWidth},${svgHeight}`}
              fill="url(#hist-grad-r)"
            />
          )}
          {showRed && (
            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinejoin="round"
              points={rPoints}
            />
          )}

          {/* Green Channel Curve */}
          {showGreen && fillArea && (
            <polygon
              points={`0,${svgHeight} ${gPoints} ${svgWidth},${svgHeight}`}
              fill="url(#hist-grad-g)"
            />
          )}
          {showGreen && (
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinejoin="round"
              points={gPoints}
            />
          )}

          {/* Blue Channel Curve */}
          {showBlue && fillArea && (
            <polygon
              points={`0,${svgHeight} ${bPoints} ${svgWidth},${svgHeight}`}
              fill="url(#hist-grad-b)"
            />
          )}
          {showBlue && (
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinejoin="round"
              points={bPoints}
            />
          )}

          {/* Vertical Inspector Cursor */}
          {hoverBin !== null && (
            <line
              x1={(hoverBin / 255) * svgWidth}
              y1="0"
              x2={(hoverBin / 255) * svgWidth}
              y2={svgHeight}
              stroke="#e2e8f0"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          )}
        </svg>

        {/* X-Axis Labels */}
        <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2 px-1">
          <span>0 (Đen tuyệt đối)</span>
          <span>64 (Tối)</span>
          <span>128 (Trung tính)</span>
          <span>192 (Sáng)</span>
          <span>255 (Trắng tuyệt đối)</span>
        </div>
      </div>

      {/* Hover Tooltip Info Banner */}
      <div className="mt-3 p-3 bg-[#141827] rounded-lg border border-[#21273e] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {hoverBin !== null ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Mức sáng đang soi:</span>
              <span className="px-2 py-0.5 rounded bg-[#1c2237] text-white font-bold">
                {hoverBin} / 255
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-rose-400 font-semibold">
                Đỏ: {channels.r.histogram[hoverBin]?.toLocaleString() || 0} px (
                {(((channels.r.histogram[hoverBin] || 0) / totalPixels) * 100).toFixed(2)}%)
              </span>
              <span className="text-emerald-400 font-semibold">
                Xanh lá: {channels.g.histogram[hoverBin]?.toLocaleString() || 0} px (
                {(((channels.g.histogram[hoverBin] || 0) / totalPixels) * 100).toFixed(2)}%)
              </span>
              <span className="text-blue-400 font-semibold">
                Xanh dương: {channels.b.histogram[hoverBin]?.toLocaleString() || 0} px (
                {(((channels.b.histogram[hoverBin] || 0) / totalPixels) * 100).toFixed(2)}%)
              </span>
            </div>
          </>
        ) : (
          <div className="text-slate-400 italic flex items-center gap-1.5">
            <span>Rê chuột trên biểu đồ phổ để xem số lượng pixel chính xác tại từng mức độ sáng 0-255</span>
          </div>
        )}
      </div>
    </div>
  );
};
