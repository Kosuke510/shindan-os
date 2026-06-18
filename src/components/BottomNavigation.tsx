import { BookOpenCheck, Database, Home, ListChecks, ShieldCheck } from "lucide-react";
import type { AppView } from "@/types";

interface BottomNavigationProps {
  active: AppView;
  practiceBadge: number;
  reviewBadge: number;
  onSelect: (view: AppView) => void;
}

const items = [
  { id: "home", label: "Home", icon: Home },
  { id: "practice", label: "Practice", icon: BookOpenCheck },
  { id: "weak", label: "Weak", icon: ListChecks },
  { id: "review", label: "Review", icon: ShieldCheck },
  { id: "data", label: "Data", icon: Database },
] satisfies Array<{ id: AppView; label: string; icon: typeof Home }>;

export function BottomNavigation({ active, practiceBadge, reviewBadge, onSelect }: BottomNavigationProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 px-2 pt-1.5 shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur-xl lg:hidden" style={{ paddingBottom: "max(0.4rem, env(safe-area-inset-bottom))" }} aria-label="モバイルナビゲーション">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ id, label, icon: Icon }) => {
          const selected = active === id;
          const badge = id === "practice" ? practiceBadge : id === "review" ? reviewBadge : 0;
          return (
            <button type="button" key={id} onClick={() => onSelect(id)} aria-current={selected ? "page" : undefined} className={`relative flex min-h-15 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 transition ${selected ? "text-blue-700" : "text-slate-400 hover:text-slate-700"}`}>
              <span className={`relative grid size-7 place-items-center rounded-lg ${selected ? "bg-blue-50" : ""}`}><Icon size={18} strokeWidth={selected ? 2.4 : 2} />{badge > 0 && <span className="absolute -right-2 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[8px] font-black leading-4 text-white ring-2 ring-white">{badge >= 99 ? "99+" : badge}</span>}</span>
              <span className="truncate text-[10px] font-black tracking-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
