// Captures an image of each page for the warp, which needs a picture of the page
// it is about to twist. Run after content changes: npm run shots (needs `npm run dev`).
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const BASE = process.env.BASE ?? "http://localhost:4321";
const PAGES = { real: "/", archivist: "/worldline/chrono-archivist/", alchemist: "/worldline/data-alchemist/" };
const WIDTHS = [
  [390, 844, 1.5],
  [820, 1100, 1.25],
  [1440, 900, 1],
];

await mkdir("public/shots", { recursive: true });
const browser = await chromium.launch();
for (const [id, path] of Object.entries(PAGES)) {
  for (const [width, height, deviceScaleFactor] of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor, reducedMotion: "reduce" });
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    // The warp puts real space behind this page itself, so only the type is captured.
    await page.addStyleTag({ content: ".sky{display:none}" });
    const png = `public/shots/${id}-${width}.png`;
    // WebP tops out at 16383 px. The warp only leaves from near the top of a long page.
    const full = await page.evaluate(() => document.documentElement.scrollHeight);
    const clip = { x: 0, y: 0, width, height: Math.min(full, Math.floor(16000 / deviceScaleFactor)) };
    await page.screenshot({ path: png, fullPage: true, clip });
    execFileSync("magick", [png, "-quality", "70", png.replace(".png", ".webp")]);
    execFileSync("rm", [png]);
    await page.close();
  }
}
await browser.close();
