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
  await page.goto(appUrl + "#food");
  await page
    .getByRole("button", { name: "Добавить рецепт", exact: true })
    .click();
  await page.getByLabel("Название рецепта").fill("Мой офлайн-рецепт");
  await page
    .getByLabel("Ингредиенты с количеством")
    .fill("200 г риса\n1 морковь");
  await page
    .getByLabel("Как приготовить")
    .fill("Сварить рис.\nДобавить приготовленную морковь.");
  await page
    .getByRole("button", { name: "Сохранить рецепт", exact: true })
    .click();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.waitForFunction(() =>
    document
      .querySelector(".local-badge")
      ?.textContent?.includes("Сохранено локально"),
  );
  await page.reload();
  await page.getByRole("button", { name: "Моя книга", exact: true }).click();
  await page
    .getByRole("button", { name: "Открыть рецепт: Мой офлайн-рецепт" })
    .click();
  if (!(await page.getByRole("dialog").textContent()).includes("200"))
    throw Error("Saved recipe unavailable offline");
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page
    .getByRole("button", { name: "Меню недели и покупки", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Запланировать готовку", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: "Рецепт", exact: true })
    .selectOption({ label: "Мой офлайн-рецепт" });
  await page.getByLabel("Всего порций в партии").fill("4");
  await page.getByLabel("На сколько порций исходный рецепт").fill("2");
  await page
    .getByRole("button", { name: "Сохранить готовку", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Куплено: рис, 400 г", exact: true })
    .check();
  await page.waitForFunction(() =>
    document
      .querySelector(".local-badge")
      ?.textContent?.includes("Сохранено локально"),
  );
  await page.reload();
  if (
    !(await page
      .getByRole("checkbox", { name: "Куплено: рис, 400 г", exact: true })
      .isChecked())
  )
    throw Error("Offline shopping check lost");
  await page.goto(appUrl + "#day");
  await page.getByRole("heading", { name: "Мой день.", exact: true }).waitFor();
  if (
    !(await page.locator(".day-grid").textContent()).includes(
      "Мой офлайн-рецепт",
    )
  )
    throw Error("Offline daily menu missing");
  await context.setOffline(false);
  await context.grantPermissions(["notifications"], {
    origin: new URL(appUrl).origin,
  });
  await page.goto(appUrl + "#settings");
  await page.getByLabel("Тихие часы: с", { exact: true }).fill("00:00");
  await page.getByLabel("Тихие часы: до", { exact: true }).fill("00:00");
  await page
    .getByRole("button", { name: "Новое напоминание", exact: true })
    .click();
  await page.getByLabel("О чём напомнить").fill("Тестовое напоминание");
  await page.getByLabel("Время напоминания").fill("00:00");
  await page
    .getByRole("button", { name: "Сохранить напоминание", exact: true })
    .click();
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return (await registration.getNotifications()).some(
      (n) => n.body === "Тестовое напоминание",
    );
  });
  await page.evaluate(() =>
    navigator.serviceWorker.dispatchEvent(
      new MessageEvent("message", { data: { type: "VSPACE_OPEN_DAY" } }),
    ),
  );
  await page.getByRole("heading", { name: "Мой день.", exact: true }).waitFor();
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    for (const n of await reg.getNotifications()) n.close();
  });
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    JSON.stringify({
      serviceWorkerControlled: true,
      offlineReload: true,
      offlineRecipes: recipeCount,
      offlinePosters: posters,
      offlineLifePersistence: true,
      offlineSavedRecipe: true,
      offlineWeeklyMenuAndShopping: true,
      nativeNotificationWithGrantedPermission: true,
      notificationMessageOpensMyDay: true,
      browserErrors: errors,
    }),
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
