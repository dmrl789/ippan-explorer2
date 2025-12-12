/**
 * IPPAN-native terminology constants
 * 
 * This file provides the single source of truth for labels and tooltips
 * used throughout the explorer to ensure IPPAN-native vocabulary.
 */

// HashTimer terminology
export const LABEL_LATEST_FINALIZED_HASHTIMER = "Latest Finalized Round HashTimer";
export const TIP_LATEST_FINALIZED_HASHTIMER =
  "HashTimer of the latest finalized round. This is the network ordering anchor (not a chain head).";

export const LABEL_TRANSACTION_HASHTIMER = "Transaction HashTimer";
export const TIP_TRANSACTION_HASHTIMER =
  "HashTimer used for ordering this transaction within IPPAN.";

// Round terminology
export const LABEL_FINALIZED_ROUND_INDEX = "Finalized Round Index";
export const TIP_FINALIZED_ROUND_INDEX =
  "IPPAN finality is tracked by rounds. DAG blocks do not have a canonical height.";

export const LABEL_ROUND = "Round";
export const TIP_ROUND =
  "Current round number in the IPPAN consensus.";

// Time terminology
export const LABEL_IPPAN_TIME = "Current IPPAN Time";
export const TIP_IPPAN_TIME =
  "Authoritative network time used by IPPAN. Ordering is provided by HashTimers and finalized rounds.";

export const LABEL_IPPAN_TIME_MS = "IPPAN Time (ms)";
export const TIP_IPPAN_TIME_MS =
  "IPPAN network time in milliseconds since epoch.";

// DAG blocks (not blockchain blocks)
export const LABEL_DAG_BLOCKS_OBSERVED = "DAG Blocks Observed";
export const TIP_DAG_BLOCKS_OBSERVED =
  "Local view only; IPPAN DAG has no global block height. This counter reflects blocks observed by this node.";

// Metrics window (if epoch must be kept)
export const LABEL_METRICS_WINDOW = "Metrics Window (derived)";
export const TIP_METRICS_WINDOW =
  "Derived reporting window; not used for consensus. IPPAN ordering uses HashTimers and finalized rounds.";
