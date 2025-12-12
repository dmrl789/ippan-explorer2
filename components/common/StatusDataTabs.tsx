"use client";

import { useState } from "react";

import SimpleTable from "@/components/tables/SimpleTable";
import TabSwitcher from "@/components/common/TabSwitcher";
import { HashTimerValue } from "@/components/common/HashTimerValue";
import { isHashTimerId, shortHashTimer } from "@/lib/hashtimer";
import type { StatusResponseV1 } from "@/types/rpc";

interface StatusDataTabsProps {
  blocks?: NonNullable<StatusResponseV1["latest_blocks"]>;
  rounds?: NonNullable<StatusResponseV1["latest_rounds"]>;
  validators?: NonNullable<NonNullable<StatusResponseV1["consensus"]>["validators"]>;
}

function formatPercent(value?: number, digits = 1) {
  if (value === undefined || value === null) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

function formatMs(value?: number) {
  if (value === undefined || value === null) return "—";
  return `${value.toLocaleString()} ms`;
}

function formatCount(value?: number) {
  if (value === undefined || value === null) return "—";
  return value.toLocaleString();
}

function formatAge(ageMs?: number) {
  if (ageMs === undefined || ageMs === null) return "—";
  const seconds = Math.round(ageMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
}

function renderHashTimerSpan(start?: string, end?: string) {
  if (start && end && isHashTimerId(start) && isHashTimerId(end)) {
    return `${shortHashTimer(start, 6)} → ${shortHashTimer(end, 6)}`;
  }
  if (!start && !end) return "—";

  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex w-max items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-tight text-red-200">
        Invalid
      </span>
      <span className="break-all font-mono text-[11px] text-slate-400">{[start, end].filter(Boolean).join(" → ")}</span>
    </div>
  );
}

export default function StatusDataTabs({ blocks, rounds, validators }: StatusDataTabsProps) {
  const tabs = [
    { id: "blocks", label: "Latest Blocks" },
    { id: "rounds", label: "Latest Rounds" },
    { id: "validators", label: "Validators" }
  ];

  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const blocksToShow = blocks ?? [];
  const roundsToShow = rounds ?? [];
  const validatorsToShow = validators ?? [];

  return (
    <div className="space-y-3">
      <TabSwitcher tabs={tabs} onChange={setActiveTab} />

      {activeTab === "blocks" && (
        <SimpleTable
          data={blocksToShow}
          columns={[
            { key: "block_height", header: "Block", render: (row) => `#${row.block_height.toLocaleString()}` },
            { key: "hash_timer_id", header: "HashTimer", render: (row) => <HashTimerValue id={row.hash_timer_id} short /> },
            { key: "round_height", header: "Round" },
            { key: "tx_count", header: "Txs" },
            { key: "age_ms", header: "Age", render: (row) => formatAge(row.age_ms) },
            { key: "proposer", header: "Proposer", render: (row) => row.proposer ?? "—" }
          ]}
          emptyMessage="Not provided by /status yet."
        />
      )}

      {activeTab === "rounds" && (
        <SimpleTable
          data={roundsToShow}
          columns={[
            { key: "round_height", header: "Round" },
            { key: "finalized", header: "Finalized", render: (row) => (row.finalized ? "Yes" : "Pending") },
            { key: "block_count", header: "Blocks" },
            { key: "tx_count", header: "Txs" },
            { key: "finality_ms", header: "Finality", render: (row) => formatMs(row.finality_ms) },
            {
              key: "start_hash_timer_id",
              header: "HashTimer span",
              render: (row) => renderHashTimerSpan(row.start_hash_timer_id, row.end_hash_timer_id)
            }
          ]}
          emptyMessage="Not provided by /status yet."
        />
      )}

      {activeTab === "validators" && (
        <SimpleTable
          data={validatorsToShow}
          columns={[
            { key: "validator_id", header: "Validator" },
            { key: "uptime_ratio_7d", header: "Uptime (7d)", render: (row) => formatPercent(row.uptime_ratio_7d, 2) },
            { key: "validated_blocks_7d", header: "Validated", render: (row) => formatCount(row.validated_blocks_7d) },
            { key: "missed_blocks_7d", header: "Missed", render: (row) => formatCount(row.missed_blocks_7d) },
            { key: "avg_latency_ms", header: "Latency", render: (row) => formatMs(row.avg_latency_ms) },
            { key: "slashing_events_90d", header: "Slashing", render: (row) => formatCount(row.slashing_events_90d) },
            { key: "stake_normalized", header: "Stake", render: (row) => formatPercent(row.stake_normalized) },
            { key: "peer_reports_quality", header: "Peer quality", render: (row) => formatPercent(row.peer_reports_quality) },
            { key: "fairness_score", header: "Fairness", render: (row) => formatPercent(row.fairness_score) },
            { key: "reward_weight", header: "Reward weight", render: (row) => formatPercent(row.reward_weight) },
            { key: "status", header: "Status", render: (row) => row.status ?? "—" }
          ]}
          emptyMessage="Not provided by /status yet."
        />
      )}
    </div>
  );
}
