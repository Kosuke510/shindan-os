"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Download, FileCheck2, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { AppViewHeader } from "@/components/AppViewHeader";
import { questions } from "@/data/questionCatalog";
import { subjects } from "@/data/subjects";
import type { BackupActivity, LearningState } from "@/types";
import { applyBackupAuxiliaryData, createShindanBackup, downloadShindanBackup, getBackupActivity, parseShindanBackup, recordBackupExport } from "@/utils/backup";
import { getContentReviewStats } from "@/utils/contentReview";
import { runQAValidation } from "@/utils/qa";
import { isReviewDue } from "@/utils/reviewScheduler";

interface DataViewProps {
  state: LearningState;
  onImportState: (state: LearningState) => boolean;
  onReset: () => boolean;
}

type OperationMessage = { tone: "success" | "error" | "info"; text: string };
const subjectRows = subjects.map((subject) => ({ label: `${subject.code} ${subject.shortName}`, count: questions.filter((question) => question.subject === subject.id).length }));
const rankCounts = ["A", "B", "C"].map((rank) => ({ label: `Rank ${rank}`, count: questions.filter((question) => question.rank === rank).length }));
const sourceCounts = ["自作", "過去問", "教材", "手入力"].map((source) => ({ label: source, count: questions.filter((question) => question.source === source).length }));

export function DataView({ state, onImportState, onReset }: DataViewProps) {
  const [activity, setActivity] = useState<BackupActivity>(getBackupActivity);
  const [message, setMessage] = useState<OperationMessage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reviewStats = useMemo(() => getContentReviewStats(questions, state.questionReviews), [state.questionReviews]);
  const validation = useMemo(() => runQAValidation(questions), []);
  const dueCount = useMemo(() => questions.filter((question) => state.questionProgress[question.id] && isReviewDue(state.questionProgress[question.id])).length, [state.questionProgress]);

  const exportData = () => {
    try {
      const backup = createShindanBackup(state);
      downloadShindanBackup(backup);
      if (!recordBackupExport(backup.exportedAt)) throw new Error("最終エクスポート日時を保存できませんでした。");
      setActivity(getBackupActivity());
      setMessage({ tone: "success", text: "バックアップJSONをダウンロードしました。安全な場所へ保管してください。" });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "エクスポートに失敗しました。" });
    }
  };

  const importData = async (file: File) => {
    try {
      const parsed = parseShindanBackup(await file.text());
      const confirmed = window.confirm("現在の学習データをバックアップファイルの内容で上書きします。実行前に現在のデータをエクスポートすることをおすすめします。\n\nインポートを実行しますか？");
      if (!confirmed) {
        setMessage({ tone: "info", text: "インポートをキャンセルしました。" });
        return;
      }
      if (!onImportState(parsed.state)) throw new Error("学習データをlocalStorageへ保存できませんでした。");
      if (!applyBackupAuxiliaryData(parsed)) throw new Error("QAチェックリストなど一部データを復元できませんでした。");
      setActivity(getBackupActivity());
      setMessage({ tone: "success", text: `バックアップ（v${parsed.backup.version}）を復元しました。` });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "インポートに失敗しました。" });
    }
  };

  const resetData = () => {
    if (!onReset()) return;
    setActivity(getBackupActivity());
    setMessage({ tone: "success", text: "学習データを初期状態へ戻しました。" });
  };

  return (
    <div className="min-h-dvh bg-[#f6f7fb] pb-28 text-[#17213a]">
      <AppViewHeader eyebrow="DATA" title="データと保護" description="問題データの状態と学習履歴のバックアップ" />
      <main className="mx-auto max-w-[1000px] px-4 py-5 sm:px-7 sm:py-8">
        {message && <OperationNotice message={message} onClose={() => setMessage(null)} />}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DataMetric label="総問題数" value={`${questions.length}問`} icon={Database} />
          <DataMetric label="年度依存" value={`${reviewStats.totalSensitive}問`} icon={AlertTriangle} tone="amber" />
          <DataMetric label="未確認" value={`${reviewStats.unconfirmed}問`} icon={AlertTriangle} tone="orange" />
          <DataMetric label="証跡あり" value={`${reviewStats.evidenceCount}問`} icon={FileCheck2} tone="blue" />
        </section>

        <section className="mt-5 overflow-hidden rounded-[24px] border border-blue-100 bg-white shadow-[0_6px_24px_rgba(15,23,42,.05)]" aria-labelledby="data-protection-heading">
          <div className="bg-[#17213a] p-5 text-white sm:p-6"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-blue-200"><ShieldCheck size={21} /></span><div><p className="text-[10px] font-black tracking-[0.14em] text-blue-200">DATA PROTECTION</p><h2 id="data-protection-heading" className="mt-1 text-lg font-black">学習データを守る</h2><p className="mt-1 text-xs leading-5 text-slate-300">端末変更やブラウザデータ削除に備えて、定期的にJSONを保存してください。</p></div></div></div>
          <div className="p-5 sm:p-6">
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-6 text-amber-900">学習データはこの端末・このブラウザ内に保存されています。端末変更やブラウザデータ削除に備えて、定期的にバックアップをエクスポートしてください。</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <BackupValue label="最終学習日" value={state.lastStudyDate ?? "未学習"} />
              <BackupValue label="累計回答" value={`${state.answerHistory.length}問`} />
              <BackupValue label="Weak" value={`${state.weakPoints.length}件`} />
              <BackupValue label="復習タスク" value={`${dueCount}件`} alert={dueCount > 0} />
              <BackupValue label="最終エクスポート" value={formatTimestamp(activity.lastExportAt)} />
              <BackupValue label="最終インポート" value={formatTimestamp(activity.lastImportAt)} />
            </div>
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              <button type="button" onClick={exportData} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-black text-white shadow-[0_10px_26px_rgba(37,99,235,.28)] ring-2 ring-blue-100 hover:bg-blue-700"><Download size={17} />データをエクスポート<span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px]">推奨</span></button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-600 hover:border-blue-200 hover:bg-blue-50"><Upload size={17} />データをインポート</button>
              <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void importData(file); }} />
            </div>
            <details className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500"><summary className="cursor-pointer font-black text-slate-600">バックアップに含まれるデータ</summary><p className="mt-2">回答履歴、Weak論点、復習予定、ストリーク、レビュー証跡、QAチェックリスト、Shindan OS関連の追加保存データを含みます。</p></details>
            <div className="mt-5 border-t border-slate-100 pt-4"><button type="button" onClick={resetData} className="inline-flex min-h-10 items-center gap-1.5 text-xs font-black text-red-500 hover:text-red-700"><RotateCcw size={14} />学習データをリセット</button><p className="mt-1 text-[10px] leading-5 text-slate-400">実行には「リセット」の入力が必要です。先にエクスポートすることをおすすめします。</p></div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">VALIDATION OVERVIEW</p><h2 className="mt-1 text-base font-black">簡易データチェック</h2></div><span className={`rounded-full px-3 py-1.5 text-[10px] font-black ${validation.passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{validation.passed ? "PASS" : "ERROR"}</span></div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><InfoPill label="エラー" value={validation.errors.length} /><InfoPill label="警告" value={validation.warnings.length} /><InfoPill label="要レビュー" value={reviewStats.totalDue} /><InfoPill label="高優先未確認" value={reviewStats.highPriorityUnconfirmed} /></div>
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-slate-500"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />本画面はブラウザ内の簡易チェックです。完全な検証は validate:questions を使用します。</p>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <DataList title="科目別問題数" rows={subjectRows} />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2"><DataList title="Rank別" rows={rankCounts} /><DataList title="source別" rows={sourceCounts} /></div>
        </section>
      </main>
    </div>
  );
}

