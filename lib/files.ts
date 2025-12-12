import type { IpndhtFileDescriptor, RpcSource } from "@/types/rpc";
import { getRpcBaseUrl } from "@/lib/rpcBase";
import { getIpndht } from "@/lib/mockData";

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

export async function fetchIpndhtFiles(): Promise<{ source: RpcSource; files: IpndhtFileDescriptor[] }> {
  const rpcBase = getRpcBaseUrl();
  if (!rpcBase) {
    const mock = await getIpndht();
    return { source: "mock", files: mock.latest_files };
  }

  try {
    const res = await fetch(`${rpcBase}/files`);
    if (!res.ok) throw new Error(`RPC files failed: ${res.status}`);
    const payload = await res.json();
    const rawFiles: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.files) ? payload.files : [];
    return { source: "rpc", files: rawFiles.map((record, idx) => normalizeFile(record, `file-${idx}`)) };
  } catch (error) {
    console.warn("Falling back to mock files due to RPC error", error);
    const mock = await getIpndht();
    return { source: "mock", files: mock.latest_files };
  }
}

export async function fetchIpndhtFileDescriptor(id: string): Promise<{ source: RpcSource; file?: IpndhtFileDescriptor }> {
  const rpcBase = getRpcBaseUrl();
  if (rpcBase) {
    try {
      const res = await fetch(`${rpcBase}/files/${encodeURIComponent(id)}`);
      if (res.ok) {
        const payload = await res.json();
        return { source: "rpc", file: normalizeFile(payload, id) };
      }
    } catch (error) {
      console.warn("File detail fetch failed; falling back to list scan", error);
    }
  }

  const list = await fetchIpndhtFiles();
  const file = list.files.find((candidate) => candidate.id === id || candidate.file_id === id);
  return { source: list.source, file };
}

