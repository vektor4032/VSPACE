import { useState } from "react";
import { useApp } from "../context";
import { uid } from "../data";
import { Modal } from "../components/ui";
import { TaskForm } from "../components/Tasks";
import { TransactionForm } from "../life/Finance";
import { JournalForm } from "../life/Psychology";
export type QuickKind =
  "menu" | "task" | "expense" | "thought" | "food" | "journal";
export function openQuick(kind: QuickKind = "menu") {
  window.dispatchEvent(new CustomEvent("vspace:quick", { detail: kind }));
}
export function QuickCreate({
  kind,
  onClose,
}: {
  kind: QuickKind;
  onClose: () => void;
}) {
  const { today, update, toast } = useApp();
  const [selected, setSelected] = useState(kind);
  if (selected === "task") return <TaskForm onClose={onClose} />;
  if (selected === "expense")
    return <TransactionForm date={today} onClose={onClose} />;
  if (selected === "journal")
    return <JournalForm date={today} onClose={onClose} />;
  return (
    <Modal
      title={
        selected === "menu"
          ? "Быстрая запись"
          : selected === "food"
            ? "Что было на тарелке?"
            : "Место для мысли"
      }
      onClose={onClose}
    >
      {selected === "menu" ? (
        <div className="quick-grid">
          {(
            [
              ["task", "Задача", "Одно конкретное дело"],
              ["expense", "Доход / расход", "Записать сумму"],
              ["thought", "Мысль", "Не держать в голове"],
              ["food", "Приём пищи", "Записать съеденное"],
              ["journal", "Мой день", "Настроение и чувства"],
            ] as const
          ).map(([value, label, desc]) => (
            <button
              className="panel"
              key={value}
              onClick={() => setSelected(value)}
            >
              <strong>{label}</strong>
              <small>{desc}</small>
            </button>
          ))}
        </div>
      ) : (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const text = String(f.get("text")).trim();
            if (!text) return;
            const date = String(f.get("date"));
            update((s) =>
              selected === "thought"
                ? {
                    ...s,
                    life: {
                      ...s.life,
                      thoughts: [
                        ...s.life.thoughts,
                        {
                          id: uid(),
                          text,
                          date,
                          bucket: "inbox",
                          taskId: null,
                        },
                      ],
                    },
                  }
                : {
                    ...s,
                    life: {
                      ...s.life,
                      foodLog: [
                        ...s.life.foodLog,
                        {
                          id: uid(),
                          date,
                          title: text,
                          slot: f.get("slot") as
                            "breakfast" | "lunch" | "dinner" | "snack",
                          grams: null,
                          calories: null,
                          protein: null,
                          fat: null,
                          carbs: null,
                          estimated: true,
                        },
                      ],
                    },
                  },
            );
            toast("Запись сохранена");
            onClose();
          }}
        >
          <label>
            {selected === "food" ? "Блюдо" : "Что занимает мысли?"}
            <textarea
              name="text"
              maxLength={selected === "food" ? 300 : 5000}
              required
              autoFocus
            />
          </label>
          <label>
            Дата
            <input
              name="date"
              type="date"
              required
              defaultValue={today}
              max={today}
            />
          </label>
          {selected === "food" && (
            <label>
              Приём пищи
              <select name="slot">
                <option value="breakfast">Завтрак</option>
                <option value="lunch">Обед</option>
                <option value="dinner">Ужин</option>
                <option value="snack">Перекус</option>
              </select>
            </label>
          )}
          <button className="btn primary">Сохранить запись</button>
        </form>
      )}
    </Modal>
  );
}
