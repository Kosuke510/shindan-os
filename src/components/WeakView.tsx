import { AppViewHeader } from "@/components/AppViewHeader";
import { WeakPointList } from "@/components/WeakPointList";
import { questions } from "@/data/questionCatalog";
import type { LearningState } from "@/types";

export function WeakView({ state, onStartQuestion }: { state: LearningState; onStartQuestion: (questionId: string) => void }) {
  const ids = new Set(questions.map((question) => question.id));
  const weakPoints = state.weakPoints.filter((item) => ids.has(item.questionId));
  return (
    <div className="min-h-dvh bg-[#f6f7fb] pb-28 text-[#17213a]">
      <AppViewHeader eyebrow="WEAK" title="弱点リスト" description="ほぼ正解・不正解だった論点を再演習" />
      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-7 sm:py-8">
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-500"><span className="font-black text-slate-700">{weakPoints.length}件のWeak論点</span><br />正解として自己採点すると弱点リストから自動で外れます。</div>
        <WeakPointList weakPoints={weakPoints} onSelect={onStartQuestion} showAll />
      </main>
    </div>
  );
}
