import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
const today = "2026-10-26";
async function saveRecipe(page: Page, title: string, ingredients: string) {
  await page
    .getByRole("button", { name: "Добавить рецепт", exact: true })
    .click();
  await page.getByLabel("Название рецепта").fill(title);
  await page.getByLabel("Ингредиенты с количеством").fill(ingredients);
  await page
    .getByLabel("Как приготовить")
    .fill("Приготовить ингредиенты до готовности.");
  await page.getByLabel("На сколько порций", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Сохранить рецепт", exact: true })
    .click();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
}
test("weekly batches combine shopping quantities once, persist checks and recalculate edits", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(today + "T12:00:00Z"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#food");
  await saveRecipe(page, "Рисовая партия А", "200 г риса\n0,5 л молока");
  await saveRecipe(page, "Рисовая партия Б", "100 г риса\n250 мл молока");
  await page
    .getByRole("button", { name: "Меню недели и покупки", exact: true })
    .click();
  for (const [title, servings, date] of [
    ["Рисовая партия А", "6", today],
    ["Рисовая партия Б", "2", "2026-10-29"],
  ]) {
    await page
      .getByRole("button", { name: "Запланировать готовку", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("combobox", { name: "Рецепт", exact: true })
      .selectOption({ label: title });
    await page.getByLabel("Дата готовки").fill(date);
    await page.getByLabel("Всего порций в партии").fill(servings);
    await page
      .getByRole("button", { name: "Сохранить готовку", exact: true })
      .click();
  }
  await expect(page.locator(".shopping-items")).toContainText("700 г");
  await expect(page.locator(".shopping-items")).toContainText("1 750 мл");
  const rice = page.getByRole("checkbox", {
    name: "Куплено: рис, 700 г",
    exact: true,
  });
  await rice.check();
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await page.reload();
  await expect(rice).toBeChecked();
  await expect(page.locator(".batch-list article")).toHaveCount(2);
  await page
    .locator(".batch-list article")
    .filter({ hasText: "Рисовая партия А" })
    .getByRole("button", { name: "Приготовление", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator(".recipe-steps")).toContainText(
    "Приготовить ингредиенты до готовности",
  );
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page
    .locator(".batch-list article")
    .filter({ hasText: "Рисовая партия А" })
    .getByRole("button", { name: "Изменить", exact: true })
    .click();
  await page.getByLabel("Всего порций в партии").fill("4");
  await page
    .getByRole("button", { name: "Сохранить готовку", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Куплено: рис, 500 г", exact: true }),
  ).not.toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/#day");
  await expect(page.locator(".day-grid")).toContainText("Рисовая партия А");
});
test("my day respects challenge rest days, saves a photo and supports quick notes and global search", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(today + "T12:00:00Z"));
  await page.goto("/#habits");
  await page
    .getByRole("button", { name: "Отметить состояние", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("slider", { name: /Настроение/ })
    .fill("4");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Сохранить", exact: true })
    .click();
  await page.goto("/#day");
  await expect(page.locator(".day-feeling")).toContainText("4 / 5");
  await page.goto("/#life?tab=goals");
  await page.getByRole("button", { name: "Новая цель", exact: true }).click();
  await page.getByLabel("Моя главная цель").fill("Зал по расписанию");
  for (const day of ["Вт", "Чт", "Сб", "Вс"])
    await page.getByRole("dialog").getByLabel(day, { exact: true }).uncheck();
  await page
    .getByLabel("Фото с устройства")
    .setInputFiles("public/icon-192.png");
  await expect(
    page.getByRole("img", { name: "Выбранная обложка" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Сохранить цель", exact: true })
    .click();
  await expect(page.locator(".goal-card")).toContainText(
    "0 / 9 дней выполнено",
  );
  await expect(
    page.getByRole("checkbox", {
      name: "Зал по расписанию: 27 октября 2026 г.",
      exact: true,
    }),
  ).toBeDisabled();
  await page.goto("/#day");
  await page
    .getByRole("checkbox", { name: "Сегодня: Зал по расписанию", exact: true })
    .check();
  await expect(page.locator(".day-grid")).toContainText("1 / 9 дней");
  await page
    .getByRole("button", { name: "Быстрая запись", exact: true })
    .click();
  await page.getByRole("button", { name: "Мысль Не держать в голове" }).click();
  await page.getByLabel("Что занимает мысли?").fill("Поездка в Карелию");
  await page
    .getByRole("button", { name: "Сохранить запись", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Поиск по пространству", exact: true })
    .click();
  await page.getByLabel("Что найти?").fill("карелию");
  await page.locator(".search-results button").first().click();
  await expect(page.locator(".search-full-text")).toContainText(
    "Поездка в Карелию",
  );
  await page.getByRole("link", { name: "Открыть раздел", exact: true }).click();
  await expect(page.locator(".thought-card")).toContainText(
    "Поездка в Карелию",
  );
});
test("home layout, palette and start page remain personalized after reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#settings");
  await page.getByLabel("Приветственная карточка", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Sage", exact: true }).click();
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await page.goto("/#home");
  await expect(page.locator(".hero")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".app")).toHaveClass(/accent-sage/);
  await page.goto("/#settings");
  await page
    .getByRole("button", { name: "Вернуть все блоки", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Выше: Прогресс и показатели", exact: true })
    .click();
  await page.goto("/#home");
  await expect(page.locator("[data-home-block]").first()).toHaveAttribute(
    "data-home-block",
    "stats",
  );
  await page.goto("/#settings");
  await page
    .getByRole("combobox", { name: "Открывать при запуске", exact: true })
    .selectOption("day");
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Мой день.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Поиск по пространству", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("monthly payments are explicit and idempotent, savings track contributions", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(today + "T12:00:00Z"));
  await page.goto("/#life?tab=finance");
  await page
    .getByRole("button", { name: "Добавить платёж", exact: true })
    .click();
  await page.getByLabel("Название платежа").fill("Музыка");
  await page.getByLabel("Сумма, ₽", { exact: true }).fill("499,90");
  await page
    .getByRole("button", { name: "Сохранить платёж", exact: true })
    .click();
  await expect(page.locator(".finance-row")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Внести оплату", exact: true })
    .click();
  await expect(page.locator(".finance-row")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Внести оплату", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Новая цель накоплений", exact: true })
    .click();
  await page.getByLabel("На что коплю").fill("Отпуск");
  await page.getByLabel("Целевая сумма, ₽").fill("10000");
  await page
    .getByRole("button", { name: "Сохранить накопление", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Добавить взнос", exact: true })
    .click();
  await page.getByLabel("Сумма взноса, ₽").fill("2500");
  await page
    .getByRole("button", { name: "Сохранить взнос", exact: true })
    .click();
  await expect(page.locator(".savings-card")).toContainText("25%");
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await page.reload();
  await expect(page.locator(".finance-row")).toHaveCount(1);
  await expect(page.locator(".savings-card")).toContainText("2 500");
});
test("reminders can be snoozed, dismissed and exported to the phone calendar", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(today + "T12:00:00Z"));
  await page.goto("/#settings");
  await page
    .getByRole("button", { name: "Новое напоминание", exact: true })
    .click();
  await page.getByLabel("О чём напомнить").fill("Сделать паузу");
  await page.getByLabel("Время напоминания").fill("09:00");
  await page
    .getByRole("button", { name: "Сохранить напоминание", exact: true })
    .click();
  await expect(page.locator(".reminder-tray")).toContainText("Сделать паузу");
  await page.getByRole("button", { name: "Через 15 мин", exact: true }).click();
  await expect(page.locator(".reminder-tray")).toHaveCount(0);
  await page.clock.setFixedTime(new Date(today + "T12:16:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator(".reminder-tray")).toBeVisible();
  await page
    .locator(".reminder-tray")
    .getByRole("button", { name: "Готово", exact: true })
    .click();
  await expect(page.locator(".reminder-tray")).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "В календарь", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.ics$/);
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await page.reload();
  await expect(page.locator(".reminder-tray")).toHaveCount(0);
});
