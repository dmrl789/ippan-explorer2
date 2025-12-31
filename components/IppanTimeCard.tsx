"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SourceBadge } from "@/components/common/SourceBadge";
import { HashTimerValue } from "@/components/common/HashTimerValue";
import { computeClockDelta, formatClockDelta } from "@/lib/ippanTime";

export interface IppanTimeData {
  /** IPPAN time in microseconds as string (bigint serialized) */
  timeUs: string | null;
  /** IPPAN time in milliseconds */
  timeMs: number | null;
  /** ISO timestamp (UTC) if unix epoch based */
  isoTimestamp: string | null;
  /** Source field name where time was found */
  sourceField: string | null;
  /** Whether the time appears to be unix epoch based */
  isUnixEpoch: boolean;
}

export interface HashTimerData {
  /** HashTimer value (64-char hex) */
  hashTimer: string | null;
  /** Source field name */
  sourceField: string | null;
}

interface IppanTimeCardProps {
  /** Extracted IPPAN time data */
  ippanTime: IppanTimeData | null;
  /** Extracted HashTimer data */
  hashTimerData: HashTimerData | null;
  /** Data source indicator */
  source: "live" | "error";
  /** Whether data is currently loading */
  loading?: boolean;
}

/**
 * Card component displaying IPPAN Time and HashTimer information.
 * Shows:
 * - IPPAN Time (μs) - raw network time
 * - ISO timestamp (UTC) if epoch-based
 * - Clock delta vs local time (client-side computed)
 * - Last HashTimer (with link to detail page)
 */
export function IppanTimeCard({
  ippanTime,
  hashTimerData,
  source,
  loading = false,
}: IppanTimeCardProps) {
  // Client-side clock delta computation (needs to be recalculated on client)
  const [clockDelta, setClockDelta] = useState<string>("Calculating…");
  const [localTime, setLocalTime] = useState<string>("—");

  useEffect(() => {
    // Update local time display
    setLocalTime(new Date().toISOString());

    // Compute clock delta on client
    if (ippanTime?.timeMs !== null && ippanTime?.isUnixEpoch) {
      const delta = computeClockDelta(ippanTime.timeMs);
      setClockDelta(formatClockDelta(delta));
    } else if (ippanTime?.timeMs !== null) {
      setClockDelta("N/A (ledger-relative time)");
    } else {
      setClockDelta("—");
    }

    // Update delta every second
    const interval = setInterval(() => {
      setLocalTime(new Date().toISOString());
      if (ippanTime?.timeMs !== null && ippanTime?.isUnixEpoch) {
        const delta = computeClockDelta(ippanTime.timeMs);
        setClockDelta(formatClockDelta(delta));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ippanTime?.timeMs, ippanTime?.isUnixEpoch]);

  const hasIppanTime = ippanTime?.timeUs !== null;
  const hasHashTimer = hashTimerData?.hashTimer !== null;

  return (
    <Card
      title="IPPAN Time"
      description="Network time and HashTimer ordering"
      headerSlot={<SourceBadge source={source} />}
    >
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-3/4 rounded bg-slate-800" />
          <div className="h-4 w-1/2 rounded bg-slate-800" />
          <div className="h-4 w-2/3 rounded bg-slate-800" />
        </div>
      ) : !hasIppanTime && !hasHashTimer ? (
        <div className="rounded-lg border border-slate-800/70 bg-slate-900/30 p-3">
          <p className="text-sm text-slate-400">
            IPPAN Time not provided by this node build
          </p>
          <p className="mt-1 text-xs text-slate-500">
            The /status response does not include recognized time fields.
            Check the Raw /status JSON for available data.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* IPPAN Time (μs) */}
          {hasIppanTime && (
            <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                IPPAN Time (μs)
              </p>
              <p className="font-mono text-sm font-semibold text-emerald-100 break-all">
                {ippanTime?.timeUs}
              </p>
              {ippanTime?.sourceField && (
                <p className="mt-1 text-[10px] text-slate-500">
                  Source: {ippanTime.sourceField}
                </p>
              )}
            </div>
          )}

          {/* ISO Timestamp */}
          {ippanTime?.isoTimestamp && (
            <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Network Time (UTC)
              </p>
              <p className="font-mono text-sm font-semibold text-slate-100">
                {ippanTime.isoTimestamp}
              </p>
            </div>
          )}

          {/* Clock Delta */}
          {hasIppanTime && (
            <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Clock Delta (vs local)
              </p>
              <p className={`text-sm font-semibold ${
                clockDelta.includes("ahead") 
                  ? "text-emerald-300" 
                  : clockDelta.includes("behind")
                    ? "text-amber-300"
                    : "text-slate-100"
              }`}>
                {clockDelta}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Local: {localTime}
              </p>
            </div>
          )}

          {/* HashTimer */}
          {hasHashTimer && (
            <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Last HashTimer
              </p>
              <div className="mt-1">
                <HashTimerValue
                  id={hashTimerData?.hashTimer ?? ""}
                  short
                  shortSize={12}
                  linkClassName="font-mono text-sm text-emerald-100 hover:text-emerald-300"
                />
              </div>
              {hashTimerData?.sourceField && (
                <p className="mt-1 text-[10px] text-slate-500">
                  Source: {hashTimerData.sourceField}
                </p>
              )}
            </div>
          )}

          {/* Time type indicator */}
          {hasIppanTime && (
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-slate-500">Time type:</span>
              <span className={`rounded border px-1.5 py-0.5 ${
                ippanTime?.isUnixEpoch
                  ? "border-emerald-700/50 bg-emerald-900/30 text-emerald-300"
                  : "border-amber-700/50 bg-amber-900/30 text-amber-300"
              }`}>
                {ippanTime?.isUnixEpoch ? "Unix Epoch (convertible)" : "Ledger-relative (μs only)"}
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
