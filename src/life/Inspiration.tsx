import { useState } from "react";
import { Heart, Plus, Download } from "lucide-react";
import { useApp } from "../context";
import { uid } from "../data";
import { Modal } from "../components/ui";
import { DeleteButton } from "./ui";
export const quotes = [
  { id: "v1", text: "Сегодня достаточно одного шага в свою сторону." },
  { id: "v2", text: "Отдых — часть пути, а не награда за усталость." },
  { id: "v3", text: "Твой темп имеет право отличаться от чужого." },
  { id: "v4", text: "Не обязательно видеть весь маршрут, чтобы начать." },
  { id: "v5", text: "Маленькие действия оставляют большие следы." },
  { id: "v6", text: "В твоей жизни есть место для перемен и для покоя." },
  { id: "v7", text: "Забота о себе начинается с внимания к себе." },
  { id: "v8", text: "Ты можешь пересмотреть план и сохранить мечту." },
  { id: "v9", text: "Замечай то, что уже получается." },
  { id: "v10", text: "Сделай паузу. Вдохни. Выбери следующее маленькое дело." },
  {
    id: "v11",
    text: "Не каждый день должен быть продуктивным, чтобы быть ценным.",
  },
  {
    id: "v12",
    text: "Пусть сегодня будет чуть больше того, что даёт тебе силы.",
  },
  { id: "v13", text: "Твоё внимание — ресурс. Подари немного себе." },
  { id: "v14", text: "Можно начать заново с того места, где ты сейчас." },
];
export const quoteOfDay = (date: string) =>
  quotes[
    Math.floor(Date.parse(date + "T12:00:00Z") / 86400000) % quotes.length
  ];
