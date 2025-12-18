import type { IpndhtFileDescriptor } from "@/types/rpc";
import { RpcError, rpcFetch } from "@/lib/rpc";

function normalizeFile(record: any, fallbackId: string): IpndhtFileDescriptor {
  const id =
    typeof record?.id === "string"
      ? record.id
      : typeof record?.file_id === "string"
        ? record.file_id
        : typeof record?.fileId === "string"
          ? record.fileId
          : fallbackId;

  const tagsRaw = record?.tags;
  const tags =
    Array.isArray(tagsRaw) && tagsRaw.every((value) => typeof value === "string") ? (tagsRaw as string[]) : undefined;

  return {
    id,
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
    hash_timer_id: typeof record?.hash_timer_id === "string" ? record.hash_timer_id : undefined
  };
}

export async function fetchIpndhtFiles(): Promise<
  | { ok: true; source: "live"; files: IpndhtFileDescriptor[] }
  | { ok: false; source: "error"; error: string; files: IpndhtFileDescriptor[] }
> {
  try {
    const payload = await rpcFetch<any>("/files");
    const rawFiles: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.files) ? payload.files : [];
    return { ok: true, source: "live", files: rawFiles.map((record, idx) => normalizeFile(record, `file-${idx}`)) };
  } catch (error) {
    console.error("[files] RPC error", error);
    return { ok: false, source: "error", error: "IPPAN devnet RPC unavailable", files: [] };
  }
}

export async function fetchIpndhtFileDescriptor(
  id: string
): Promise<
  | { ok: true; source: "live"; file: IpndhtFileDescriptor }
  | { ok: true; source: "live"; file: null }
  | { ok: false; source: "error"; error: string }
> {
  try {
    const payload = await rpcFetch<any>(`/files/${encodeURIComponent(id)}`);
    return { ok: true, source: "live", file: normalizeFile(payload, id) };
  } catch (error) {
    if (error instanceof RpcError && error.status === 404) {
      return { ok: true, source: "live", file: null };
    }
    console.error("[files/:id] RPC error", error);
    return { ok: false, source: "error", error: "IPPAN devnet RPC unavailable" };
  }
}

