import type { IpndhtFile, IpndhtHandle, IpndhtProvider, IpndhtResponse } from "@/types/rpc";
import { getRpcBaseUrl } from "./rpcBase";
import { getIpndht } from "./mockData";
import { fetchPeers } from "./peers";
import { HASHTIMER_RE } from "./hashtimer";

function normalizeHandle(record: any, fallback: string): IpndhtHandle {
  const handle = typeof record?.handle === "string" && record.handle.length > 0 ? record.handle : fallback;
  const hashTimerRaw = record?.hash_timer_id ?? record?.hashTimerId ?? record?.hash_timer;
  const hashTimerId = typeof hashTimerRaw === "string" ? hashTimerRaw.toLowerCase() : undefined;

  return {
    handle,
    owner: typeof record?.owner === "string" ? record.owner : record?.address,
    hash_timer_id: typeof hashTimerId === "string" && HASHTIMER_RE.test(hashTimerId) ? hashTimerId : hashTimerId
  };
}

function normalizeFile(record: any, fallback: string): IpndhtFile {
  const fileId = typeof record?.file_id === "string" && record.file_id.length > 0 ? record.file_id : record?.id ?? fallback;
  const hashTimerRaw = record?.hash_timer_id ?? record?.hashTimerId ?? record?.hash_timer;
  const hashTimerId = typeof hashTimerRaw === "string" ? hashTimerRaw.toLowerCase() : undefined;

  return {
    file_id: fileId,
    size_bytes: typeof record?.size_bytes === "number" ? record.size_bytes : record?.size,
    hash_timer_id: typeof hashTimerId === "string" && HASHTIMER_RE.test(hashTimerId) ? hashTimerId : hashTimerId
  };
}

function deriveProvidersFromPeers(peers: IpndhtProvider[], fallback: IpndhtProvider[]): IpndhtProvider[] {
  if (peers.length) return peers;
  return fallback;
}

export async function fetchIpndht(): Promise<IpndhtResponse> {
  const mock = await getIpndht();
  const rpcBase = getRpcBaseUrl();

  if (!rpcBase) {
    return mock;
  }

  let latest_handles: IpndhtHandle[] = mock.latest_handles;
  let latest_files: IpndhtFile[] = mock.latest_files;
  let providers: IpndhtProvider[] = mock.providers;
  let summary = { ...mock.summary };
  let rpcSuccess = false;

  try {
    const res = await fetch(`${rpcBase}/handles`);
    if (!res.ok) {
      throw new Error(`RPC handles failed: ${res.status}`);
    }
    const payload = await res.json();
    const rawHandles: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.handles) ? payload.handles : [];
    latest_handles = rawHandles.map((record, index) => normalizeHandle(record, `handle-${index}`));
    summary.handles = latest_handles.length;
    rpcSuccess = true;
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
    summary.files = latest_files.length;
    rpcSuccess = true;
  } catch (error) {
    console.warn("Falling back to mock files due to RPC error", error);
  }

  const peerData = await fetchPeers();
  summary.peers = peerData.peers.length;
  rpcSuccess = rpcSuccess || peerData.source === "rpc";

  const derivedProviders: IpndhtProvider[] = peerData.peers.map((peer, index) => ({
    peer_id: peer.peer_id,
    provides: mock.providers[index % mock.providers.length]?.provides ?? "both"
  }));

  providers = deriveProvidersFromPeers(derivedProviders, mock.providers);
  summary.providers = providers.length;

  return {
    source: rpcSuccess ? "rpc" : "mock",
    summary,
    latest_handles,
    latest_files,
    providers
  };
}
