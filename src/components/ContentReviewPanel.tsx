"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, FilePenLine, ShieldCheck, X } from "lucide-react";
import { subjectMap } from "@/data/subjects";
import type { ContentReviewFilter, ContentReviewRecord, Question, ReviewEvidenceSourceType, ReviewOverride, ReviewPriority } from "@/types";
import { getEffectiveContentReview, isContentReviewDue, isContentReviewUnconfirmed } from "@/utils/contentReview";
import { toDateKey } from "@/utils/date";

interface ContentReviewPanelProps {
  questions: Question[];
  records: Record<string, ContentReviewRecord>;
  initialFilter?: ContentReviewFilter;
  onMarkReviewed: (question: Question, update: ReviewOverride) => void;
  onOpenQuestion: (questionId: string) => void;
  onClose: () => void;
}

const priorityOrder: Record<ReviewPriority, number> = { "高": 0, "中": 1, "低": 2 };
const sourceLabels = { "過去問": "過去問ベース", "自作": "自作問題", "教材": "教材ベース", "手入力": "手入力" } as const;
const evidenceTypes: ReviewEvidenceSourceType[] = ["公式", "白書", "法令", "過去問", "教材", "自作メモ", "その他"];
const filterOptions: Array<{ value: ContentReviewFilter; label: string }> = [
  { value: "unconfirmed", label: "未確認のみ" }, { value: "due", label: "要レビューのみ" }, { value: "high", label: "高優先度のみ" },
  { value: "policy", label: "中小企業政策のみ" }, { value: "law", label: "経営法務のみ" }, { value: "labor", label: "労働法規のみ" },
  { value: "no-evidence", label: "証跡なしのみ" }, { value: "all", label: "すべて" },
];

const isLaborQuestion = (question: Question): boolean => `${question.field} ${question.topic}`.match(/労働|育児・介護|社会保険|ハラスメント/) !== null;

