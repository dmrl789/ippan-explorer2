import type { AccountSummary } from "@/types/rpc";
import { safeJsonFetchWithStatus } from "@/lib/rpc";

function normalizeAccount(record: any, fallbackAddress: string): AccountSummary {
  const address = typeof record?.address === "string" ? record.address : fallbackAddress;
  const balance =
    typeof record?.balance === "number"
      ? record.balance
      : typeof record?.balance_ipn === "number"
        ? record.balance_ipn
        : 0;
  const balanceAtomic =
    typeof record?.balanceAtomic === "string"
      ? record.balanceAtomic
      : typeof record?.balance_atomic === "string"
        ? record.balance_atomic
        : "0";
  const nonce = typeof record?.nonce === "number" ? record.nonce : typeof record?.nonce === "string" ? Number(record.nonce) : 0;
  const handles = Array.isArray(record?.handles) ? record.handles.filter((h: any) => typeof h === "string") : undefined;

  return { address, balance, balanceAtomic, nonce, handles };
}

export async function fetchAccountSummary(
  address: string
): Promise<
  | { ok: true; source: "live"; account: AccountSummary }
  | { ok: true; source: "live"; account: null }
  | { ok: false; source: "error"; error: string }
> {
  const { status, data } = await safeJsonFetchWithStatus<any>(`/accounts/${encodeURIComponent(address)}`);
  if (status === 404) {
    return { ok: true, source: "live", account: null };
  }
  if (!data) {
    return { ok: false, source: "error", error: "IPPAN devnet RPC unavailable" };
  }
  return { ok: true, source: "live", account: normalizeAccount(data, address) };
}

