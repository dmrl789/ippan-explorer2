"use client";

import { useEffect, useMemo, useState } from "react";

import { Histogram } from "./Histogram";
import { Sparkline } from "./Sparkline";
import { Card } from "./ui/Card";
import { appendSample, loadSamples, pruneOld, type Sample } from "@/lib/seriesStore";
import type { StatusResponseV1 } from "@/types/rpc";

const STORAGE_KEY = "ippan_status_samples_v1";

function toSample(status: StatusResponseV1, peersCount?: number): Sample {
  return {
    t_ms: status.head.ippan_time_ms ?? Date.now(),
    round_ms: status.live.round_time_avg_ms ?? 0,
    finality_ms: status.live.finality_time_ms ?? 0,
    tx_total: status.counters.transactions_total ?? 0,
    active_ops: status.live.active_operators ?? 0,
    peers: typeof peersCount === "number" ? peersCount : undefined
  };
}

function computeTpsSeries(samples: Sample[]) {
  return samples.map((sample, idx) => {
    if (idx === 0) return 0;
    const prev = samples[idx - 1];
    const dt = sample.t_ms - prev.t_ms;
    const deltaTx = sample.tx_total - prev.tx_total;
    if (dt <= 0 || deltaTx < 0) return 0;
    return Math.max(Math.round((deltaTx * 1000) / dt), 0);
  });
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((acc, value) => acc + value, 0) / values.length);
}

function formatNumber(value: number | undefined) {
  if (value === undefined) return "—";
  return value.toLocaleString();
}

export function DashboardGraphs({ status, peersCount }: { status: StatusResponseV1; peersCount?: number }) {
  const [samples, setSamples] = useState<Sample[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sample = toSample(status, peersCount);
    appendSample(STORAGE_KEY, sample);
    const pruned = pruneOld(STORAGE_KEY);
    setSamples(pruned);
  }, [status, peersCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSamples(loadSamples(STORAGE_KEY));
    const interval = window.setInterval(() => {
      setSamples(loadSamples(STORAGE_KEY));
    }, 10000);
    return () => window.clearInterval(interval);
  }, []);

  const { roundSeries, finalitySeries, tpsSeries, activeSeries, peerSeries, tenMinuteTps } = useMemo(() => {
    const tpsValues: Array<{ t: number; value: number }> = [];
    const tpsRaw = computeTpsSeries(samples);
    samples.forEach((sample, idx) => {
      tpsValues.push({ t: sample.t_ms, value: tpsRaw[idx] ?? 0 });
    });
    const tenMinuteCutoff = Date.now() - 10 * 60 * 1000;
    const recentTps = tpsValues.filter((point) => point.t >= tenMinuteCutoff).map((point) => point.value);

    return {
      roundSeries: samples.map((sample) => sample.round_ms),
      finalitySeries: samples.map((sample) => sample.finality_ms),
      tpsSeries: tpsValues.map((point) => point.value),
      activeSeries: samples.map((sample) => sample.active_ops),
      peerSeries: samples.map((sample) => sample.peers ?? 0).filter((value) => value > 0),
      tenMinuteTps: average(recentTps)
    };
  }, [samples]);

  const latestRound = roundSeries.at(-1) ?? status.live.round_time_avg_ms;
  const latestFinality = finalitySeries.at(-1) ?? status.live.finality_time_ms;
  const latestTps = tpsSeries.at(-1) ?? 0;
  const latestActive = activeSeries.at(-1) ?? status.live.active_operators;
  const latestPeers = peerSeries.at(-1);

  const fairnessScores = status.consensus.validators
    .map((validator) => validator.fairness_score)
    .filter((value): value is number => typeof value === "number");

  const uptimeCoverage = computeCoverage(status.consensus.validators, "uptime_ratio_7d");
  const latencyCoverage = computeCoverage(status.consensus.validators, "avg_latency_ms");

  return (
    <div className="space-y-4">
      <Card title="Performance" description="Live samples held in localStorage; updates when the dashboard refreshes">
        <div className="grid gap-3 md:grid-cols-3">
          <MetricSparkline label="Round time" value={`${formatNumber(latestRound)} ms`} series={roundSeries} />
          <MetricSparkline label="Finality time" value={`${formatNumber(latestFinality)} ms`} series={finalitySeries} />
          <MetricSparkline
            label="Estimated TPS"
            value={`${formatNumber(latestTps)} tx/s`}
            hint={tenMinuteTps ? `~${tenMinuteTps.toLocaleString()} avg (10m)` : undefined}
            series={tpsSeries}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <MetricSparkline label="Active operators" value={formatNumber(latestActive)} series={activeSeries} />
          {peerSeries.length > 0 && (
            <MetricSparkline label="Peers" value={formatNumber(latestPeers)} series={peerSeries} />
          )}
        </div>
      </Card>

      <Card title="Validator dataset readiness" description="Fairness distribution plus metric coverage from /status">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold ${
              status.consensus.metrics_available
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-amber-500/40 bg-amber-500/10 text-amber-200"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {status.consensus.metrics_available ? "Metrics available" : "Metrics unavailable"}
          </span>
          <span>Columns: uptime, validated/missed, latency, slashing, stake, peer quality</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Fairness score distribution</p>
            <Histogram values={fairnessScores} bins={12} />
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-slate-800/70 bg-slate-950/50 p-3 text-sm text-slate-200">
            <CoverageBadge label="Validators tracked" value={status.consensus.validators.length} suffix="nodes" />
            <CoverageBadge label="Uptime coverage" value={uptimeCoverage} suffix="% with uptime" />
            <CoverageBadge label="Latency coverage" value={latencyCoverage} suffix="% with latency" />
          </div>
        </div>
      </Card>
    </div>
  );
}

function CoverageBadge({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-800/80 bg-slate-900/80 px-3 py-2">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-emerald-100">{value.toLocaleString()} {suffix}</span>
    </div>
  );
}

function MetricSparkline({
  label,
  value,
  series,
  hint
}: {
  label: string;
  value: string;
  series: number[];
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 shadow-inner shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-lg font-semibold text-slate-100">{value}</p>
          {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
        </div>
      </div>
      <Sparkline values={series} height={50} width={220} />
    </div>
  );
}

function computeCoverage(
  validators: StatusResponseV1["consensus"]["validators"],
  field: keyof StatusResponseV1["consensus"]["validators"][number]
) {
  if (!validators.length) return 0;
  const withField = validators.filter((validator) => validatorsHasField(validator, field)).length;
  return Math.round((withField / validators.length) * 100);
}

function validatorsHasField(
  validator: StatusResponseV1["consensus"]["validators"][number],
  field: keyof StatusResponseV1["consensus"]["validators"][number]
) {
  return validator[field] !== undefined && validator[field] !== null;
}
