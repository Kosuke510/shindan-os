"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FlaskConical, Play, RotateCcw, X } from "lucide-react";
import { questions } from "@/data/questionCatalog";
import { subjects } from "@/data/subjects";
import type { LearningState, PersistenceStatus, QAAction, QAValidationResult } from "@/types";
import { getContentReviewStats } from "@/utils/contentReview";
import { runQAValidation } from "@/utils/qa";
import { isReviewDue } from "@/utils/reviewScheduler";

const CHECKLIST_KEY = "shindan-os:qaChecklist";
const checklistItems = [
  "アプリが初回アクセスでクラッシュしない", "localStorageが空でもダッシュボードが表示される", "全科目ランダム出題ができる",
  "4択問題で選択肢が表示される", "一問一答で入力欄が表示される", "計算問題で入力欄が表示される", "比較問題で入力欄が表示される",
  "自己採点後に解説が表示される", "不正解で弱点に追加される", "復習タスクが作成される", "赤バッジが表示される",
  "10分だけやるが5問キューを作る", "弱点一覧が表示される", "レビュー一覧が表示される", "証跡付き確認済みにできる",
  "localStorageリセットができる", "スマホ幅で横スクロールが出ない",
  "PWA manifest が存在する", "Data画面にエクスポートボタンがある", "エクスポートJSONがダウンロードできる",
  "不正JSONをインポートしてもクラッシュしない", "正常JSONをインポートできる", "リセット前に確認が出る",
  "リセット後に初期状態に戻る", "オフラインでも最低限画面が表示できる",
];

const actions: Array<{ id: QAAction; label: string; effect: string }> = [
  { id: "sample-history", label: "サンプル回答履歴を作成", effect: "回答履歴と問題進捗を変更します" },
  { id: "overdue-review", label: "復習期限切れタスクを作成", effect: "復習予定日を期限切れに変更します" },
  { id: "weak-point", label: "弱点データを作成", effect: "Weak論点を追加します" },
  { id: "unconfirmed-review", label: "年度依存の未確認データを作成", effect: "レビュー証跡を未確認へ変更します" },
  { id: "streak-3", label: "学習ストリークを3日にする", effect: "ストリークと最終学習日を変更します" },
];

const loadChecklist = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(CHECKLIST_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && checklistItems.includes(item)) : [];
  } catch {
    return [];
  }
};

interface QAPanelProps {
  state: LearningState;
  persistenceStatus: PersistenceStatus;
  onAction: (action: QAAction) => void;
  onReset: () => boolean;
  onClose: () => void;
}

