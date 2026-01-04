/**
 * Displays validator identities with duplicate detection and warnings.
 * Helps operators diagnose identity/config propagation issues.
 */

import { StatusPill } from "@/components/ui/StatusPill";
import CopyButton from "@/components/common/CopyButton";

interface ValidatorIdentity {
  id: string;
  isSelf?: boolean;
  occurrences?: number;
}

interface Props {
  validatorIds: string[];
  selfId?: string;
  reportedValidatorCount?: number;
  className?: string;
}

export function ValidatorIdentityPanel({ validatorIds, selfId, reportedValidatorCount, className = "" }: Props) {
  // Count occurrences and detect duplicates
  const idCounts = new Map<string, number>();
  for (const id of validatorIds) {
    idCounts.set(id, (idCounts.get(id) || 0) + 1);
  }

  const uniqueCount = idCounts.size;
  const totalCount = validatorIds.length;
  const hasDuplicates = uniqueCount < totalCount;

  // Check for suspicious scenarios (do NOT compare peers vs validators; peers can be observers/bots)
  const identityUndercount =
    typeof reportedValidatorCount === "number" &&
    reportedValidatorCount > 1 &&
    totalCount > 0 &&
    uniqueCount === 1;
  const noValidatorIds = validatorIds.length === 0;

  // Build validator list with metadata
  const validators: ValidatorIdentity[] = Array.from(idCounts.entries()).map(([id, count]) => ({
    id,
    isSelf: id === selfId,
    occurrences: count,
  }));

  // Sort: self first, then by ID
  validators.sort((a, b) => {
    if (a.isSelf && !b.isSelf) return -1;
    if (!a.isSelf && b.isSelf) return 1;
    return a.id.localeCompare(b.id);
  });

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Summary row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Validator IDs:</span>
          <span className="text-sm font-semibold text-slate-100">
            {uniqueCount} unique {uniqueCount === 1 ? "identity" : "identities"}
          </span>
          {hasDuplicates && (
            <span className="text-xs text-slate-500">
              ({totalCount} total with duplicates)
            </span>
          )}
          {typeof reportedValidatorCount === "number" && reportedValidatorCount > 0 && (
            <span className="text-xs text-slate-500">
              · gateway reports {reportedValidatorCount} validators
            </span>
          )}
        </div>
        {hasDuplicates && (
          <StatusPill status="error" />
        )}
        {identityUndercount && !hasDuplicates && (
          <StatusPill status="warn" />
        )}
      </div>

      {/* Warnings */}
      {hasDuplicates && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-300 font-medium">⚠️ Duplicate Validator IDs Detected</span>
          </div>
          <p className="text-sm text-slate-300">
            The gateway reports {totalCount} validator entries but only {uniqueCount} unique validator ID{uniqueCount === 1 ? "" : "s"}.
            This usually indicates:
          </p>
          <ul className="mt-2 text-sm text-slate-400 list-disc list-inside space-y-1">
            <li>Multiple nodes using the same <code className="text-slate-300">identity.key</code> or validator signing key</li>
            <li>Configuration drift: nodes copied from the same template without regenerating keys</li>
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Run <code className="bg-slate-900/60 px-1 rounded">sha256sum /var/lib/ippan/p2p/identity.key</code> on each node to verify unique identities.
          </p>
        </div>
      )}

      {identityUndercount && !hasDuplicates && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-300 font-medium">⚠️ Validator Identity Undercount</span>
          </div>
          <p className="text-sm text-slate-300">
            Gateway reports <strong>{reportedValidatorCount} validators</strong> but only{" "}
            <strong>{uniqueCount} validator identity</strong> is exposed in{" "}
            <code className="bg-slate-900/60 px-1 rounded">/status.consensus.validator_ids</code>.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            This is usually a <strong>status field limitation</strong> (not necessarily a network fault). If you expect
            full identities to be visible, ensure the node/gateway exposes an explicit validator identity list.
          </p>
        </div>
      )}

      {noValidatorIds && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-300 font-medium">⚠️ No Validator IDs Available</span>
          </div>
          <p className="text-sm text-slate-300">
            The gateway&apos;s <code className="bg-slate-900/60 px-1 rounded">/status</code> response does not include validator identity information.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            This may be expected if the node&apos;s RPC does not expose <code className="bg-slate-900/60 px-1 rounded">consensus.validator_ids</code>.
          </p>
        </div>
      )}

      {/* Validator ID list */}
      {validators.length > 0 && (
        <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800/70">
            <span className="text-xs uppercase tracking-wide text-slate-500">Validator Identities</span>
          </div>
          <div className="divide-y divide-slate-800/50">
            {validators.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs text-emerald-100 truncate" title={v.id}>
                    {v.id.slice(0, 16)}…{v.id.slice(-8)}
                  </span>
                  {v.isSelf && (
                    <span className="shrink-0 rounded bg-emerald-900/50 px-1.5 py-0.5 text-[10px] text-emerald-300">
                      self
                    </span>
                  )}
                  {(v.occurrences ?? 1) > 1 && (
                    <span className="shrink-0 rounded bg-red-900/50 px-1.5 py-0.5 text-[10px] text-red-300">
                      ×{v.occurrences} duplicates
                    </span>
                  )}
                </div>
                <CopyButton text={v.id} label="Copy ID" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
