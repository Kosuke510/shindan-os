import { Brand } from "@/components/Brand";

export function AppViewHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="safe-area-top sticky top-0 z-20 border-b border-slate-200/70 bg-[#f6f7fb]/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[72px] max-w-[1100px] items-center gap-4 px-4 py-3 pr-16 sm:px-7 sm:pr-20">
        <div className="shrink-0"><Brand compact /></div>
        <div className="min-w-0 border-l border-slate-200 pl-4"><p className="text-[9px] font-black tracking-[0.14em] text-blue-600">{eyebrow}</p><h1 className="truncate text-base font-black text-[#17213a]">{title}</h1><p className="hidden text-[10px] font-semibold text-slate-400 sm:block">{description}</p></div>
      </div>
    </header>
  );
}
