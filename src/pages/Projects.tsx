import { useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowUpRight,
  Plus,
  Search,
  Trash2,
  Pencil,
  ExternalLink,
} from "lucide-react";
import { uid } from "../data";
import type { Project } from "../data";
import { useApp, priorityLabel, fmt } from "../context";
import { IconButton, Empty, Modal, PageHeading } from "../components/ui";

export function ProjectProgress({ project: p }: { project: Project }) {
  const done = p.steps.filter((x) => x.done).length;
  const pct = p.steps.length ? (done / p.steps.length) * 100 : 0;
  return (
    <div className="project-progress">
      <div>
        <span>
          {p.status === "done"
            ? "Завершён"
            : p.status === "active"
              ? "В работе"
              : "Идея"}
        </span>
        <strong>{Math.round(pct)}%</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${pct}%` }} />
      </div>
      <small>
        {done} из {p.steps.length} этапов
      </small>
    </div>
  );
}

function ProjectForm({
  project,
  onClose,
}: {
  project?: Project;
  onClose: () => void;
}) {
  const { update, toast } = useApp();
  const [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const links = String(f.get("links"))
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (
      links.some((l) => {
        try {
          return !["http:", "https:"].includes(new URL(l).protocol);
        } catch {
          return true;
        }
      })
    ) {
      setError("Используйте полные ссылки https:// или http://");
      return;
    }
    const stepTitles = String(f.get("steps"))
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const usedIds = new Set<string>();
    const steps = stepTitles.map((title, i) => {
      const exact = project?.steps.find(
        (step) => step.title === title && !usedIds.has(step.id),
      );
      const positional = project?.steps[i];
      const old =
        exact ||
        (positional &&
        !usedIds.has(positional.id) &&
        !stepTitles.includes(positional.title)
          ? positional
          : undefined);
      if (old) usedIds.add(old.id);
      return { id: old?.id || uid(), title, done: old?.done || false };
    });
    const title = String(f.get("title")).trim();
    if (!title) return;
    const p: Project = {
      id: project?.id || uid(),
      title,
      category: String(f.get("category")).trim() || "Личное",
      status: f.get("status") as Project["status"],
      priority: f.get("priority") as Project["priority"],
      deadline: String(f.get("deadline")),
      notes: String(f.get("notes")),
      links,
      steps,
      color: f.get("color") as Project["color"],
    };
    update((s) => ({
      ...s,
      projects: project
        ? s.projects.map((x) => (x.id === project.id ? p : x))
        : [...s.projects, p],
    }));
    toast("Проект сохранён");
    onClose();
  }
  return (
    <Modal
      title={project ? "Редактировать проект" : "Пространство для идеи"}
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        <label>
          Название
          <input
            name="title"
            required
            maxLength={150}
            defaultValue={project?.title}
            placeholder="Мой следующий большой проект"
          />
        </label>
        <div className="form-grid">
          <label>
            Категория
            <input
              name="category"
              maxLength={100}
              defaultValue={project?.category || "Дизайн"}
            />
          </label>
          <label>
            Дедлайн
            <input
              name="deadline"
              type="date"
              defaultValue={project?.deadline}
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Статус
            <select name="status" defaultValue={project?.status || "idea"}>
              <option value="idea">Идея</option>
              <option value="active">В работе</option>
              <option value="done">Завершён</option>
            </select>
          </label>
          <label>
            Приоритет
            <select
              name="priority"
              defaultValue={project?.priority || "medium"}
            >
              {Object.entries(priorityLabel).map(([v, l]) => (
                <option value={v} key={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Этапы / чек-лист
          <textarea
            name="steps"
            rows={4}
            defaultValue={project?.steps.map((s) => s.title).join("\n")}
            maxLength={10000}
            placeholder={"Исследование\nКонцепция\nПервый прототип"}
          />
          <small>
            Каждый этап с новой строки. При редактировании сохраняется статус
            строки.
          </small>
        </label>
        <label>
          Материалы и заметки
          <textarea
            name="notes"
            rows={3}
            maxLength={10000}
            defaultValue={project?.notes}
            placeholder="Идеи, бриф, заметки…"
          />
        </label>
        <label>
          Ссылки на материалы
          <textarea
            name="links"
            rows={2}
            maxLength={5000}
            defaultValue={project?.links.join("\n")}
            placeholder={"https://figma.com/…\nhttps://behance.net/…"}
          />
          <small>Одна ссылка на строку</small>
        </label>
        <label>
          Цвет
          <select name="color" defaultValue={project?.color || "lime"}>
            <option value="lime">Acid lime</option>
            <option value="violet">Electric violet</option>
            <option value="mint">Digital mint</option>
          </select>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary" type="submit">
          Сохранить проект <ArrowUpRight size={17} />
        </button>
      </form>
    </Modal>
  );
}

export function Projects() {
  const { state, update, toast } = useApp();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<Project | null>();
  const [detail, setDetail] = useState<string | null>(null);
  const [remove, setRemove] = useState<Project | null>(null);
  const selected = state.projects.find((p) => p.id === detail);
  const list = state.projects.filter(
    (p) =>
      (filter === "all" || p.status === filter) &&
      (p.title + " " + p.category).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="IDEAS NEED SPACE"
        title="Создавай своё."
        description="От первой искры до последнего штриха."
        action={
          <button className="btn primary" onClick={() => setEdit(null)}>
            <Plus size={18} /> Новый проект
          </button>
        }
      />
      <div className="toolbar">
        <div className="segmented">
          {[
            ["all", "Все"],
            ["idea", "Идеи"],
            ["active", "В работе"],
            ["done", "Готово"],
          ].map(([v, l]) => (
            <button
              className={filter === v ? "active" : ""}
              key={v}
              onClick={() => setFilter(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="search-field">
          <Search size={17} />
          <input
            placeholder="Найти проект"
            aria-label="Найти проект"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      {list.length ? (
        <div className="project-grid">
          {list.map((p, i) => (
            <article className={`project-card project-${p.color}`} key={p.id}>
              <button className="project-open" onClick={() => setDetail(p.id)}>
                <div className="project-card-top">
                  <span className="tag">{p.category}</span>
                  <ArrowUpRight size={22} />
                </div>
                <div className={`project-art art-${i % 3}`} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="project-card-label">
                  <span className="eyebrow">
                    PROJECT / {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`priority-dot ${p.priority}`}
                    title={priorityLabel[p.priority]}
                  />
                </div>
                <h3>{p.title}</h3>
                <p className="deadline">
                  {p.deadline ? `До ${fmt(p.deadline)}` : "Без дедлайна"} ·{" "}
                  {priorityLabel[p.priority]} приоритет
                </p>
                <ProjectProgress project={p} />
              </button>
              <div className="project-actions">
                <button className="text-link" onClick={() => setEdit(p)}>
                  <Pencil size={14} /> Редактировать
                </button>
                <IconButton
                  label={`Удалить проект ${p.title}`}
                  onClick={() => setRemove(p)}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title={
            query || filter !== "all"
              ? "Проектов не найдено"
              : "Твоя следующая большая идея"
          }
          description={
            query || filter !== "all"
              ? "Попробуйте другой поиск или фильтр."
              : "Создайте проект, добавьте этапы и соберите всё вдохновение в одном месте."
          }
          action={
            <button className="btn primary" onClick={() => setEdit(null)}>
              <Plus size={17} /> Создать проект
            </button>
          }
        />
      )}{" "}
      {edit !== undefined && (
        <ProjectForm
          project={edit || undefined}
          onClose={() => setEdit(undefined)}
        />
      )}{" "}
      {selected && (
        <Modal title={selected.title} onClose={() => setDetail(null)}>
          <div className="project-detail">
            <div className="button-row">
              <span className="tag">{selected.category}</span>
              <span className="tag">
                {priorityLabel[selected.priority]} приоритет
              </span>
            </div>
            <ProjectProgress project={selected} />
            <h3>Этапы проекта</h3>
            {selected.steps.length ? (
              selected.steps.map((step) => (
                <label className="checklist-item" key={step.id}>
                  <input
                    type="checkbox"
                    checked={step.done}
                    onChange={() =>
                      update((s) => ({
                        ...s,
                        projects: s.projects.map((p) =>
                          p.id === selected.id
                            ? {
                                ...p,
                                steps: p.steps.map((st) =>
                                  st.id === step.id
                                    ? { ...st, done: !st.done }
                                    : st,
                                ),
                              }
                            : p,
                        ),
                      }))
                    }
                  />
                  <span>{step.title}</span>
                </label>
              ))
            ) : (
              <p className="muted">
                Добавьте этапы через редактирование проекта.
              </p>
            )}{" "}
            {selected.notes && (
              <>
                <h3>Материалы и заметки</h3>
                <p className="pre-wrap">{selected.notes}</p>
              </>
            )}{" "}
            {selected.links.length > 0 && (
              <>
                <h3>Ссылки</h3>
                {selected.links.map((url, i) => (
                  <a
                    className="external-link"
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {new URL(url).hostname}
                    <ExternalLink size={15} />
                  </a>
                ))}
              </>
            )}
            <label className="form">
              Статус
              <select
                value={selected.status}
                onChange={(e) => {
                  const status = e.target.value as Project["status"];
                  update((s) => ({
                    ...s,
                    projects: s.projects.map((p) =>
                      p.id === selected.id ? { ...p, status } : p,
                    ),
                  }));
                }}
              >
                <option value="idea">Идея</option>
                <option value="active">В работе</option>
                <option value="done">Завершён</option>
              </select>
            </label>
            <button
              className="btn"
              onClick={() => {
                setEdit(selected);
                setDetail(null);
              }}
            >
              <Pencil size={16} /> Редактировать
            </button>
          </div>
        </Modal>
      )}
      {remove && (
        <Modal title="Удалить проект?" onClose={() => setRemove(null)}>
          <p>«{remove.title}» и его материалы будут удалены.</p>
          <div className="button-row">
            <button className="btn" onClick={() => setRemove(null)}>
              Отмена
            </button>
            <button
              className="btn danger"
              onClick={() => {
                update((s) => ({
                  ...s,
                  projects: s.projects.filter((p) => p.id !== remove.id),
                }));
                setRemove(null);
                toast("Проект удалён");
              }}
            >
              Удалить
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
