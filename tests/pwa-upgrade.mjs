import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  statSync,
  cpSync,
  appendFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, extname } from "node:path";
import { createServer } from "node:http";
import { chromium } from "@playwright/test";
const legacy =
  process.env.VSPACE_LEGACY_RELEASE ||
  "b563b1b501679a02accd223541f047c6a24a37d9";
const temp = mkdtempSync(join(tmpdir(), "vspace-pwa-upgrade-"));
let browser, server;
try {
  const archive = execFileSync("git", ["archive", legacy], {
    maxBuffer: 20 * 1024 * 1024,
  });
  writeFileSync(join(temp, "legacy.tar"), archive);
  execFileSync("tar", ["-xf", join(temp, "legacy.tar"), "-C", temp]);
  let root = temp;
  const mime = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".png": "image/png",
  };
  server = createServer((req, res) => {
    const path = new URL(req.url, "http://localhost").pathname;
    if (!path.startsWith("/VSPACE/")) {
      res.writeHead(404).end();
      return;
    }
    const rel =
      decodeURIComponent(path.slice("/VSPACE/".length)) || "index.html";
    const file = resolve(root, rel);
    if (
      !file.startsWith(root + "/") ||
      !existsSync(file) ||
      !statSync(file).isFile()
    ) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}/VSPACE/`;
  browser = await chromium.launch({
    executablePath:
      process.env.VSPACE_CHROMIUM ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(origin + "#settings");
  await page.getByLabel("Как тебя зовут?").fill("Сохранённый профиль");
  await page.getByRole("button", { name: "Сохранить профиль" }).click();
  await page.waitForTimeout(300);
  await page.goto(origin + "#home");
  await page.getByRole("button", { name: "Создать свой день" }).click();
  await page.getByLabel("Что планируем?").fill("Запись из старой версии");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Добавить задачу", exact: true })
    .click();
  await page.waitForTimeout(300);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.evaluate(() => {
    window.__legacyController = navigator.serviceWorker.controller;
  });
  // Keep an unsaved form open while installing: upgrading must not reload it.
  await page.getByRole("button", { name: "Создать свой день" }).click();
  await page.getByLabel("Что планируем?").fill("Несохранённый черновик");
  root = resolve("dist");
  await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    await r.update();
  });
  await page.waitForFunction(
    () => navigator.serviceWorker.controller !== window.__legacyController,
    undefined,
    { timeout: 15000 },
  );
  if (
    (await page.getByLabel("Что планируем?").inputValue()) !==
    "Несохранённый черновик"
  )
    throw Error("Upgrade unexpectedly reloaded the open form");
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", {
      name: "Выполнить: Запись из старой версии",
      exact: true,
    })
    .waitFor();
  await page.goto(origin + "#settings");
  await page.getByLabel("Электронная почта").waitFor();
  if (
    (await page.getByLabel("Как тебя зовут?").inputValue()) !==
    "Сохранённый профиль"
  )
    throw Error("Profile data lost");
  await context.setOffline(true);
  await page.reload();
  await page.getByLabel("Электронная почта").waitFor();
  if (
    (await page.getByLabel("Как тебя зовут?").inputValue()) !==
    "Сохранённый профиль"
  )
    throw Error("Offline profile lost");
  await context.setOffline(false);
  const modern = join(temp, "modern");
  cpSync(resolve("dist"), modern, { recursive: true });
  appendFileSync(
    join(modern, "sw.js"),
    "\n/* Next modern release fixture */\n",
  );
  root = modern;
  await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    await r.update();
  });
  await page.getByRole("button", { name: "Обновить", exact: true }).waitFor();
  const waiting = await page.evaluate(
    async () => !!(await navigator.serviceWorker.getRegistration()).waiting,
  );
  if (!waiting) throw Error("Modern update skipped user confirmation");
  await page.getByRole("button", { name: "Обновить", exact: true }).click();
  await page.getByLabel("Электронная почта").waitFor();
  if (
    (await page.getByLabel("Как тебя зовут?").inputValue()) !==
    "Сохранённый профиль"
  )
    throw Error("Modern update lost data");
  console.log(
    "Legacy upgrade preserved profile, task and open draft; new login/offline verified; subsequent releases still request update confirmation.",
  );
} finally {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  rmSync(temp, { recursive: true, force: true });
}