export function ContentReviewPanel({ questions, records, initialFilter = "unconfirmed", onMarkReviewed, onOpenQuestion, onClose }: ContentReviewPanelProps) {
  const [filter, setFilter] = useState<ContentReviewFilter>(initialFilter);
  const [editingId, setEditingId] = useState<string | null>(null);
  const sensitiveQuestions = useMemo(() => questions
    .filter((question) => question.isYearSensitive)
    .sort((left, right) => {
      const unconfirmedDifference = Number(isContentReviewUnconfirmed(right, records[right.id])) - Number(isContentReviewUnconfirmed(left, records[left.id]));
      if (unconfirmedDifference) return unconfirmedDifference;
      const dueDifference = Number(isContentReviewDue(right, records[right.id])) - Number(isContentReviewDue(left, records[left.id]));
      if (dueDifference) return dueDifference;
      return priorityOrder[(records[left.id]?.reviewPriority ?? left.reviewPriority) ?? "中"] - priorityOrder[(records[right.id]?.reviewPriority ?? right.reviewPriority) ?? "中"];
    }), [questions, records]);

  const visibleQuestions = sensitiveQuestions.filter((question) => {
    const review = getEffectiveContentReview(question, records[question.id]);
    if (filter === "unconfirmed") return isContentReviewUnconfirmed(question, records[question.id]);
    if (filter === "due") return isContentReviewDue(question, records[question.id]);
    if (filter === "high") return review.reviewPriority === "高";
    if (filter === "policy") return question.subject === "policy";
    if (filter === "law") return question.subject === "law";
    if (filter === "labor") return isLaborQuestion(question);
    if (filter === "no-evidence") return !review.reviewEvidence;
    return true;
  });
  const unconfirmedCount = sensitiveQuestions.filter((question) => isContentReviewUnconfirmed(question, records[question.id])).length;
  const dueCount = sensitiveQuestions.filter((question) => isContentReviewDue(question, records[question.id])).length;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#f6f7fb]">
      <header className="safe-area-top sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[70px] max-w-5xl flex-wrap items-center gap-2 px-4 py-2 sm:flex-nowrap sm:gap-3 sm:px-6">
          <button type="button" onClick={onClose} aria-label="レビュー一覧を閉じる" className="grid size-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X size={20} /></button>
          <div className="min-w-0 flex-1"><p className="text-sm font-black text-[#23304d]">レビュー証跡・確認ソース</p><p className="text-[10px] font-bold text-slate-400">年度依存論点の根拠資料と鮮度を管理</p></div>
          <div className="ml-12 flex gap-1.5 sm:ml-0"><span className="rounded-full bg-amber-50 px-2.5 py-1.5 text-[10px] font-black text-amber-700">未確認 {unconfirmedCount}</span><span className="rounded-full bg-red-50 px-2.5 py-1.5 text-[10px] font-black text-red-600">期限到来 {dueCount}</span></div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 pb-12 sm:px-6 sm:py-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs leading-6 text-amber-900">
          <div className="flex items-center gap-2 font-black"><AlertTriangle size={16} />最新の法令・白書・制度公式ページを確認し、参照した資料を記録してください</div>
          <p className="mt-1 text-amber-800">資料名やURLが空でも保存できますが、証跡としては不完全です。</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2" aria-label="レビュー対象フィルター">
          {filterOptions.map((option) => <button type="button" key={option.value} onClick={() => setFilter(option.value)} className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-black transition ${filter === option.value ? "border-[#17213a] bg-[#17213a] text-white" : "border-slate-200 bg-white text-slate-500 hover:border-blue-200"}`}>{option.label}</button>)}
        </div>
        <p className="mt-2 text-xs font-bold text-slate-500">表示中 {visibleQuestions.length} / 年度依存 {sensitiveQuestions.length}問</p>

        {visibleQuestions.length ? <div className="mt-4 space-y-3">{visibleQuestions.map((question) => {
          const review = getEffectiveContentReview(question, records[question.id]);
          const unconfirmed = isContentReviewUnconfirmed(question, records[question.id]);
          const due = isContentReviewDue(question, records[question.id]);
          const subject = subjectMap[question.subject];
          return (
            <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_3px_14px_rgba(15,23,42,.04)] sm:p-5">
              <div className="flex flex-wrap items-start gap-2">
                <span className="rounded-lg px-2.5 py-1.5 text-[10px] font-black" style={{ background: subject.softAccent, color: subject.accent }}>{subject.code} · {subject.shortName}</span>
                <span className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black ${review.reviewPriority === "高" ? "bg-red-50 text-red-600" : review.reviewPriority === "中" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>優先度 {review.reviewPriority}</span>
                {unconfirmed && <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-black text-amber-700">未確認</span>}
                {due && <span className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[10px] font-black text-red-600">要レビュー</span>}
                {!unconfirmed && !due && <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black text-emerald-700">確認済み</span>}
                <span className="ml-auto text-[10px] font-bold text-slate-400">Rank {question.rank} · {sourceLabels[question.source]}</span>
              </div>
              <h2 className="mt-3 text-sm font-black text-[#26304a]">{question.coreName} / {question.topic}</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
                <ReviewValue label="確認年度" value={review.confirmedYear ?? "未確認"} alert={unconfirmed} />
                <ReviewValue label="有効確認日" value={review.validAsOf ?? "未設定"} />
                <ReviewValue label="最終レビュー" value={review.lastReviewedAt ?? "未実施"} />
                <ReviewValue label="次回期限" value={review.nextReviewDue ?? "未設定"} alert={due} />
              </div>
              <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-6 text-slate-600">
                <p>{review.reviewNote ?? "レビュー時に改正リスクを記録してください。"}</p>
                <p className="mt-1 font-bold text-slate-500">確認ソース：{review.reviewEvidence?.sourceTitle || "未登録"}{review.reviewEvidence?.sourceType ? `（${review.reviewEvidence.sourceType}）` : ""}</p>
              </div>
              {editingId === question.id && <EvidenceEditor question={question} record={records[question.id]} onSubmit={(update) => { onMarkReviewed(question, update); setEditingId(null); }} />}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => onOpenQuestion(question.id)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-600 hover:bg-slate-50">問題を見る<ArrowRight size={14} /></button>
                <button type="button" onClick={() => setEditingId((current) => current === question.id ? null : question.id)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#17213a] px-4 text-xs font-black text-white hover:bg-[#223052]"><FilePenLine size={15} />{editingId === question.id ? "編集を閉じる" : "証跡を編集"}</button>
              </div>
            </article>
          );
        })}</div> : (
          <div className="mt-4 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center"><CheckCircle2 size={30} className="text-emerald-500" /><p className="mt-3 text-sm font-black text-slate-700">該当する問題はありません</p><p className="mt-1 text-xs text-slate-400">別のフィルターを選択してください。</p></div>
        )}
      </main>
    </div>
  );
}

function EvidenceEditor({ question, record, onSubmit }: { question: Question; record?: ContentReviewRecord; onSubmit: (update: ReviewOverride) => void }) {
  const review = getEffectiveContentReview(question, record);
  const [confirmedYear, setConfirmedYear] = useState(review.confirmedYear === "未確認" ? "" : review.confirmedYear ?? "");
  const [validAsOf, setValidAsOf] = useState(review.validAsOf ?? toDateKey());
  const [priority, setPriority] = useState<ReviewPriority>(review.reviewPriority ?? "中");
  const [sourceTitle, setSourceTitle] = useState(review.reviewEvidence?.sourceTitle ?? "");
  const [sourceUrl, setSourceUrl] = useState(review.reviewEvidence?.sourceUrl ?? "");
  const [sourceType, setSourceType] = useState<ReviewEvidenceSourceType>(review.reviewEvidence?.sourceType ?? "公式");
  const [memo, setMemo] = useState(review.reviewEvidence?.memo ?? "");

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSubmit({ questionId: question.id, confirmedYear, validAsOf, reviewPriority: priority, reviewNote: review.reviewNote, reviewEvidence: { sourceTitle, sourceUrl, sourceType, checkedBy: "user", memo } }); }} className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="確認年度"><input value={confirmedYear} onChange={(event) => setConfirmedYear(event.target.value)} placeholder="例：2026（空欄なら未確認）" pattern="[0-9]{4}(年度)?" className="review-input" /></Field>
        <Field label="有効確認日"><input type="date" value={validAsOf} onChange={(event) => setValidAsOf(event.target.value)} className="review-input" /></Field>
        <Field label="優先度"><select value={priority} onChange={(event) => setPriority(event.target.value as ReviewPriority)} className="review-input"><option>高</option><option>中</option><option>低</option></select></Field>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="確認ソース名"><input value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} placeholder="例：中小企業白書 2026年版" className="review-input" /></Field>
        <Field label="参照URL"><input type="url" pattern="https?://.*" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://...（空欄可）" className="review-input" /></Field>
        <Field label="ソース種別"><select value={sourceType} onChange={(event) => setSourceType(event.target.value as ReviewEvidenceSourceType)} className="review-input">{evidenceTypes.map((type) => <option key={type}>{type}</option>)}</select></Field>
        <Field label="確認メモ"><input value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="改正点・確認範囲など" className="review-input" /></Field>
      </div>
      <button type="submit" className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-700"><ShieldCheck size={16} />証跡付きで確認済みにする</button>
      <p className="mt-2 text-[10px] leading-5 text-slate-500">確認者はuser、最終レビュー日・証跡確認日は今日、次回期限は優先度から自動設定されます。</p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="text-[10px] font-black text-slate-500"><span className="mb-1.5 block">{label}</span>{children}</label>;
}

function ReviewValue({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return <div className="rounded-lg border border-slate-100 p-2.5"><p className="font-bold text-slate-400">{label}</p><p className={`mt-1 font-black ${alert ? "text-amber-700" : "text-slate-700"}`}>{value}</p></div>;
}
