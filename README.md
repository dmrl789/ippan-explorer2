# IPPAN Explorer

A modern Next.js + Tailwind CSS explorer for the IPPAN network. The app surfaces the most important RPC data in a clean dashboard: network and AI status, block + transaction details, accounts with payment history, handle + file lookups, and operator health panels.

## Getting started

```bash
npm install
npm run dev
```

The explorer expects an IPPAN RPC endpoint. Configure the base URL via `NEXT_PUBLIC_IPPAN_RPC_URL`. For local development you can point it to `http://localhost:8080`; in production the explorer runs in mock mode when the variable is unset so UI links never point at localhost.

## Pages

- `/` – Global dashboard with network, AI, health and recent activity, plus IPPAN feature shortcuts.
- `/network` – Peer inventory from `/peers` with mock fallback and IPNDHT context.
- `/ipndht` – Aggregated IPNDHT view with handles, files, providers, and peer counts.
- `/blocks` – Latest blocks, plus `/blocks/[id]` for block details + transactions.
- `/tx/[hash]` – Transaction detail + raw JSON view.
- `/accounts/[address]` – Account overview with balance, nonce and paginated payments.
- `/handles` – Search for `@handle.ipn` records.
- `/files` – List of files with `/files/[id]` for descriptor detail.
- `/status` – Operator status cards combining `/health` and `/ai/status`.

## HashTimer spec

HashTimers follow the IPPAN format: a 64-character lowercase hexadecimal string with no prefix, shaped as `<14-hex time prefix><50-hex BLAKE3 hash>`. The explorer enforces this canonical format across mocks and UI rendering: invalid values get a red badge, and mock HashTimers are generated in `lib/hashtimer.ts` to stay spec-compliant.

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
