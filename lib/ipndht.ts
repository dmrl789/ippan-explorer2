import type { IpndhtFileDescriptor, IpndhtHandleRecord, IpndhtProvider, IpndhtResponse } from "@/types/rpc";
import { safeJsonFetchWithStatus } from "./rpc";
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

export async function fetchIpndht(): Promise<
  | ({ ok: true; source: "live" } & Omit<IpndhtResponse, "source">)
  | ({ ok: false; source: "error"; error: string; errorCode?: string } & Omit<IpndhtResponse, "source">)
> {
  const { status, data: payload } = await safeJsonFetchWithStatus<any>("/ipndht");
  
  // DevNet may not expose /ipndht endpoint yet (404 is expected)
  if (status === 404) {
    return {
      ok: false,
      source: "error",
      error: "IPNDHT endpoint not available on this DevNet (404). This is expected while IPNDHT is being implemented.",
      errorCode: "endpoint_not_available",
      sections: { handles: "error", files: "error", providers: "error", peers: "error" },
      summary: { handles_count: 0, files_count: 0, peers_count: 0 },
      latest_handles: [],
      latest_files: [],
      providers: []
    };
  }
  
  if (!payload) {
    return {
      ok: false,
      source: "error",
      error: "IPPAN devnet RPC unavailable",
      errorCode: "rpc_unavailable",
      sections: { handles: "error", files: "error", providers: "error", peers: "error" },
      summary: { handles_count: 0, files_count: 0, peers_count: 0 },
      latest_handles: [],
      latest_files: [],
      providers: []
    };
  }

  const rawHandles: any[] =
    Array.isArray(payload?.latest_handles) ? payload.latest_handles : Array.isArray(payload?.handles) ? payload.handles : [];
  const rawFiles: any[] =
    Array.isArray(payload?.latest_files) ? payload.latest_files : Array.isArray(payload?.files) ? payload.files : [];
  const rawProviders: any[] = Array.isArray(payload?.providers) ? payload.providers : [];

  const latest_handles = rawHandles.map((record, index) => normalizeHandle(record, `handle-${index}`));
  const latest_files = rawFiles.map((record, index) => normalizeFile(record, `file-${index}`));
  const providers: IpndhtProvider[] = rawProviders
    .map((record: any) => ({
      peer_id: typeof record?.peer_id === "string" ? record.peer_id : "",
      provides: record?.provides === "handles" || record?.provides === "files" || record?.provides === "both" ? record.provides : "both"
    }))
    .filter((p) => p.peer_id.length > 0);

  const summary = payload?.summary && typeof payload.summary === "object" ? payload.summary : {};

  return {
    ok: true,
    source: "live",
    sections: { handles: "live", files: "live", providers: "live", peers: "live" },
    summary: {
      handles_count: typeof summary.handles_count === "number" ? summary.handles_count : latest_handles.length,
      files_count: typeof summary.files_count === "number" ? summary.files_count : latest_files.length,
      providers_count: typeof summary.providers_count === "number" ? summary.providers_count : providers.length,
      peers_count: typeof summary.peers_count === "number" ? summary.peers_count : 0,
      dht_peers_count: typeof summary.dht_peers_count === "number" ? summary.dht_peers_count : undefined
    },
    latest_handles,
    latest_files,
    providers
  };
}
