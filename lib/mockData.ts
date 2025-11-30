import type {
  AccountSummary,
  AiStatus,
  BlockDetail,
  BlockSummary,
  FileRecord,
  HandleRecord,
  HealthStatus,
  NetworkSummary,
  PaymentEntry,
  StatusResponseV1,
  Transaction
} from "@/types/rpc";

const now = new Date();

const makeHashTimer = (value: number) => `ht-${value.toString().padStart(8, "0")}`;

const mockTransactions: Transaction[] = Array.from({ length: 8 }).map((_, index) => ({
  hash: `0xmocktx${index}`.padEnd(66, "0"),
  from: `0xfrom${index}`.padEnd(66, "1"),
  to: `0xto${index}`.padEnd(66, "2"),
  amount: 12.5 + index,
  amountAtomic: ((12.5 + index) * 1e9).toFixed(0),
  fee: 0.05,
  timestamp: new Date(now.getTime() - index * 60000).toISOString(),
  hashTimer: makeHashTimer(20000 + index),
  type: index % 2 === 0 ? "payment" : "handle",
  status: "finalized",
  blockId: (1000 - index).toString()
}));

const mockBlocks: BlockDetail[] = Array.from({ length: 5 }).map((_, index) => ({
  id: (1005 - index).toString(),
  hash: `0xmockblock${index}`.padEnd(66, "a"),
  timestamp: new Date(now.getTime() - index * 120000).toISOString(),
  hashTimer: makeHashTimer(12030 + index),
  txCount: 3 + index,
  parents: [(1004 - index).toString(), (1003 - index).toString()],
  transactions: mockTransactions.slice(0, 4)
}));

const statusSnapshot: StatusResponseV1 = {
  head: {
    hash_timer_id: "ht-00001234",
    ippan_time: now.toISOString(),
    round_height: 12034,
    block_height: Number(mockBlocks[0].id),
    finalized: true,
    hash_timer_seq: "seq-12034"
  },
  counters: {
    finalized_rounds: 12034,
    transactions_total: 52345,
    total_issuance: 4_500_000,
    accounts_total: 2045,
    holders_total: 1640,
    hash_timers_total: 12_500,
    ai_requests_total: 320
  },
  live: {
    round_time_avg_ms: 420,
    finality_time_ms: 1800,
    current_epoch: 12,
    epoch_progress_pct: 64.5,
    active_operators: 18
  },
  latest_blocks: mockBlocks.map((block, index) => ({
    block_height: Number(block.id),
    hash_timer_id: block.hashTimer,
    round_height: 12030 + index,
    tx_count: block.txCount,
    age_ms: index * 120000,
    proposer: `validator-${index + 1}`
  })),
  latest_rounds: Array.from({ length: 5 }).map((_, index) => ({
    round_height: 12034 - index,
    finalized: index < 3,
    block_count: 2 + index,
    tx_count: 8 + index * 3,
    finality_ms: 1500 + index * 120,
    start_hash_timer_id: `ht-0000${12030 - index}`,
    end_hash_timer_id: `ht-0000${12031 - index}`
  })),
  consensus: {
    metrics_available: true,
    validators: [
      {
        validator_id: "validator-1",
        uptime_ratio_7d: 0.995,
        validated_blocks_7d: 420,
        missed_blocks_7d: 2,
        avg_latency_ms: 220,
        slashing_events_90d: 0,
        stake_normalized: 0.24,
        peer_reports_quality: 0.91,
        fairness_score: 0.88,
        reward_weight: 0.31,
        status: "active",
        last_seen_hash_timer: "ht-00001234"
      },
      {
        validator_id: "validator-2",
        uptime_ratio_7d: 0.982,
        validated_blocks_7d: 398,
        missed_blocks_7d: 7,
        avg_latency_ms: 340,
        slashing_events_90d: 1,
        stake_normalized: 0.18,
        peer_reports_quality: 0.76,
        fairness_score: 0.81,
        reward_weight: 0.26,
        status: "active",
        last_seen_hash_timer: "ht-00001233"
      },
      {
        validator_id: "validator-3",
        uptime_ratio_7d: 0.968,
        validated_blocks_7d: 361,
        missed_blocks_7d: 12,
        avg_latency_ms: 415,
        slashing_events_90d: 0,
        stake_normalized: 0.12,
        peer_reports_quality: 0.7,
        fairness_score: 0.78,
        reward_weight: 0.22,
        status: "syncing",
        last_seen_hash_timer: "ht-00001231"
      }
    ]
  }
};

