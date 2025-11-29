# IPPAN Explorer

A modern Next.js + Tailwind CSS explorer for the IPPAN network. The app surfaces the most important RPC data in a clean dashboard: network and AI status, block + transaction details, accounts with payment history, handle + file lookups, and operator health panels.

## Getting started

```bash
npm install
npm run dev
```

The explorer expects an IPPAN RPC endpoint. Configure the base URL via `NEXT_PUBLIC_IPPAN_RPC_URL` (defaults to `http://localhost:8080`). All data is mocked locally for now, but every page is wired through a reusable `fetchJson` helper so you can swap in real endpoints when available.

## Pages

- `/` – Global dashboard with network, AI, health and recent activity.
- `/blocks` – Latest blocks, plus `/blocks/[id]` for block details + transactions.
- `/tx/[hash]` – Transaction detail + raw JSON view.
- `/accounts/[address]` – Account overview with balance, nonce and paginated payments.
- `/handles` – Search for `@handle.ipn` records.
- `/files` – List of files with `/files/[id]` for descriptor detail.
- `/status` – Operator status cards combining `/health` and `/ai/status`.

## Tech stack

- Next.js App Router + React Server Components
- Tailwind CSS for styling
- TypeScript-first components and RPC types in `types/rpc.ts`
- Mock data loaders in `lib/mockData.ts` to simulate RPC responses
