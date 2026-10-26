import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function open(page: Page, tab: string) {
  await page.goto(`/#life?tab=${tab}`);
  await expect(
    page.getByRole("heading", { name: "Моя жизнь.", exact: true }),
  ).toBeVisible();
}
async function saved(page: Page) {
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
}
test("weekly priorities, shared tasks, goals and journals survive reload", async ({
  page,
}) => {
  await open(page, "week");
  await page
    .getByLabel("Приоритет недели", { exact: true })
    .fill("Позаботиться о себе");
  await page
    .getByRole("button", { name: "Добавить приоритет", exact: true })
    .click();
  await page.getByLabel("Позаботиться о себе", { exact: true }).check();
  await page.getByLabel("На чём хочу сосредоточиться?").fill("Меньше спешить");
  await page
    .getByRole("button", { name: "Сохранить неделю", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Добавить задачу на/ })
    .first()
    .click();
  await page.getByLabel("Что планируем?").fill("Записаться на йогу");
  await page
    .getByRole("button", { name: "Добавить задачу", exact: true })
    .click();
  await expect(page.locator(".week-days")).toContainText("Записаться на йогу");
  await saved(page);
  await page.reload();
  await expect(
    page.getByLabel("Позаботиться о себе", { exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("На чём хочу сосредоточиться?")).toHaveValue(
    "Меньше спешить",
  );
  await page
    .getByRole("navigation", { name: "Разделы моей жизни" })
    .getByRole("button", { name: "21 / 90 дней" })
    .click();
  await page.getByRole("button", { name: "Новая цель", exact: true }).click();
  await page.getByLabel("Моя главная цель").fill("Вернуться к рисованию");
  await page
    .getByRole("combobox", { name: "Период", exact: true })
    .selectOption("90");
  await page.getByLabel("Новый шаг").fill("Купить скетчбук");
  await page.getByRole("button", { name: "Добавить шаг", exact: true }).click();
  await page.getByLabel("Новый шаг").fill("Нарисовать первый этюд");
  await page
    .getByRole("button", { name: "Сохранить цель", exact: true })
    .click();
  await page.getByLabel("Купить скетчбук", { exact: true }).check();
  await expect(page.locator(".goal-card")).toContainText("50% шагов");
  await saved(page);
  await page.reload();
  await expect(
    page.getByLabel("Купить скетчбук", { exact: true }),
  ).toBeChecked();
  await open(page, "psychology");
  await page
    .getByRole("button", { name: "Записать день", exact: true })
    .click();
  await page.getByRole("button", { name: "Хороший", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("slider", { name: /Напряжение/ })
    .fill("2");
  await page
    .getByLabel("За что я благодарна / благодарен?")
    .fill("За тихое утро");
  await page
    .getByRole("button", { name: "Сохранить дневник", exact: true })
    .click();
  await expect(page.locator(".journal-entry")).toContainText("Настроение 4/5");
  await saved(page);
  await page.reload();
  await expect(page.locator(".journal-entry")).toContainText("За тихое утро");
  await page
    .getByRole("button", { name: "Разобрать мысли", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Выгрузить мысль", exact: true })
    .click();
  await page.getByLabel("Что занимает голову?").fill("Позвонить другу");
  await page
    .getByRole("button", { name: "Сохранить мысль", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Изменить мысль", exact: true })
    .click();
  await page.getByLabel("Что занимает голову?").fill("Позвонить другу вечером");
  await page
    .getByRole("button", { name: "Сохранить мысль", exact: true })
    .click();
  await expect(page.locator(".thought-card")).toHaveCount(1);
  await page
    .getByLabel("Категория мысли: Позвонить другу вечером")
    .selectOption("do");
  await page.getByRole("button", { name: "В задачу", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "В планере", exact: true }),
  ).toBeDisabled();
  await page.goto("/#planner");
  await expect(page.locator("main")).toContainText("Позвонить другу");
});
test("financial kopecks, budgets, edits and deletion update totals", async ({
  page,
}) => {
  await open(page, "finance");
  await page
    .getByRole("button", { name: "Новая операция", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Тип", exact: true })
    .selectOption("income");
  await page.getByLabel("Сумма, ₽").fill("10000,10");
  await page
    .getByRole("combobox", { name: "Категория", exact: true })
    .fill("Зарплата");
  await page
    .getByRole("button", { name: "Сохранить операцию", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Новая операция", exact: true })
    .click();
  await page.getByLabel("Сумма, ₽").fill("250,20");
  await page
    .getByRole("button", { name: "Сохранить операцию", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Задать бюджет", exact: true })
    .click();
  await page.getByLabel("Лимит расходов, ₽").fill("1000");
  await page
    .getByRole("button", { name: "Сохранить бюджет", exact: true })
    .click();
  await expect(
    page.locator(".life-metric").filter({ hasText: "Осталось от бюджета" }),
  ).toContainText("749,80");
  await saved(page);
  await page.reload();
  await expect(page.locator(".finance-row")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Редактировать операцию Продукты" })
    .click();
  await page.getByLabel("Сумма, ₽").fill("500");
  await page
    .getByRole("button", { name: "Сохранить операцию", exact: true })
    .click();
  await expect(
    page.locator(".life-metric").filter({ hasText: "Осталось от бюджета" }),
  ).toContainText("500");
  await page.getByRole("button", { name: /Удалить: Продукты/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Удалить", exact: true })
    .click();
  await expect(page.locator(".finance-row")).toHaveCount(1);
  await expect(
    page.locator(".life-metric").filter({ hasText: "Расходы за месяц" }),
  ).toContainText("0");
});
test("nutrition, activity, balance and inspiration persist and remain usable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "nutrition");
  await page
    .getByRole("button", { name: "Записать приём пищи", exact: true })
    .click();
  await page.getByLabel("Блюдо", { exact: true }).fill("Овощной суп");
  await page.getByLabel("Калории, ккал", { exact: true }).fill("180");
  await page.getByLabel("Белки, г", { exact: true }).fill("8");
  await page
    .getByRole("button", { name: "Сохранить блюдо", exact: true })
    .click();
  await page.getByRole("button", { name: "+ 250 мл", exact: true }).click();
  await page.getByRole("button", { name: "+ 250 мл", exact: true }).click();
  await saved(page);
  await page.reload();
  await expect(page.locator(".water-count")).toContainText("0,5");
  await expect(page.locator(".food-diary")).toContainText("Овощной суп");
  await expect(
    page.locator(".life-metric").filter({ hasText: "Жиры, г" }),
  ).toContainText("—");
  await open(page, "balance");
  for (const label of [
    "Здоровье",
    "Работа и учёба",
    "Финансы",
    "Личное развитие",
    "Отношения",
    "Отдых и хобби",
  ])
    await page.getByLabel(`Оценка: ${label}`, { exact: true }).fill("7");
  await page
    .getByRole("button", { name: "Сохранить баланс", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: /Баланс сфер жизни:/ }),
  ).toBeVisible();
  await saved(page);
  await page.reload();
  await expect(
    page.getByLabel("Оценка: Здоровье", { exact: true }),
  ).toHaveValue("7");
  await open(page, "inspiration");
  await page.getByRole("button", { name: "Своя фраза", exact: true }).click();
  await page.getByLabel("Текст фразы").fill("Сегодня я выбираю себя");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Сохранить фразу", exact: true })
    .click();
  await expect(
    page.locator(".quote-card").filter({ hasText: "Сегодня я выбираю себя" }),
  ).toBeVisible();
  await page
    .locator(".poster-card")
    .first()
    .getByRole("button", { name: "В обзор", exact: true })
    .click();
  await saved(page);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Выбрана ✓", exact: true }),
  ).toHaveCount(1);
  await open(page, "overview");
  await page
    .getByRole("button", { name: "Записать активность", exact: true })
    .click();
  await page.getByLabel("Тренировка, минут").fill("35");
  await page
    .getByRole("button", { name: "Сохранить активность", exact: true })
    .click();
  await expect(
    page.locator(".life-metric").filter({ hasText: "Движение" }),
  ).toContainText("35 мин");
  await expect(page.locator(".overview-poster img")).toBeVisible();
  for (const tab of [
    "overview",
    "week",
    "goals",
    "psychology",
    "balance",
    "nutrition",
    "finance",
    "inspiration",
  ]) {
    await open(page, tab);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test("recipe records only explicitly consumed one-portion nutrition", async ({
  page,
}) => {
  await page.goto("/#food");
  await page
    .getByRole("button", {
      name: "Открыть рецепт: Овсянка с бананом и орехами",
    })
    .click();
  await page.getByRole("button", { name: "В меню", exact: true }).click();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await open(page, "nutrition");
  await expect(page.locator(".food-log-row")).toHaveCount(0);
  await page.goto("/#food");
  await page
    .getByRole("button", {
      name: "Открыть рецепт: Овсянка с бананом и орехами",
    })
    .click();
  await page
    .getByRole("button", { name: "В дневник: 1 порция", exact: true })
    .click();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await open(page, "nutrition");
  await expect(page.locator(".food-log-row")).toHaveCount(1);
  await expect(page.locator(".food-log-row")).toContainText("≈");
});

test("daily challenge calendar and ring persist independently from steps for 21 and 90 days", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-26T12:00:00Z"));
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "goals");
  await page.getByRole("button", { name: "Новая цель", exact: true }).click();
  await page.getByLabel("Моя главная цель").fill("Читать каждый вечер");
  await page.getByLabel("Дата старта").fill("2026-10-25");
  await page.getByLabel("Новый шаг").fill("Выбрать книгу");
  await page
    .getByRole("button", { name: "Сохранить цель", exact: true })
    .click();
  const card = page
    .locator(".goal-card")
    .filter({ hasText: "Читать каждый вечер" });
  await expect(card.locator(".challenge-day")).toHaveCount(21);
  const yesterday = card.getByRole("checkbox", {
    name: "Читать каждый вечер: 25 октября 2026 г.",
    exact: true,
  });
  const today = card.getByRole("checkbox", {
    name: "Читать каждый вечер: 26 октября 2026 г.",
    exact: true,
  });
  await yesterday.check();
  await today.check();
  await expect(
    card.getByRole("checkbox", {
      name: "Читать каждый вечер: 27 октября 2026 г.",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(card.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "10",
  );
  await expect(card).toContainText("2 / 21 дней выполнено");
  await card.getByLabel("Выбрать книгу", { exact: true }).check();
  await expect(card.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "10",
  );
  await card
    .getByRole("button", { name: "Изменить цель", exact: true })
    .click();
  await page.getByLabel("Зачем мне это?").fill("Моё время для себя");
  await page
    .getByRole("button", { name: "Сохранить цель", exact: true })
    .click();
  await saved(page);
  await page.reload();
  await expect(yesterday).toBeChecked();
  await expect(today).toBeChecked();
  await expect(card.getByLabel("Выбрать книгу", { exact: true })).toBeChecked();
  await yesterday.uncheck();
  await saved(page);
  await page.reload();
  await expect(yesterday).not.toBeChecked();
  await expect(today).toBeChecked();
  await expect(card.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "5",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Новая цель", exact: true }).click();
  await page.getByLabel("Моя главная цель").fill("Двигаться 90 дней");
  await page
    .getByRole("combobox", { name: "Период", exact: true })
    .selectOption("90");
  await page
    .getByRole("button", { name: "Сохранить цель", exact: true })
    .click();
  const long = page
    .locator(".goal-card")
    .filter({ hasText: "Двигаться 90 дней" });
  await expect(long.locator(".challenge-day")).toHaveCount(90);
  await long.locator(".challenge-day input:not(:disabled)").first().check();
  await expect(long.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
  await expect(long).toContainText("1 / 90 дней выполнено");
  await open(page, "overview");
  await expect(
    page.locator(".life-goal-link").filter({ hasText: "Читать каждый вечер" }),
  ).toContainText("1 / 21 дней");
});
