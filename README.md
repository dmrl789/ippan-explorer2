# IPPAN Explorer

A modern Next.js + Tailwind CSS explorer for the IPPAN network. This repo is **devnet-only**: it reads from a live IPPAN devnet RPC and never serves demo/mock data.

## What this explorer shows

- **L1 (consensus + chain)**: `/status` snapshot, blocks, transactions, accounts.
- **IPNDHT (files + handles + providers)**: file descriptors, handle resolution, and (when available) provider/peer context.
- **AI / L2 modules**: a high-level launchpad for L2 surfaces (AI fairness scoring, InfoLAW, etc.) derived from **L1 status + IPNDHT descriptors**, without inventing its own state.

## Getting started

```bash
npm install
npm run dev
```

## RPC behavior (`NEXT_PUBLIC_IPPAN_RPC_BASE` / `NEXT_PUBLIC_IPPAN_RPC_URL` / `IPPAN_RPC_URL`)

The explorer requires a reachable IPPAN DevNet RPC endpoint.

- **Preferred**: set `NEXT_PUBLIC_IPPAN_RPC_BASE` (or `NEXT_PUBLIC_IPPAN_RPC_URL`) in Vercel env vars.
- **Also supported**: `NEXT_PUBLIC_NODE_RPC`, `VITE_NODE_RPC`, `IPPAN_RPC_URL`, `IPPAN_RPC_BASE`.
- **Fallback**: if nothing is configured, the explorer falls back to `http://188.245.97.41:8080` (DevNet) and renders a visible “DevNet status” panel so misconfiguration is obvious.

- **No mocks**: the production explorer never falls back to mock/demo data.
- **If RPC is unreachable**: pages show **“Devnet RPC unavailable”** (and API routes return `{ ok: false }`) rather than faking state.

### DevNet node list (optional)

Set `NEXT_PUBLIC_IPPAN_DEVNET_NODES` to a comma-separated list to power the DevNet status panel:

```bash
NEXT_PUBLIC_IPPAN_DEVNET_NODES="http://188.245.97.41:8080,http://135.181.145.174:8080,http://5.223.51.238:8080,http://178.156.219.107:8080"
```

The canonical node ordering is:
- Node 1: Nuremberg (`188.245.97.41:8080`)
- Node 2: Helsinki (`135.181.145.174:8080`)
- Node 3: Singapore (`5.223.51.238:8080`)
- Node 4: Ashburn, USA (`178.156.219.107:8080`)

## Pages

This explorer is wired to the current IPPAN DevNet (Nuremberg, Helsinki, Singapore, Ashburn) and never shows mocked data.

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

## HashTimer spec

HashTimers follow the IPPAN format: a 64-character lowercase hexadecimal string with no prefix, shaped as `<14-hex time prefix><50-hex BLAKE3 hash>`. The explorer enforces this canonical format in UI rendering: invalid values get a red badge.

## L2 hooks on L1

This explorer treats L2 as **surfaces anchored on L1**: it lists L2 modules and shows their footprint by looking at **IPNDHT descriptors (tags/meta), account ownership, and `/status` signals**. It does not fabricate “L2 chain state” that the RPC doesn’t expose.

## Network + IPNDHT features

- `/api/peers` proxies to `${NEXT_PUBLIC_IPPAN_RPC_URL}/peers` (no mock fallback).
- `/api/ipndht` proxies to `${NEXT_PUBLIC_IPPAN_RPC_URL}/ipndht` (no mock fallback).
- When the RPC is down/unreachable, the UI shows a clear devnet error state instead of fake data.

## Tech stack

- Next.js App Router + React Server Components
- Tailwind CSS for styling
- TypeScript-first components and RPC types in `types/rpc.ts`
