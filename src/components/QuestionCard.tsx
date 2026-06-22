"use client";

import { useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpenCheck, CalendarClock, Check, CircleCheck, Clock3, Lightbulb, PenLine, Target, X } from "lucide-react";
import { subjectMap } from "@/data/subjects";
import type { ContentReviewRecord, GradeResult, Question, SelfGrade } from "@/types";
import { getEffectiveContentReview, isContentReviewDue, isContentReviewUnconfirmed } from "@/utils/contentReview";

interface QuestionCardProps {
  question: Question;
  sessionLabel: string;
  current: number;
  total: number;
  secondsLeft?: number;
  contentReview?: ContentReviewRecord;
  onGrade: (question: Question, selectedAnswer: string, grade: SelfGrade) => GradeResult;
  onNext: () => void;
  onClose: () => void;
}

const gradeOptions: Array<{ grade: SelfGrade; label: string; score: string; style: string }> = [
  { grade: "correct", label: "正解", score: "10点", style: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
  { grade: "almost", label: "ほぼ正解", score: "6点", style: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" },
  { grade: "incorrect", label: "不正解", score: "0点", style: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
];

export function QuestionCard({ question, sessionLabel, current, total, secondsLeft, contentReview, onGrade, onNext, onClose }: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [grade, setGrade] = useState<SelfGrade | null>(null);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const subject = subjectMap[question.subject];
  const usesChoiceInput = question.type === "4択";
  const canSubmit = Boolean(selectedAnswer?.trim());
  const sourceKindLabel = { "過去問": "過去問ベース", "自作": "自作問題", "教材": "教材ベース", "手入力": "手入力" }[question.source];
  const sourceLabel = [sourceKindLabel, question.sourceYear ? `${question.sourceYear}年度` : undefined, question.sourceSubject, question.sourceQuestionNumber]
    .filter((value): value is string => Boolean(value))
    .join(" · ");
  const review = getEffectiveContentReview(question, contentReview);
  const reviewDue = isContentReviewDue(question, contentReview);
  const reviewUnconfirmed = isContentReviewUnconfirmed(question, contentReview);
  const reviewRiskLabel = question.subject === "policy" ? "制度改正注意" : question.subject === "law" || question.field.includes("労働") || question.topic.includes("ハラスメント") ? "法改正注意" : "年度注意";
  const confirmedYearLabel = review.confirmedYear?.endsWith("年度") ? review.confirmedYear : `${review.confirmedYear ?? "未確認"}年度`;
  const evidenceUrl = review.reviewEvidence?.sourceUrl?.match(/^https?:\/\//) ? review.reviewEvidence.sourceUrl : undefined;

  const handleGrade = (value: SelfGrade) => {
    if (!selectedAnswer?.trim() || grade) return;
    setGrade(value);
    setGradeResult(onGrade(question, selectedAnswer.trim(), value));
  };

  const timer = secondsLeft === undefined ? null : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto bg-[#f6f7fb]">
      <header className="safe-area-top sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] max-w-4xl items-center gap-3 px-4 sm:px-6">
          <button type="button" onClick={onClose} aria-label="学習を終了して戻る" className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-xs font-black text-slate-500 hover:bg-slate-100"><ArrowLeft size={17} />戻る</button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-[#23304d]">{sessionLabel}</p>
            <p className="text-[10px] font-bold text-slate-400">問題 {current} / {total}</p>
          </div>
          {timer && <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-black ${secondsLeft! <= 60 ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"}`}><Clock3 size={15} />{timer}</span>}
        </div>
        <div className="h-1 bg-slate-100"><div className="h-full bg-blue-600 transition-all" style={{ width: `${(current / total) * 100}%` }} /></div>
      </header>

      <main className="mx-auto max-w-3xl px-3.5 py-5 pb-28 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg px-2.5 py-1.5 text-[10px] font-black" style={{ background: subject.softAccent, color: subject.accent }}>{subject.code} · {subject.shortName}</span>
          <span className="rounded-lg bg-slate-200/70 px-2.5 py-1.5 text-[10px] font-black text-slate-600">Core {question.coreName}</span>
          <span className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black ring-1 ${question.importance === "A" ? "bg-blue-50 text-blue-700 ring-blue-100" : question.importance === "B" ? "bg-amber-50 text-amber-700 ring-amber-100" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>{question.importance ?? question.rank}論点</span>
          <span className="max-w-full break-words rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-black text-blue-700">出典: {sourceLabel}</span>
          {question.isYearSensitive && <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-black text-amber-700">{reviewRiskLabel}</span>}
          {question.isYearSensitive && <span className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black ${reviewUnconfirmed ? "bg-orange-50 text-orange-700" : reviewDue ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>{reviewUnconfirmed ? "未確認" : reviewDue ? "要レビュー" : `${confirmedYearLabel}確認済み`}</span>}
          <span className="ml-auto text-[10px] font-bold text-slate-400">{question.type} · {question.difficulty}</span>
        </div>

        <article className="mt-4 rounded-[22px] border border-slate-200/90 bg-white p-4 shadow-[0_8px_32px_rgba(15,23,42,.05)] sm:rounded-[26px] sm:p-8">
          <p className="text-[10px] font-black tracking-[0.16em] text-blue-600">QUESTION</p>
          <h1 className="mt-3 text-[17px] font-bold leading-8 text-[#26304a] sm:text-xl sm:leading-9">{question.question}</h1>

          {usesChoiceInput ? (
            <div className="mt-7 space-y-3">
              {(question.choices ?? []).map((choice, index) => {
                const selected = selectedAnswer === choice;
                const isAnswer = answerLocked && choice === question.answer;
                const isWrongSelection = answerLocked && selected && choice !== question.answer;
                return (
                  <button
                    type="button"
                    key={choice}
                    disabled={answerLocked}
                    onClick={() => setSelectedAnswer(choice)}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-xl border p-3.5 text-left transition sm:p-4 ${isAnswer ? "border-emerald-300 bg-emerald-50" : isWrongSelection ? "border-red-300 bg-red-50" : selected ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"}`}
                  >
                    <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-black ${isAnswer ? "bg-emerald-500 text-white" : isWrongSelection ? "bg-red-500 text-white" : selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>{isAnswer ? <Check size={16} /> : String.fromCharCode(65 + index)}</span>
                    <span className="text-sm font-bold leading-6 text-slate-700">{choice}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-7">
              <label htmlFor="answer-input" className="flex items-center gap-2 text-xs font-black text-slate-600"><PenLine size={15} className="text-blue-600" />自分の答えを入力</label>
              <textarea
                id="answer-input"
                value={selectedAnswer ?? ""}
                disabled={answerLocked}
                onChange={(event) => setSelectedAnswer(event.target.value)}
                inputMode={question.type === "計算" ? "decimal" : "text"}
                rows={3}
                placeholder={question.type === "計算" ? "計算結果を入力してください（単位を含めても構いません）" : "考えた答えを自分の言葉で入力してください"}
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base font-semibold leading-7 text-slate-700 outline-none transition placeholder:text-sm placeholder:font-medium placeholder:text-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
              />
              <p className="mt-2 text-[10px] font-semibold leading-5 text-slate-400">表現が完全一致しなくても構いません。回答後に模範解答と照らして自己採点します。</p>
            </div>
          )}

          {!answerLocked && (
            <button type="button" disabled={!canSubmit} onClick={() => setAnswerLocked(true)} className="sticky bottom-3 z-10 mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#17213a] px-5 py-4 text-sm font-black text-white shadow-[0_10px_30px_rgba(15,23,42,.2)] transition hover:bg-[#223052] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
              回答を確定する<ArrowRight size={17} />
            </button>
          )}

          {answerLocked && !grade && (
            <div className="sticky bottom-3 z-10 mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-[0_12px_32px_rgba(37,99,235,.14)]">
              <p className="text-center text-xs font-black text-[#273552]">手応えを自己採点してください</p>
              <p className="mt-1 text-center text-[10px] font-semibold leading-5 text-slate-500">あなたの回答：{selectedAnswer}</p>
              <div className="mt-3 rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-center"><p className="text-[10px] font-black text-slate-400">模範解答</p><p className="mt-1 text-sm font-black text-emerald-700">{question.answer}</p></div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {gradeOptions.map((option) => (
                  <button type="button" key={option.grade} onClick={() => handleGrade(option.grade)} className={`min-h-14 rounded-xl border px-2 py-3 text-center transition ${option.style}`}>
                    <span className="block text-sm font-black">{option.label}</span><span className="mt-0.5 block text-[10px] font-bold opacity-75">{option.score}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {grade && gradeResult && (
            <div className="mt-6 animate-[fadeIn_.25s_ease-out] space-y-4">
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black ${grade === "correct" ? "bg-emerald-50 text-emerald-700" : grade === "almost" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                {grade === "correct" ? <CircleCheck size={19} /> : <AlertTriangle size={19} />}
                {grade === "correct" ? "正解として記録しました" : grade === "almost" ? "ほぼ正解：Weak論点に追加しました" : "不正解：Weak論点に追加しました"}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black tracking-wider text-slate-400">CORRECT ANSWER</p>
                <p className="mt-1 text-sm font-black text-emerald-700">{question.answer}</p>
              </div>
              <div className="rounded-xl bg-blue-50/60 p-4">
                <div className="flex items-center gap-2 text-xs font-black text-blue-700"><Lightbulb size={16} />解説</div>
                <p className="mt-2 text-sm leading-7 text-slate-600">{question.explanation}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Insight icon={AlertTriangle} label="よくある誤り" text={question.commonMistake} tone="amber" />
                <Insight icon={Target} label="試験ポイント" text={question.examPoint} tone="blue" />
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-4">
                <BookOpenCheck size={16} className="text-slate-400" /><span className="mr-1 text-xs font-black text-slate-600">関連論点</span>
                {question.relatedTopics.map((topic) => <span key={topic} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{topic}</span>)}
              </div>
              {question.sourceNote && (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[10px] font-black tracking-wider text-slate-400">SOURCE NOTE</p>
                  <p className="mt-1 text-xs leading-6 text-slate-600">{question.sourceNote}</p>
                </div>
              )}
              {question.isYearSensitive && (
                <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-black tracking-wider text-amber-700">CONTENT FRESHNESS</p>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${reviewUnconfirmed ? "bg-orange-100 text-orange-700" : reviewDue ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{reviewUnconfirmed ? "未確認" : reviewDue ? "要レビュー" : "確認済み"}</span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-xs leading-6 sm:grid-cols-2">
                    <div><dt className="font-bold text-slate-400">出典</dt><dd className="font-semibold text-slate-600">{sourceLabel}</dd></div>
                    <div><dt className="font-bold text-slate-400">確認年度</dt><dd className="font-semibold text-slate-600">{review.confirmedYear ?? "未確認"}</dd></div>
                    <div><dt className="font-bold text-slate-400">確認ソース</dt><dd className="font-semibold text-slate-600">{review.reviewEvidence?.sourceTitle || "未登録"}</dd></div>
                    <div><dt className="font-bold text-slate-400">確認日</dt><dd className="font-semibold text-slate-600">{review.reviewEvidence?.checkedAt ?? review.lastReviewedAt ?? "未実施"}</dd></div>
                  </dl>
                  {evidenceUrl && <a href={evidenceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-black text-blue-700 underline decoration-blue-200 underline-offset-4 hover:text-blue-900">確認ソースを開く</a>}
                </div>
              )}
              <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white p-4">
                <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600"><CalendarClock size={18} /></span>
                <div><p className="text-[10px] font-bold text-slate-400">次回復習</p><p className="text-sm font-black text-slate-700">{new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric" }).format(new Date(gradeResult.nextReviewAt))}（{gradeResult.intervalDays}日後）</p></div>
              </div>
              <button type="button" onClick={onNext} className="sticky bottom-3 z-10 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,235,.22)] transition hover:bg-blue-700">{current === total ? "学習を完了する" : "次の問題へ"}<ArrowRight size={17} /></button>
            </div>
          )}
        </article>
        <button type="button" onClick={onClose} className="mx-auto mt-5 flex min-h-11 items-center gap-1.5 px-3 text-xs font-bold text-slate-400 hover:text-slate-600"><X size={14} />あとで続ける</button>
      </main>
    </div>
  );
}

type InsightIcon = typeof AlertTriangle;
function Insight({ icon: Icon, label, text, tone }: { icon: InsightIcon; label: string; text: string; tone: "amber" | "blue" }) {
  return <div className={`rounded-xl p-4 ${tone === "amber" ? "bg-amber-50/70" : "bg-slate-50"}`}><div className={`flex items-center gap-2 text-xs font-black ${tone === "amber" ? "text-amber-700" : "text-blue-700"}`}><Icon size={15} />{label}</div><p className="mt-2 text-xs leading-6 text-slate-600">{text}</p></div>;
}