export const posters = [
  { id: "orbit", title: "Твоя орбита", caption: "Твой ритм. Твоя орбита." },
  {
    id: "sunrise",
    title: "Новый день",
    caption: "Каждый день — новое начало.",
  },
  {
    id: "mountain",
    title: "Маленькие шаги",
    caption: "Шаг за шагом. Ближе к себе.",
  },
  {
    id: "bloom",
    title: "Время расти",
    caption: "Разреши себе расти в своём темпе.",
  },
  { id: "waves", title: "Выдохни", caption: "Пауза тоже часть движения." },
  {
    id: "stars",
    title: "Своя вселенная",
    caption: "В тебе больше возможностей, чем кажется.",
  },
] as const;
export function Inspiration() {
  const { state, update, today, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [onlySaved, setOnlySaved] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(
    null,
  );
  const daily = quoteOfDay(today);
  const all = [...quotes, ...state.life.inspiration.customQuotes];
  const saved = state.life.inspiration.savedQuotes;
  function toggle(id: string) {
    update((s) => ({
      ...s,
      life: {
        ...s.life,
        inspiration: {
          ...s.life.inspiration,
          savedQuotes: s.life.inspiration.savedQuotes.includes(id)
            ? s.life.inspiration.savedQuotes.filter((x) => x !== id)
            : [...s.life.inspiration.savedQuotes, id],
        },
      },
    }));
  }
  return (
    <>
      <section className="panel daily-quote">
        <span className="eyebrow">ФРАЗА ДНЯ</span>
        <blockquote>{daily.text}</blockquote>
        <button
          className="text-link"
          aria-pressed={saved.includes(daily.id)}
          onClick={() => toggle(daily.id)}
        >
          <Heart
            size={17}
            fill={saved.includes(daily.id) ? "currentColor" : "none"}
          />
          {saved.includes(daily.id) ? "Сохранена" : "Сохранить фразу"}
        </button>
      </section>
      <div className="toolbar">
        <div>
          <h2>Слова, к которым хочется вернуться</h2>
          <p className="field-help">
            Авторские фразы VSPACE и твои собственные напоминания.
          </p>
        </div>
        <button
          className="btn primary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus size={16} />
          Своя фраза
        </button>
      </div>
      <div className="segmented">
        <button
          className={!onlySaved ? "active" : ""}
          onClick={() => setOnlySaved(false)}
        >
          Все фразы
        </button>
        <button
          className={onlySaved ? "active" : ""}
          onClick={() => setOnlySaved(true)}
        >
          Избранные
        </button>
      </div>
      <div className="life-grid three">
        {all
          .filter((q) => !onlySaved || saved.includes(q.id))
          .map((q) => (
            <article className="panel quote-card" key={q.id}>
              <p>{q.text}</p>
              <div className="life-row">
                <button
                  className="icon-btn"
                  aria-label={`${saved.includes(q.id) ? "Убрать из избранного" : "Сохранить фразу"}: ${q.text}`}
                  aria-pressed={saved.includes(q.id)}
                  onClick={() => toggle(q.id)}
                >
                  <Heart
                    size={18}
                    fill={saved.includes(q.id) ? "currentColor" : "none"}
                  />
                </button>
                {state.life.inspiration.customQuotes.some(
                  (x) => x.id === q.id,
                ) && (
                  <div className="button-row">
                    <button
                      className="text-link"
                      onClick={() => {
                        setEditing(q);
                        setOpen(true);
                      }}
                    >
                      Изменить
                    </button>
                    <DeleteButton
                      title={q.text}
                      onDelete={() =>
                        update((s) => ({
                          ...s,
                          life: {
                            ...s.life,
                            inspiration: {
                              ...s.life.inspiration,
                              customQuotes:
                                s.life.inspiration.customQuotes.filter(
                                  (x) => x.id !== q.id,
                                ),
                              savedQuotes:
                                s.life.inspiration.savedQuotes.filter(
                                  (x) => x !== q.id,
                                ),
                            },
                          },
                        }))
                      }
                    />
                  </div>
                )}
              </div>
            </article>
          ))}
      </div>
      {onlySaved && !all.some((q) => saved.includes(q.id)) && (
        <p className="field-help">
          Нажми на сердечко у фразы, которую хочешь оставить себе.
        </p>
      )}
      <div className="toolbar">
        <div>
          <h2>Визуальное вдохновение</h2>
          <p className="field-help">
            Выбери карточку для обзора или скачай её себе. Доступны без сети
            после загрузки приложения.
          </p>
        </div>
      </div>
      <div className="life-grid three">
        {posters.map((p) => (
          <article className="panel poster-card" key={p.id}>
            <img
              src={`${import.meta.env.BASE_URL}inspiration/${p.id}.svg`}
              alt={p.caption}
              loading="lazy"
              width="600"
              height="700"
            />
            <div className="poster-actions">
              <strong>{p.title}</strong>
              <div className="button-row">
                <button
                  className="btn"
                  aria-pressed={state.life.inspiration.poster === p.id}
                  onClick={() => {
                    update((s) => ({
                      ...s,
                      life: {
                        ...s.life,
                        inspiration: {
                          ...s.life.inspiration,
                          poster:
                            s.life.inspiration.poster === p.id ? null : p.id,
                        },
                      },
                    }));
                    toast(
                      state.life.inspiration.poster === p.id
                        ? "Карточка убрана из обзора"
                        : "Карточка выбрана",
                    );
                  }}
                >
                  {state.life.inspiration.poster === p.id
                    ? "Выбрана ✓"
                    : "В обзор"}
                </button>
                <a
                  className="icon-btn"
                  href={`${import.meta.env.BASE_URL}inspiration/${p.id}.svg`}
                  download={`VSPACE-${p.id}.svg`}
                  aria-label={`Скачать: ${p.title}`}
                >
                  <Download size={17} />
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
      {open && (
        <Modal
          title={editing ? "Изменить фразу" : "Моё напоминание"}
          onClose={() => setOpen(false)}
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
                  inspiration: {
                    ...s.life.inspiration,
                    customQuotes: editing
                      ? s.life.inspiration.customQuotes.map((q) =>
                          q.id === editing.id ? { ...q, text } : q,
                        )
                      : [
                          ...s.life.inspiration.customQuotes,
                          { id: uid(), text },
                        ],
                  },
                },
              }));
              setOpen(false);
              toast("Фраза сохранена");
            }}
          >
            <label>
              Текст фразы
              <textarea
                name="text"
                required
                maxLength={500}
                autoFocus
                defaultValue={editing?.text}
              />
            </label>
            <button className="btn primary">Сохранить фразу</button>
          </form>
        </Modal>
      )}
    </>
  );
}
