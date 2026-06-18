import { useMemo } from "react";
import { ArrowRight, CheckCircle2, Clock3, Shuffle, Sparkles } from "lucide-react";
import { AppViewHeader } from "@/components/AppViewHeader";
import { SubjectCards } from "@/components/SubjectCards";
import { questions } from "@/data/questionCatalog";
import type { LearningState, StudySessionConfig } from "@/types";
import { isReviewDue } from "@/utils/reviewScheduler";
import { getSubjectStats } from "@/utils/stats";

export function PracticeView({ state, onStart }: { state: LearningState; onStart: (config: StudySessionConfig) => void }) {
  const dueCount = useMemo(() => questions.filter((question) => state.questionProgress[question.id] && isReviewDue(state.questionProgress[question.id])).length, [state.questionProgress]);
  const stats = useMemo(() => getSubjectStats({ answerHistory: state.answerHistory }), [state.answerHistory]);
  return (
    <div className="min-h-dvh bg-[#f6f7fb] pb-28 text-[#17213a]">
      <AppViewHeader eyebrow="PRACTICE" title="問題演習" description="復習、新規問題、科目別演習の入口" />
      <main className="mx-auto max-w-[1100px] px-4 py-5 sm:px-7 sm:py-8">
        <section className="overflow-hidden rounded-[24px] bg-[#17213a] p-5 text-white shadow-[0_14px_40px_rgba(23,33,58,.16)] sm:p-7">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black tracking-wider text-blue-200"><Sparkles size={13} />START HERE</span>
          <h2 className="mt-4 text-xl font-black tracking-tight sm:text-2xl">今の集中力に合わせて始める</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">期限到来の問題を優先しつつ、短時間でも学習を止めない構成です。</p>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
            <ActionButton icon={Clock3} label="10分だけやる" note="復習・Weak優先の5問" primary onClick={() => onStart({ mode: "quick" })} />
            <ActionButton icon={ArrowRight} label={dueCount ? "復習タスクから" : "Aランク問題を1問"} note={dueCount ? `${dueCount}問が期限到来` : "新規問題を1問出題"} onClick={() => onStart({ mode: "review" })} />
            <ActionButton icon={Shuffle} label="ランダムで1問" note={`${questions.length}問から出題`} onClick={() => onStart({ mode: "random" })} />
          </div>
        </section>

        {dueCount === 0 && <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4"><CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-600" /><div><p className="text-sm font-black text-emerald-800">今日の復習タスクはありません</p><p className="mt-1 text-xs leading-5 text-emerald-700">Aランクの新規問題に進みましょう。</p></div></div>}
        <div className="mt-8"><SubjectCards stats={stats} progress={state.questionProgress} onSelect={(subject) => onStart({ mode: "subject", subject })} /></div>
      </main>
    </div>
  );
}

function ActionButton({ icon: Icon, label, note, primary = false, onClick }: { icon: typeof Clock3; label: string; note: string; primary?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex min-h-16 items-center gap-3 rounded-xl px-4 py-3 text-left transition ${primary ? "bg-blue-600 text-white hover:bg-blue-500" : "border border-white/15 bg-white/10 text-white hover:bg-white/15"}`}><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${primary ? "bg-white/15" : "bg-white/10"}`}><Icon size={18} /></span><span><span className="block text-sm font-black">{label}</span><span className={`mt-0.5 block text-[10px] font-semibold ${primary ? "text-blue-100" : "text-slate-300"}`}>{note}</span></span></button>;
}
