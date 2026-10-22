import { createContext, useContext } from "react";
import {
  LayoutDashboard,
  Orbit,
  CalendarDays,
  Folder,
  Utensils,
  ChartNoAxesCombined,
  Settings,
  Droplets,
  Moon,
  Sun,
  Heart,
  Activity,
  Leaf,
  Sparkles,
} from "lucide-react";
import type { AppState } from "./data";

export type Page =
  "home" | "habits" | "planner" | "projects" | "food" | "insights" | "settings";
export type Setter = (fn: (s: AppState) => AppState) => void;
export const Context = createContext<{
  state: AppState;
  update: Setter;
  toast: (s: string) => void;
  go: (p: Page) => void;
  today: string;
}>(null!);
export const useApp = () => useContext(Context);
export const nav = [
  { id: "home", label: "Главная", en: "Overview", icon: LayoutDashboard },
  { id: "habits", label: "Привычки", en: "Habits", icon: Orbit },
  { id: "planner", label: "Планер", en: "Planner", icon: CalendarDays },
  { id: "projects", label: "Проекты", en: "Projects", icon: Folder },
  { id: "food", label: "Рецепты", en: "Food & fuel", icon: Utensils },
  {
    id: "insights",
    label: "Аналитика",
    en: "Insights",
    icon: ChartNoAxesCombined,
  },
  { id: "settings", label: "Настройки", en: "Settings", icon: Settings },
] as const;
export const priorityLabel = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};
export const habitIcons = {
  water: Droplets,
  moon: Moon,
  sun: Sun,
  heart: Heart,
  activity: Activity,
  leaf: Leaf,
  sparkles: Sparkles,
};
export const fmt = (
  date: string,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" },
) => new Date(date + "T12:00:00").toLocaleDateString("ru-RU", opts);
