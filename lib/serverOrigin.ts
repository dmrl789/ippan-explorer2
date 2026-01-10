/**
 * Get the server origin URL for SSR fetches.
 * 
 * Used when server components need to call API routes on the same deployment.
 * On Vercel, this resolves to the deployed URL; locally defaults to localhost:3000.
 */
export function getServerOrigin(): string {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  return (site ?? "http://localhost:3000").replace(/\/+$/, "");
}