export function QAPanel({ state, persistenceStatus, onAction, onReset, onClose }: QAPanelProps) {
  const [checked, setChecked] = useState<string[]>(loadChecklist);
  const [validation, setValidation] = useState<QAValidationResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const reviewStats = useMemo(() => getContentReviewStats(questions, state.questionReviews), [state.questionReviews]);
  const dueCount = useMemo(() => questions.filter((question) => state.questionProgress[question.id] && isReviewDue(state.questionProgress[question.id])).length, [state.questionProgress]);
  const subjectCounts = useMemo(() => subjects.map((subject) => ({ ...subject, count: questions.filter((question) => question.subject === subject.id).length })), []);

  const toggle = (item: string) => {
    setChecked((current) => {
      const next = current.includes(item) ? current.filter((value) => value !== item) : [...current, item];
      try { window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next)); } catch { /* QA state remains usable without storage. */ }
      return next;
    });
  };

  const runAction = (action: QAAction, label: string, effect: string) => {
    if (!window.confirm(`QAデータ操作：${label}\n${effect}。\n\nこの端末のlocalStorageを変更します。実行しますか？`)) return;
    onAction(action);
    setNotice(`${label}しました。画面を閉じて表示を確認してください。`);
  };
  const reset = () => { if (onReset()) { setChecked([]); setValidation(null); setNotice("localStorageをリセットしました。"); } };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#f6f7fb]">
      <header className="safe-area-top sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-xl"><div className="mx-auto flex min-h-[68px] max-w-5xl items-center gap-3 px-4 py-2 sm:px-6"><span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><FlaskConical size={20} /></span><div className="min-w-0 flex-1"><p className="text-sm font-black text-[#17213a]">QA / Debug</p><p className="truncate text-[10px] font-bold text-slate-400">手動検証用。作成データはlocalStorageへ保存されます</p></div><button type="button" onClick={onClose} aria-label="QAを閉じる" className="grid size-11 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X size={20} /></button></div></header>
      <main className="mx-auto max-w-5xl px-4 py-5 pb-12 sm:px-6 sm:py-8">
        <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs leading-5 text-violet-900"><span className="font-black">DEBUG MODE</span>：以下の操作は実データと同じlocalStorageを変更します。必要なら先にData画面からバックアップしてください。</div>
        {notice && <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-800"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{notice}</div>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5"><p className="eyebrow">CURRENT STATE</p><h2 className="mt-1 text-base font-black">状態確認</h2><div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4"><QAStat label="問題総数" value={questions.length} /><QAStat label="今日の復習" value={dueCount} alert={dueCount > 0} /><QAStat label="弱点" value={state.weakPoints.length} /><QAStat label="年度依存" value={reviewStats.totalSensitive} /><QAStat label="未確認" value={reviewStats.unconfirmed} alert /><QAStat label="要レビュー" value={reviewStats.totalDue} alert={reviewStats.totalDue > 0} /><QAStat label="ストリーク" value={state.learningStreak} suffix="日" /><QAStat label="保存状態" value={persistenceStatus === "available" ? "OK" : persistenceStatus} /></div><div className="mt-4 flex flex-wrap gap-1.5">{subjectCounts.map((subject) => <span key={subject.id} className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500">{subject.code} {subject.count}</span>)}</div></section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5"><p className="eyebrow">TEST ACTIONS</p><h2 className="mt-1 text-base font-black">テストデータ操作</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{actions.map((action) => <button type="button" key={action.id} onClick={() => runAction(action.id, action.label, action.effect)} className="inline-flex min-h-12 items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 text-left text-xs font-black text-slate-700 hover:border-blue-200 hover:bg-blue-50"><span>{action.label}</span><Play size={14} className="shrink-0 text-blue-600" /></button>)}<button type="button" onClick={() => { const result = runQAValidation(questions); setValidation(result); setNotice("簡易チェックを実行しました。"); }} className="inline-flex min-h-12 items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 text-left text-xs font-black text-violet-800"><span>validate相当の簡易チェック</span><FlaskConical size={15} /></button><button type="button" onClick={reset} className="inline-flex min-h-12 items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 text-left text-xs font-black text-red-700"><span>localStorageをリセット</span><RotateCcw size={15} /></button></div>{validation && <div className={`mt-4 rounded-xl p-4 text-xs leading-6 ${validation.passed ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}><p className="font-black">{validation.passed ? "簡易チェック PASS" : "簡易チェック ERROR"}</p><p>エラー {validation.errors.length}件 / 警告 {validation.warnings.length}件</p>{validation.errors.slice(0, 5).map((error) => <p key={error}>・{error}</p>)}</div>}</section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-end justify-between gap-3"><div><p className="eyebrow">MANUAL CHECK</p><h2 className="mt-1 text-base font-black">手動検証チェックリスト</h2></div><span className="text-xs font-black text-slate-500">{checked.length}/{checklistItems.length}</span></div><div className="mt-4 space-y-1.5">{checklistItems.map((item) => <label key={item} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-100 px-3 py-2.5 hover:bg-slate-50"><input type="checkbox" checked={checked.includes(item)} onChange={() => toggle(item)} className="mt-0.5 size-4 shrink-0 accent-blue-600" /><span className={`text-xs font-semibold leading-5 ${checked.includes(item) ? "text-slate-400 line-through" : "text-slate-600"}`}>{item}</span></label>)}</div></section>
      </main>
    </div>
  );
}

function QAStat({ label, value, suffix = "", alert = false }: { label: string; value: string | number; suffix?: string; alert?: boolean }) { return <div className={`rounded-xl px-2 py-3 ${alert ? "bg-amber-50" : "bg-slate-50"}`}><p className="text-[9px] font-bold text-slate-400">{label}</p><p className={`mt-1 text-base font-black ${alert ? "text-amber-700" : "text-slate-700"}`}>{value}{suffix}</p></div>; }
