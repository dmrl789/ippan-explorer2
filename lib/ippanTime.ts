export function safeParseBigInt(value: string): bigint {
  const normalized = value.trim();
  return BigInt(normalized);
}

function toBigInt(us: bigint | number | string): bigint {
  if (typeof us === "bigint") {
    return us;
  }
  if (typeof us === "number") {
    return BigInt(Math.trunc(us));
  }
  return safeParseBigInt(us);
}

export function toMsFromUs(us: bigint | number | string): number {
  const micros = toBigInt(us);
  const millis = micros / 1000n;
  return Number(millis);
}

export function formatMs(ms: number): string {
  return new Date(ms).toISOString();
}

// ============================================================================
// IPPAN Time Extraction Helpers
// ============================================================================

/**
 * Possible field names for IPPAN time in microseconds.
 * The extractor checks these in order and returns the first valid value found.
 */
const IPPAN_TIME_US_KEYS = [
  "ippan_time_us",
  "ippan_time",
  "network_time_us",
  "time_us",
  "now_us",
  "current_time_us",
  "ledger_time_us",
  "consensus_time_us",
] as const;

/**
 * Possible field names for IPPAN time in milliseconds.
 */
const IPPAN_TIME_MS_KEYS = [
  "ippan_time_ms",
  "network_time_ms",
  "time_ms",
  "now_ms",
  "current_time_ms",
] as const;

/**
 * Possible field names for HashTimer values.
 */
const HASHTIMER_KEYS = [
  "hashtimer",
  "hash_timer",
  "last_hashtimer",
  "tip_hashtimer",
  "head_hashtimer",
  "latest_hashtimer",
  "current_hashtimer",
  "finalized_hashtimer",
] as const;

/**
 * Possible nested paths for time fields (e.g., status.head.ippan_time_us).
 */
const NESTED_TIME_PATHS = [
  ["head", "ippan_time_us"],
  ["head", "ippan_time_ms"],
  ["head", "ippan_time"],
  ["consensus", "time_us"],
  ["consensus", "ippan_time_us"],
  ["network", "time_us"],
  ["time", "us"],
  ["time", "microseconds"],
] as const;

/**
 * Possible nested paths for HashTimer fields.
 */
const NESTED_HASHTIMER_PATHS = [
  ["head", "hash_timer_id"],
  ["head", "hashtimer"],
  ["consensus", "tip_hashtimer"],
  ["consensus", "hashtimer"],
  ["latest_block", "hash_timer_id"],
  ["latest_block", "hashtimer"],
] as const;

/**
 * Extract a value from a nested path in an object.
 */
function getNestedValue(obj: Record<string, unknown>, path: readonly string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Check if a value looks like a valid microsecond timestamp (13-19 digits).
 * Unix epoch microseconds since 1970 are ~16-17 digits.
 */
function isValidMicroseconds(value: unknown): value is number | string | bigint {
  if (typeof value === "bigint") {
    return value > 0n && value < 10n ** 19n;
  }
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 1e12 && value < 1e19;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return false;
    const len = trimmed.length;
    return len >= 13 && len <= 19;
  }
  return false;
}

/**
 * Check if a value looks like a valid millisecond timestamp (13 digits).
 */
function isValidMilliseconds(value: unknown): value is number | string {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 1e12 && value < 1e16;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return false;
    const len = trimmed.length;
    return len >= 13 && len <= 16;
  }
  return false;
}

/**
 * Check if a string looks like a valid HashTimer (64 hex chars).
 */
function isValidHashTimer(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{64}$/i.test(value.trim());
}

export interface ExtractedIppanTime {
  /** IPPAN time in microseconds (if found) */
  timeUs: bigint | null;
  /** IPPAN time in milliseconds (computed from timeUs or found directly) */
  timeMs: number | null;
  /** ISO timestamp (UTC) if the time appears to be unix epoch based */
  isoTimestamp: string | null;
  /** Source field name where the time was found */
  sourceField: string | null;
  /** Whether the time appears to be unix epoch based (vs ledger-relative) */
  isUnixEpoch: boolean;
  /** Raw value as found in the response */
  rawValue: unknown;
}

export interface ExtractedHashTimer {
  /** HashTimer value (64-char hex) */
  hashTimer: string | null;
  /** Source field name where the HashTimer was found */
  sourceField: string | null;
  /** Raw value as found in the response */
  rawValue: unknown;
}

/**
 * Extract IPPAN time from a status response.
 * Searches multiple possible field names and nested paths.
 * 
 * @param status - The raw status response from the RPC
 * @returns Extracted time info or null values if not found
 */
