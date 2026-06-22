"use client";

import { useMemo, useState } from "react";
import { ArrowRight, BookOpenCheck, CircleDot, Target } from "lucide-react";
import { abcTopicCounts, abcTopicMap } from "@/data/abcTopics";
import { questions } from "@/data/questionCatalog";
import { subjectMap, subjects } from "@/data/subjects";
import type { AbcImportance, StudySessionConfig, SubjectId } from "@/types";

const importanceStyles: Record<AbcImportance, string> = {
  A: "border-blue-200 bg-blue-50 text-blue-700",
  B: "border-amber-200 bg-amber-50 text-amber-700",
  C: "border-slate-200 bg-slate-100 text-slate-600",
};

const importanceNotes: Record<AbcImportance, string> = {
  A: "最優先・安定得点",
  B: "60点超えの上積み",
  C: "余力・高得点狙い",
};

export function AbcTopicMap({ onStart }: { onStart: (config: StudySessionConfig) => void }) {
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>("finance");
  const [importance, setImportance] = useState<AbcImportance>("A");
  const selectedMap = abcTopicMap.subjects.find((subject) => subject.subject === selectedSubject)!;
  const visibleTopics = selectedMap.topics.filter((topic) => topic.importance === importance);
  const questionCounts = useMemo(() => questions.reduce<Record<string, number>>((counts, question) => {
    const tag = question.primaryExamTopicTag;
    if (tag) counts[tag] = (counts[tag] ?? 0) + 1;
    return counts;
  }, {}), []);

  return (
    <section className="mt-9 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_6px_24px_rgba(15,23,42,.045)]" aria-labelledby="abc-topic-heading">
      <div className="bg-[#17213a] p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black tracking-[0.16em] text-blue-200">PRIMARY EXAM MAP</p>
            <h2 id="abc-topic-heading" className="mt-1 text-xl font-black">ABC重要論点マップ</h2>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-300">過去問での反復性・得点化しやすさ・短期学習効率から、一次試験135論点を分類しています。</p>
          </div>
          <button type="button" onClick={() => onStart({ mode: "importance", importance: "A" })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-500"><BookOpenCheck size={16} />全科目のA論点を演習<ArrowRight size={14} /></button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {(["A", "B", "C"] as const).map((rank) => <div key={rank} className="rounded-xl bg-white/[0.07] px-2 py-3"><p className="text-[9px] font-bold text-slate-400">{importanceNotes[rank]}</p><p className="mt-1 text-lg font-black">{rank} {abcTopicCounts[rank]}</p></div>)}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex gap-2 overflow-x-auto pb-2" aria-label="ABC論点の科目">
          {subjects.map((subject) => <button type="button" key={subject.id} onClick={() => setSelectedSubject(subject.id)} className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-black transition ${selectedSubject === subject.id ? "border-[#17213a] bg-[#17213a] text-white" : "border-slate-200 bg-white text-slate-500 hover:border-blue-200"}`}>{subject.code} {subject.shortName}</button>)}
        </div>

        <div className="mt-4 rounded-2xl p-4" style={{ background: subjectMap[selectedSubject].softAccent }}>
          <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-xs font-black" style={{ color: subjectMap[selectedSubject].accent }}>{subjectMap[selectedSubject].code}</span><div><h3 className="text-sm font-black text-[#26304a]">{selectedMap.name}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{selectedMap.strategy}</p></div></div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2" aria-label="重要度フィルター">
          {(["A", "B", "C"] as const).map((rank) => {
            const count = selectedMap.topics.filter((topic) => topic.importance === rank).length;
            return <button type="button" key={rank} onClick={() => setImportance(rank)} className={`min-h-12 rounded-xl border px-2 text-xs font-black ${importance === rank ? importanceStyles[rank] : "border-slate-200 bg-white text-slate-500"}`}>{rank}論点 <span className="block text-[10px] opacity-70">{count}件</span></button>;
          })}
        </div>

        <div className="mt-4 space-y-3">
          {visibleTopics.map((topic) => {
            const questionCount = questionCounts[topic.codexTag] ?? 0;
            return (
              <article key={topic.codexTag} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-xl border text-sm font-black ${importanceStyles[topic.importance]}`}>{topic.importance}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-black text-slate-800">{topic.topic}</h4><span className={`rounded-full px-2 py-1 text-[9px] font-black ${questionCount ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{questionCount ? `${questionCount}問収録` : "未問題化"}</span></div><p className="mt-2 text-xs leading-5 text-slate-500"><span className="font-black text-slate-600">出題：</span>{topic.pastQuestionPattern}</p><p className="mt-1 text-xs leading-5 text-slate-500"><span className="font-black text-slate-600">学習：</span>{topic.studyTask}</p></div></div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-400"><CircleDot size={11} />{topic.codexTag}</span><button type="button" disabled={!questionCount} onClick={() => onStart({ mode: "importance", subject: selectedSubject, importance: topic.importance, topicTag: topic.codexTag })} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#17213a] px-3 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"><Target size={13} />この論点を解く</button></div>
              </article>
            );
          })}
        </div>

        <p className="mt-4 text-[10px] leading-5 text-slate-400">分類基準日：{abcTopicMap.createdAt}。制度・白書・法令の数値や要件は試験年度の最新資料で確認してください。</p>
      </div>
    </section>
  );
}
