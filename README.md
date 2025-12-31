# IPPAN Explorer

A modern Next.js + Tailwind CSS explorer for the IPPAN network. This repo is **devnet-only**: it reads from a live IPPAN devnet RPC and never serves demo/mock data.

## What this explorer shows

- **L1 (consensus + chain)**: `/status` snapshot, blocks, transactions, accounts.
- **IPPAN Time & HashTimers**: Network time extraction with clock delta display and HashTimer ordering anchors.
- **IPNDHT (files + handles + providers)**: file descriptors, handle resolution, and (when available) provider/peer context.
- **AI / L2 modules**: a high-level launchpad for L2 surfaces (AI fairness scoring, InfoLAW, etc.) derived from **L1 status + IPNDHT descriptors**, without inventing its own state.
- **All Fields View**: Raw JSON viewer that displays ALL fields from RPC responses, including unknown/new fields without requiring code changes.

## Getting started

```bash
npm install
npm run dev
```

## Environment Variables

### Required for Production (Vercel)

| Variable | Description | Default |
|----------|-------------|---------|
| `IPPAN_RPC_BASE_URL` | **Server-side only** RPC gateway URL (preferred) | — |
| `NEXT_PUBLIC_IPPAN_RPC_BASE` | Public RPC gateway URL (client + server) | `http://188.245.97.41:8080` |
| `NEXT_PUBLIC_DEMO_MODE` | Enable demo/mock data (default: `false`) | `false` |

### Vercel Configuration

1. Go to your Vercel project → Settings → Environment Variables
2. Add the following:

```
IPPAN_RPC_BASE_URL = http://188.245.97.41:8080
NEXT_PUBLIC_IPPAN_RPC_BASE = http://188.245.97.41:8080
NEXT_PUBLIC_DEMO_MODE = false
```

**Important Notes:**
- `NEXT_PUBLIC_DEMO_MODE=false` (default) ensures no mock data is ever displayed
- If the RPC is not publicly reachable, you must use a reverse proxy or Cloudflare tunnel
- The Explorer will show clear error messages if the RPC is unreachable

### Demo Mode

Setting `NEXT_PUBLIC_DEMO_MODE=true` enables mock data fallback. **Do NOT use this in production.**

## RPC Architecture

The explorer connects to a **single canonical RPC gateway**. This gateway is the public entry point that aggregates data from all internal DevNet validators.

### Architecture

```
Explorer (Vercel)
    ↓
/api/rpc/* (Next.js API routes - server-side proxy)
    ↓
Single RPC Gateway (188.245.97.41:8080)
    ↓
Internal DevNet peer graph
```

All RPC calls are proxied through Next.js API routes to:
- Eliminate CORS issues
- Avoid mixed-content restrictions
- Provide consistent error handling
- Enable server-side timeouts

### Available API Proxy Routes

| Route | Description |
|-------|-------------|
| `GET /api/rpc/status` | Proxy to `/status` |
| `GET /api/rpc/health` | Proxy to `/health` |
| `GET /api/rpc/blocks` | Proxy to `/blocks` |
| `GET /api/rpc/block/[id]` | Proxy to `/blocks/[id]` |
| `GET /api/rpc/tx/[hash]` | Proxy to `/tx/[hash]` |
| `GET /api/rpc/account/[hex]` | Proxy to `/accounts/[hex]` |
| `GET /api/rpc/debug` | Diagnostic bundle (probes all endpoints) |
| `GET /api/rpc/*` | Catch-all proxy with allowlist (see below) |

### Catch-all RPC Proxy

The `/api/rpc/[...path]` route provides a catch-all proxy for any RPC endpoint. It:

- **Enforces an allowlist** of known paths to prevent SSRF attacks
- **Sets a 5-second timeout** for all requests
- **Returns structured errors** with error codes
- **Adds Cache-Control headers** appropriate for devnet UI

Allowed path prefixes:
- `/status`, `/health`, `/blocks`, `/block`, `/tx`
- `/accounts`, `/account`, `/handles`, `/handle`
- `/files`, `/file`, `/ipndht`, `/peers`, `/peer`
- `/l2`, `/ai`, `/hashtimers`, `/hashtimer`
- `/debug`, `/consensus`, `/network`, `/metrics`

### Security Note

The proxy allowlist prevents Server-Side Request Forgery (SSRF) by only forwarding requests to known IPPAN RPC endpoints. Unknown paths return a 403 error.

### The `/api/rpc/debug` Endpoint

Visit `/api/rpc/debug` to get a one-shot diagnostic bundle that includes:
- RPC configuration
- Gateway reachability status
- Individual endpoint probe results
- Node info (if available)
- Troubleshooting steps

This is extremely useful for debugging RPC connectivity issues from Vercel.

The Explorer **does NOT**:
- Call validator IPs directly
- Assume public RPC on all nodes
- Infer liveness from unreachable endpoints
- Fall back to mock/demo data (when `NEXT_PUBLIC_DEMO_MODE=false`)

### Error handling