const accountSummary: AccountSummary = {
  address: "0xAccount000000000000000000000000000000000000",
  balance: 15234.123,
  balanceAtomic: "15234123000000",
  nonce: 42,
  handles: ["@ippan.ai", "@node.operator"]
};

const payments: PaymentEntry[] = Array.from({ length: 12 }).map((_, index) => ({
  direction: index % 3 === 0 ? "incoming" : index % 3 === 1 ? "outgoing" : "self",
  amount: 10 + index,
  fee: 0.01 * index,
  counterparty: `0xCounterparty${index}`.padEnd(66, "3"),
  timestamp: new Date(now.getTime() - index * 3600000).toISOString(),
  hash: `0xpayment${index}`.padEnd(66, "4")
}));

const handles: HandleRecord[] = [
  {
    handle: "@ippan.ai",
    owner: accountSummary.address,
    expiresAt: new Date(now.getTime() + 86400000 * 90).toISOString(),
    dhtStatus: "Published to libp2p"
  }
];

const files: FileRecord[] = [
  {
    id: "file-01",
    owner: accountSummary.address,
    size: 1024 * 1024 * 5,
    mimeType: "application/octet-stream",
    mode: "libp2p",
    description: "Test model artifact"
  }
];

export function getNetworkSummary(): Promise<NetworkSummary> {
  return Promise.resolve({
    consensusMode: "PoA",
    lastFinalizedRound: 12034,
    lastBlockId: mockBlocks[0].id,
    hashTimer: mockBlocks[0].hashTimer,
    tps: 42,
    activeValidators: 18
  });
}

export function getStatus(): Promise<StatusResponseV1> {
  return Promise.resolve(statusSnapshot);
}

export function getAiStatus(): Promise<AiStatus> {
  return Promise.resolve({
    modelHash: "0xmodelhash",
    usingStub: false,
    mode: "DLC"
  });
}

export function getHealthStatus(): Promise<HealthStatus> {
  return Promise.resolve({
    consensus: true,
    dhtFile: { mode: "libp2p", healthy: true },
    dhtHandle: { mode: "libp2p", healthy: true },
    storage: true,
    rpc: true
  });
}

export function getRecentBlocks(): Promise<BlockSummary[]> {
  return Promise.resolve(mockBlocks.map(({ transactions, ...block }) => block));
}

export function getBlockById(id: string): Promise<BlockDetail | undefined> {
  return Promise.resolve(mockBlocks.find((block) => block.id === id));
}

export function getTransaction(hash: string): Promise<Transaction | undefined> {
  return Promise.resolve(mockTransactions.find((tx) => tx.hash === hash));
}

export function getRecentTransactions(): Promise<Transaction[]> {
  return Promise.resolve(mockTransactions.slice(0, 5));
}

export function getAccount(address: string): Promise<AccountSummary> {
  return Promise.resolve({ ...accountSummary, address });
}

export function getPayments(): Promise<PaymentEntry[]> {
  return Promise.resolve(payments);
}

export function getHandleRecord(handle: string): Promise<HandleRecord | undefined> {
  return Promise.resolve(handles.find((record) => record.handle === handle));
}

export function getFileRecord(id: string): Promise<FileRecord | undefined> {
  return Promise.resolve(files.find((file) => file.id === id));
}

export function getFiles(): Promise<FileRecord[]> {
  return Promise.resolve(files);
}
