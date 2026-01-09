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
  // Fetch from the new IPNDHT endpoints in parallel
  const [summaryResult, handlesResult, filesResult] = await Promise.all([
    safeJsonFetchWithStatus<any>("/ipndht/summary"),
    safeJsonFetchWithStatus<any>("/ipndht/handles?limit=10"),
    safeJsonFetchWithStatus<any>("/ipndht/files?limit=10"),
  ]);

  const summaryPayload = summaryResult.data;
  const handlesPayload = handlesResult.data;
  const filesPayload = filesResult.data;

  // Check if any endpoint returned 404 (not implemented)
  const all404 = summaryResult.status === 404 && handlesResult.status === 404 && filesResult.status === 404;
  
  if (all404) {
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
  
  // Check if gateway is unreachable
  if (!summaryPayload && !handlesPayload && !filesPayload) {
    return {
      ok: false,
      source: "error",
      error: "Gateway RPC unavailable (connection failed)",
      errorCode: "gateway_unreachable",
      sections: { handles: "error", files: "error", providers: "error", peers: "error" },
      summary: { handles_count: 0, files_count: 0, peers_count: 0 },
      latest_handles: [],
      latest_files: [],
      providers: []
    };
  }

  // Determine section status
  const handlesSectionOk = handlesResult.status === 200 && handlesPayload?.ok;
  const filesSectionOk = filesResult.status === 200 && filesPayload?.ok;
  const summarySectionOk = summaryResult.status === 200 && summaryPayload?.ok;

  // Parse handles from new endpoint format
  const rawHandles: any[] = Array.isArray(handlesPayload?.items) ? handlesPayload.items : [];
  const rawFiles: any[] = Array.isArray(filesPayload?.items) ? filesPayload.items : [];

  const latest_handles = rawHandles.map((record, index) => normalizeHandle(record, `handle-${index}`));
  const latest_files = rawFiles.map((record, index) => normalizeFile(record, `file-${index}`));

  // Providers not implemented yet
  const providers: IpndhtProvider[] = [];

  // Build summary from /ipndht/summary or fall back to counts
  const summary = summaryPayload ?? {};

  return {
    ok: true,
    source: "live",
    sections: {
      handles: handlesSectionOk ? "live" : "error",
      files: filesSectionOk ? "live" : "error",
      providers: "error", // Not implemented yet
      peers: summarySectionOk ? "live" : "error"
    },
    summary: {
      handles_count: typeof summary.handles === "number" ? summary.handles : handlesPayload?.total ?? latest_handles.length,
      files_count: typeof summary.files === "number" ? summary.files : filesPayload?.total ?? latest_files.length,
      providers_count: typeof summary.providers === "number" ? summary.providers : 0,
      peers_count: typeof summary.dht_peers === "number" ? summary.dht_peers : 0,
      dht_peers_count: typeof summary.dht_peers === "number" ? summary.dht_peers : undefined
    },
    latest_handles,
    latest_files,
    providers
  };
}
