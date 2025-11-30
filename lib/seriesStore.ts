export type Sample = {
  t_ms: number;
  round_ms: number;
  finality_ms: number;
  tx_total: number;
  active_ops: number;
  peers?: number;
};

function isSample(value: unknown): value is Sample {
  if (!value || typeof value !== "object") return false;
  const sample = value as Partial<Sample>;
  return (
    typeof sample.t_ms === "number" &&
    typeof sample.round_ms === "number" &&
    typeof sample.finality_ms === "number" &&
    typeof sample.tx_total === "number" &&
    typeof sample.active_ops === "number"
  );
}

export function loadSamples(key: string): Sample[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSample);
  } catch (error) {
    console.warn("Failed to load samples", error);
    return [];
  }
}

export function appendSample(key: string, sample: Sample, maxPoints = 240) {
  if (typeof window === "undefined") return;
  const samples = loadSamples(key);
  samples.push(sample);
  const trimmed = samples.slice(Math.max(samples.length - maxPoints, 0));
  try {
    window.localStorage.setItem(key, JSON.stringify(trimmed));
  } catch (error) {
    console.warn("Failed to append sample", error);
  }
}

export function pruneOld(key: string, maxAgeMs = 2 * 60 * 60 * 1000) {
  if (typeof window === "undefined") return [] as Sample[];
  const cutoff = Date.now() - maxAgeMs;
  const samples = loadSamples(key).filter((sample) => sample.t_ms >= cutoff);
  try {
    window.localStorage.setItem(key, JSON.stringify(samples));
  } catch (error) {
    console.warn("Failed to prune samples", error);
  }
  return samples;
}
