import { test, expect } from "@playwright/test";
const meal = {
  idMeal: "52772",
  strMeal: "Chicken Handi",
  strCategory: "Chicken",
  strInstructions: "Chop the onion.\r\nCook the chicken thoroughly.",
  strIngredient1: "Chicken",
  strMeasure1: "500 g",
  strIngredient2: "Onion",
  strMeasure2: "1 large",
  strSource: "https://example.com/chicken",
};
test("internet search saves complete recipes, nutrition gaps and menu through reload", async ({
  page,
}) => {
  await page.route("https://www.themealdb.com/**", (route) =>
    route.fulfill({ json: { meals: [meal] } }),
  );
  await page.goto("/#food");
  await page
    .getByRole("button", { name: "Международный каталог", exact: true })
    .click();
  await page.getByLabel("Найти рецепт или ингредиент").fill("курица");
  await page
    .getByRole("button", { name: "Найти в каталоге", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Открыть рецепт: Chicken Handi" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("500 g");
  await expect(page.getByRole("dialog")).toContainText("Калории не указаны");
  await expect(
    page.getByRole("link", { name: /Источник: TheMealDB/ }),
  ).toHaveAttribute("href", "https://example.com/chicken");
  await page
    .getByRole("button", { name: "Сохранить в мою книгу", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Сохранить в мою книгу", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "В меню", exact: true }).click();
  await page
    .getByRole("button", { name: "В дневник питания", exact: true })
    .click();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await page.reload();
  await page.getByRole("button", { name: "Моя книга", exact: true }).click();
  await expect(page.locator(".recipe-card")).toHaveCount(1);
  await expect(page.locator(".meal-entry")).toContainText("Chicken Handi");
  await page.goto("/#life?tab=nutrition");
  await expect(page.locator(".food-log-row")).toContainText(
    "Калории не указаны",
  );
});
test("own recipes can be edited, searched, reloaded and deleted with menu cleanup on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#food");
  await page
    .getByRole("button", { name: "Добавить рецепт", exact: true })
    .click();
  await page.getByLabel("Название рецепта").fill("Тыквенный суп");
  await page
    .getByLabel("Ингредиенты с количеством")
    .fill("500 г тыквы\n1 морковь");
  await page
    .getByLabel("Как приготовить")
    .fill("Нарезать овощи.\nВарить 25 минут и измельчить.");
  await page.getByLabel("Ссылка на источник").fill("https://example.com/soup");
  await page
    .getByRole("button", { name: "Сохранить рецепт", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Изменить рецепт", exact: true })
    .click();
  await page.getByLabel("Название рецепта").fill("Тыквенный крем-суп");
  await page
    .getByRole("button", { name: "Сохранить рецепт", exact: true })
    .click();
  await page.getByRole("button", { name: "В меню", exact: true }).click();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await page.reload();
  await page.getByRole("button", { name: "Моя книга", exact: true }).click();
  await page.getByLabel("Найти рецепт или ингредиент").fill("морковь");
  await expect(page.locator(".recipe-card")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Открыть рецепт: Тыквенный крем-суп" })
    .click();
  await page
    .getByRole("button", { name: "Удалить: Тыквенный крем-суп" })
    .click();
  await page
    .getByRole("dialog", { name: "Удалить запись?" })
    .getByRole("button", { name: "Удалить", exact: true })
    .click();
  await expect(page.locator(".recipe-card")).toHaveCount(0);
  await expect(page.locator(".meal-entry")).toHaveCount(0);
});
test("catalog failure and no results leave local recipes available and web search safely encoded", async ({
  page,
}) => {
  let fail = true;
  await page.route("https://www.themealdb.com/**", (route) =>
    fail ? route.abort() : route.fulfill({ json: { meals: null } }),
  );
  await page.goto("/#food");
  await page
    .getByRole("button", { name: "Международный каталог", exact: true })
    .click();
  await page.getByLabel("Найти рецепт или ингредиент").fill("рис & овощи");
  await expect(
    page.getByRole("link", { name: "Найти в Яндексе" }),
  ).toHaveAttribute("href", /yandex.ru\/search\/\?text=/);
  await page
    .getByRole("button", { name: "Найти в каталоге", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Не удаётся подключиться",
  );
  fail = false;
  await page
    .getByRole("button", { name: "Найти в каталоге", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Найдено рецептов: 0" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Все рецепты", exact: true }).click();
  await page.getByLabel("Найти рецепт или ингредиент").fill("");
  await page.getByRole("button", { name: "Все", exact: true }).click();
  await expect(page.locator(".recipe-card")).toHaveCount(6);
});
