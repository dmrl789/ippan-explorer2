import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL || "https://ippan-explorer2.vercel.app";

test.describe("IPPAN Explorer E2E", () => {
  test("status page renders key fields", async ({ page }) => {
    await page.goto(`${BASE}/status`, { waitUntil: "networkidle" });
    
    // Page header should be visible
    await expect(page.getByRole("heading", { name: "Status" })).toBeVisible();
    
    // Should show peer count or validators
    const peerCountVisible = await page.getByText(/Peer Count/i).isVisible().catch(() => false);
    const validatorsVisible = await page.getByText(/Validators/i).isVisible().catch(() => false);
    
    expect(peerCountVisible || validatorsVisible).toBeTruthy();
    
    // Take screenshot
    await page.screenshot({ path: "audit/explorer2/out/status.png", fullPage: true });
  });

  test("network page renders peer addresses", async ({ page }) => {
    await page.goto(`${BASE}/network`, { waitUntil: "networkidle" });
    
    // Page header should be visible
    await expect(page.getByRole("heading", { name: /Network|Peers/i })).toBeVisible();
    
    // Wait for loading to finish (look for peer count or address pattern)
    await page.waitForFunction(() => {
      const body = document.body.innerText;
      // Check for IP:port pattern or "peers" count
      return /\d+\.\d+\.\d+\.\d+:\d+/.test(body) || /\d+ peers/i.test(body);
    }, { timeout: 15000 });

    // Expect at least one visible address:port pattern
    const hasAddress = await page.locator("text=/\\d+\\.\\d+\\.\\d+\\.\\d+:\\d+/").first().isVisible().catch(() => false);
    const hasPeerCount = await page.getByText(/peers discovered/i).isVisible().catch(() => false);
    
    expect(hasAddress || hasPeerCount).toBeTruthy();
    
    // Take screenshot
    await page.screenshot({ path: "audit/explorer2/out/network.png", fullPage: true });
  });

  test("transactions page renders rows when tx_recent has items", async ({ page, request }) => {
    // First check what the debug API says about available transactions
    const debugResp = await request.get(`${BASE}/api/rpc/debug`);
    expect(debugResp.ok()).toBeTruthy();
    const debug = await debugResp.json();
    
    const txCount = debug?.probe_matrix?.tx_recent?.sample_data?.count ?? 0;
    console.log(`Debug API reports ${txCount} transactions`);
    
    // Navigate to transactions page
    await page.goto(`${BASE}/transactions`, { waitUntil: "networkidle" });
    
    // Page header should be visible
    await expect(page.getByRole("heading", { name: /Transactions/i })).toBeVisible();
    
    if (txCount > 0) {
      // Wait for data to load (either table rows or tx hash patterns)
      await page.waitForFunction(() => {
        const body = document.body.innerText;
        // Look for hex hash patterns (tx_id) or "Finalized"/"Mempool" status
        return /[a-f0-9]{16,}/i.test(body) || /Finalized|Mempool/i.test(body);
      }, { timeout: 15000 });
      
      // Should not show "All (0)" if we have transactions
      const allZero = await page.getByText("All (0)").isVisible().catch(() => false);
      if (allZero) {
        console.warn("Warning: Page shows All (0) but debug reports", txCount, "transactions");
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: "audit/explorer2/out/transactions.png", fullPage: true });
  });

  test("blocks page loads without error", async ({ page }) => {
    await page.goto(`${BASE}/blocks`, { waitUntil: "networkidle" });
    
    // Page should have blocks heading
    await expect(page.getByRole("heading", { name: /Blocks/i })).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: "audit/explorer2/out/blocks.png", fullPage: true });
  });

  test("dashboard shows live data", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    
    // Should show some live metrics
    await page.waitForFunction(() => {
      const body = document.body.innerText;
      // Look for numbers that indicate live data (peer count, validators, etc.)
      return /\d+ peers|\d+ validators|online|connected/i.test(body);
    }, { timeout: 15000 });
    
    // Take screenshot  
    await page.screenshot({ path: "audit/explorer2/out/dashboard.png", fullPage: true });
  });

  test("API endpoints return expected data", async ({ request }) => {
    // Test /api/rpc/status
    const statusResp = await request.get(`${BASE}/api/rpc/status`);
    expect(statusResp.ok()).toBeTruthy();
    const statusData = await statusResp.json();
    expect(statusData.ok).toBe(true);
    expect(statusData.data).toBeDefined();
    
    // Test /api/rpc/tx/recent
    const txResp = await request.get(`${BASE}/api/rpc/tx/recent?limit=5`);
    expect(txResp.ok()).toBeTruthy();
    const txData = await txResp.json();
    expect(txData.ok).toBe(true);
    
    // Test /api/rpc/peers (or status.peers fallback)
    const peersResp = await request.get(`${BASE}/api/rpc/peers`);
    expect(peersResp.ok()).toBeTruthy();
    const peersData = await peersResp.json();
    expect(peersData.ok).toBe(true);
  });
});
