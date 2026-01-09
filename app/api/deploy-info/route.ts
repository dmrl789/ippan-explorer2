import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/deploy-info
 * 
 * Returns deployment info for verification.
 * Uses Vercel environment variables to identify which commit is deployed.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      git_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      git_ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      env: process.env.VERCEL_ENV ?? null,
      deployed_at: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
