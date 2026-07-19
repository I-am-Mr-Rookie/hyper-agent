import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.APP_BASE_URL || "http://127.0.0.1:3000";
const evidenceDir = new URL("../docs/evidence/", import.meta.url);
await mkdir(evidenceDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

async function inspect(name, path, viewport) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle", timeout: 30_000 });
  const status = response?.status() ?? 0;
  const title = await page.title();
  const h1 = await page.locator("h1").first().textContent();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const overflowOffenders = await page.evaluate(() => Array.from(document.querySelectorAll("*")).map((element) => {
    const rect = element.getBoundingClientRect();
    return { tag: element.tagName.toLowerCase(), className: element.className?.toString?.() || "", left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: element.scrollWidth };
  }).filter((entry) => entry.right > window.innerWidth + 1 || entry.left < -1).slice(0, 12));
  const buttonsWithoutNames = await page.locator("button").evaluateAll((buttons) => buttons.filter((button) => !(button.getAttribute("aria-label") || button.getAttribute("title") || button.textContent?.trim())).length);
  const linksWithoutNames = await page.locator("a").evaluateAll((links) => links.filter((link) => !(link.getAttribute("aria-label") || link.textContent?.trim())).length);
  const screenshot = new URL(`${name}-${viewport.width}.png`, evidenceDir);
  await page.screenshot({ path: screenshot.pathname, fullPage: true });

  const result = {
    name,
    path,
    viewport,
    status,
    title,
    h1,
    horizontalOverflowPx: overflow,
    overflowOffenders,
    buttonsWithoutNames,
    linksWithoutNames,
    consoleErrors,
    pageErrors,
    pass: status === 200 && Boolean(h1) && overflow <= 1 && buttonsWithoutNames === 0 && linksWithoutNames === 0 && consoleErrors.length === 0 && pageErrors.length === 0,
  };
  results.push(result);
  await page.close();
}

await inspect("home", "/", { width: 1440, height: 1000 });
await inspect("dashboard", "/dashboard", { width: 1440, height: 1000 });
await inspect("home-mobile", "/", { width: 390, height: 844 });
await inspect("dashboard-mobile", "/dashboard", { width: 390, height: 844 });

const interaction = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await interaction.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
await interaction.getByRole("button", { name: /generate code/i }).click();
await interaction.waitForSelector(".pair-code", { timeout: 5_000 });
const pairingCodeRendered = Boolean((await interaction.locator(".pair-code code").textContent())?.trim());
results.push({ name: "pairing-interaction", pairingCodeRendered, pass: pairingCodeRendered });
await interaction.close();

await browser.close();
const report = { runAt: new Date().toISOString(), baseUrl, results, pass: results.every((result) => result.pass) };
await writeFile(new URL("visual-smoke.json", evidenceDir), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
