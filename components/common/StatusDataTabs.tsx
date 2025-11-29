"use client";

import { useState } from "react";

import SimpleTable from "@/components/tables/SimpleTable";
import TabSwitcher from "@/components/common/TabSwitcher";
import { shortenHash } from "@/lib/format";
import type { StatusResponseV1 } from "@/types/rpc";

interface StatusDataTabsProps {
  blocks: StatusResponseV1["latest_blocks"];
  rounds: StatusResponseV1["latest_rounds"];
  validators: StatusResponseV1["consensus"]["validators"];
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

export default function StatusDataTabs({ blocks, rounds, validators }: StatusDataTabsProps) {
  const tabs = [
    { id: "blocks", label: "Latest Blocks" },
    { id: "rounds", label: "Latest Rounds" },
    { id: "validators", label: "Validators" }
  ];

  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div className="space-y-3">
      <TabSwitcher tabs={tabs} onChange={setActiveTab} />

      {activeTab === "blocks" && (
        <SimpleTable
          data={blocks}
          columns={[
            { key: "block_height", header: "Block", render: (row) => `#${row.block_height.toLocaleString()}` },
            { key: "hash_timer_id", header: "HashTimer", render: (row) => <code className="text-emerald-200">{row.hash_timer_id}</code> },
            { key: "round_height", header: "Round" },
            { key: "tx_count", header: "Txs" },
            { key: "age_ms", header: "Age", render: (row) => formatAge(row.age_ms) },
            { key: "proposer", header: "Proposer", render: (row) => row.proposer ?? "—" }
          ]}
        />
      )}

      {activeTab === "rounds" && (
        <SimpleTable
          data={rounds}
          columns={[
            { key: "round_height", header: "Round" },
            { key: "finalized", header: "Finalized", render: (row) => (row.finalized ? "Yes" : "Pending") },
            { key: "block_count", header: "Blocks" },
            { key: "tx_count", header: "Txs" },
            { key: "finality_ms", header: "Finality", render: (row) => formatMs(row.finality_ms) },
            {
              key: "start_hash_timer_id",
              header: "HashTimer span",
              render: (row) =>
                row.start_hash_timer_id && row.end_hash_timer_id
                  ? `${shortenHash(row.start_hash_timer_id, 6)} → ${shortenHash(row.end_hash_timer_id, 6)}`
                  : "—"
            }
          ]}
        />
      )}

      {activeTab === "validators" && (
        <SimpleTable
          data={validators}
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
        />
      )}
    </div>
  );
}