- **No mocks**: the production explorer never falls back to mock/demo data.
- **Gateway unreachable**: pages show **"Gateway RPC unavailable"** with detailed diagnostics and debug links.
- **404 on optional endpoints**: pages show **"DevNet feature — endpoint not yet exposed"** (e.g., `/ipndht`, `/peers`) without treating it as a failure.
- **Valid `/status`**: DevNet is considered UP if the gateway returns valid JSON from `/status`.

### Mempool Size Interpretation

A `mempool_size=0` means no pending transactions at this node right now. This could mean:
- The network is idle (no transactions being submitted)
- Transactions are being processed quickly
- The node hasn't received any transactions yet

If blocks/tx pages are failing to load while mempool shows 0, this indicates an RPC endpoint issue (not a network issue).

### DevNet topology (internal)

The DevNet consists of 4 validator nodes + tx bot:
- Node 1: Nuremberg
- Node 2: Helsinki
- Node 3: Singapore
- Node 4: Ashburn, USA

**Note**: These validators are NOT public RPC endpoints. All queries go through the single canonical gateway.

## Pages

This explorer is wired to the current IPPAN DevNet and never shows mocked data.

- `/` – Dashboard: truthful L1 snapshot + peers + IPNDHT + links to L2.
- `/blocks` – Latest blocks, plus `/blocks/[id]` for block details + transactions.
- `/tx/[hash]` – Transaction detail + raw JSON view.
- `/accounts` – Landing page (no demo data).
- `/accounts/[address]` – Account overview (payment history is shown only if your RPC exposes it).
- `/ipndht` – IPNDHT overview from devnet RPC.
- `/files` – Browse IPNDHT file descriptors with filters (`id`, `owner`, `tag`); `/files/[id]` shows descriptor detail + raw JSON.
- `/handles` – Search for `@handle.ipn` records and resolve to an owner.
- `/network` – Peer inventory from `/peers`.
- `/status` – Operator/cluster view combining `/health`, `/status`, and `/ai/status` (if exposed by your devnet RPC).
- `/l2` – L2 modules list driven by config + IPNDHT tag footprint (no invented state).

## IPPAN Time & HashTimer

### IPPAN Time

The explorer extracts and displays IPPAN Time from multiple possible field names in the `/status` response:

- **Microsecond fields**: `ippan_time_us`, `network_time_us`, `time_us`, `now_us`
- **Millisecond fields**: `ippan_time_ms`, `network_time_ms`, `time_ms`
- **Nested paths**: `head.ippan_time_us`, `consensus.time_us`, etc.

The UI displays:
- **IPPAN Time (μs)**: Raw network time in microseconds
- **Network Time (UTC)**: ISO timestamp if the time is unix-epoch based
- **Clock Delta**: Client-side computed difference from local time
- **Time Type**: Indicates if the time is unix-epoch (convertible) or ledger-relative

### HashTimer spec

HashTimers follow the IPPAN format: a 64-character lowercase hexadecimal string with no prefix, shaped as `<14-hex time prefix><50-hex BLAKE3 hash>`. The explorer enforces this canonical format in UI rendering: invalid values get a red badge.

### All Fields View

The "Raw /status JSON" viewer includes an "All Fields" mode that:
- Flattens the entire response into searchable path-value pairs
- Shows every field including unknown/new ones
- Never hides data - ensures full transparency
- Includes search/filter functionality

This ensures the explorer can display new fields added to the RPC without code changes.

## L2 hooks on L1

This explorer treats L2 as **surfaces anchored on L1**: it lists L2 modules and shows their footprint by looking at **IPNDHT descriptors (tags/meta), account ownership, and `/status` signals**. It does not fabricate "L2 chain state" that the RPC doesn't expose.

## Network + IPNDHT features

- `/api/peers` proxies to `${NEXT_PUBLIC_IPPAN_RPC_BASE}/peers` (no mock fallback).
- `/api/ipndht` proxies to `${NEXT_PUBLIC_IPPAN_RPC_BASE}/ipndht` (no mock fallback).
- `/api/rpc/*` routes provide server-side proxying with consistent error handling.
- When the RPC is down/unreachable, the UI shows a clear devnet error state instead of fake data.

## Troubleshooting

### RPC Connection Issues

1. **Visit `/api/rpc/debug`** to see a complete diagnostic report
2. Check if `IPPAN_RPC_BASE_URL` is set correctly in Vercel
3. Verify the RPC gateway is publicly accessible (no firewall blocking)
4. Look for CORS or mixed-content errors in browser console

### "Mock data blocked" Error

If you see this error, it means the code tried to use mock data but `NEXT_PUBLIC_DEMO_MODE=false`:
- This is intentional - production should never show mock data
- Fix the underlying RPC issue instead of enabling demo mode

### Blocks/Transactions Not Loading

If `/status` works but blocks/tx fail:
- The node may not expose `/blocks` or `/tx` endpoints yet (404 expected)
- This is a DevNet limitation, not an Explorer bug
- The UI will show a clear "endpoint not available" message

## Tech stack

- Next.js App Router + React Server Components
- Tailwind CSS for styling
- TypeScript-first components and RPC types in `types/rpc.ts`
