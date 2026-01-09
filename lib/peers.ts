import type { PeersResponse, PeerInfo } from "@/types/rpc";
import { safeJsonFetchWithStatus } from "./rpc";

/**
 * Transform various peer formats to normalized PeerInfo objects.
 * The gateway may return:
 * - Array of URL strings: ["http://1.2.3.4:9000", ...]
 * - Array of PeerInfo objects: [{ peer_id, addr, agent, last_seen_ms }, ...]
 * - Object with peers array: { peers: [...] }
 */
function normalizePeers(raw: unknown): PeerInfo[] {
  if (!raw) return [];
  
  // Handle { peers: [...] } wrapper
  const dataArray = Array.isArray(raw) 
    ? raw 
    : (raw as { peers?: unknown }).peers && Array.isArray((raw as { peers?: unknown }).peers)
      ? (raw as { peers: unknown[] }).peers
      : [];
  
  return dataArray.map((item, index) => {
    // If it's already a PeerInfo-like object
    if (item && typeof item === "object" && "peer_id" in item) {
      const obj = item as Record<string, unknown>;
      return {
        peer_id: String(obj.peer_id ?? ""),
        addr: obj.addr ? String(obj.addr) : undefined,
        agent: obj.agent ? String(obj.agent) : undefined,
        last_seen_ms: typeof obj.last_seen_ms === "number" ? obj.last_seen_ms : undefined,
      };
    }
    
    // If it's a URL string like "http://1.2.3.4:9000"
    if (typeof item === "string") {
      // Extract IP:port from URL
      let addr = item;
      try {
        const url = new URL(item);
        addr = `${url.hostname}:${url.port || "80"}`;
      } catch {
        // Not a valid URL, use as-is
      }
      
      return {
        peer_id: `peer-${index + 1}`, // Generate a placeholder ID
        addr,
        agent: undefined,
        last_seen_ms: undefined,
      };
    }
    
    // Unknown format
    return {
      peer_id: `unknown-${index + 1}`,
      addr: undefined,
      agent: undefined,
      last_seen_ms: undefined,
    };
  });
}

export async function fetchPeers(): Promise<
  | { ok: true; source: "live"; peers: PeersResponse["peers"] }
  | { ok: false; source: "error"; error: string; errorCode?: string; peers: PeersResponse["peers"] }
> {
  const { status, data } = await safeJsonFetchWithStatus<unknown>("/peers");

  // 404 means endpoint not implemented yet (expected for some DevNet phases)
  if (status === 404) {
    return {
      ok: false,
      source: "error",
      error: "Peer endpoint not available on this DevNet (404 expected)",
      errorCode: "endpoint_not_available",
      peers: [],
    };
  }

  // No response means gateway is unreachable
  if (!data) {
    return {
      ok: false,
      source: "error",
      error: "Gateway RPC unavailable (connection failed)",
      errorCode: "gateway_unreachable",
      peers: [],
    };
  }

  const peers = normalizePeers(data);

  return { ok: true, source: "live", peers };
}
