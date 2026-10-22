import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Добр/ })).toBeVisible();
});
test("task create, edit, complete, reload, delete", async ({ page }) => {
  await page.getByRole("button", { name: "Создать свой день" }).click();
  await page.getByLabel("Что планируем?").fill("Нарисовать логотип");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Добавить задачу", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Нарисовать логотип Средний приоритет" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Нарисовать логотип Средний приоритет" })
    .click();
  await page.getByLabel("Что планируем?").fill("Собрать концепцию");
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await page
    .getByRole("button", { name: "Выполнить: Собрать концепцию", exact: true })
    .click();
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Вернуть задачу: Собрать концепцию" }),
  ).toBeVisible();
  await page.goto("/#planner");
  await page
    .getByRole("button", { name: "Удалить: Собрать концепцию", exact: true })
    .click();
  await page.getByRole("button", { name: "Удалить", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Собрать концепцию Средний приоритет" }),
  ).toHaveCount(0);
});
test("habit history persists and powers real insights", async ({ page }) => {
  await page.goto("/#habits");
  await page.getByRole("button", { name: "Новая привычка" }).click();
  await page.getByLabel("Название", { exact: true }).fill("Чтение");
  await page.getByRole("button", { name: "Сохранить привычку" }).click();
  await page.getByRole("button", { name: "Отметить", exact: true }).click();
  await expect(page.getByText("1 дн. подряд")).toBeVisible();
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Готово · сбросить" }),
  ).toBeVisible();
  await page.goto("/#insights");
  await expect(page.getByRole("img", { name: /1 привычек/ })).toBeVisible();
});
test("project checklist and links work", async ({ page }) => {
  await page.goto("/#projects");
  await page.getByRole("button", { name: "Новый проект" }).click();
  await page.getByLabel("Название", { exact: true }).fill("Новая айдентика");
  await page.getByLabel("Этапы / чек-лист").fill("Исследование\nКонцепция");
  await page.getByLabel("Ссылки на материалы").fill("https://figma.com/");
  await page.getByRole("button", { name: "Сохранить проект" }).click();
  await page
    .getByRole("button", { name: /Новая айдентика.*Без дедлайна/ })
    .click();
  await page.getByLabel("Исследование", { exact: true }).check();
  await expect(
    page.getByRole("dialog").getByText("50%", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "figma.com" })).toHaveAttribute(
    "href",
    "https://figma.com/",
  );
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await page.reload();
  await expect(page.getByText("50%", { exact: true })).toBeVisible();
});
test("recipe portions, favorites and meal plan", async ({ page }) => {
  await page.goto("/#food");
  await page
    .getByRole("button", {
      name: "Открыть рецепт: Овсянка с бананом и орехами",
    })
    .click();
  await expect(page.getByText("100 г", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Больше порций" }).click();
  await expect(page.getByText("150 г", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "В избранное", exact: true }).click();
  await page.getByRole("button", { name: "В меню", exact: true }).click();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await page.reload();
  await expect(page.locator(".meal-entry")).toContainText(
    "Овсянка с бананом и орехами",
  );
  await page.getByRole("button", { name: "Избранное", exact: true }).click();
  await expect(page.locator(".recipe-card")).toHaveCount(1);
});
test("profile export, validated import and persistence", async ({ page }) => {
  await page.goto("/#settings");
  await page.getByLabel("Как тебя зовут?").fill("Виктор");
  await page.getByRole("button", { name: "Сохранить профиль" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/vspace-.*json/);
  await page.getByLabel("Импорт резервной копии").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":5}'),
  });
  await expect(page.getByRole("alert")).toContainText("Формат данных");
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await page.reload();
  await page.goto("/#home");
  await expect(page.getByRole("heading", { name: /Виктор/ })).toBeVisible();
});
test("mobile routes fit and keyboard modal closes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "home",
    "habits",
    "planner",
    "projects",
    "food",
    "insights",
    "settings",
  ]) {
    await page.goto("/#" + route);
    await expect(page.locator("main")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.waitForTimeout(350);
    await page.screenshot({
      path: `/tmp/vspace-mobile-${route}.png`,
      fullPage: true,
    });
  }
  await page.goto("/#home");
  await page.getByRole("button", { name: "Создать свой день" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("desktop screenshot and no browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/vspace-desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("valid backup restores data after confirmation and reload", async ({
  page,
}) => {
  await page.goto("/#settings");
  const backup = {
    version: 1,
    profile: { name: "Алина", focus: "Творчество" },
    settings: {
      accent: "mint",
      theme: "forest",
      motion: "reduced",
      three: false,
    },
    tasks: [],
    habits: [
      {
        id: "import-habit",
        title: "Медитация",
        icon: "heart",
        target: 1,
        unit: "раз",
        entries: {},
      },
    ],
    projects: [],
    favorites: [],
    meals: [],
    checkins: {},
  };
  await page.getByLabel("Импорт резервной копии").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page
    .getByRole("button", { name: "Заменить данные", exact: true })
    .click();
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await page.reload();
  await page.goto("/#habits");
  await expect(
    page.getByRole("heading", { name: "Медитация", exact: true }),
  ).toBeVisible();
  await page.goto("/#home");
  await expect(page.getByRole("heading", { name: /Алина/ })).toBeVisible();
});
test("weekly planner supports rescheduling with drag and drop", async ({
  page,
}) => {
  await page.goto("/#planner");
  await page.getByRole("button", { name: "Новая задача", exact: true }).click();
  await page.getByLabel("Что планируем?").fill("Перенести встречу");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Добавить задачу", exact: true })
    .click();
  await page.getByRole("button", { name: "Неделя", exact: true }).click();
  const from = page
    .locator(".calendar-day")
    .filter({ hasText: "Перенести встречу" });
  const target = page.locator(".calendar-day").first();
  if (
    (await from.getAttribute("class")) === (await target.getAttribute("class"))
  ) {
    await from
      .locator(".task-row")
      .dragTo(page.locator(".calendar-day").last());
    await expect(page.locator(".calendar-day").last()).toContainText(
      "Перенести встречу",
    );
  } else {
    await from.locator(".task-row").dragTo(target);
    await expect(target).toContainText("Перенести встречу");
  }
});

test("overdue tasks are visible and can be moved to today", async ({
  page,
}) => {
  await page.goto("/#planner");
  await page.getByRole("button", { name: "Новая задача", exact: true }).click();
  await page.getByLabel("Что планируем?").fill("Не забыть старую идею");
  await page.getByLabel("Дата", { exact: true }).fill("2020-01-10");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Добавить задачу", exact: true })
    .click();
  await expect(page.locator(".overdue-panel")).toContainText(
    "Не забыть старую идею",
  );
  await page
    .getByRole("button", {
      name: "На сегодня: Не забыть старую идею",
      exact: true,
    })
    .click();
  await expect(page.locator(".overdue-panel")).toHaveCount(0);
  await expect(page.locator(".calendar-day")).toContainText(
    "Не забыть старую идею",
  );
  await expect(
    page.getByRole("status").filter({ hasText: "Сохранено локально" }),
  ).toBeVisible();
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await page.reload();
  await expect(page.locator(".calendar-day")).toContainText(
    "Не забыть старую идею",
  );
});

test("stale tabs cannot overwrite saved profile data", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await other.goto("/#settings");
  await other.getByLabel("Как тебя зовут?").waitFor();
  await page.goto("/#settings");
  await page.getByLabel("Как тебя зовут?").fill("Сохранённый профиль");
  await page.getByRole("button", { name: "Сохранить профиль" }).click();
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await other.getByLabel("Как тебя зовут?").fill("Устаревший профиль");
  await other.getByRole("button", { name: "Сохранить профиль" }).click();
  await expect(other.getByRole("alert")).toContainText("в другой вкладке");
  await expect(other.locator(".local-badge")).toHaveText("Не сохранено");
  const downloadPromise = other.waitForEvent("download");
  await other.getByRole("button", { name: "Экспорт JSON" }).click();
  await downloadPromise;
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await page.reload();
  await expect(page.getByLabel("Как тебя зовут?")).toHaveValue(
    "Сохранённый профиль",
  );
  await other.close();
});

