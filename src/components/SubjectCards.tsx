import { ArrowUpRight, BarChart3 } from "lucide-react";
import { questions } from "@/data/questionCatalog";
import { subjects } from "@/data/subjects";
import type { LearningState, SubjectId, SubjectStat } from "@/types";
import { isReviewDue } from "@/utils/reviewScheduler";

interface SubjectCardsProps {
  stats: Record<SubjectId, SubjectStat>;
  progress: LearningState["questionProgress"];
  onSelect: (subject: SubjectId) => void;
}

const questionsBySubject = Object.fromEntries(subjects.map((subject) => [subject.id, questions.filter((question) => question.subject === subject.id)])) as Record<SubjectId, typeof questions>;

export function SubjectCards({ stats, progress, onSelect }: SubjectCardsProps) {
  return (
    <section aria-labelledby="subject-heading">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">SUBJECT CORES</p>
          <h2 id="subject-heading" className="mt-1 text-lg font-black tracking-tight text-[#17213a]">7科目のCore</h2>
        </div>
        <p className="text-xs font-semibold text-slate-400">各科目20問収録</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        {subjects.map((subject) => {
          const stat = stats[subject.id];
          const subjectQuestions = questionsBySubject[subject.id];
          const importanceA = subjectQuestions.filter((question) => (question.importance ?? question.rank) === "A").length;
          const importanceB = subjectQuestions.filter((question) => (question.importance ?? question.rank) === "B").length;
          const importanceC = subjectQuestions.filter((question) => (question.importance ?? question.rank) === "C").length;
          const unanswered = subjectQuestions.filter((question) => !progress[question.id]).length;
          const due = subjectQuestions.filter((question) => progress[question.id] && isReviewDue(progress[question.id])).length;
          return (
            <button
              type="button"
              key={subject.id}
              onClick={() => onSelect(subject.id)}
              className="group min-w-0 rounded-2xl border border-slate-200/90 bg-white p-3.5 text-left shadow-[0_2px_10px_rgba(15,23,42,.035)] transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_12px_28px_rgba(15,23,42,.08)] sm:p-4"
            >
              <div className="flex items-start justify-between">
                <span className="grid size-9 place-items-center rounded-xl text-[11px] font-black" style={{ background: subject.softAccent, color: subject.accent }}>{subject.code}</span>
                <ArrowUpRight size={15} className="text-slate-300 transition group-hover:text-blue-600" />
              </div>
              <p className="mt-4 text-sm font-black text-[#26304a]">{subject.shortName}</p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">{subject.name}</p>
              <div className="mt-3 grid grid-cols-2 gap-1 text-[10px] font-black">
                <span className="rounded-md bg-slate-50 px-1.5 py-1 text-slate-500">全{subjectQuestions.length}問</span>
                <span className="rounded-md bg-blue-50 px-1.5 py-1 text-blue-600">A {importanceA} · B {importanceB} · C {importanceC}</span>
                <span className="rounded-md bg-slate-50 px-1.5 py-1 text-slate-500">未回答 {unanswered}</span>
                <span className={`rounded-md px-1.5 py-1 ${due ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>復習 {due}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-400">
                <span>{stat.answers}回答</span>
                <span className="inline-flex items-center gap-1 text-slate-600"><BarChart3 size={11} />{stat.accuracy}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
