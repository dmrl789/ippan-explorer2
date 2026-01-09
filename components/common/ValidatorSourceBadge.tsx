/**
 * Displays the source of validator count data with visual indicator.
 * Helps operators understand where the "validators: N" number comes from.
 */

export type ValidatorSource = 
  | "from_validator_count"        // explicit validator_count field
  | "from_status_validators"      // derived from /status.validators array length
  | "from_validators_object"      // derived from validators object keys
  | "from_validator_metrics"      // derived from validator_metrics/stats keys
  | "from_validator_ids"          // derived from validator_ids array length (LAST resort)
  | "unknown";                    // missing fields

const sourceLabels: Record<ValidatorSource, string> = {
  from_validator_count: "from /status.validator_count",
  from_status_validators: "from /status.validators",
  from_validator_ids: "from /status.consensus.validator_ids",
  from_validators_object: "from /status.consensus.validators",
  from_validator_metrics: "from /status.validator_* (metrics/stats)",
  unknown: "unknown (missing fields)",
};

const sourceColors: Record<ValidatorSource, string> = {
  from_validator_count: "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
  from_status_validators: "bg-blue-900/50 text-blue-300 border-blue-700/50",
  from_validator_ids: "bg-blue-900/50 text-blue-300 border-blue-700/50",
  from_validators_object: "bg-blue-900/50 text-blue-300 border-blue-700/50",
  from_validator_metrics: "bg-blue-900/50 text-blue-300 border-blue-700/50",
  unknown: "bg-amber-900/50 text-amber-300 border-amber-700/50",
};

interface Props {
  source: ValidatorSource;
  className?: string;
}

export function ValidatorSourceBadge({ source, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium ${sourceColors[source]} ${className}`}
      title={sourceLabels[source]}
    >
      {sourceLabels[source]}
    </span>
  );
}

/**
 * Determines the source of validator count from status response.
 */
export function getValidatorSource(status: {
  validator_count?: number;
  validators?: unknown;
  validator_metrics?: Record<string, unknown>;
  validator_stats?: Record<string, unknown>;
  consensus?: {
    validator_ids?: string[];
    validators?: Record<string, unknown>;
  };
} | undefined | null): { source: ValidatorSource; count: number } {
  if (!status) {
    return { source: "unknown", count: 0 };
  }

  // 1) explicit validator_count (best, already correct)
  if (typeof status.validator_count === "number" && status.validator_count > 0) {
    return { source: "from_validator_count", count: status.validator_count };
  }

  // 2) status.validators array (if present)
  if (Array.isArray(status.validators) && status.validators.length > 0) {
    return { source: "from_status_validators", count: status.validators.length };
  }

  // 3) consensus.validators object keys (common in schema v2)
  if (status.consensus?.validators && typeof status.consensus.validators === "object") {
    return { 
      source: "from_validators_object", 
      count: Object.keys(status.consensus.validators).length 
    };
  }

  // 4) validator_metrics / validator_stats object keys (fallback)
  const metricsObj =
    status.validator_metrics && typeof status.validator_metrics === "object"
      ? status.validator_metrics
      : status.validator_stats && typeof status.validator_stats === "object"
        ? status.validator_stats
        : undefined;
  if (metricsObj && Object.keys(metricsObj).length > 0) {
    return { source: "from_validator_metrics", count: Object.keys(metricsObj).length };
  }

  // 5) consensus.validator_ids length (LAST fallback only)
  if (status.consensus?.validator_ids && Array.isArray(status.consensus.validator_ids) && status.consensus.validator_ids.length > 0) {
    return { source: "from_validator_ids", count: status.consensus.validator_ids.length };
  }

  return { source: "unknown", count: 0 };
}
