import { FinancialExtras } from "../features/FinancialExtras";
import { hashParam } from "../features/navigation";
import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import {
  Plus,
  Pencil,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
} from "lucide-react";
import { useApp, fmt } from "../context";
import { uid } from "../data";
import { Modal, Empty, SectionHead } from "../components/ui";
import { Metric, DeleteButton, Trend } from "./ui";
import { financeStats, moneyToMinor, rubles } from "./stats";
import type { Transaction } from "./schema";
const categories = [
  "Продукты",
  "Кафе",
  "Жильё",
  "Транспорт",
  "Здоровье",
  "Образование",
  "Покупки",
  "Развлечения",
  "Подарки",
  "Другое",
];
export function TransactionForm({
  transaction,
  date,
  onClose,
}: {
  transaction?: Transaction;
  date: string;
  onClose: () => void;
}) {
  const { update, toast } = useApp();
  const [error, setError] = useState("");
  const [type, setType] = useState(transaction?.type || "expense");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const amountMinor = moneyToMinor(String(f.get("amount")));
      if (amountMinor <= 0) throw Error("Сумма должна быть больше нуля");
      const item: Transaction = {
        id: transaction?.id || uid(),
        date: String(f.get("date")),
        type,
        amountMinor,
        category: String(f.get("category")).trim(),
        note: String(f.get("note")).trim(),
      };
      if (!item.category) return;
      update((s) => ({
        ...s,
        life: {
          ...s.life,
          transactions: transaction
            ? s.life.transactions.map((t) => (t.id === item.id ? item : t))
            : [...s.life.transactions, item],
        },
      }));
      toast("Операция сохранена");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Проверьте сумму");
    }
  }
  return (
    <Modal
      title={transaction ? "Изменить операцию" : "Новая финансовая запись"}
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        <label>
          Тип
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
          >
            <option value="expense">Расход</option>
            <option value="income">Доход</option>
          </select>
        </label>
        <div className="form-grid">
          <label>
            Сумма, ₽
            <input
              name="amount"
              inputMode="decimal"
              required
              maxLength={20}
              defaultValue={
                transaction ? (transaction.amountMinor / 100).toFixed(2) : ""
              }
              placeholder="0,00"
            />
          </label>
          <label>
            Дата
            <input
              name="date"
              type="date"
              defaultValue={transaction?.date || date}
              required
            />
          </label>
        </div>
        <label>
          Категория
          <input
            name="category"
            list="finance-categories"
            defaultValue={
              transaction?.category ||
              (type === "income" ? "Зарплата" : "Продукты")
            }
            required
            maxLength={80}
          />
          <datalist id="finance-categories">
            {[...categories, "Зарплата", "Фриланс", "Возврат"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </datalist>
        </label>
        <label>
          Комментарий
          <textarea
            name="note"
            maxLength={500}
            rows={2}
            defaultValue={transaction?.note}
          />
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="btn primary">Сохранить операцию</button>
      </form>
    </Modal>
  );
}
export function Finance() {
  const { state, update, today, toast } = useApp();
  const [month, setMonth] = useState(() => {
    const month = hashParam("month");
    return month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
      ? month
      : today.slice(0, 7);
  });
  useEffect(() => {
    const handler = () => {
      const month = hashParam("month");
      if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) setMonth(month);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<Transaction | null>();
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetError, setBudgetError] = useState("");
  const stats = financeStats(state.life.transactions, month);
  const budget = state.life.budgets[month];
  const records = stats.records
    .filter(
      (t) =>
        (filter === "all" || t.type === filter) &&
        (t.category + " " + t.note).toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const daysInMonth = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5)),
    0,
  ).getDate();
  const spending = Array.from({ length: daysInMonth }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, "0")}`;
    const entries = stats.records.filter(
      (t) => t.date === date && t.type === "expense",
    );
    return {
      date,
      value: entries.length
        ? entries.reduce((s, t) => s + t.amountMinor, 0) / 100
        : null,
    };
  });
  return (
    <>
      <div className="life-section-intro">
        <div>
          <span className="eyebrow">MONEY WITH INTENTION</span>
          <h2>Деньги — без тумана.</h2>
          <p>Записывай доходы и расходы. Находи место для важного.</p>
        </div>
        <button className="btn primary" onClick={() => setEdit(null)}>
          <Plus size={17} /> Новая операция
        </button>
      </div>
      <div className="toolbar">
        <input
          type="month"
          aria-label="Месяц финансов"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
        />
        <button className="btn" onClick={() => setBudgetOpen(true)}>
          <Wallet size={15} />
          {budget === undefined ? "Задать бюджет" : "Изменить бюджет"}
        </button>
      </div>
      <div className="life-metrics">
        <Metric
          label="Доходы за месяц"
          value={rubles(stats.income)}
          color="#39e6a2"
        />
        <Metric label="Расходы за месяц" value={rubles(stats.expense)} />
        <Metric
          label="Разница доходов и расходов"
          value={rubles(stats.balance)}
          note="Не равна балансу банковского счёта"
        />
        <Metric
          label="Осталось от бюджета"
          value={budget === undefined ? "—" : rubles(budget - stats.expense)}
          note={
            budget === undefined
              ? "Установите собственный лимит"
              : `Лимит: ${rubles(budget)}`
          }
          color={
            budget !== undefined && stats.expense > budget
              ? "#efaf9e"
              : undefined
          }
        />
      </div>
      <div className="life-two">
        <section className="panel">
          <SectionHead index="01" title="Куда уходят деньги" />
          {stats.categories.length ? (
            <div className="category-breakdown">
              {stats.categories.map(([category, amount], i) => (
                <div key={category}>
                  <div>
                    <span>
                      <i
                        style={{
                          background: [
                            "#b7ff36",
                            "#8664ff",
                            "#39e6a2",
                            "#e8b478",
                            "#edb5c7",
                            "#c2f4ff",
                          ][i % 6],
                        }}
                      />
                      {category}
                    </span>
                    <strong>
                      {rubles(amount)}{" "}
                      <small>
                        {Math.round((amount / stats.expense) * 100)}%
                      </small>
                    </strong>
                  </div>
                  <div className="progress-track">
                    <span
                      style={{ width: `${(amount / stats.expense) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Пока без расходов"
              description="Распределение появится по вашим финансовым записям."
            />
          )}
        </section>
        <section className="panel">
          <SectionHead index="02" title="Расходы по дням" />
          <Trend
            values={spending}
            label="Сумма расходов по дням месяца"
            unit="₽"
          />
          {budget !== undefined && (
            <div className="budget-progress">
              <span>
                Использовано{" "}
                {budget > 0
                  ? `${Math.round((stats.expense / budget) * 100)}%`
                  : rubles(stats.expense)}
              </span>
              <div className="progress-track">
                <span
                  style={{
                    width: `${budget > 0 ? Math.min(100, (stats.expense / budget) * 100) : stats.expense ? 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
        </section>
      </div>
      <section className="panel">
        <SectionHead index="03" title="История операций" />
        <div className="toolbar">
          <div className="segmented">
            {[
              ["all", "Все"],
              ["expense", "Расходы"],
              ["income", "Доходы"],
            ].map(([v, l]) => (
              <button
                key={v}
                className={filter === v ? "active" : ""}
                onClick={() => setFilter(v)}
              >
                {l}
              </button>
            ))}
          </div>
          <input
            placeholder="Категория или комментарий"
            aria-label="Поиск операций"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {records.length ? (
          <div className="finance-records">
            {records.map((t) => (
              <div
                className="finance-row"
                key={t.id}
                id={"transaction-" + t.id}
                tabIndex={-1}
              >
                <div className={`finance-icon ${t.type}`}>
                  {t.type === "income" ? (
                    <ArrowDownLeft size={18} />
                  ) : (
                    <ArrowUpRight size={18} />
                  )}
                </div>
                <button
                  className="finance-description"
                  onClick={() => setEdit(t)}
                >
                  <strong>{t.category}</strong>
                  <small>
                    {fmt(t.date)}
                    {t.note ? ` · ${t.note}` : ""}
                  </small>
                </button>
                <strong className={t.type === "income" ? "mint-text" : ""}>
                  {t.type === "income" ? "+" : "−"}
                  {rubles(t.amountMinor)}
                </strong>
                <button
                  className="icon-btn"
                  aria-label={`Редактировать операцию ${t.category}`}
                  onClick={() => setEdit(t)}
                >
                  <Pencil size={14} />
                </button>
                <DeleteButton
                  title={`${t.category}: ${rubles(t.amountMinor)}`}
                  onDelete={() =>
                    update((s) => ({
                      ...s,
                      life: {
                        ...s.life,
                        transactions: s.life.transactions.filter(
                          (x) => x.id !== t.id,
                        ),
                      },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Нет операций"
            description="Добавьте запись или измените фильтр."
          />
        )}
      </section>
      <FinancialExtras />
      {edit !== undefined && (
        <TransactionForm
          transaction={edit || undefined}
          date={month === today.slice(0, 7) ? today : month + "-01"}
          onClose={() => setEdit(undefined)}
        />
      )}{" "}
      {budgetOpen && (
        <Modal title="Бюджет на месяц" onClose={() => setBudgetOpen(false)}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const limit = moneyToMinor(
                  String(new FormData(e.currentTarget).get("budget")),
                );
                update((s) => ({
                  ...s,
                  life: {
                    ...s.life,
                    budgets: { ...s.life.budgets, [month]: limit },
                  },
                }));
                setBudgetOpen(false);
                toast("Бюджет сохранён");
              } catch (e) {
                setBudgetError(
                  e instanceof Error ? e.message : "Проверьте сумму",
                );
              }
            }}
          >
            <label>
              Лимит расходов, ₽
              <input
                name="budget"
                inputMode="decimal"
                required
                defaultValue={
                  budget === undefined ? "" : (budget / 100).toFixed(2)
                }
              />
            </label>
            <p className="field-help">
              Это ваш собственный ориентир, а не автоматическое списание денег.
            </p>
            {budgetError && (
              <p role="alert" className="form-error">
                {budgetError}
              </p>
            )}
            <button className="btn primary">Сохранить бюджет</button>
          </form>
        </Modal>
      )}
    </>
  );
}
