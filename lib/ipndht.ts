import type { IpndhtFileDescriptor, IpndhtHandleRecord, IpndhtProvider, IpndhtResponse, RpcSource } from "@/types/rpc";
import { getRpcBaseUrl } from "./rpcBase";
import { getIpndht } from "./mockData";
import { fetchPeers } from "./peers";
import { HASHTIMER_RE } from "./hashtimer";

function normalizeHandle(record: any, fallback: string): IpndhtHandleRecord {
  const handle = typeof record?.handle === "string" && record.handle.length > 0 ? record.handle : fallback;
  const hashTimerRaw = record?.hash_timer_id ?? record?.hashTimerId ?? record?.hash_timer;
  const hashTimerId = typeof hashTimerRaw === "string" ? hashTimerRaw.toLowerCase() : undefined;
  const expires =
    typeof record?.expires_at === "string"
      ? record.expires_at
      : typeof record?.expiresAt === "string"
        ? record.expiresAt
        : undefined;

  return {
    handle,
    owner: typeof record?.owner === "string" ? record.owner : typeof record?.address === "string" ? record.address : undefined,
    expires_at: expires,
    hash_timer_id: typeof hashTimerId === "string" && HASHTIMER_RE.test(hashTimerId) ? hashTimerId : undefined
  };
}

function normalizeFile(record: any, fallback: string): IpndhtFileDescriptor {
  const rawId =
    typeof record?.id === "string"
      ? record.id
      : typeof record?.file_id === "string"
        ? record.file_id
        : typeof record?.fileId === "string"
          ? record.fileId
          : fallback;
  const hashTimerRaw = record?.hash_timer_id ?? record?.hashTimerId ?? record?.hash_timer;
  const hashTimerId = typeof hashTimerRaw === "string" ? hashTimerRaw.toLowerCase() : undefined;

  const tagsRaw = record?.tags;
  const tags =
    Array.isArray(tagsRaw) && tagsRaw.every((value) => typeof value === "string") ? (tagsRaw as string[]) : undefined;

  return {
    id: rawId,
    file_id: typeof record?.file_id === "string" ? record.file_id : undefined,
    owner: typeof record?.owner === "string" ? record.owner : typeof record?.address === "string" ? record.address : undefined,
    content_hash: typeof record?.content_hash === "string" ? record.content_hash : typeof record?.contentHash === "string" ? record.contentHash : undefined,
    size_bytes: typeof record?.size_bytes === "number" ? record.size_bytes : typeof record?.size === "number" ? record.size : undefined,
    created_at: typeof record?.created_at === "string" ? record.created_at : typeof record?.createdAt === "string" ? record.createdAt : undefined,
    mime_type: typeof record?.mime_type === "string" ? record.mime_type : typeof record?.mimeType === "string" ? record.mimeType : undefined,
    availability: typeof record?.availability === "string" || typeof record?.availability === "number" ? record.availability : undefined,
    dht_published: typeof record?.dht_published === "boolean" ? record.dht_published : typeof record?.dhtPublished === "boolean" ? record.dhtPublished : undefined,
    tags,
    meta: record?.meta && typeof record.meta === "object" ? (record.meta as Record<string, unknown>) : undefined,
    retrieval: record?.retrieval && typeof record.retrieval === "object" ? (record.retrieval as Record<string, unknown>) : undefined,
    hash_timer_id: typeof hashTimerId === "string" && HASHTIMER_RE.test(hashTimerId) ? hashTimerId : undefined
  };
}

export async function fetchIpndht(): Promise<IpndhtResponse> {
  const mock = await getIpndht();
  const rpcBase = getRpcBaseUrl();

  if (!rpcBase) {
    return mock;
  }

  let latest_handles: IpndhtHandleRecord[] = mock.latest_handles;
  let latest_files: IpndhtFileDescriptor[] = mock.latest_files;
  let providers: IpndhtProvider[] = mock.providers;
  let handlesSource: RpcSource = "mock";
  let filesSource: RpcSource = "mock";
  let providersSource: RpcSource = "mock";
  let peersSource: RpcSource = "mock";

  try {
    const res = await fetch(`${rpcBase}/handles`);
    if (!res.ok) {
      throw new Error(`RPC handles failed: ${res.status}`);
    }
    const payload = await res.json();
    const rawHandles: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.handles) ? payload.handles : [];
    latest_handles = rawHandles.map((record, index) => normalizeHandle(record, `handle-${index}`));
    handlesSource = "rpc";
  } catch (error) {
    console.warn("Falling back to mock handles due to RPC error", error);
  }

  try {
    const res = await fetch(`${rpcBase}/files`);
    if (!res.ok) {
      throw new Error(`RPC files failed: ${res.status}`);
    }
    const payload = await res.json();
    const rawFiles: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.files) ? payload.files : [];
    latest_files = rawFiles.map((record, index) => normalizeFile(record, `file-${index}`));
    filesSource = "rpc";
  } catch (error) {
    console.warn("Falling back to mock files due to RPC error", error);
  }

  const peerData = await fetchPeers();
  peersSource = peerData.source;

  // Providers are not derived from peers (derivation would be dishonest).
  // If the RPC exposes provider announcements in the future, wire them here.
  providers = mock.providers;
  providersSource = "mock";

  const peerIds = new Set(peerData.peers.map((peer) => peer.peer_id));
  const dhtPeersCount = providers.filter((provider) => peerIds.has(provider.peer_id)).length;

  const source: RpcSource = handlesSource === "rpc" || filesSource === "rpc" || peersSource === "rpc" ? "rpc" : "mock";

  return {
    source,
    sections: { handles: handlesSource, files: filesSource, providers: providersSource, peers: peersSource },
    summary: {
      handles_count: latest_handles.length,
      files_count: latest_files.length,
      providers_count: providers.length,
      peers_count: peerData.peers.length,
      dht_peers_count: dhtPeersCount
    },
    latest_handles,
    latest_files,
    providers
  };
}
