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
| `NEXT_PUBLIC_IPPAN_RPC_BASE` | Public RPC gateway URL (for display) | `http://188.245.97.41:8080` |
| `NEXT_PUBLIC_DEMO_MODE` | Enable demo/mock data (default: `false`) | `false` |

### Vercel Configuration

1. Go to your Vercel project → Settings → Environment Variables
2. Add the following:

```
IPPAN_RPC_BASE_URL = http://188.245.97.41:8080
NEXT_PUBLIC_DEMO_MODE = false
```

**Important Notes:**
- Only `IPPAN_RPC_BASE_URL` is required - the server-side proxy uses this
- `NEXT_PUBLIC_IPPAN_RPC_BASE` is optional and used only for display in the UI
- `NEXT_PUBLIC_DEMO_MODE=false` (default) ensures no mock data is ever displayed
- All browser RPC calls go through `/api/rpc/*` (no CORS/mixed-content issues)

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
- **Eliminate mixed-content issues**: HTTPS site (Vercel) cannot fetch from HTTP RPC directly
- **Avoid CORS restrictions**: Server-side fetching bypasses browser CORS policies
- **Provide consistent error handling**: Structured error responses with error codes
- **Enable server-side timeouts**: 5-second timeout with proper abort handling

**Important**: The browser NEVER makes direct HTTP requests to the RPC gateway. All requests go through `/api/rpc/*` which runs server-side on Vercel.

### Available API Proxy Routes

| Route | Description | Fallback |
|-------|-------------|----------|
| `GET /api/rpc/status` | Proxy to `/status` | — |
| `GET /api/rpc/health` | Proxy to `/health` | — |
| `GET /api/rpc/blocks` | Proxy to `/blocks` | Derives from `/tx/recent` |
| `GET /api/rpc/block/[id]` | Proxy to `/block/[id]` | Falls back to `/blocks/[id]` |
| `GET /api/rpc/tx/[hash]` | Proxy to `/tx/[hash]` | — |
| `GET /api/rpc/tx/recent` | Proxy to `/tx/recent` | — |
| `GET /api/rpc/tx/status/[hash]` | Proxy to `/tx/status/[hash]` | — |
| `GET /api/rpc/round/[id]` | Proxy to `/round/[id]` | — |
| `GET /api/rpc/account/[hex]` | Proxy to `/accounts/[hex]` | — |
| `GET /api/rpc/debug` | Diagnostic probe matrix | — |
| `GET /api/rpc/*` | Catch-all proxy with allowlist | — |

### Blocks List Fallback

If the upstream `/blocks` endpoint returns 404 (not implemented), the explorer automatically falls back to:

1. Fetch recent transactions via `/tx/recent?limit=200`
2. Extract unique `block_hash` from finalized/included transactions
3. Hydrate each block via `/block/[hash]` (parallel, max 8 concurrent)
4. Return normalized list sorted by timestamp

This ensures the blocks page works even on DevNet versions without a `/blocks` endpoint.

### Catch-all RPC Proxy

The `/api/rpc/[...path]` route provides a catch-all proxy for any RPC endpoint. It:

- **Enforces an allowlist** of known paths to prevent SSRF attacks
- **Sets a 5-second timeout** for all requests
- **Returns structured errors** with error codes
- **Adds Cache-Control headers** appropriate for devnet UI

Allowed path prefixes:
- `/status`, `/health`, `/blocks`, `/block`, `/tx`
- `/round`, `/rounds`, `/accounts`, `/account`
- `/handles`, `/handle`, `/files`, `/file`
- `/ipndht`, `/peers`, `/peer`, `/l2`, `/ai`
- `/hashtimers`, `/hashtimer`, `/debug`
- `/consensus`, `/network`, `/metrics`

### Security Note

The proxy allowlist prevents Server-Side Request Forgery (SSRF) by only forwarding requests to known IPPAN RPC endpoints. Unknown paths return a 403 error.

### The `/api/rpc/debug` Endpoint

