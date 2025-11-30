interface HistogramProps {
  values: number[];
  bins?: number;
  width?: number;
  height?: number;
  className?: string;
}

export function Histogram({ values, bins = 10, width = 260, height = 120, className }: HistogramProps) {
  if (!values.length) {
    return <p className="text-xs text-slate-500">No data yet</p>;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const binSize = span / bins;
  const counts = new Array(bins).fill(0) as number[];

  values.forEach((value) => {
    const index = Math.min(Math.floor((value - min) / binSize), bins - 1);
    counts[index] += 1;
  });

  const maxCount = Math.max(...counts, 1);
  const barWidth = width / bins;

  return (
    <div className={className}>
      <svg width={width} height={height} role="img" aria-label="histogram">
        {counts.map((count, idx) => {
          const barHeight = (count / maxCount) * height;
          const x = idx * barWidth;
          const y = height - barHeight;
          return (
            <rect
              key={idx}
              x={x + 1}
              y={y}
              width={barWidth - 2}
              height={barHeight}
              rx={3}
              className="fill-emerald-400/70"
            />
          );
        })}
      </svg>
      <p className="mt-1 text-[10px] text-slate-400">Min {min.toLocaleString()} · Max {max.toLocaleString()}</p>
    </div>
  );
}
