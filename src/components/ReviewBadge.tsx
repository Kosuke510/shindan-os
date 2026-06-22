import { Bell } from "lucide-react";

interface ReviewBadgeProps {
  count: number;
  onClick: () => void;
}

export function ReviewBadge({ count, onClick }: ReviewBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={count ? `今日の復習タスク ${count}件` : "A論点問題を1問始める"}
      className="relative grid size-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <Bell size={19} />
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[10px] font-black leading-5 text-white ring-2 ring-[#f6f7fb]">
          {count >= 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
