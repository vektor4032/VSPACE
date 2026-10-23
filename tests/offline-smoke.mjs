import { chromium } from "@playwright/test";
import { preview } from "vite";
import { existsSync } from "node:fs";
const base = process.env.VSPACE_BASE_PATH || "/";
const appUrl = `http://127.0.0.1:4174${base}`;
const server = await preview({
  base,
  preview: { host: "127.0.0.1", port: 4174, strictPort: true },
});
let browser;
try {
  browser = await chromium.launch({
    executablePath:
      process.env.VSPACE_CHROMIUM ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(appUrl);
  await page.waitForSelector(".hero");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector(".hero");
  await page.goto(appUrl + "#food");
  await page.waitForSelector(".recipe-card");
  const recipeCount = await page.locator(".recipe-card").count();
  if (recipeCount !== 6) throw Error("Offline recipes unavailable");
  await page.goto(appUrl + "#life?tab=inspiration");
  await page.waitForSelector(".poster-card img");
  await page
    .locator(".poster-card img")
    .evaluateAll((imgs) => imgs.forEach((img) => (img.loading = "eager")));
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".poster-card img")].every(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  );
  const posters = await page.locator(".poster-card img").count();
  if (posters !== 6) throw Error("Offline inspiration unavailable");
  await page.goto(appUrl + "#life?tab=nutrition");
  await page.getByRole("button", { name: "+ 250 мл", exact: true }).click();
  await page.waitForFunction(() =>
    document
      .querySelector(".local-badge")
      ?.textContent?.includes("Сохранено локально"),
  );
  await page.reload();
  await page.waitForSelector(".water-count");
  const water = await page.locator(".water-count").textContent();
  if (!water.includes("0,25"))
    throw Error("Offline life entry was not persisted");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    JSON.stringify({
      serviceWorkerControlled: true,
      offlineReload: true,
      offlineRecipes: recipeCount,
      offlinePosters: posters,
      offlineLifePersistence: true,
      browserErrors: errors,
    }),
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
