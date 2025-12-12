# IPPAN Explorer - Live Node Setup

## Quick Start

This explorer is now configured to connect to your live IPPAN node!

### Current Configuration

The explorer is set up to fetch real blockchain data from:
- **RPC URL**: `http://188.245.97.41:8080`

### How It Works

1. **Environment Variables**: The app uses Next.js environment variables in `.env.local`
   - `NEXT_PUBLIC_IPPAN_RPC_URL` - Your IPPAN node's RPC endpoint

2. **Automatic Fallback**: If the RPC endpoint is unavailable, the app gracefully falls back to mock data and clearly badges the source

3. **Source Badges**: Throughout the UI, you'll see badges indicating whether data comes from:
   - `RPC` - Live data from your node
   - `MOCK` - Fallback demo data

### Running the Explorer

```bash
# Install dependencies (first time only)
npm install

# Start the development server
npm run dev

# Open http://localhost:3000 in your browser
```

### Available Endpoints

The explorer connects to these RPC endpoints on your node:

- `/status` - Node status and chain head
- `/blocks` - Recent blocks list
- `/blocks/:id` - Block details
- `/tx/:hash` - Transaction details
- `/accounts/:address` - Account information
- `/files` - IPNDHT file descriptors
- `/files/:id` - File details
- `/handles` - Handle lookup
- `/peers` - Network peer information
- `/health` - Node health status
- `/ai/status` - AI/L2 module status

### Changing Nodes

To connect to a different node:

1. Edit `.env.local`
2. Change the `NEXT_PUBLIC_IPPAN_RPC_URL` value
3. Restart the dev server

Example for local node:
```bash
NEXT_PUBLIC_IPPAN_RPC_URL=http://localhost:8080
```

### Running Without a Node

To run in demo mode (mock data only):

1. Delete or rename `.env.local`
2. Restart the dev server
3. The explorer will show mock data with clear "MOCK" badges

### Production Deployment

For production builds:

```bash
# Build the application
npm run build

# Start production server
npm start
```

Environment variables can also be set in your hosting platform (Vercel, Netlify, etc.) instead of using `.env.local`.

### Troubleshooting

**Problem**: App shows mock data instead of live data
- **Check**: Is `.env.local` present with the correct URL?
- **Check**: Is the RPC endpoint accessible? Try `curl http://188.245.97.41:8080/status`
- **Check**: Did you restart the dev server after changing `.env.local`?

**Problem**: CORS errors in browser console
- **Solution**: Configure CORS headers on your IPPAN node to allow requests from your domain

**Problem**: Connection timeout or network errors
- **Check**: Is the node running and accessible?
- **Check**: Are there firewall rules blocking the connection?
- **Fallback**: The app will automatically use mock data and show source badges

### Architecture Notes

- The app uses **Next.js**, not Vite (so environment variables are prefixed with `NEXT_PUBLIC_`, not `VITE_`)
- All RPC fetching logic is in `/lib` directory
- Each lib file imports `getRpcBaseUrl()` from `rpcBase.ts`
- API routes in `/app/api` proxy to the RPC endpoints
- Mock data is only used when RPC is unavailable
