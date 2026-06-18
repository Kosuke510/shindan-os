import { Layers3 } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-[#222b46] text-white shadow-sm">
        <Layers3 size={18} strokeWidth={2.2} />
      </span>
      {!compact && (
        <div className="leading-none">
          <p className="text-[15px] font-extrabold tracking-[-0.02em] text-[#202740]">Shindan OS</p>
          <p className="mt-1 text-[9px] font-bold tracking-[0.18em] text-slate-400">STUDY SYSTEM</p>
        </div>
      )}
    </div>
  );
}
