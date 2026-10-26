import { useState } from "react";
import { useApp, fmt } from "../context";
import { uid, shiftDate } from "../data";
import { Modal, Ring } from "../components/ui";
import { DeleteButton } from "../life/ui";
import { moneyToMinor, rubles } from "../life/stats";
import type { Features } from "./schema";
import { payRecurring } from "./finance";
export function FinancialExtras() {
  const { state, update, today, toast } = useApp();
  const [payment, setPayment] = useState<
    Features["recurring"][number] | null | undefined
  >();
  const [goal, setGoal] = useState<
    Features["savings"][number] | null | undefined
  >();
  const [add, setAdd] = useState("");
  const [error, setError] = useState("");
  const recurring = state.features.recurring;
  const savings = state.features.savings;
  const addGoal = savings.find((g) => g.id === add);
  const due = recurring.filter(
    (p) => p.enabled && p.nextDate <= shiftDate(today, 30),
  );
  return (
    <>
      <section className="panel feature-card">
        <div className="toolbar">
          <div>
            <span className="eyebrow">LESS TO KEEP IN MIND</span>
            <h3>Подписки и регулярные платежи</h3>
            <p className="field-help">
              Ежемесячные обязательства. В расход попадают только после нажатия
              «Внести оплату».
            </p>
          </div>
          <button
            className="btn"
            onClick={() => {
              setError("");
              setPayment(null);
            }}
          >
            Добавить платёж
          </button>
        </div>
        <p>
          В ближайшие 30 дней и просрочено:{" "}
          <strong>
            {rubles(due.reduce((sum, p) => sum + p.amountMinor, 0))}
          </strong>
        </p>
        {recurring.map((p) => (
          <article className="feature-list-row" key={p.id}>
            <div>
              <strong>{p.title}</strong>
              <small>
                {rubles(p.amountMinor)} · {fmt(p.nextDate)} ·{" "}
                {p.enabled ? "ежемесячно" : "приостановлено"}
              </small>
            </div>
            <div className="button-row wrap">
              <button
                className="btn"
                disabled={!p.enabled || p.nextDate > today}
                onClick={() => {
                  update((s) => payRecurring(s, p.id, p.nextDate, today));
                  toast("Оплата внесена в расходы; следующая дата обновлена");
                }}
              >
                Внести оплату
              </button>
              <button
                className="text-link"
                onClick={() => {
                  setError("");
                  setPayment(p);
                }}
              >
                Изменить
              </button>
              <DeleteButton
                title={p.title}
                onDelete={() =>
                  update((s) => ({
                    ...s,
                    features: {
                      ...s.features,
                      recurring: s.features.recurring.filter(
                        (x) => x.id !== p.id,
                      ),
                    },
                  }))
                }
              />
            </div>
          </article>
        ))}
        {!recurring.length && (
          <p className="field-help">
            Добавь подписки, аренду или другие регулярные расходы.
          </p>
        )}
      </section>
      <section className="panel feature-card">
        <div className="toolbar">
          <div>
            <span className="eyebrow">A LITTLE CLOSER</span>
            <h3>Накопления на важное</h3>
            <p className="field-help">
              Взносы учитываются отдельно от доходов и расходов: это личный
              трекер, без операций с банковским счётом.
            </p>
          </div>
          <button
            className="btn"
            onClick={() => {
              setError("");
              setGoal(null);
            }}
          >
            Новая цель накоплений
          </button>
        </div>
        <div className="life-grid">
          {savings.map((g) => {
            const sum = g.contributions.reduce((a, c) => a + c.amountMinor, 0);
            return (
              <article className="savings-card" key={g.id}>
                <div className="life-row">
                  <h4>{g.title}</h4>
                  <DeleteButton
                    title={g.title}
                    onDelete={() =>
                      update((s) => ({
                        ...s,
                        features: {
                          ...s.features,
                          savings: s.features.savings.filter(
                            (x) => x.id !== g.id,
                          ),
                        },
                      }))
                    }
                  />
                </div>
                <div className="goal-progress">
                  <Ring value={(sum / g.targetMinor) * 100} />
                  <div>
                    <strong>
                      {rubles(sum)} / {rubles(g.targetMinor)}
                    </strong>
                    <p className="field-help">
                      {sum >= g.targetMinor
                        ? "Цель достигнута!"
                        : `Осталось ${rubles(g.targetMinor - sum)}`}
                    </p>
                  </div>
                </div>
                <div className="button-row">
                  <button
                    className="btn primary"
                    onClick={() => {
                      setError("");
                      setAdd(g.id);
                    }}
                  >
                    Добавить взнос
                  </button>
                  <button
                    className="text-link"
                    onClick={() => {
                      setError("");
                      setGoal(g);
                    }}
                  >
                    Изменить цель
                  </button>
                </div>
                {g.contributions.length > 0 && (
                  <details>
                    <summary>История взносов</summary>
                    {[...g.contributions]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((c) => (
                        <div className="life-row" key={c.id}>
                          <span>
                            {fmt(c.date)} · {rubles(c.amountMinor)}
                          </span>
                          <DeleteButton
                            title={`Взнос ${rubles(c.amountMinor)}`}
                            onDelete={() =>
                              update((s) => ({
                                ...s,
                                features: {
                                  ...s.features,
                                  savings: s.features.savings.map((x) =>
                                    x.id === g.id
                                      ? {
                                          ...x,
                                          contributions: x.contributions.filter(
                                            (v) => v.id !== c.id,
                                          ),
                                        }
                                      : x,
                                  ),
                                },
                              }))
                            }
                          />
                        </div>
                      ))}
                  </details>
                )}
              </article>
            );
          })}
        </div>
      </section>
      {payment !== undefined && (
        <Modal
          title={
            payment ? "Изменить регулярный платёж" : "Новый регулярный платёж"
          }
          onClose={() => setPayment(undefined)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const f = new FormData(e.currentTarget);
                const amountMinor = moneyToMinor(String(f.get("amount")));
                if (!amountMinor) throw Error("Укажите сумму больше нуля");
                const nextDate = String(f.get("date"));
                const p = {
                  id: payment?.id || uid(),
                  title: String(f.get("title")).trim(),
                  category: String(f.get("category")).trim(),
                  nextDate,
                  amountMinor,
                  enabled: f.get("enabled") === "on",
                  anchorDay:
                    payment && payment.nextDate === nextDate
                      ? payment.anchorDay
                      : Number(nextDate.slice(-2)),
                };
                update((s) => ({
                  ...s,
                  features: {
                    ...s.features,
                    recurring: payment
                      ? s.features.recurring.map((x) =>
                          x.id === payment.id ? p : x,
                        )
                      : [...s.features.recurring, p],
                  },
                }));
                setPayment(undefined);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Проверьте сумму");
              }
            }}
          >
            <label>
              Название платежа
              <input
                name="title"
                required
                maxLength={300}
                defaultValue={payment?.title}
              />
            </label>
            <label>
              Сумма, ₽
              <input
                name="amount"
                required
                inputMode="decimal"
                defaultValue={payment ? payment.amountMinor / 100 : ""}
              />
            </label>
            <label>
              Категория расхода
              <input
                name="category"
                required
                maxLength={80}
                defaultValue={payment?.category || "Подписки"}
              />
            </label>
            <label>
              Следующая дата оплаты
              <input
                name="date"
                type="date"
                required
                defaultValue={payment?.nextDate || today}
              />
            </label>
            <label className="life-checkbox">
              <input
                name="enabled"
                type="checkbox"
                defaultChecked={payment?.enabled ?? true}
              />
              Активный платёж
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="btn primary">Сохранить платёж</button>
          </form>
        </Modal>
      )}
      {goal !== undefined && (
        <Modal
          title={goal ? "Изменить накопление" : "Цель накоплений"}
          onClose={() => setGoal(undefined)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const f = new FormData(e.currentTarget);
                const targetMinor = moneyToMinor(String(f.get("amount")));
                if (!targetMinor) throw Error("Укажите цель больше нуля");
                const item = {
                  id: goal?.id || uid(),
                  title: String(f.get("title")).trim(),
                  targetMinor,
                  contributions: goal?.contributions || [],
                };
                update((s) => ({
                  ...s,
                  features: {
                    ...s.features,
                    savings: goal
                      ? s.features.savings.map((g) =>
                          g.id === goal.id
                            ? { ...item, contributions: g.contributions }
                            : g,
                        )
                      : [...s.features.savings, item],
                  },
                }));
                setGoal(undefined);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Проверьте сумму");
              }
            }}
          >
            <label>
              На что коплю
              <input
                name="title"
                required
                maxLength={300}
                defaultValue={goal?.title}
              />
            </label>
            <label>
              Целевая сумма, ₽
              <input
                name="amount"
                required
                inputMode="decimal"
                defaultValue={goal ? goal.targetMinor / 100 : ""}
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="btn primary">Сохранить накопление</button>
          </form>
        </Modal>
      )}
      {addGoal && (
        <Modal title={`Взнос: ${addGoal.title}`} onClose={() => setAdd("")}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const f = new FormData(e.currentTarget);
                const amountMinor = moneyToMinor(String(f.get("amount")));
                if (!amountMinor) throw Error("Укажите сумму больше нуля");
                const contribution = {
                  id: uid(),
                  date: String(f.get("date")),
                  amountMinor,
                };
                update((s) => ({
                  ...s,
                  features: {
                    ...s.features,
                    savings: s.features.savings.map((g) =>
                      g.id === add
                        ? {
                            ...g,
                            contributions: [...g.contributions, contribution],
                          }
                        : g,
                    ),
                  },
                }));
                setAdd("");
                toast("Взнос сохранён");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Проверьте сумму");
              }
            }}
          >
            <label>
              Сумма взноса, ₽
              <input name="amount" required inputMode="decimal" />
            </label>
            <label>
              Дата взноса
              <input
                name="date"
                type="date"
                required
                defaultValue={today}
                max={today}
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="btn primary">Сохранить взнос</button>
          </form>
        </Modal>
      )}
    </>
  );
}
