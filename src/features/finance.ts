import type { AppState } from "../data";
export function nextMonth(date: string, anchor = Number(date.slice(-2))) {
  const year = Number(date.slice(0, 4)),
    month = Number(date.slice(5, 7));
  const next = new Date(Date.UTC(year, month, 1));
  const last = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(anchor, last)).padStart(2, "0")}`;
}
export function payRecurring(
  state: AppState,
  id: string,
  expectedDate: string,
  today: string,
): AppState {
  const p = state.features.recurring.find((p) => p.id === id);
  if (!p || !p.enabled || p.nextDate !== expectedDate || p.nextDate > today)
    return state;
  const txId = `recurring-${p.id}-${p.nextDate}`;
  return {
    ...state,
    life: {
      ...state.life,
      transactions: state.life.transactions.some((t) => t.id === txId)
        ? state.life.transactions
        : [
            ...state.life.transactions,
            {
              id: txId,
              date: today,
              type: "expense",
              amountMinor: p.amountMinor,
              category: p.category,
              note:
                p.nextDate === today
                  ? p.title
                  : `${p.title} · плановая дата ${p.nextDate}`,
            },
          ],
    },
    features: {
      ...state.features,
      recurring: state.features.recurring.map((x) =>
        x.id === id
          ? { ...x, nextDate: nextMonth(x.nextDate, x.anchorDay) }
          : x,
      ),
    },
  };
}
