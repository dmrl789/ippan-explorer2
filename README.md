# IPPAN Explorer

A modern Next.js + Tailwind CSS explorer for the IPPAN network. The explorer is designed to be a truthful “front door” to L1 + IPNDHT + L2 modules: it shows what the current RPC exposes, and clearly badges mock fallback data when running without an RPC URL.

## What this explorer shows

- **L1 (consensus + chain)**: `/status` snapshot, blocks, transactions, accounts.
- **IPNDHT (files + handles + providers)**: file descriptors, handle resolution, and (when available) provider/peer context.
- **AI / L2 modules**: a high-level launchpad for L2 surfaces (AI fairness scoring, InfoLAW, etc.) derived from **L1 status + IPNDHT descriptors**, without inventing its own state.

## Getting started

```bash
npm install
npm run dev
```

## Configuration

### Connecting to a Live IPPAN Node

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and set your IPPAN node's RPC URL:
   ```bash
   NEXT_PUBLIC_IPPAN_RPC_URL=http://188.245.97.41:8080
   ```

3. Restart the dev server to load the new environment variables

The explorer will now fetch real blockchain data from your live node!

### RPC / Mock Behavior

The explorer expects an IPPAN RPC endpoint configured via `NEXT_PUBLIC_IPPAN_RPC_URL`:

- **When set**: Pages fetch real RPC data where possible, with **mock fallback only when an endpoint is missing or errors**.
- **When unset**: The explorer runs in **mock-only demo mode**, and major sections are clearly badged as `"mock"` using `SourceBadge`.

**Live node examples:**
- Production: `http://188.245.97.41:8080`
- Local development: `http://localhost:8080`

In production, leaving it unset creates a standalone demo without external dependencies.

## Pages

- `/` – Dashboard: truthful L1 snapshot + peers + IPNDHT + links to L2.
- `/blocks` – Latest blocks, plus `/blocks/[id]` for block details + transactions.
- `/tx/[hash]` – Transaction detail + raw JSON view.
- `/accounts` – Landing page with examples.
- `/accounts/[address]` – Account overview (payments may be mock if RPC doesn’t expose history yet).
- `/ipndht` – IPNDHT overview: counts + recent file descriptors + recent handles (RPC-backed, mock fallback).
- `/files` – Browse IPNDHT file descriptors with filters (`id`, `owner`, `tag`); `/files/[id]` shows descriptor detail + raw JSON.
- `/handles` – Search for `@handle.ipn` records and resolve to an owner (with source badge).
- `/network` – Peer inventory from `/peers`, with IPNDHT context when available.
- `/status` – Operator/cluster view combining `/health`, `/status`, and `/ai/status`.
- `/l2` – L2 modules list driven by config + IPNDHT tag footprint (no invented state).

## HashTimer spec

HashTimers follow the IPPAN format: a 64-character lowercase hexadecimal string with no prefix, shaped as `<14-hex time prefix><50-hex BLAKE3 hash>`. The explorer enforces this canonical format across mocks and UI rendering: invalid values get a red badge, and mock HashTimers are generated in `lib/hashtimer.ts` to stay spec-compliant.

## L2 hooks on L1

This explorer treats L2 as **surfaces anchored on L1**: it lists L2 modules and shows their footprint by looking at **IPNDHT descriptors (tags/meta), account ownership, and `/status` signals**. It does not fabricate “L2 chain state” that the RPC doesn’t expose.

## Network + IPNDHT features

- `/api/peers` proxies to `${NEXT_PUBLIC_IPPAN_RPC_URL}/peers` when available or returns stable mock peers otherwise.
- `/api/ipndht` aggregates handles, files, providers, and peer counts from RPC (with per-section mock fallback) for the `/ipndht` page.
- The dashboard highlights live vs. mock sources for HashTimers, IPNDHT, peers, and operator status; `/network` and `/ipndht` expose detailed tables with the same source badges.
- Node health draws from `/health` + `/status` (or mocks), while IPNDHT-facing UX for handles/files remains available even in mock mode.

## Tech stack

- Next.js App Router + React Server Components
- Tailwind CSS for styling
- TypeScript-first components and RPC types in `types/rpc.ts`
- Mock data loaders in `lib/mockData.ts` to simulate RPC responses
