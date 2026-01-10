import BlocksClient, { type BlocksApiResponse } from "@/components/blocks/BlocksClient";
import { getServerOrigin } from "@/lib/serverOrigin";
import { PageHeader } from "@/components/ui/PageHeader";

// Force dynamic rendering - no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Unwrap the proxy response - handles both envelope and plain formats.
 */
function unwrapBlocks(json: unknown): BlocksApiResponse | null {
  if (!json || typeof json !== "object") return null;
  
  const obj = json as Record<string, unknown>;
  
  // Check if request failed
  if (obj.ok === false) return null;
  
  // Envelope format: { ok, data: { blocks: [...] } }
  if ("data" in obj && obj.data && typeof obj.data === "object") {
    const data = obj.data as Record<string, unknown>;
    if ("blocks" in data) {
      return data as unknown as BlocksApiResponse;
    }
  }
  
  // Plain format: { ok, blocks: [...] }
  if ("blocks" in obj && Array.isArray(obj.blocks)) {
    return obj as unknown as BlocksApiResponse;
  }
  
  return null;
}

/**
 * Fetch initial blocks data on the server.
 * This ensures the page shows content even before client JS hydrates.
 */
async function getInitialBlocks(): Promise<BlocksApiResponse | null> {
  try {
    const origin = getServerOrigin();
    const res = await fetch(`${origin}/api/rpc/blocks?limit=25`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    
    if (!res.ok) {
      console.error(`[SSR] Blocks fetch failed: HTTP ${res.status}`);
      return null;
    }
    
    const json = await res.json();
    const parsed = unwrapBlocks(json);
    
    if (!parsed) {
      console.error("[SSR] Blocks response could not be parsed");
      return null;
    }
    
    return parsed;
  } catch (err) {
    console.error("[SSR] Blocks fetch error:", err);
    return null;
  }
}

/**
 * Blocks page with SSR initial data.
 * 
 * The page renders blocks immediately from SSR, then the client component
 * takes over for auto-refresh polling. This ensures content is visible
 * even if client JS fails to hydrate.
 */
export default async function BlocksPage() {
  const initial = await getInitialBlocks();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blocks"
        description="Latest blocks from DevNet"
      />
      
      {/* Show SSR status for debugging (dev only) */}
      {process.env.NODE_ENV !== "production" && (
        <div className="text-xs text-slate-500 font-mono">
          SSR: {initial ? `${initial.blocks?.length ?? 0} blocks loaded` : "no initial data"}
        </div>
      )}
      
      <BlocksClient initial={initial} />
    </div>
  );
}
