import { test, expect } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import { initialState } from "../../src/data";
import type { AppState } from "../../src/data";
const host = "https://vspace-test.supabase.co";
const ids: Record<string, string> = {
  "one@example.test": "00000000-0000-0000-0000-000000000001",
  "two@example.test": "00000000-0000-0000-0000-000000000002",
};
function jwt(id: string) {
  return (
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ) +
    "." +
    Buffer.from(
      JSON.stringify({
        sub: id,
        exp: Math.floor(Date.now() / 1000) + 3600,
        role: "authenticated",
        aud: "authenticated",
      }),
    ).toString("base64url") +
    ".test-signature"
  );
}
class MockCloud {
  rows = new Map<string, { data: AppState; revision: number }>();
  online = true;
  async install(context: BrowserContext, network = { online: true }) {
    await context.route("**/cloud-config.json", (r) =>
      r.fulfill({
        json: { url: host, publishableKey: "sb_publishable_test_public_key" },
      }),
    );
    await context.route(host + "/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      const headers = {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
      };
      if (!this.online || !network.online) {
        await route.abort("internetdisconnected");
        return;
      }
      if (req.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers });
        return;
      }
      if (url.pathname === "/auth/v1/token") {
        const email = req.postDataJSON().email;
        const id = ids[email];
        if (!id) {
          await route.fulfill({
            status: 400,
            json: {
              error: "invalid_grant",
              error_description: "Invalid login credentials",
            },
            headers,
          });
          return;
        }
        await route.fulfill({
          json: {
            access_token: jwt(id),
            refresh_token: "test-refresh-" + id,
            token_type: "bearer",
            expires_in: 3600,
            user: {
              id,
              email,
              aud: "authenticated",
              role: "authenticated",
              created_at: "2026-10-22T00:00:00Z",
            },
          },
          headers,
        });
        return;
      }
      if (url.pathname === "/auth/v1/logout") {
        await route.fulfill({ status: 204, headers });
        return;
      }
      const auth = req.headers().authorization || "";
      let id = "";
      try {
        id = JSON.parse(
          Buffer.from(auth.split(".")[1], "base64url").toString(),
        ).sub;
      } catch {}
      if (!Object.values(ids).includes(id)) {
        await route.fulfill({
          status: 401,
          json: { message: "unauthorized" },
          headers,
        });
        return;
      }
      if (url.pathname === "/rest/v1/vspace_workspaces") {
        if (url.searchParams.get("user_id") !== "eq." + id) {
          await route.fulfill({ json: [], headers });
          return;
        }
        await route.fulfill({
          json: this.rows.has(id) ? [this.rows.get(id)] : [],
          headers,
        });
        return;
      }
      if (url.pathname === "/rest/v1/rpc/save_vspace_workspace") {
        const body = req.postDataJSON();
        const row = this.rows.get(id);
        if ((row?.revision || 0) !== body.p_expected_revision) {
          await route.fulfill({
            status: 409,
            json: { code: "40001", message: "Workspace revision conflict" },
            headers,
          });
          return;
        }
        const revision = (row?.revision || 0) + 1;
        this.rows.set(id, { data: body.p_data, revision });
        await route.fulfill({ json: revision, headers });
        return;
      }
      await route.fulfill({
        status: 404,
        json: { message: "unknown test endpoint" },
        headers,
      });
    });
  }
}
async function login(page: Page, email = "one@example.test") {
  await page.goto("/#settings");
  await page.getByLabel("Электронная почта").fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill("test-password-123");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.locator(".account-identity")).toContainText(email);
  await synced(page);
}
async function synced(page: Page) {
  await expect(page.locator(".local-badge")).toHaveText("Синхронизировано", {
    timeout: 10000,
  });
}
async function addTask(page: Page, title: string) {
  await page.goto("/#planner");
  await page.getByRole("button", { name: "Новая задача", exact: true }).click();
  await page.getByLabel("Что планируем?").fill(title);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Добавить задачу", exact: true })
    .click();
}