test("wellbeing trends use recorded values and leave gaps for missing days", async ({
  page,
}) => {
  await page.goto("/#habits");
  await page.getByRole("button", { name: "Отметить состояние" }).click();
  await page.getByLabel("Сон (часов)").fill("7.5");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Сохранить", exact: true })
    .click();
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await page.goto("/#insights");
  await expect(
    page.getByRole("img", { name: /Сон: среднее 7.5 ч, записей 1/ }),
  ).toBeVisible();
  await expect(page.locator(".wellbeing-chart circle")).toHaveCount(1);
  await expect(page.locator(".wellbeing-chart polyline")).toHaveCount(0);
  await page.getByRole("button", { name: "Настроение", exact: true }).click();
  await expect(
    page.getByRole("img", { name: /Настроение: среднее 3.0/ }),
  ).toBeVisible();
  await page.getByText("Записи самочувствия текстом").click();
  await expect(page.locator(".wellbeing-panel details")).toContainText(
    "Нет записи",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.waitForTimeout(350);
  await page.screenshot({
    path: "/tmp/vspace-wellbeing-mobile.png",
    fullPage: true,
  });
});

test("unreadable stored data is preserved and editing is blocked", async ({
  page,
}) => {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("vspace", 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("universe", "readwrite");
          tx.objectStore("universe").put({ broken: "preserve-me" }, "state");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Сохраним твоё пространство." }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "оставлены без изменений",
  );
  await expect(
    page.getByRole("button", { name: "Создать свой день" }),
  ).toHaveCount(0);
  const data = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("vspace", 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("universe", "readonly");
          const record = tx.objectStore("universe").get("state");
          record.onsuccess = () => resolve(record.result);
          record.onerror = () => reject(record.error);
          tx.oncomplete = () => db.close();
        };
      }),
  );
  expect(data).toEqual({ broken: "preserve-me" });
});
