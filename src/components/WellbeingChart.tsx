import { useState } from "react";
import { Moon, Heart, Sun } from "lucide-react";
import { useApp, fmt } from "../context";
import { Empty, SectionHead } from "./ui";

type Metric = "sleep" | "energy" | "mood";
const metrics = [
  { id: "sleep", label: "Сон", icon: Moon, unit: "ч" },
  { id: "energy", label: "Энергия", icon: Sun, unit: "/ 5" },
  { id: "mood", label: "Настроение", icon: Heart, unit: "/ 5" },
] as const;
export function WellbeingChart({ days }: { days: string[] }) {
  const { state, go } = useApp();
  const [metric, setMetric] = useState<Metric>("sleep");
  const points = days.map((date, index) => ({
    date,
    index,
    value: state.checkins[date]?.[metric],
  }));
  const recorded = points.filter((p) => p.value !== undefined);
  const info = metrics.find((m) => m.id === metric)!;
  const maximum =
    metric === "sleep"
      ? Math.max(8, ...recorded.map((p) => Math.ceil(p.value! / 2) * 2))
      : 5;
  const average = recorded.length
    ? recorded.reduce((a, p) => a + p.value!, 0) / recorded.length
    : null;
  const x = (index: number) => 45 + (index / (days.length - 1)) * 650;
  const y = (value: number) => 185 - (value / maximum) * 150;
  const runs: (typeof points)[] = [];
  for (const point of points) {
    if (point.value === undefined) {
      if (runs.at(-1)?.length) runs.push([]);
    } else {
      if (!runs.length) runs.push([]);
      runs.at(-1)!.push(point);
    }
  }
  return (
    <section className="panel wellbeing-panel">
      <SectionHead
        index="02"
        title="На своей волне"
        action={
          <div className="segmented" aria-label="Показатель самочувствия">
            {metrics.map((m) => (
              <button
                key={m.id}
                aria-pressed={metric === m.id}
                className={metric === m.id ? "active" : ""}
                onClick={() => setMetric(m.id)}
              >
                <m.icon size={13} />
                {m.label}
              </button>
            ))}
          </div>
        }
      />
      {recorded.length ? (
        <>
          <div className="wellbeing-average">
            <strong>
              {average!.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}
              <small>{info.unit}</small>
            </strong>
            <span>
              Среднее по {recorded.length}{" "}
              {recorded.length === 1 ? "записи" : "записям"} за период
            </span>
          </div>
          <svg
            className="wellbeing-chart"
            viewBox="0 0 730 230"
            role="img"
            aria-label={`${info.label}: среднее ${average!.toFixed(1)} ${info.unit}, записей ${recorded.length}. Дни без записей не соединяются.`}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((r) => (
              <g key={r}>
                <line
                  x1="45"
                  x2="695"
                  y1={y(maximum * r)}
                  y2={y(maximum * r)}
                  stroke="currentColor"
                  strokeOpacity=".1"
                />
                <text x="29" y={y(maximum * r) + 3} textAnchor="end">
                  {(maximum * r).toLocaleString("ru-RU", {
                    maximumFractionDigits: 1,
                  })}
                </text>
              </g>
            ))}
            {runs
              .filter((r) => r.length > 1)
              .map((run, i) => (
                <polyline
                  key={i}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  points={run
                    .map((p) => `${x(p.index)},${y(p.value!)}`)
                    .join(" ")}
                />
              ))}
            {recorded.map((p) => (
              <circle
                key={p.date}
                cx={x(p.index)}
                cy={y(p.value!)}
                r="4"
                fill="var(--accent)"
              >
                <title>
                  {fmt(p.date)}: {p.value} {info.unit}
                </title>
              </circle>
            ))}
            {points
              .filter(
                (p, i) =>
                  days.length === 7 || i % 5 === 0 || i === days.length - 1,
              )
              .map((p) => (
                <text key={p.date} x={x(p.index)} y="215" textAnchor="middle">
                  {fmt(
                    p.date,
                    days.length === 7
                      ? { weekday: "short" }
                      : { day: "numeric", month: "short" },
                  )}
                </text>
              ))}
          </svg>
          <details className="chart-data">
            <summary>Записи самочувствия текстом</summary>
            {points.map((p) => (
              <p key={p.date}>
                {fmt(p.date)}:{" "}
                {p.value === undefined
                  ? "Нет записи"
                  : `${p.value} ${info.unit}`}
              </p>
            ))}
          </details>
          <p className="field-help">
            Пропущенные дни не считаются нулём. Показатели помогают замечать
            свой ритм и не являются медицинской оценкой.
          </p>
        </>
      ) : (
        <Empty
          title="Прислушайся к себе"
          description="Отметьте сон, энергию и настроение в привычках. Здесь появится их динамика."
          action={
            <button className="btn" onClick={() => go("habits")}>
              Записать самочувствие
            </button>
          }
        />
      )}
    </section>
  );
}
