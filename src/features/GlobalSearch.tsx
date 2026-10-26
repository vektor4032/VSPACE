import { useDeferredValue, useMemo, useState } from "react";
import type { AppState } from "../data";
import { recipes } from "../data";
import { useApp, fmt } from "../context";
import { Modal } from "../components/ui";
export type SearchHit = {
  id: string;
  title: string;
  type: string;
  text: string;
  href: string;
};
export function searchWorkspace(state: AppState, query: string): SearchHit[] {
  const q = query.trim().toLocaleLowerCase("ru-RU");
  if (!q) return [];
  const hits: SearchHit[] = [];
  const push = (hit: SearchHit) => {
    if (
      (hit.title + " " + hit.text + " " + hit.type)
        .toLocaleLowerCase("ru-RU")
        .includes(q)
    )
      hits.push(hit);
  };
  state.tasks.forEach((t) =>
    push({
      id: "task-" + t.id,
      title: t.title,
      type: "Задача",
      text: `${t.date} · ${t.done ? "Выполнено" : "Не выполнено"}`,
      href: `#planner?date=${t.date}&focus=${encodeURIComponent("task-" + t.id)}`,
    }),
  );
  state.projects.forEach((p) =>
    push({
      id: "project-" + p.id,
      title: p.title,
      type: "Проект",
      text: [
        p.category,
        p.notes,
        ...p.steps.map((x) => x.title),
        ...p.links,
      ].join("\n"),
      href: "#projects?focus=" + encodeURIComponent("project-" + p.id),
    }),
  );
  state.life.goals.forEach((g) =>
    push({
      id: "goal-" + g.id,
      title: g.title,
      type: "Челлендж",
      text: [g.why, g.reward, ...g.steps.map((s) => s.title)].join("\n"),
      href: "#life?tab=goals&focus=" + encodeURIComponent("goal-" + g.id),
    }),
  );
  state.habits.forEach((h) =>
    push({
      id: "habit-" + h.id,
      title: h.title,
      type: "Привычка",
      text: `${h.target} ${h.unit}`,
      href: "#habits?focus=" + encodeURIComponent("habit-" + h.id),
    }),
  );
  state.life.thoughts.forEach((t) =>
    push({
      id: "thought-" + t.id,
      title: t.text.slice(0, 100),
      type: "Мысль",
      text: t.text,
      href:
        "#life?tab=psychology&mode=thoughts&focus=" +
        encodeURIComponent("thought-" + t.id),
    }),
  );
  Object.entries(state.life.journal).forEach(([date, j]) =>
    push({
      id: "journal-" + date,
      title: "Дневник · " + fmt(date),
      type: "Дневник",
      text: [date, j.thoughts, j.gratitude, j.needs, j.tinyStep].join("\n"),
      href: "#life?tab=psychology&date=" + date,
    }),
  );
  [...recipes, ...state.savedRecipes].forEach((r) =>
    push({
      id: "recipe-" + r.id,
      title: r.title,
      type: "Рецепт",
      text: [r.category, ...r.ingredients.map((i) => i[0]), ...r.steps].join(
        "\n",
      ),
      href: "#food?find=" + encodeURIComponent(r.id),
    }),
  );
  state.life.foodLog.forEach((r) =>
    push({
      id: "food-" + r.id,
      title: r.title,
      type: "Питание",
      text: r.date,
      href: "#life?tab=nutrition&date=" + r.date,
    }),
  );
  state.life.transactions.forEach((t) =>
    push({
      id: "transaction-" + t.id,
      title:
        t.category +
        " · " +
        (t.amountMinor / 100).toLocaleString("ru-RU") +
        " ₽",
      type: t.type === "income" ? "Доход" : "Расход",
      text: t.date + "\n" + t.note,
      href:
        "#life?tab=finance&month=" +
        t.date.slice(0, 7) +
        "&focus=" +
        encodeURIComponent("transaction-" + t.id),
    }),
  );
  state.features.reminders.forEach((r) =>
    push({
      id: "reminder-" + r.id,
      title: r.title,
      type: "Напоминание",
      text: r.time,
      href: "#settings",
    }),
  );
  Object.entries(state.life.weekPlans).forEach(([date, w]) =>
    push({
      id: "week-" + date,
      title: "Неделя · " + fmt(date),
      type: "Планы и итоги",
      text: [
        w.focus,
        w.wins,
        w.energy,
        w.learned,
        w.joy,
        w.next,
        ...w.priorities.map((p) => p.title),
      ].join("\n"),
      href: "#life?tab=week&date=" + date,
    }),
  );
  state.features.savings.forEach((g) =>
    push({
      id: "saving-" + g.id,
      title: g.title,
      type: "Накопление",
      text: "Целевая сумма " + g.targetMinor / 100,
      href: "#life?tab=finance",
    }),
  );
  return hits;
}
export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const { state } = useApp();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchHit | null>(null);
  const deferred = useDeferredValue(query);
  const hits = useMemo(
    () => searchWorkspace(state, deferred),
    [state, deferred],
  );
  return (
    <Modal
      title={selected ? selected.title : "Поиск по всему пространству"}
      onClose={onClose}
    >
      {selected ? (
        <div className="feature-card">
          <span className="tag">{selected.type}</span>
          <p className="search-full-text">{selected.text}</p>
          <div className="button-row">
            <button className="btn" onClick={() => setSelected(null)}>
              К результатам
            </button>
            <a className="btn primary" href={selected.href} onClick={onClose}>
              Открыть раздел
            </a>
          </div>
        </div>
      ) : (
        <div className="feature-card">
          <label>
            Что найти?
            <input
              type="search"
              autoFocus
              maxLength={200}
              placeholder="Задача, рецепт, мысль, цель…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <p className="field-help">
            Поиск только по твоим записям на устройстве. Данные поиска никуда не
            отправляются.
          </p>
          {query.trim() && (
            <p role="status">
              Найдено: {hits.length}
              {hits.length > 60 ? " · показаны первые 60" : ""}
            </p>
          )}
          <div className="search-results">
            {hits.slice(0, 60).map((h) => (
              <button key={h.id} onClick={() => setSelected(h)}>
                <small>{h.type}</small>
                <strong>{h.title}</strong>
                <span>{h.text.slice(0, 160)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
