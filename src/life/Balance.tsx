import { useState, useEffect } from "react";
import { useApp, fmt } from "../context";
import { areas } from "./schema";
import { areaLabels, areaColors } from "./stats";
import { Metric, DateNav, DeleteButton } from "./ui";
import { SectionHead, Empty } from "../components/ui";
type Ratings = Record<
  (typeof areas)[number],
  { score: number; importance: number }
>;
export function Balance() {
  const { state, update, today, toast } = useApp();
  const [date, setDate] = useState(today);
  const dates = Object.keys(state.life.balance).sort().reverse();
  const entry = state.life.balance[date];
  const points = areas.map((a, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 3;
    const score = entry?.[a].score || 0;
    return {
      area: a,
      x: 160 + Math.cos(angle) * score * 11,
      y: 155 + Math.sin(angle) * score * 11,
      axisX: 160 + Math.cos(angle) * 110,
      axisY: 155 + Math.sin(angle) * 110,
    };
  });
  const rated = areas.filter((a) => entry?.[a].score > 0);
  const previousDate = dates.find((d) => d < date);
  const previous = previousDate ? state.life.balance[previousDate] : null;
  const avg =
    entry && rated.length
      ? rated.reduce((sum, a) => sum + entry[a].score, 0) / rated.length
      : null;
  const oldRated = previous ? areas.filter((a) => previous[a].score > 0) : [];
  const oldMean =
    previous && oldRated.length
      ? oldRated.reduce((sum, a) => sum + previous[a].score, 0) /
        oldRated.length
      : null;
  const comparable = previous && rated.length === 6 && oldRated.length === 6;
  return (
    <>
      <div className="life-section-intro">
        <div>
          <span className="eyebrow">LIFE IS MORE THAN A CHECKLIST</span>
          <h2>Баланс, который подходит тебе.</h2>
          <p>Оцени удовлетворённость сферами жизни и их важность для себя.</p>
        </div>
        <DateNav date={date} onChange={setDate} max={today} />
      </div>
      <div className="life-metrics three">
        <Metric
          label="Средняя оценка"
          value={
            avg === null
              ? "—"
              : avg.toLocaleString("ru-RU", { maximumFractionDigits: 1 })
          }
          note={`Оценено ${rated.length} из 6 сфер`}
        />
        <Metric
          label="Изменение с прошлого обзора"
          value={
            comparable && avg !== null && oldMean !== null
              ? `${avg - oldMean >= 0 ? "+" : ""}${(avg - oldMean).toFixed(1)}`
              : "—"
          }
          note={
            comparable && previousDate
              ? `Сравнение с ${fmt(previousDate)}`
              : "Для сравнения нужны две полные оценки"
          }
        />
        <Metric
          label="Обзоров сохранено"
          value={dates.length}
          note="Это личные оценки, не объективный рейтинг жизни"
        />
      </div>
      <div className="life-two">
        <section className="panel balance-wheel">
          <SectionHead index="01" title="Моё колесо жизни" />
          {entry ? (
            <>
              <svg
                viewBox="0 0 320 310"
                role="img"
                aria-label={`Баланс сфер жизни: ${rated.map((a) => `${areaLabels[a]} ${entry[a].score} из 10`).join(", ")}`}
              >
                <g stroke="currentColor" strokeOpacity=".15" fill="none">
                  {[2, 4, 6, 8, 10].map((level) => (
                    <polygon
                      key={level}
                      points={points
                        .map((p, i) => {
                          const angle = -Math.PI / 2 + (i * Math.PI) / 3;
                          return `${160 + Math.cos(angle) * level * 11},${155 + Math.sin(angle) * level * 11}`;
                        })
                        .join(" ")}
                    />
                  ))}
                  {points.map((p) => (
                    <line
                      key={p.area}
                      x1="160"
                      y1="155"
                      x2={p.axisX}
                      y2={p.axisY}
                    />
                  ))}
                </g>
                {rated.length === 6 && (
                  <polygon
                    points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="var(--accent)"
                    fillOpacity=".12"
                    stroke="var(--accent)"
                    strokeWidth="2"
                  />
                )}
                {points
                  .filter((p) => entry[p.area].score > 0)
                  .map((p) => (
                    <g key={p.area}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="5"
                        fill={areaColors[p.area]}
                      />
                      <title>
                        {areaLabels[p.area]}: {entry[p.area].score}/10
                      </title>
                    </g>
                  ))}
                {points.map((p) => (
                  <text
                    key={p.area}
                    x={160 + (p.axisX - 160) * 1.28}
                    y={155 + (p.axisY - 155) * 1.18}
                    textAnchor="middle"
                    fill="currentColor"
                  >
                    {areaLabels[p.area]}
                  </text>
                ))}
              </svg>
              <p className="field-help">
                Сферы без оценки показаны без точек. Полное колесо появится
                после оценки всех шести сфер.
              </p>
            </>
          ) : (
            <Empty
              title="Начни со своего ощущения"
              description="Заполни оценки справа — колесо появится после сохранения."
            />
          )}
        </section>
        <section className="panel">
          <SectionHead index="02" title="Оценка и важность" />
          <BalanceForm
            key={date}
            date={date}
            values={entry}
            onSave={(values) => {
              update((s) => ({
                ...s,
                life: {
                  ...s.life,
                  balance: { ...s.life.balance, [date]: values },
                },
              }));
              toast("Обзор баланса сохранён");
            }}
          />
        </section>
      </div>
      {dates.length > 0 && (
        <section className="panel">
          <SectionHead index="03" title="История обзоров" />
          <div className="balance-history">
            {dates.map((d) => (
              <div key={d}>
                <button onClick={() => setDate(d)}>
                  {fmt(d, { day: "numeric", month: "long", year: "numeric" })}
                  <small>
                    {
                      areas.filter((a) => state.life.balance[d][a].score > 0)
                        .length
                    }{" "}
                    / 6 сфер
                  </small>
                </button>
                <DeleteButton
                  title={`Баланс за ${fmt(d)}`}
                  onDelete={() =>
                    update((s) => {
                      const balance = { ...s.life.balance };
                      delete balance[d];
                      return { ...s, life: { ...s.life, balance } };
                    })
                  }
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
function BalanceForm({
  values,
  onSave,
}: {
  date: string;
  values?: Ratings;
  onSave: (v: Ratings) => void;
}) {
  const [ratings, setRatings] = useState<Ratings>(
    values ||
      (Object.fromEntries(
        areas.map((a) => [a, { score: 0, importance: 3 }]),
      ) as Ratings),
  );
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty)
      setRatings(
        values ||
          (Object.fromEntries(
            areas.map((a) => [a, { score: 0, importance: 3 }]),
          ) as Ratings),
      );
  }, [values, dirty]);
  return (
    <form
      className="balance-form"
      onChange={() => setDirty(true)}
      onSubmit={(e) => {
        e.preventDefault();
        onSave(ratings);
        setDirty(false);
      }}
    >
      {areas.map((a) => (
        <fieldset key={a}>
          <legend>
            <i style={{ background: areaColors[a] }} />
            {areaLabels[a]}
            <strong>
              {ratings[a].score ? `${ratings[a].score}/10` : "Нет оценки"}
            </strong>
          </legend>
          <label className="sr-only" htmlFor={`score-${a}`}>
            Оценка: {areaLabels[a]}
          </label>
          <input
            id={`score-${a}`}
            type="range"
            min="0"
            max="10"
            value={ratings[a].score}
            onChange={(e) =>
              setRatings({
                ...ratings,
                [a]: { ...ratings[a], score: Number(e.target.value) },
              })
            }
          />
          <label>
            Важность
            <select
              value={ratings[a].importance}
              onChange={(e) =>
                setRatings({
                  ...ratings,
                  [a]: { ...ratings[a], importance: Number(e.target.value) },
                })
              }
            >
              {[1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>
                  {v} / 5
                </option>
              ))}
            </select>
          </label>
        </fieldset>
      ))}
      <button className="btn primary">Сохранить баланс</button>
    </form>
  );
}
