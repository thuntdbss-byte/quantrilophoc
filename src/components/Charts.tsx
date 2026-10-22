import React, { useState } from 'react';

interface BarData {
  label: string;
  sublabel?: string;
  value: number;
  secondaryValue?: number;
  color?: string;
}

interface BarChartProps {
  data: BarData[];
  title: string;
  unit?: string;
  height?: number;
  maxValue?: number;
}

export const SimpleBarChart: React.FC<BarChartProps> = ({
  data,
  title,
  unit = '',
  height = 220,
  maxValue,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-5 border border-slate-200 text-center text-slate-500 py-12">
        <p className="text-sm">Chưa có dữ liệu để lập biểu đồ</p>
      </div>
    );
  }

  const calculatedMax = maxValue || Math.max(...data.map((d) => d.value), 10);
  const chartHeight = height - 60;

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        <span className="text-xs text-slate-500 font-medium">Đơn vị: {unit || 'giá trị'}</span>
      </div>

      <div className="relative flex-1 flex items-end gap-3 pt-6 pb-2 px-2 min-h-[160px] border-b border-slate-200">
        {/* Horizontal grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-2 pt-6">
          <div className="border-b border-slate-100 w-full"></div>
          <div className="border-b border-slate-100 w-full"></div>
          <div className="border-b border-slate-100 w-full"></div>
        </div>

        {data.map((item, idx) => {
          const barHeightPercent = Math.min(100, Math.max(8, (item.value / calculatedMax) * 100));
          const isHovered = hoveredIdx === idx;
          const barColor = item.color || '#00897b';

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip on hover */}
              {isHovered && (
                <div className="absolute -top-10 z-20 bg-slate-900 text-white text-xs py-1 px-2.5 rounded shadow-lg whitespace-nowrap transition-all">
                  <span className="font-semibold">{item.label}</span>: {item.value} {unit}
                </div>
              )}

              {/* Bar Value text above */}
              <span className="text-xs font-semibold text-slate-600 mb-1 tabular-nums">
                {item.value}{unit === '%' ? '%' : ''}
              </span>

              {/* Bar */}
              <div
                className="w-full max-w-[48px] rounded-t-md transition-all duration-300 relative overflow-hidden"
                style={{
                  height: `${barHeightPercent}%`,
                  backgroundColor: barColor,
                  opacity: isHovered ? 0.9 : 1,
                  transform: isHovered ? 'scaleY(1.02)' : 'scaleY(1)',
                  transformOrigin: 'bottom',
                }}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Label */}
              <div className="mt-2 text-center w-full">
                <p className="text-xs font-medium text-slate-700 truncate" title={item.label}>
                  {item.label}
                </p>
                {item.sublabel && (
                  <p className="text-[11px] text-slate-600 truncate">{item.sublabel}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface DonutData {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutData[];
  title: string;
  subTitle?: string;
  totalLabel?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  title,
  subTitle,
  totalLabel = 'Tổng số',
}) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  // SVG Donut calculation
  const size = 180;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col h-full">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        {subTitle && <p className="text-xs text-slate-600 mt-0.5">{subTitle}</p>}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-auto pt-2">
        {/* SVG Donut */}
        <div className="relative flex items-center justify-center">
          <svg width={size} height={size} className="transform -rotate-90">
            {total === 0 ? (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#E2E8F0"
                strokeWidth={strokeWidth}
              />
            ) : (
              data.map((item, idx) => {
                const percent = (item.value / total) * 100;
                const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                accumulatedPercent += percent;

                if (item.value === 0) return null;

                return (
                  <circle
                    key={idx}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500 hover:opacity-85"
                  />
                );
              })
            )}
          </svg>

          {/* Center text */}
          <div className="absolute text-center flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-800 tabular-nums">{total}</span>
            <span className="text-[11px] text-slate-600 font-medium">{totalLabel}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2.5 w-full sm:w-auto">
          {data.map((item, idx) => {
            const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={idx} className="flex items-center justify-between sm:justify-start gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold tabular-nums text-slate-800 ml-auto">
                  <span>{item.value}</span>
                  <span className="text-slate-600 font-normal">({percent}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface ProgressBarProps {
  percent: number | null;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  showText = true,
  size = 'md',
}) => {
  if (percent === null) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
          <div className="w-0 h-full bg-slate-300" />
        </div>
        {showText && <span className="text-xs text-slate-600 italic">Chưa có dữ liệu</span>}
      </div>
    );
  }

  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';

  let barBg = 'bg-[#00897b]';
  let textColor = 'text-[#0f766e] font-semibold';

  if (percent === 100) {
    barBg = 'bg-emerald-600';
    textColor = 'text-emerald-700 font-semibold';
  } else if (percent < 50) {
    barBg = 'bg-amber-500';
    textColor = 'text-amber-700';
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <div className={`flex-1 bg-slate-100 rounded-full ${heightClass} overflow-hidden`}>
        <div
          className={`${barBg} ${heightClass} rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      {showText && (
        <span className={`text-xs tabular-nums font-medium ${textColor} min-w-[36px] text-right`}>
          {percent}%
        </span>
      )}
    </div>
  );
};
