import type { SVGProps } from "react";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
  stroke?: string;
  backgroundStroke?: string;
}

function buildPath(values: number[], width: number, height: number) {
  if (values.length === 0) {
    return "";
  }
  if (values.length === 1) {
    const x = width / 2;
    const y = height / 2;
    return `M ${x} ${y} L ${x} ${y}`;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const step = width / Math.max(values.length - 1, 1);

  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildBaseline(width: number, height: number) {
  const y = height / 2;
  return `M 0 ${y} L ${width} ${y}`;
}

export function Sparkline({
  values,
  width = 160,
  height = 44,
  strokeWidth = 2,
  className,
  stroke = "#34d399",
  backgroundStroke = "#1f2937"
}: SparklineProps) {
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const path = buildPath(values, width, height);
  const showBaseline = values.length <= 1 || min === max;

  return (
    <div className={className}>
      <svg width={width} height={height} role="img" aria-label="sparkline" className="overflow-visible">
        {showBaseline && (
          <path
            d={buildBaseline(width, height)}
            fill="none"
            stroke={backgroundStroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.6}
          />
        )}
        {path && (
          <path
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      <p className="mt-1 text-[10px] text-slate-400">Min {min.toLocaleString()} · Max {max.toLocaleString()}</p>
    </div>
  );
}

export type SparklinePropsType = SVGProps<SVGSVGElement> & SparklineProps;
