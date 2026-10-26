import type { Recipe } from "../recipes/schema";
import type { Batch } from "./schema";
import { shiftDate } from "../data";
const aliases: Record<string, string> = {
  рисa: "рис",
  риса: "рис",
  "овсяных хлопьев": "овсяные хлопья",
  молока: "молоко",
  воды: "вода",
  "куриного филе": "куриное филе",
  "куриная грудка": "куриное филе",
  лука: "лук",
  "лук репчатый": "лук",
  "репчатый лук": "лук",
  onion: "лук",
  onions: "лук",
  помидоров: "помидоры",
  помидора: "помидоры",
  tomatoes: "помидоры",
  tomato: "помидоры",
  моркови: "морковь",
  carrots: "морковь",
  carrot: "морковь",
  картофеля: "картофель",
  potatoes: "картофель",
  potato: "картофель",
  соли: "соль",
  salt: "соль",
  сахара: "сахар",
  sugar: "сахар",
  "оливкового масла": "оливковое масло",
  "olive oil": "оливковое масло",
  чеснока: "чеснок",
  garlic: "чеснок",
  курицы: "курица",
  chicken: "курица",
  rice: "рис",
  water: "вода",
  milk: "молоко",
  яиц: "яйца",
  яйца: "яйца",
  яйцо: "яйца",
  "яйца куриные": "яйца",
  eggs: "яйца",
  egg: "яйца",
  банана: "банан",
  бананов: "банан",
  бананы: "банан",
  лимона: "лимон",
  лимоны: "лимон",
};
const clean = (s: string) =>
  s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
export function ingredientName(s: string) {
  const key = clean(s).replace(/[,;.]$/, "");
  return Object.hasOwn(aliases, key) ? aliases[key] : key;
}
const countable = new Set([
  "помидоры",
  "морковь",
  "лук",
  "яйца",
  "банан",
  "лимон",
  "картофель",
  "авокадо",
  "огурец",
  "яблоко",
  "груша",
]);
const unitMap: Record<string, [string, number]> = {
  г: ["г", 1],
  гр: ["г", 1],
  грамм: ["г", 1],
  граммов: ["г", 1],
  g: ["г", 1],
  grams: ["г", 1],
  gram: ["г", 1],
  кг: ["г", 1000],
  kg: ["г", 1000],
  мл: ["мл", 1],
  ml: ["мл", 1],
  л: ["мл", 1000],
  l: ["мл", 1000],
  литр: ["мл", 1000],
  литра: ["мл", 1000],
  литров: ["мл", 1000],
  шт: ["шт", 1],
  штук: ["шт", 1],
  штуки: ["шт", 1],
  штука: ["шт", 1],
  pcs: ["шт", 1],
  pc: ["шт", 1],
  "ст. л": ["мл", 15],
  "ст.л": ["мл", 15],
  tbsp: ["мл", 15],
  tbs: ["мл", 15],
  "ч. л": ["мл", 5],
  "ч.л": ["мл", 5],
  tsp: ["мл", 5],
};
export function normalizeUnit(unit: string): [string, number] {
  const key = clean(unit).replace(/\.$/, "");
  return Object.hasOwn(unitMap, key) ? unitMap[key] : [key, 1];
}
function amount(raw: string): number | null {
  const value = raw.trim().replace(",", ".");
  const mixed = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = value.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const fractions: Record<string, number> = {
    "½": 0.5,
    "¼": 0.25,
    "¾": 0.75,
    "⅓": 1 / 3,
    "⅔": 2 / 3,
    "⅛": 0.125,
  };
  const symbol = value.match(/^(\d*)\s*([½¼¾⅓⅔⅛])$/);
  if (symbol) return Number(symbol[1] || 0) + fractions[symbol[2]];
  return /^\d+(\.\d+)?$/.test(value) ? Number(value) : null;
}
export function parseMeasure(
  raw: string,
): { amount: number; unit: string } | null {
  const match = raw
    .trim()
    .match(
      /^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\s*[½¼¾⅓⅔⅛]|\d+(?:[.,]\d+)?)\s*([\p{L}.\s()\d]*)$/u,
    );
  if (!match) return null;
  const n = amount(match[1]);
  if (n === null || !Number.isFinite(n) || n <= 0) return null;
  return { amount: n, unit: match[2].trim() };
}
export function parseIngredientLine(
  line: string,
): Recipe["ingredients"][number] {
  const trimmed = line.trim();
  if (/^\d+(?:[.,]\d+)?\s*[-–]\s*\d/.test(trimmed)) return [trimmed, null, ""];
  const match = trimmed.match(
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\s*[½¼¾⅓⅔⅛]|\d+(?:[.,]\d+)?)\s*(.+)$/u,
  );
  if (!match) return [trimmed, null, ""];
  const n = amount(match[1]);
  if (!n || !Number.isFinite(n)) return [trimmed, null, ""];
  const tail = match[2].trim();
  const unit = tail.match(
    /^(ст\.\s*л\.?|ч\.\s*л\.?|tbsp|tsp|кг|граммов|грамм|гр\.?|г|мл|литров|литра|л|kg|ml|g|l|шт\.?)\s+(.+)$/iu,
  );
  return unit
    ? [ingredientName(unit[2]), n, unit[1]]
    : countable.has(ingredientName(tail))
      ? [ingredientName(tail), n, "шт"]
      : [ingredientName(tail), null, match[1]];
}
export type ShoppingItem = {
  name: string;
  unit: string;
  amount: number | null;
  notes: string[];
  recipes: string[];
  key: string;
};
export function shoppingList(batches: Batch[], week: string): ShoppingItem[] {
  const end = shiftDate(week, 6);
  const groups = new Map<string, Omit<ShoppingItem, "key">>();
  for (const batch of batches.filter((b) => b.date >= week && b.date <= end)) {
    for (const original of batch.recipe.ingredients) {
      let [name, n, unit] = original;
      if (n === null) {
        if (unit) {
          const parsed = parseMeasure(unit);
          if (parsed && (parsed.unit || countable.has(ingredientName(name)))) {
            n = parsed.amount;
            unit = parsed.unit || "шт";
          }
        } else {
          [name, n, unit] = parseIngredientLine(name);
        }
      }
      const canonical = ingredientName(name);
      const [baseUnit, factor] = normalizeUnit(unit);
      const key = JSON.stringify([canonical, n === null ? "?" : baseUnit]);
      const entry = groups.get(key) || {
        name: canonical,
        unit: n === null ? "" : baseUnit,
        amount: n === null ? null : 0,
        notes: [],
        recipes: [],
      };
      if (n !== null) {
        entry.amount =
          (entry.amount || 0) +
          (n * factor * batch.servings) / batch.baseServings;
      } else {
        const raw = [name, unit].filter(Boolean).join(" — ");
        if (!entry.notes.includes(raw)) entry.notes.push(raw);
      }
      if (!entry.recipes.includes(batch.recipe.title))
        entry.recipes.push(batch.recipe.title);
      groups.set(key, entry);
    }
  }
  return [...groups.values()]
    .map((item) => {
      if (item.amount !== null)
        item.amount = Math.round(item.amount * 1000) / 1000;
      return {
        ...item,
        key: JSON.stringify([
          item.name,
          item.unit,
          item.amount,
          [...item.notes].sort(),
        ]),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}
export const servesOn = (batch: Batch, date: string) =>
  date >= batch.date && date <= shiftDate(batch.date, batch.days - 1);
