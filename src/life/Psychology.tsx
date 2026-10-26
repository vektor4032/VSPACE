import { dateParam, hashParam } from "../features/navigation";
import { useState, useEffect } from "react";
import { Plus, Check, ArrowUpRight } from "lucide-react";
import { useApp, fmt } from "../context";
import { uid } from "../data";
import { Modal, SectionHead, Empty } from "../components/ui";
import { DateNav, Metric, Trend, DeleteButton } from "./ui";
import { dateRange } from "./stats";
import type { JournalEntry, LifeState } from "./schema";
const emotions = {
  calm: "Спокойно",
  happy: "Радостно",
  anxious: "Тревожно",
  sad: "Грустно",
  tired: "Устала / устал",
  angry: "Злюсь",
};
const buckets = {
  inbox: "Всё из головы",
  remove: "Убрать",
  solve: "Решить",
  do: "Сделать",
  later: "Пока оставить",
};
export function JournalForm({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const { state, update, toast } = useApp();
  const entry = state.life.journal[date];
  const [mood, setMood] = useState(
    entry?.mood ?? state.checkins[date]?.mood ?? 3,
  );
  const [stress, setStress] = useState(entry?.stress ?? 5);
  return (
    <Modal title={`Мой день · ${fmt(date)}`} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const record: JournalEntry = {
            mood,
            stress,
            emotion: f.get("emotion") as JournalEntry["emotion"],
            thoughts: String(f.get("thoughts")).trim(),
            gratitude: String(f.get("gratitude")).trim(),
            needs: String(f.get("needs")).trim(),
            tinyStep: String(f.get("tinyStep")).trim(),
          };
          update((s) => ({
            ...s,
            checkins: s.checkins[date]
              ? { ...s.checkins, [date]: { ...s.checkins[date], mood } }
              : s.checkins,
            life: { ...s.life, journal: { ...s.life.journal, [date]: record } },
          }));
          toast("Дневник сохранён");
          onClose();
        }}
      >
        <fieldset className="mood-picker">
          <legend>Какой сегодня день?</legend>
          {["Тяжёлый", "Непростой", "Обычный", "Хороший", "Прекрасный"].map(
            (label, i) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                aria-pressed={mood === i + 1}
                className={mood === i + 1 ? "active" : ""}
                onClick={() => setMood(i + 1)}
              >
                <span>{["☁", "☂", "◐", "☀", "✳"][i]}</span>
                <small>{label}</small>
              </button>
            ),
          )}
        </fieldset>
        <label>
          Что чувствую
          <select name="emotion" defaultValue={entry?.emotion || "calm"}>
            {Object.entries(emotions).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Напряжение · {stress} / 10
          <input
            type="range"
            min="0"
            max="10"
            value={stress}
            onChange={(e) => setStress(Number(e.target.value))}
          />
          <span className="range-labels">
            <span>Спокойно</span>
            <span>Очень напряжённо</span>
          </span>
        </label>
        {[
          ["thoughts", "Что сейчас занимает мысли?"],
          ["gratitude", "За что я благодарна / благодарен?"],
          ["needs", "Чего мне сейчас не хватает?"],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <textarea
              name={key}
              rows={3}
              maxLength={5000}
              defaultValue={entry?.[key as "thoughts" | "gratitude" | "needs"]}
            />
          </label>
        ))}
        <label>
          Один бережный шаг для себя
          <input
            name="tinyStep"
            maxLength={500}
            defaultValue={entry?.tinyStep}
            placeholder="Небольшое действие на сегодня"
          />
        </label>
        <button className="btn primary">Сохранить дневник</button>
      </form>
    </Modal>
  );
}
export function Psychology() {
  const { state, update, today, toast } = useApp();
  const [date, setDate] = useState(() => dateParam(today));
  useEffect(() => {
    const handler = () => setDate(dateParam(today));
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, [today]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"diary" | "thoughts">(() =>
    hashParam("mode") === "thoughts" ? "thoughts" : "diary",
  );
  const [thought, setThought] = useState(false);
  const [editingThought, setEditingThought] = useState<
    LifeState["thoughts"][number] | null
  >(null);
  const days = dateRange(date, 7);
  const records = days.map((d) => state.life.journal[d]).filter(Boolean);
  const entry = state.life.journal[date];
  const mean = (key: "mood" | "stress") =>
    records.length
      ? (
          records.reduce((a, r) => a + r[key], 0) / records.length
        ).toLocaleString("ru-RU", { maximumFractionDigits: 1 })
      : "—";
  return (
    <>
      <div className="life-section-intro">
        <div>
          <span className="eyebrow">ROOM FOR YOUR INNER WORLD</span>
          <h2>Место, где можно выдохнуть.</h2>
          <p>
            Замечай чувства, разгружай мысли, выбирай небольшой следующий шаг.
          </p>
        </div>
        <button
          className="btn primary"
          onClick={() => (mode === "diary" ? setOpen(true) : setThought(true))}
        >
          <Plus size={17} />
          {mode === "diary" ? "Записать день" : "Выгрузить мысль"}
        </button>
      </div>
      <div className="toolbar">
        <div className="segmented">
          <button
            className={mode === "diary" ? "active" : ""}
            onClick={() => setMode("diary")}
          >
            Мой дневник
          </button>
          <button
            className={mode === "thoughts" ? "active" : ""}
            onClick={() => setMode("thoughts")}
          >
            Разобрать мысли
          </button>
        </div>
        {mode === "diary" && (
          <DateNav date={date} max={today} onChange={setDate} />
        )}
      </div>
      {mode === "diary" ? (
        <>
          <div className="life-metrics three">
            <Metric
              label="Настроение за 7 дней"
              value={mean("mood")}
              note={`Шкала 1–5 · ${records.length} записей`}
            />
            <Metric
              label="Напряжение за 7 дней"
              value={mean("stress")}
              note="Шкала 0–10; меньше — спокойнее"
            />
            <Metric
              label="Дней с записью"
              value={records.length}
              note="Из 7 дней. Пропуски — не неудачи."
            />
          </div>
          <div className="life-two">
            <section className="panel">
              <SectionHead index="01" title="Мой эмоциональный ритм" />
              <Trend
                label="Настроение по дням, шкала от 1 до 5"
                max={5}
                values={days.map((d) => ({
                  date: d,
                  value: state.life.journal[d]?.mood ?? null,
                }))}
              />
            </section>
            <section className="panel">
              <SectionHead index="02" title="Уровень напряжения" />
              <Trend
                label="Напряжение по дням от 0 до 10"
                max={10}
                values={days.map((d) => ({
                  date: d,
                  value: state.life.journal[d]?.stress ?? null,
                }))}
              />
            </section>
          </div>
          <section className="panel journal-entry">
            <SectionHead
              index="03"
              title={`Запись · ${fmt(date)}`}
              action={
                <button className="text-link" onClick={() => setOpen(true)}>
                  {entry ? "Редактировать" : "Заполнить"}{" "}
                  <ArrowUpRight size={15} />
                </button>
              }
            />
            {entry ? (
              <>
                <div className="button-row wrap">
                  <span className="tag">Настроение {entry.mood}/5</span>
                  <span className="tag">{emotions[entry.emotion]}</span>
                  <span className="tag">Напряжение {entry.stress}/10</span>
                </div>
                <div className="reflection-grid">
                  {[
                    ["thoughts", "В мыслях"],
                    ["gratitude", "Благодарности"],
                    ["needs", "Мне нужно"],
                    ["tinyStep", "Мой маленький шаг"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <span className="eyebrow">{label}</span>
                      <p className="pre-wrap">
                        {entry[
                          key as keyof Pick<
                            JournalEntry,
                            "thoughts" | "gratitude" | "needs" | "tinyStep"
                          >
                        ] || "Не заполнено"}
                      </p>
                    </div>
                  ))}
                </div>
                <DeleteButton
                  title={`Дневник за ${fmt(date)}`}
                  onDelete={() =>
                    update((s) => {
                      const journal = { ...s.life.journal };
                      delete journal[date];
                      return { ...s, life: { ...s.life, journal } };
                    })
                  }
                />
              </>
            ) : (
              <Empty
                title="Как ты на самом деле?"
                description="Здесь не нужно выглядеть продуктивно. Оставь пару слов о своём дне."
                action={
                  <button className="btn" onClick={() => setOpen(true)}>
                    Сделать запись
                  </button>
                }
              />
            )}
          </section>
          <p className="field-help">
            Это дневник наблюдений: приложение не делает психологических
            диагнозов и не выводит причины вашего состояния из графиков.
          </p>
        </>
      ) : (
        <>
          <section className="brain-intro panel">
            <span className="eyebrow">
              ВЫГРУЗИТЬ → РАЗДЕЛИТЬ → ВЫБРАТЬ → СДЕЛАТЬ → ПРОВЕРИТЬ
            </span>
            <h3>Не держать всё в голове.</h3>
            <p>
              Запиши то, что тревожит или отвлекает. Затем распределяй: что
              убрать, что решить, что превратить в действие, а что пока
              отложить.
            </p>
          </section>
          <div className="thought-board">
            {Object.entries(buckets).map(([bucket, label]) => (
              <section className="panel thought-column" key={bucket}>
                <h3>
                  {label}
                  <small>
                    {
                      state.life.thoughts.filter((t) => t.bucket === bucket)
                        .length
                    }
                  </small>
                </h3>
                {state.life.thoughts
                  .filter((t) => t.bucket === bucket)
                  .map((t) => (
                    <article
                      className="thought-card"
                      key={t.id}
                      id={"thought-" + t.id}
                      tabIndex={-1}
                    >
                      <p>{t.text}</p>
                      <button
                        className="text-link"
                        onClick={() => {
                          setEditingThought(t);
                          setThought(true);
                        }}
                      >
                        Изменить мысль
                      </button>
                      <small>{fmt(t.date)}</small>
                      <select
                        aria-label={`Категория мысли: ${t.text.slice(0, 40)}`}
                        value={t.bucket}
                        onChange={(e) => {
                          const value = e.target.value as typeof t.bucket;
                          update((s) => ({
                            ...s,
                            life: {
                              ...s.life,
                              thoughts: s.life.thoughts.map((x) =>
                                x.id === t.id ? { ...x, bucket: value } : x,
                              ),
                            },
                          }));
                        }}
                      >
                        {Object.entries(buckets).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                      <div className="button-row">
                        {t.bucket === "do" && (
                          <button
                            className="text-link"
                            disabled={
                              !!t.taskId &&
                              state.tasks.some((x) => x.id === t.taskId)
                            }
                            onClick={() => {
                              const taskId = uid();
                              update((s) => ({
                                ...s,
                                tasks: [
                                  ...s.tasks,
                                  {
                                    id: taskId,
                                    title: t.text.slice(0, 300),
                                    date: today,
                                    priority: "medium",
                                    repeat: "none",
                                    done: false,
                                    completedAt: null,
                                  },
                                ],
                                life: {
                                  ...s.life,
                                  thoughts: s.life.thoughts.map((x) =>
                                    x.id === t.id ? { ...x, taskId } : x,
                                  ),
                                },
                              }));
                              toast("Мысль стала задачей в планере");
                            }}
                          >
                            {t.taskId &&
                            state.tasks.some((x) => x.id === t.taskId) ? (
                              <>
                                <Check size={13} /> В планере
                              </>
                            ) : (
                              <>
                                В задачу <ArrowUpRight size={13} />
                              </>
                            )}
                          </button>
                        )}
                        <DeleteButton
                          title={t.text.slice(0, 70)}
                          onDelete={() =>
                            update((s) => ({
                              ...s,
                              life: {
                                ...s.life,
                                thoughts: s.life.thoughts.filter(
                                  (x) => x.id !== t.id,
                                ),
                              },
                            }))
                          }
                        />
                      </div>
                    </article>
                  ))}
                {!state.life.thoughts.some((t) => t.bucket === bucket) && (
                  <p className="muted">Пока пусто</p>
                )}
              </section>
            ))}
          </div>
        </>
      )}
      {open && <JournalForm date={date} onClose={() => setOpen(false)} />}{" "}
      {thought && (
        <Modal
          title={editingThought ? "Изменить мысль" : "Выгрузить мысль"}
          onClose={() => {
            setThought(false);
            setEditingThought(null);
          }}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const text = String(
                new FormData(e.currentTarget).get("text"),
              ).trim();
              if (!text) return;
              update((s) => ({
                ...s,
                life: {
                  ...s.life,
                  thoughts: editingThought
                    ? s.life.thoughts.map((t) =>
                        t.id === editingThought.id ? { ...t, text } : t,
                      )
                    : [
                        ...s.life.thoughts,
                        {
                          id: uid(),
                          text,
                          date: today,
                          bucket: "inbox",
                          taskId: null,
                        },
                      ],
                },
              }));
              setThought(false);
              setEditingThought(null);
            }}
          >
            <label>
              Что занимает голову?
              <textarea
                name="text"
                required
                maxLength={5000}
                rows={6}
                autoFocus
                defaultValue={editingThought?.text}
                placeholder="Без структуры и правильных формулировок…"
              />
            </label>
            <button className="btn primary">Сохранить мысль</button>
          </form>
        </Modal>
      )}
    </>
  );
}
