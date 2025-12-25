/**
 * Demo Mode Configuration
 * 
 * Controls whether mock/demo data is allowed in the application.
 * 
 * NEXT_PUBLIC_DEMO_MODE=false (default) - Production mode, no mock data allowed
 * NEXT_PUBLIC_DEMO_MODE=true - Demo mode, mock data fallback allowed (for testing only)
 */

/**
 * Check if demo mode is enabled.
 * Demo mode is DISABLED by default - must be explicitly set to "true" to enable.
 */
export function isDemoMode(): boolean {
  const raw = process.env.NEXT_PUBLIC_DEMO_MODE;
  return raw?.toLowerCase() === "true";
}

/**
 * Check if we're in strict production mode (no mock data allowed).
 */
export function isStrictMode(): boolean {
  return !isDemoMode();
}

/**
 * Runtime assertion that throws if mock data is used in production mode.
 * Call this at the top of any mock data provider function.
 */
export function assertDemoModeOrThrow(context: string): void {
  if (isStrictMode()) {
    throw new Error(
      `[STRICT MODE] Mock data access blocked: ${context}. ` +
      `Set NEXT_PUBLIC_DEMO_MODE=true to enable demo/mock data (not recommended for production).`
    );
  }
}

/**
 * Log a warning if mock data is being used (for debugging).
 */
export function warnMockDataUsage(context: string): void {
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn(`[DEMO MODE] Using mock data for: ${context}`);
  }
}
