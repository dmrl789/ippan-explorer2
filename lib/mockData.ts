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
  PeerInfo,
  PeersResponse,
  StatusResponseV1,
  Transaction,
  HashTimerDetail,
  IpndhtResponse
} from "@/types/rpc";
import { assertHashTimerId, isHashTimerId, makeMockHashTimer } from "@/lib/hashtimer";
import { toMsFromUs } from "@/lib/ippanTime";

const now = new Date();
const nowMicros = BigInt(now.getTime()) * 1000n;
const nowMs = toMsFromUs(nowMicros);
const microsAgo = (ms: number) => nowMicros - BigInt(ms) * 1000n;

const isPresent = (value: string | undefined | null): value is string => Boolean(value);

const blockHashTimers = Array.from({ length: 5 }).map((_, index) =>
  makeMockHashTimer(`block-${index}`, microsAgo(index * 120000))
);

const roundStartTimers = Array.from({ length: 5 }).map((_, index) =>
  makeMockHashTimer(`round-start-${index}`, microsAgo((index + 1) * 180000))
);

const roundEndTimers = Array.from({ length: 5 }).map((_, index) =>
  makeMockHashTimer(`round-end-${index}`, microsAgo((index + 1) * 150000))
);

const mockTransactions: Transaction[] = Array.from({ length: 8 }).map((_, index) => {
  const txMicros = microsAgo(index * 60000);
  const txMs = toMsFromUs(txMicros);

  return {
    hash: `0xmocktx${index}`.padEnd(66, "0"),
    from: `0xfrom${index}`.padEnd(66, "1"),
    to: `0xto${index}`.padEnd(66, "2"),
    amount: 12.5 + index,
    amountAtomic: ((12.5 + index) * 1e9).toFixed(0),
    fee: 0.05,
    timestamp: new Date(txMs).toISOString(),
    hashTimer: blockHashTimers[index % blockHashTimers.length],
    type: index % 2 === 0 ? "payment" : "handle",
    status: "finalized",
    blockId: (1000 - index).toString(),
    ippan_time_us: txMicros.toString(),
    ippan_time_ms: txMs
  };
});

const mockBlocks: BlockDetail[] = Array.from({ length: 5 }).map((_, index) => {
  const blockMicros = microsAgo(index * 120000);
  const blockMs = toMsFromUs(blockMicros);

  return {
    id: (1005 - index).toString(),
    hash: `0xmockblock${index}`.padEnd(66, "a"),
    timestamp: new Date(blockMs).toISOString(),
    hashTimer: blockHashTimers[index],
    txCount: 3 + index,
    parents: [(1004 - index).toString(), (1003 - index).toString()],
    transactions: mockTransactions.slice(0, 4),
    ippan_time_us: blockMicros.toString(),
    ippan_time_ms: blockMs
  };
});