Visit `/api/rpc/debug` to get a one-shot diagnostic bundle that includes:
- RPC configuration and environment variable status
- Gateway reachability and latency
- **Probe matrix**: Status of each endpoint (status, tx_recent, blocks_list, etc.)
- Node info (if available)
- Fallback info (which endpoints need fallback)
- Explorer capabilities summary
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
- `/transactions` – **Recent transactions with status filters** (Mempool/Included/Finalized/Rejected/Pruned), search, and responsive table/card view.
- `/tx/[hash]` – Transaction detail with **lifecycle timeline** (Submitted → Included → Finalized) + raw JSON view.
- `/blocks` – Latest blocks with auto-refresh toggle; works even if `/blocks` endpoint is 404 (uses fallback).
- `/blocks/[id]` – Block details + list of transaction IDs in block.
- `/accounts` – Landing page (no demo data).
- `/accounts/[address]` – Account overview (payment history is shown only if your RPC exposes it).
- `/ipndht` – IPNDHT overview from devnet RPC.
- `/files` – Browse IPNDHT file descriptors with filters (`id`, `owner`, `tag`); `/files/[id]` shows descriptor detail + raw JSON.
- `/handles` – Search for `@handle.ipn` records and resolve to an owner.
- `/network` – Peer inventory from `/peers`.
- `/status` – Operator/cluster view combining `/health`, `/status`, and `/ai/status` (if exposed by your devnet RPC).
- `/l2` – L2 modules list driven by config + IPNDHT tag footprint (no invented state).

## Mobile & Tablet Support

The explorer is fully responsive with:
- **Responsive tables**: Tables on desktop, card lists on mobile
- **Bottom navigation**: Mobile-friendly nav bar on small screens
- **Compact hashes**: Shortened hashes with copy buttons
- **Touch-friendly**: Large tap targets, expandable sections
- **Status indicators**: Gateway connection status in header

## Schema Normalization

The explorer uses a centralized normalization layer (`lib/normalize.ts`) to handle schema drift:

- **Transaction normalization**: Accepts various field names (`tx_id`/`hash`/`tx_hash`), status formats
- **Block normalization**: Handles nested `header` objects, different field names
- **Round normalization**: Extracts `round_id`, `included_blocks`, `ordered_tx_ids`
- **Missing fields**: Show "—" instead of errors
- **Unknown endpoints**: Show "endpoint not exposed yet" message

This ensures the explorer doesn't break when the RPC schema changes.

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

- `/api/peers` proxies to `${IPPAN_RPC_BASE_URL}/peers` (no mock fallback).
- `/api/ipndht` proxies to `${IPPAN_RPC_BASE_URL}/ipndht` (no mock fallback).
- `/api/rpc/*` routes provide server-side proxying with consistent error handling.
- When the RPC is down/unreachable, the UI shows a clear devnet error state instead of fake data.

## Troubleshooting

### RPC Connection Issues

1. **Visit `/api/rpc/debug`** to see a complete diagnostic report with probe matrix
2. Check if `IPPAN_RPC_BASE_URL` is set correctly in Vercel
3. Verify the RPC gateway is publicly accessible (no firewall blocking)
4. Check the gateway status indicator in the header

### "Mock data blocked" Error

If you see this error, it means the code tried to use mock data but `NEXT_PUBLIC_DEMO_MODE=false`:
- This is intentional - production should never show mock data
- Fix the underlying RPC issue instead of enabling demo mode

### Blocks Not Loading

If `/status` works but blocks fail:
- Check if the blocks list fallback is working (look for "Fallback Mode Active" warning)
- The fallback requires `/tx/recent` to be available
- If both fail, the node may not expose transaction or block endpoints yet

### Transactions Not Loading

If transactions fail to load:
- Check `/api/rpc/debug` for `tx_recent` probe status
- Verify the node exposes `/tx/recent` endpoint

## Tech stack

- Next.js App Router + React Server Components
- Tailwind CSS for styling
- TypeScript-first components and RPC types
- Centralized schema normalization (`lib/normalize.ts`)
- Responsive design with mobile bottom navigation