function OperationNotice({ message, onClose }: { message: OperationMessage; onClose: () => void }) {
  const style = message.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : message.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-800";
  return <div role={message.tone === "error" ? "alert" : "status"} className={`mb-4 flex items-start gap-2 rounded-xl border p-3 text-xs font-bold leading-5 ${style}`}><CheckCircle2 size={16} className="mt-0.5 shrink-0" /><p className="min-w-0 flex-1">{message.text}</p><button type="button" onClick={onClose} className="shrink-0 px-1 text-[10px] font-black">閉じる</button></div>;
}

function formatTimestamp(value: string | null): string {
  if (!value) return "未実施";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未実施";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function BackupValue({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) { return <div className={`min-w-0 rounded-xl px-3 py-3 ${alert ? "bg-red-50" : "bg-slate-50"}`}><p className="text-[9px] font-bold text-slate-400">{label}</p><p className={`mt-1 truncate text-xs font-black ${alert ? "text-red-600" : "text-slate-700"}`}>{value}</p></div>; }
function DataMetric({ label, value, icon: Icon, tone = "navy" }: { label: string; value: string; icon: typeof Database; tone?: "navy" | "amber" | "orange" | "blue" }) { const color = { navy: "bg-slate-100 text-slate-600", amber: "bg-amber-50 text-amber-700", orange: "bg-orange-50 text-orange-700", blue: "bg-blue-50 text-blue-700" }[tone]; return <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4"><span className={`grid size-9 place-items-center rounded-xl ${color}`}><Icon size={17} /></span><p className="mt-3 truncate text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>; }
function InfoPill({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-slate-50 px-2 py-2.5 text-center"><p className="text-[9px] font-bold text-slate-400">{label}</p><p className="mt-0.5 font-black text-slate-700">{value}</p></div>; }
function DataList({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-black">{title}</h2><div className="mt-3 divide-y divide-slate-100">{rows.map((row) => <div key={row.label} className="flex items-center justify-between gap-3 py-2.5 text-xs"><span className="min-w-0 truncate font-semibold text-slate-500">{row.label}</span><span className="shrink-0 font-black text-slate-700">{row.count}問</span></div>)}</div></div>; }