const statusSnapshot: StatusResponseV1 = {
  head: {
    hash_timer_id: blockHashTimers[0],
    ippan_time: new Date(nowMs).toISOString(),
    ippan_time_us: nowMicros.toString(),
    ippan_time_ms: nowMs,
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
    start_hash_timer_id: roundStartTimers[index],
    end_hash_timer_id: roundEndTimers[index]
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
        last_seen_hash_timer: blockHashTimers[1]
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
        last_seen_hash_timer: blockHashTimers[2]
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
        last_seen_hash_timer: blockHashTimers[3]
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

const peers: PeerInfo[] = [
  {
    peer_id: "12D3KooWPeer000000000000000000000000000000000000000000000000001",
    addr: "/ip4/192.168.1.10/tcp/4001",
    agent: "ippan-node/0.1.0",
    last_seen_ms: 4200
  },
  {
    peer_id: "12D3KooWPeer000000000000000000000000000000000000000000000000002",
    addr: "/ip4/10.0.0.5/tcp/4001",
    agent: "ippan-node/0.1.0",
    last_seen_ms: 9800
  },
  {
    peer_id: "12D3KooWPeer000000000000000000000000000000000000000000000000003",
    addr: "/dns4/bootstrap.libp2p/tcp/4001",
    agent: "go-libp2p/0.30.0",
    last_seen_ms: 15800
  }
];

const ipndhtHandles = [
  {
    handle: "@ippan.ai",
    owner: accountSummary.address,
    hash_timer_id: makeMockHashTimer("handle-ippan", microsAgo(45000))
  },
  {
    handle: "@ai.models",
    owner: "0xAccount000000000000000000000000000000000999",
    hash_timer_id: makeMockHashTimer("handle-aimodels", microsAgo(76000))
  },
  {
    handle: "@node.operator",
    owner: accountSummary.address,
    hash_timer_id: makeMockHashTimer("handle-operator", microsAgo(105000))
  }
];

const ipndhtFiles = [
  {
    file_id: "file-01",
    size_bytes: files[0].size,
    hash_timer_id: makeMockHashTimer("file-01", microsAgo(60000))
  },
  {
    file_id: "model-weights-v2",
    size_bytes: 1024 * 1024 * 22,
    hash_timer_id: makeMockHashTimer("file-weights", microsAgo(89000))
  }
];

const ipndhtProviders = [
  { peer_id: peers[0].peer_id, provides: "both" as const },
  { peer_id: peers[1].peer_id, provides: "handles" as const },
  { peer_id: peers[2].peer_id, provides: "files" as const }
];

function validateMockHashTimers() {
  const ids = [
    statusSnapshot.head.hash_timer_id,
    ...blockHashTimers,
    ...roundStartTimers,
    ...roundEndTimers,
    ...mockTransactions.map((tx) => tx.hashTimer),
    ...statusSnapshot.latest_rounds.flatMap((round) => [round.start_hash_timer_id, round.end_hash_timer_id]).filter(isPresent),
    ...statusSnapshot.consensus.validators
      .map((validator) => validator.last_seen_hash_timer)
      .filter(isPresent),
    ...ipndhtHandles.map((item) => item.hash_timer_id).filter(isPresent),
    ...ipndhtFiles.map((item) => item.hash_timer_id).filter(isPresent)
  ];

  ids.forEach((id) => assertHashTimerId(id));
}

validateMockHashTimers();

export function mockHashtimer(id: string): HashTimerDetail {
  const normalizedInput = id.trim() || statusSnapshot.head.hash_timer_id;
  const normalizedId = isHashTimerId(normalizedInput) ? normalizedInput : statusSnapshot.head.hash_timer_id;
  const relatedTxs = mockTransactions.filter((tx) => tx.hashTimer.toLowerCase() === normalizedId.toLowerCase());
  const relatedBlock = mockBlocks.find((block) => block.hashTimer.toLowerCase() === normalizedId.toLowerCase());

  const timePrefix = normalizedId.slice(0, 14);
  const microsValue = BigInt(`0x${timePrefix}`);
  const parentMicros = microsValue > 0n ? microsValue - 1n : 0n;
  const parentId = makeMockHashTimer(`parent-of-${normalizedId}`, parentMicros);
  const ippanMs = toMsFromUs(microsValue);
  const ippanIso = relatedBlock?.timestamp ?? relatedTxs[0]?.timestamp ?? new Date(ippanMs).toISOString();

  return {
    hash_timer_id: normalizedId,
    ippan_time: ippanIso,
    ippan_time_us: microsValue.toString(),
    ippan_time_ms: ippanMs,
    round_height:
      relatedBlock && statusSnapshot.latest_blocks.find((b) => b.hash_timer_id === relatedBlock.hashTimer)?.round_height,
    block_height: relatedBlock ? Number(relatedBlock.id) : undefined,
    tx_ids: relatedTxs.map((tx) => tx.hash),
    tx_count: relatedTxs.length || undefined,
    parents: parentId ? [parentId] : undefined,
    canonical_digest: `digest-${normalizedId.slice(14)}`
  };
}

export function getHashTimerDetail(id: string): Promise<HashTimerDetail> {
  return Promise.resolve(mockHashtimer(id));
}

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

export function getPeers(): Promise<PeersResponse> {
  return Promise.resolve({ source: "mock", peers });
}

export function getIpndht(): Promise<IpndhtResponse> {
  const summary = {
    handles: ipndhtHandles.length,
    files: ipndhtFiles.length,
    providers: ipndhtProviders.length,
    peers: peers.length
  };

  return Promise.resolve({
    source: "mock",
    summary,
    latest_handles: ipndhtHandles,
    latest_files: ipndhtFiles,
    providers: ipndhtProviders
  });
}
