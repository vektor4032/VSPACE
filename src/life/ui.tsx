import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Modal, IconButton } from "../components/ui";
import { shiftDate } from "../data";
export function DateNav({
  date,
  onChange,
  max,
}: {
  date: string;
  onChange: (s: string) => void;
  max?: string;
}) {
  return (
    <div className="date-controls life-date">
      <IconButton
        label="Предыдущий день"
        onClick={() => onChange(shiftDate(date, -1))}
      >
        <ChevronLeft size={18} />
      </IconButton>
      <input
        type="date"
        aria-label="Дата записи"
        value={date}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
      <IconButton
        label="Следующий день"
        disabled={!!max && date >= max}
        onClick={() => onChange(shiftDate(date, 1))}
      >
        <ChevronRight size={18} />
      </IconButton>
    </div>
  );
}
export function Metric({
  label,
  value,
  note,
  color,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  color?: string;
}) {
  return (
    <div className="panel life-metric">
      <span>{label}</span>
      <strong style={color ? { color } : undefined}>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}
export function DeleteButton({
  title,
  onDelete,
  label,
}: {
  title: string;
  onDelete: () => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        label={label || `Удалить: ${title}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 size={15} />
      </IconButton>
      {open && (
        <Modal title="Удалить запись?" onClose={() => setOpen(false)}>
          <p>«{title}» будет удалена.</p>
          <div className="button-row">
            <button className="btn" onClick={() => setOpen(false)}>
              Отмена
            </button>
            <button
              className="btn danger"
              onClick={() => {
                onDelete();
                setOpen(false);
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
export function Trend({
  values,
  label,
  unit = "",
  max,
}: {
  values: { date: string; value: number | null }[];
  label: string;
  unit?: string;
  max?: number;
}) {
  const known = values.filter((v) => v.value !== null);
  const ceiling = max || Math.max(1, ...known.map((v) => v.value!));
  return (
    <div className="life-trend">
      <div className="life-trend-bars" role="img" aria-label={label}>
        {values.map((v) => (
          <div
            key={v.date}
            title={`${v.date}: ${v.value === null ? "Нет записи" : `${v.value} ${unit}`}`}
          >
            <span
              style={{
                height:
                  v.value === null ? "0%" : `${(v.value / ceiling) * 100}%`,
              }}
            />
            <small>{Number(v.date.slice(-2))}</small>
          </div>
        ))}
      </div>
      {!known.length && (
        <p className="field-help">График появится после первых записей.</p>
      )}
      <details className="chart-data">
        <summary>Данные графика</summary>
        {values.map((v) => (
          <p key={v.date}>
            {v.date}: {v.value === null ? "Нет записи" : `${v.value} ${unit}`}
          </p>
        ))}
      </details>
    </div>
  );
}
