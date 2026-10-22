import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowUpRight, Check, Trash2 } from "lucide-react";
import { uid, toggleTask } from "../data";
import type { Task } from "../data";
import { useApp, priorityLabel } from "../context";
import { IconButton, Modal } from "../components/ui";

export function TaskForm({
  task,
  date,
  onClose,
}: {
  task?: Task;
  date?: string;
  onClose: () => void;
}) {
  const { update, today, toast } = useApp();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title")).trim();
    if (!title) return;
    const item: Task = {
      id: task?.id || uid(),
      title,
      date: String(f.get("date")),
      priority: f.get("priority") as Task["priority"],
      repeat: f.get("repeat") as Task["repeat"],
      done: task?.done || false,
      completedAt: task?.completedAt || null,
    };
    update((s) => ({
      ...s,
      tasks: task
        ? s.tasks.map((t) => (t.id === task.id ? item : t))
        : [...s.tasks, item],
    }));
    toast(task ? "Задача обновлена" : "Задача добавлена");
    onClose();
  }
  return (
    <Modal
      title={task ? "Редактировать задачу" : "Место для нового дела"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="form">
        <label>
          Что планируем?
          <input
            name="title"
            autoFocus
            required
            maxLength={300}
            defaultValue={task?.title}
            placeholder="Например, собрать мудборд"
          />
        </label>
        <div className="form-grid">
          <label>
            Дата
            <input
              name="date"
              type="date"
              required
              defaultValue={task?.date || date || today}
            />
          </label>
          <label>
            Приоритет
            <select name="priority" defaultValue={task?.priority || "medium"}>
              <option value="low">Низкий</option>
              <option value="medium">Средний</option>
              <option value="high">Высокий</option>
            </select>
          </label>
        </div>
        <label>
          Повторять
          <select name="repeat" defaultValue={task?.repeat || "none"}>
            <option value="none">Не повторять</option>
            <option value="daily">Каждый день</option>
            <option value="weekly">Каждую неделю</option>
          </select>
        </label>
        <p className="field-help">
          После выполнения повторяющейся задачи создаётся следующая.
        </p>
        <button className="btn primary" type="submit">
          {task ? "Сохранить изменения" : "Добавить задачу"}{" "}
          <ArrowUpRight size={17} />
        </button>
      </form>
    </Modal>
  );
}

export function TaskRow({
  task,
  compact = false,
}: {
  task: Task;
  compact?: boolean;
}) {
  const { update, toast } = useApp();
  const [edit, setEdit] = useState(false);
  const [remove, setRemove] = useState(false);
  return (
    <>
      <div
        className={`task-row ${task.done ? "done" : ""}`}
        draggable={!compact}
        onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
      >
        <button
          className="checkbox"
          aria-label={
            task.done
              ? `Вернуть задачу: ${task.title}`
              : `Выполнить: ${task.title}`
          }
          aria-pressed={task.done}
          onClick={() => update((s) => toggleTask(s, task.id))}
        >
          {task.done && <Check size={14} />}
        </button>
        <button className="task-title" onClick={() => setEdit(true)}>
          {task.title}
          <small>
            {task.repeat !== "none" ? "↻ Повторяется · " : ""}
            {priorityLabel[task.priority]} приоритет
          </small>
        </button>
        <span
          className={`priority-dot ${task.priority}`}
          title={priorityLabel[task.priority]}
        />
        {!compact && (
          <IconButton
            label={`Удалить: ${task.title}`}
            onClick={() => setRemove(true)}
          >
            <Trash2 size={15} />
          </IconButton>
        )}
      </div>
      {edit && <TaskForm task={task} onClose={() => setEdit(false)} />}{" "}
      {remove && (
        <Modal title="Удалить задачу?" onClose={() => setRemove(false)}>
          <p>«{task.title}» будет удалена.</p>
          <div className="button-row">
            <button className="btn" onClick={() => setRemove(false)}>
              Отмена
            </button>
            <button
              className="btn danger"
              onClick={() => {
                update((s) => ({
                  ...s,
                  tasks: s.tasks.filter((t) => t.id !== task.id),
                }));
                toast("Задача удалена");
                setRemove(false);
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
