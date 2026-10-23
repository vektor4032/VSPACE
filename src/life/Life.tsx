import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Target,
  Heart,
  ChartNoAxesCombined,
  Utensils,
  Wallet,
  Sparkles,
} from "lucide-react";
import { PageHeading } from "../components/ui";
import { Overview } from "./Overview";
import type { LifeTab } from "./Overview";
import { Week } from "./Week";
import { Goals } from "./Goals";
import { Psychology } from "./Psychology";
import { Balance } from "./Balance";
import { Nutrition } from "./Nutrition";
import { Finance } from "./Finance";
import { Inspiration } from "./Inspiration";
const tabs = [
  { id: "overview", label: "Обзор", icon: LayoutDashboard },
  { id: "week", label: "Моя неделя", icon: CalendarDays },
  { id: "goals", label: "21 / 90 дней", icon: Target },
  { id: "psychology", label: "Психология", icon: Heart },
  { id: "balance", label: "Баланс сфер", icon: ChartNoAxesCombined },
  { id: "nutrition", label: "Питание", icon: Utensils },
  { id: "finance", label: "Финансы", icon: Wallet },
  { id: "inspiration", label: "Вдохновение", icon: Sparkles },
] as const;
function readTab(): LifeTab {
  const t = new URLSearchParams(location.hash.split("?")[1] || "").get("tab");
  return tabs.some((x) => x.id === t) ? (t as LifeTab) : "overview";
}
export function Life() {
  const [tab, setTab] = useState(readTab);
  useEffect(() => {
    const f = () => setTab(readTab());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  function open(t: LifeTab) {
    setTab(t);
    history.replaceState(null, "", `#life?tab=${t}`);
  }
  return (
    <>
      <PageHeading
        eyebrow="SMALL STEPS / YOUR WHOLE LIFE"
        title="Моя жизнь."
        description="Планы, баланс и развитие. Маленькими шагами, в своём ритме."
      />
      <nav className="life-tabs" aria-label="Разделы моей жизни">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => open(t.id)}
          >
            <t.icon size={17} />
            {t.label}
          </button>
        ))}
      </nav>
      <div className="life-content" key={tab}>
        {tab === "overview" ? (
          <Overview open={open} />
        ) : tab === "week" ? (
          <Week />
        ) : tab === "goals" ? (
          <Goals />
        ) : tab === "psychology" ? (
          <Psychology />
        ) : tab === "balance" ? (
          <Balance />
        ) : tab === "nutrition" ? (
          <Nutrition />
        ) : tab === "finance" ? (
          <Finance />
        ) : (
          <Inspiration />
        )}
      </div>
    </>
  );
}
