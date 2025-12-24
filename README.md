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

## RPC behavior (`NEXT_PUBLIC_IPPAN_RPC_BASE`)

The explorer connects to a **single canonical RPC gateway**. This gateway is the public entry point that aggregates data from all internal DevNet validators.

### Architecture

```
Explorer (Vercel) → Single RPC Gateway (188.245.97.41:8080) → Internal DevNet peer graph
```

The Explorer **does NOT**:
- Call validator IPs directly
- Assume public RPC on all nodes
- Infer liveness from unreachable endpoints

### Configuration

- **Preferred**: set `NEXT_PUBLIC_IPPAN_RPC_BASE` in Vercel env vars.
- **Also supported**: `NEXT_PUBLIC_IPPAN_RPC_URL`, `NEXT_PUBLIC_NODE_RPC`, `VITE_NODE_RPC`, `IPPAN_RPC_URL`, `IPPAN_RPC_BASE`.
- **Fallback**: if nothing is configured, the explorer falls back to `http://188.245.97.41:8080` (the canonical DevNet gateway).

### Error handling

- **No mocks**: the production explorer never falls back to mock/demo data.
- **Gateway unreachable**: pages show **"Gateway RPC unavailable"** with clear messaging.
- **404 on optional endpoints**: pages show **"DevNet feature — endpoint not yet exposed"** (e.g., `/ipndht`, `/peers`) without treating it as a failure.
- **Valid `/status`**: DevNet is considered UP if the gateway returns valid JSON from `/status`.

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

## HashTimer spec

HashTimers follow the IPPAN format: a 64-character lowercase hexadecimal string with no prefix, shaped as `<14-hex time prefix><50-hex BLAKE3 hash>`. The explorer enforces this canonical format in UI rendering: invalid values get a red badge.

## L2 hooks on L1

This explorer treats L2 as **surfaces anchored on L1**: it lists L2 modules and shows their footprint by looking at **IPNDHT descriptors (tags/meta), account ownership, and `/status` signals**. It does not fabricate "L2 chain state" that the RPC doesn't expose.

## Network + IPNDHT features

- `/api/peers` proxies to `${NEXT_PUBLIC_IPPAN_RPC_BASE}/peers` (no mock fallback).
- `/api/ipndht` proxies to `${NEXT_PUBLIC_IPPAN_RPC_BASE}/ipndht` (no mock fallback).
- When the RPC is down/unreachable, the UI shows a clear devnet error state instead of fake data.

## Tech stack

- Next.js App Router + React Server Components
- Tailwind CSS for styling
- TypeScript-first components and RPC types in `types/rpc.ts`
