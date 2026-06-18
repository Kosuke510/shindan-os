import { AlertCircle, ArrowRight, BookMarked } from "lucide-react";
import { questions } from "@/data/questionCatalog";
import { subjectMap } from "@/data/subjects";
import type { WeakPoint } from "@/types";

interface WeakPointListProps {
  weakPoints: WeakPoint[];
  onSelect: (questionId: string) => void;
  showAll?: boolean;
}

export function WeakPointList({ weakPoints, onSelect, showAll = false }: WeakPointListProps) {
  const rows = weakPoints
    .map((weakPoint) => ({ weakPoint, question: questions.find((item) => item.id === weakPoint.questionId) }))
    .filter((row): row is { weakPoint: WeakPoint; question: NonNullable<typeof row.question> } => Boolean(row.question))
    .sort((a, b) => b.weakPoint.updatedAt.localeCompare(a.weakPoint.updatedAt));

  return (
    <section className="rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-[0_2px_14px_rgba(15,23,42,.035)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">WEAK POINTS</p>
          <h2 className="mt-1 text-lg font-black text-[#17213a]">Weak論点</h2>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{rows.length}件</span>
      </div>

      {rows.length === 0 ? (
        <div className="mt-5 flex min-h-40 flex-col items-center justify-center rounded-2xl bg-slate-50 px-4 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-white text-blue-600 shadow-sm"><BookMarked size={20} /></span>
          <p className="mt-3 text-sm font-black text-slate-700">弱点はまだありません</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">「ほぼ正解」または「不正解」の論点が自動で追加されます。</p>
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {(showAll ? rows : rows.slice(0, 6)).map(({ weakPoint, question }) => {
            const subject = subjectMap[question.subject];
            return (
              <button type="button" key={question.id} onClick={() => onSelect(question.id)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-blue-100 hover:bg-blue-50/40">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg text-[10px] font-black" style={{ background: subject.softAccent, color: subject.accent }}>{subject.code}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-slate-700">{question.topic}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-slate-400"><AlertCircle size={11} />{weakPoint.lastGrade === "almost" ? "ほぼ正解" : "不正解"} · {question.field}</span>
                </span>
                <ArrowRight size={15} className="shrink-0 text-slate-300" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
