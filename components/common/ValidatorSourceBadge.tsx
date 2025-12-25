/**
 * Displays the source of validator count data with visual indicator.
 * Helps operators understand where the "validators: N" number comes from.
 */

export type ValidatorSource = 
  | "from_validator_count"        // explicit validator_count field
  | "from_validator_ids"          // derived from validator_ids array length
  | "from_validators_object"      // derived from validators object keys
  | "unknown";                    // missing fields

const sourceLabels: Record<ValidatorSource, string> = {
  from_validator_count: "from /status.validator_count",
  from_validator_ids: "from /status.consensus.validator_ids",
  from_validators_object: "from /status.consensus.validators",
  unknown: "unknown (missing fields)",
};

const sourceColors: Record<ValidatorSource, string> = {
  from_validator_count: "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
  from_validator_ids: "bg-blue-900/50 text-blue-300 border-blue-700/50",
  from_validators_object: "bg-blue-900/50 text-blue-300 border-blue-700/50",
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
  consensus?: {
    validator_ids?: string[];
    validators?: Record<string, unknown>;
  };
} | undefined | null): { source: ValidatorSource; count: number } {
  if (!status) {
    return { source: "unknown", count: 0 };
  }

  // Check for explicit validator_count field first
  if (typeof status.validator_count === "number") {
    return { source: "from_validator_count", count: status.validator_count };
  }

  // Check for validator_ids array
  if (status.consensus?.validator_ids && Array.isArray(status.consensus.validator_ids)) {
    return { 
      source: "from_validator_ids", 
      count: status.consensus.validator_ids.length 
    };
  }

  // Check for validators object
  if (status.consensus?.validators && typeof status.consensus.validators === "object") {
    return { 
      source: "from_validators_object", 
      count: Object.keys(status.consensus.validators).length 
    };
  }

  return { source: "unknown", count: 0 };
}