export function extractIppanTime(status: unknown): ExtractedIppanTime {
  const result: ExtractedIppanTime = {
    timeUs: null,
    timeMs: null,
    isoTimestamp: null,
    sourceField: null,
    isUnixEpoch: false,
    rawValue: null,
  };

  if (!status || typeof status !== "object") {
    return result;
  }

  const obj = status as Record<string, unknown>;

  // First, check top-level microsecond fields
  for (const key of IPPAN_TIME_US_KEYS) {
    const value = obj[key];
    if (isValidMicroseconds(value)) {
      result.timeUs = toBigInt(value);
      result.rawValue = value;
      result.sourceField = key;
      break;
    }
  }

  // If not found, check nested paths for microseconds
  if (result.timeUs === null) {
    for (const path of NESTED_TIME_PATHS) {
      const value = getNestedValue(obj, path);
      if (isValidMicroseconds(value)) {
        result.timeUs = toBigInt(value);
        result.rawValue = value;
        result.sourceField = path.join(".");
        break;
      }
    }
  }

  // If still not found, check millisecond fields and convert
  if (result.timeUs === null) {
    for (const key of IPPAN_TIME_MS_KEYS) {
      const value = obj[key];
      if (isValidMilliseconds(value)) {
        const ms = typeof value === "string" ? parseInt(value, 10) : value as number;
        result.timeMs = ms;
        result.timeUs = BigInt(ms) * 1000n;
        result.rawValue = value;
        result.sourceField = key;
        break;
      }
    }
  }

  // Compute derived values if we found a time
  if (result.timeUs !== null) {
    // Compute milliseconds if not already set
    if (result.timeMs === null) {
      result.timeMs = toMsFromUs(result.timeUs);
    }

    // Check if this looks like unix epoch time
    // Unix epoch microseconds since 1970-01-01 would be ~1.7e15 in 2024
    const msValue = result.timeMs;
    const year2000Ms = 946684800000; // 2000-01-01 in ms
    const year2100Ms = 4102444800000; // 2100-01-01 in ms
    
    if (msValue > year2000Ms && msValue < year2100Ms) {
      result.isUnixEpoch = true;
      result.isoTimestamp = formatMs(msValue);
    }
  }

  return result;
}

/**
 * Extract HashTimer from a status response.
 * Searches multiple possible field names and nested paths.
 * 
 * @param status - The raw status response from the RPC
 * @returns Extracted HashTimer info or null values if not found
 */
export function extractHashTimer(status: unknown): ExtractedHashTimer {
  const result: ExtractedHashTimer = {
    hashTimer: null,
    sourceField: null,
    rawValue: null,
  };

  if (!status || typeof status !== "object") {
    return result;
  }

  const obj = status as Record<string, unknown>;

  // Check top-level HashTimer fields
  for (const key of HASHTIMER_KEYS) {
    const value = obj[key];
    if (isValidHashTimer(value)) {
      result.hashTimer = value.toLowerCase();
      result.rawValue = value;
      result.sourceField = key;
      return result;
    }
  }

  // Check nested paths
  for (const path of NESTED_HASHTIMER_PATHS) {
    const value = getNestedValue(obj, path);
    if (isValidHashTimer(value)) {
      result.hashTimer = (value as string).toLowerCase();
      result.rawValue = value;
      result.sourceField = path.join(".");
      return result;
    }
  }

  return result;
}

/**
 * Extract the last block time from a status response.
 * This is separate from IPPAN time as it represents block finalization time.
 * 
 * @param status - The raw status response from the RPC
 * @returns Time in microseconds or null if not found
 */
export function extractLastBlockTimeUs(status: unknown): bigint | null {
  if (!status || typeof status !== "object") {
    return null;
  }

  const obj = status as Record<string, unknown>;

  // Check common field names for last block time
  const blockTimeKeys = [
    "last_block_time_us",
    "latest_block_time_us",
    "head_time_us",
    "tip_time_us",
  ];

  for (const key of blockTimeKeys) {
    const value = obj[key];
    if (isValidMicroseconds(value)) {
      return toBigInt(value);
    }
  }

  // Check nested paths
  const blockTimePaths = [
    ["head", "time_us"],
    ["latest_block", "time_us"],
    ["latest_block", "ippan_time_us"],
    ["tip", "time_us"],
  ];

  for (const path of blockTimePaths) {
    const value = getNestedValue(obj, path as readonly string[]);
    if (isValidMicroseconds(value)) {
      return toBigInt(value);
    }
  }

  return null;
}

/**
 * Compute clock delta between IPPAN time and local wall clock.
 * Positive value means IPPAN time is ahead of local time.
 * 
 * @param ippanTimeMs - IPPAN time in milliseconds
 * @returns Delta in milliseconds, or null if IPPAN time is not unix-epoch based
 */
export function computeClockDelta(ippanTimeMs: number | null): number | null {
  if (ippanTimeMs === null) return null;
  
  // Only compute delta if the time looks like unix epoch
  const year2000Ms = 946684800000;
  const year2100Ms = 4102444800000;
  
  if (ippanTimeMs < year2000Ms || ippanTimeMs > year2100Ms) {
    return null;
  }
  
  return ippanTimeMs - Date.now();
}

/**
 * Format clock delta for display.
 * Shows direction (ahead/behind) and human-readable duration.
 */
export function formatClockDelta(deltaMs: number | null): string {
  if (deltaMs === null) return "N/A (non-epoch time)";
  
  const absMs = Math.abs(deltaMs);
  const direction = deltaMs >= 0 ? "ahead" : "behind";
  
  if (absMs < 1000) {
    return `${deltaMs > 0 ? "+" : ""}${deltaMs}ms`;
  }
  
  if (absMs < 60000) {
    const seconds = (absMs / 1000).toFixed(1);
    return `${seconds}s ${direction}`;
  }
  
  if (absMs < 3600000) {
    const minutes = Math.floor(absMs / 60000);
    const seconds = Math.floor((absMs % 60000) / 1000);
    return `${minutes}m ${seconds}s ${direction}`;
  }
  
  const hours = Math.floor(absMs / 3600000);
  const minutes = Math.floor((absMs % 3600000) / 60000);
  return `${hours}h ${minutes}m ${direction}`;
}
