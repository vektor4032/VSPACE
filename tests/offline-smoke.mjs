import { chromium } from "@playwright/test";
import { preview } from "vite";
import { existsSync } from "node:fs";
const server = await preview({
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
  await page.goto("http://127.0.0.1:4174/");
  await page.waitForSelector(".hero");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector(".hero");
  await page.goto("http://127.0.0.1:4174/#food");
  await page.waitForSelector(".recipe-card");
  const recipeCount = await page.locator(".recipe-card").count();
  if (recipeCount !== 6) throw Error("Offline recipes unavailable");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    JSON.stringify({
      serviceWorkerControlled: true,
      offlineReload: true,
      offlineRecipes: recipeCount,
      browserErrors: errors,
    }),
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