test("two isolated devices share records through the cloud and preserve offline additions", async ({
  browser,
}) => {
  const server = new MockCloud();
  const desktop = await browser.newContext(),
    mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
  await server.install(desktop);
  await server.install(mobile);
  const a = await desktop.newPage(),
    b = await mobile.newPage();
  await login(a);
  await login(b);
  expect(
    await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await b.screenshot({
    path: "/tmp/vspace-account-mobile.png",
    fullPage: true,
  });
  await addTask(a, "Задача с компьютера");
  await synced(a);
  await b
    .getByRole("button", { name: "Синхронизировать", exact: true })
    .click();
  await synced(b);
  await b.goto("/#planner");
  await expect(b.locator("section.calendar-day")).toContainText(
    "Задача с компьютера",
  );
  server.online = false;
  await addTask(b, "Запись без сети");
  await expect(b.locator(".local-badge")).toHaveText("Сохранено на устройстве");
  await expect
    .poll(() => server.rows.get(ids["one@example.test"])?.data.tasks.length)
    .toBe(1);
  server.online = true;
  await b.goto("/#settings");
  await b
    .getByRole("button", { name: "Синхронизировать", exact: true })
    .click();
  await synced(b);
  await a.goto("/#settings");
  await a
    .getByRole("button", { name: "Синхронизировать", exact: true })
    .click();
  await synced(a);
  await a.goto("/#planner");
  await expect(a.locator("section.calendar-day")).toContainText(
    "Запись без сети",
  );
  await b.reload();
  await synced(b);
  await expect(b.locator(".account-identity")).toContainText(
    "one@example.test",
  );
  expect(server.rows.get(ids["one@example.test"])?.data.tasks).toHaveLength(2);
  await desktop.close();
  await mobile.close();
});

test("guest records require explicit transfer and switching accounts isolates caches", async ({
  context,
  page,
}) => {
  const server = new MockCloud();
  await server.install(context);
  await page.goto("/");
  await addTask(page, "Личная локальная запись");
  await expect(page.locator(".local-badge")).toHaveText("Сохранено локально");
  await login(page);
  expect(server.rows.size).toBe(0);
  await page
    .getByRole("button", { name: "Перенести локальные записи" })
    .click();
  await page
    .getByRole("button", { name: "Заменить данные аккаунта", exact: true })
    .click();
  await synced(page);
  expect(server.rows.get(ids["one@example.test"])?.data.tasks[0].title).toBe(
    "Личная локальная запись",
  );
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await page.getByRole("button", { name: "Выйти на этом устройстве" }).click();
  await page.getByLabel("Электронная почта").waitFor();
  await login(page, "two@example.test");
  await page.goto("/#planner");
  await expect(
    page.getByRole("button", {
      name: "Личная локальная запись Средний приоритет",
    }),
  ).toHaveCount(0);
  expect(server.rows.has(ids["two@example.test"])).toBe(false);
});

test("same-record conflicts offer a version choice instead of overwriting", async ({
  browser,
}) => {
  const server = new MockCloud();
  const today = new Date().toLocaleDateString("sv-SE");
  server.rows.set(ids["one@example.test"], {
    data: {
      ...structuredClone(initialState),
      tasks: [
        {
          id: "shared",
          title: "Исходная задача",
          date: today,
          done: false,
          completedAt: null,
          priority: "medium",
          repeat: "none",
        },
      ],
    },
    revision: 1,
  });
  const ca = await browser.newContext(),
    cb = await browser.newContext();
  const networkA = { online: true };
  await server.install(ca, networkA);
  await server.install(cb);
  const a = await ca.newPage(),
    b = await cb.newPage();
  await login(a);
  await login(b);
  async function rename(p: Page, title: string) {
    await p.goto("/#planner");
    await p
      .getByRole("button", { name: "Исходная задача Средний приоритет" })
      .click();
    await p.getByLabel("Что планируем?").fill(title);
    await p.getByRole("button", { name: "Сохранить изменения" }).click();
  }
  networkA.online = false;
  await rename(a, "Моя версия");
  await expect(a.locator(".local-badge")).toHaveText("Сохранено на устройстве");
  await rename(b, "Версия телефона");
  await synced(b);
  networkA.online = true;
  await a.goto("/#settings");
  await a.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(
    a.getByText("Нужно выбрать версию", { exact: true }),
  ).toBeVisible();
  await a.getByRole("button", { name: "Взять правки из облака" }).click();
  await synced(a);
  await a.goto("/#planner");
  await expect(a.locator("section.calendar-day")).toContainText(
    "Версия телефона",
  );
  await ca.close();
  await cb.close();
});

test("life nutrition, journals and finance synchronize across computer and phone including offline entries", async ({
  browser,
}) => {
  const server = new MockCloud();
  const desktop = await browser.newContext();
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const phoneNetwork = { online: true };
  await server.install(desktop);
  await server.install(mobile, phoneNetwork);
  const a = await desktop.newPage(),
    b = await mobile.newPage();
  await login(a);
  await login(b);
  await a.goto("/#life?tab=finance");
  await a.getByRole("button", { name: "Новая операция", exact: true }).click();
  await a.getByLabel("Сумма, ₽").fill("123,45");
  await a
    .getByRole("button", { name: "Сохранить операцию", exact: true })
    .click();
  await synced(a);
  await b.goto("/#settings");
  await b
    .getByRole("button", { name: "Синхронизировать", exact: true })
    .click();
  await synced(b);
  await b.goto("/#life?tab=finance");
  await expect(b.locator(".finance-row")).toContainText("123,45");
  phoneNetwork.online = false;
  await b.goto("/#life?tab=nutrition");
  await b.getByRole("button", { name: "+ 250 мл", exact: true }).click();
  await expect(b.locator(".local-badge")).toHaveText("Сохранено на устройстве");
  await a.goto("/#life?tab=psychology");
  await a.getByRole("button", { name: "Записать день", exact: true }).click();
  await a.getByLabel("Один бережный шаг для себя").fill("Прогуляться у воды");
  await a
    .getByRole("button", { name: "Сохранить дневник", exact: true })
    .click();
  await synced(a);
  phoneNetwork.online = true;
  await b.goto("/#settings");
  await b
    .getByRole("button", { name: "Синхронизировать", exact: true })
    .click();
  await synced(b);
  await b.goto("/#life?tab=psychology");
  await expect(b.locator(".journal-entry")).toContainText("Прогуляться у воды");
  await a.goto("/#settings");
  await a
    .getByRole("button", { name: "Синхронизировать", exact: true })
    .click();
  await synced(a);
  await a.goto("/#life?tab=nutrition");
  await expect(a.locator(".water-count")).toContainText("0,25");
  const cloud = server.rows.get(ids["one@example.test"])!.data;
  expect(cloud.life.transactions[0].amountMinor).toBe(12345);
  expect(Object.values(cloud.life.water)).toEqual([250]);
  expect(Object.values(cloud.life.journal)[0].tinyStep).toBe(
    "Прогуляться у воды",
  );
  await desktop.close();
  await mobile.close();
});
