import { Children, isValidElement } from "react";
import type { ReactNode } from "react";
import { useApp } from "../context";
import { homeBlocks } from "./schema";
import { ReminderSettings } from "./Reminders";
export const blockLabels: Record<(typeof homeBlocks)[number], string> = {
  hero: "Приветственная карточка",
  stats: "Прогресс и показатели",
  today: "Задачи и привычки",
  life: "Моя жизнь",
  projects: "Проекты",
};
export function OrderedHome({ children }: { children: ReactNode }) {
  const { state, go } = useApp();
  const elements = Children.toArray(children).filter(isValidElement);
  const home = state.features.home;
  return (
    <>
      {home.order
        .filter((id) => !home.hidden.includes(id))
        .map((id) =>
          elements.find(
            (e) =>
              (e.props as { "data-home-block"?: string })["data-home-block"] ===
              id,
          ),
        )}
      {home.hidden.length === 5 && (
        <div className="panel">
          <p>Все блоки скрыты. Можно вернуть нужные в настройках.</p>
          <button className="btn" onClick={() => go("settings")}>
            Настроить главную
          </button>
        </div>
      )}
    </>
  );
}
export function Personalization() {
  const { state, update } = useApp();
  const home = state.features.home;
  return (
    <div className="personal-tools">
      <section className="panel feature-card">
        <h3>Главная в твоём ритме</h3>
        <label>
          Открывать при запуске
          <select
            value={home.start}
            onChange={(e) =>
              update((s) => ({
                ...s,
                features: {
                  ...s.features,
                  home: {
                    ...s.features.home,
                    start: e.target.value as "home" | "day",
                  },
                },
              }))
            }
          >
            <option value="home">Главная</option>
            <option value="day">Мой день</option>
          </select>
        </label>
        <p className="field-help">
          Порядок и видимость блоков главной. Изменения действуют на всех
          устройствах с этим аккаунтом.
        </p>
        <div className="home-block-options">
          {home.order.map((id, index) => (
            <div key={id}>
              <label className="life-checkbox">
                <input
                  type="checkbox"
                  checked={!home.hidden.includes(id)}
                  onChange={() =>
                    update((s) => ({
                      ...s,
                      features: {
                        ...s.features,
                        home: {
                          ...s.features.home,
                          hidden: s.features.home.hidden.includes(id)
                            ? s.features.home.hidden.filter((x) => x !== id)
                            : [...s.features.home.hidden, id],
                        },
                      },
                    }))
                  }
                />
                {blockLabels[id]}
              </label>
              <div>
                <button
                  className="icon-btn"
                  disabled={index === 0}
                  aria-label={`Выше: ${blockLabels[id]}`}
                  onClick={() =>
                    update((s) => {
                      const order = [...s.features.home.order];
                      [order[index - 1], order[index]] = [
                        order[index],
                        order[index - 1],
                      ];
                      return {
                        ...s,
                        features: {
                          ...s.features,
                          home: { ...s.features.home, order },
                        },
                      };
                    })
                  }
                >
                  ↑
                </button>
                <button
                  className="icon-btn"
                  disabled={index === home.order.length - 1}
                  aria-label={`Ниже: ${blockLabels[id]}`}
                  onClick={() =>
                    update((s) => {
                      const order = [...s.features.home.order];
                      [order[index], order[index + 1]] = [
                        order[index + 1],
                        order[index],
                      ];
                      return {
                        ...s,
                        features: {
                          ...s.features,
                          home: { ...s.features.home, order },
                        },
                      };
                    })
                  }
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
        <label className="life-checkbox">
          <input
            type="checkbox"
            checked={home.celebrate}
            onChange={() =>
              update((s) => ({
                ...s,
                features: {
                  ...s.features,
                  home: {
                    ...s.features.home,
                    celebrate: !s.features.home.celebrate,
                  },
                },
              }))
            }
          />
          Праздновать выполненные задачи и дни челленджей
        </label>
        <small className="field-help">
          Эффект учитывает настройки анимации и сокращённого движения
          устройства.
        </small>
        <button
          className="btn"
          onClick={() =>
            update((s) => ({
              ...s,
              features: {
                ...s.features,
                home: {
                  ...s.features.home,
                  order: [...homeBlocks],
                  hidden: [],
                },
              },
            }))
          }
        >
          Вернуть все блоки
        </button>
      </section>
      <ReminderSettings />
    </div>
  );
}
