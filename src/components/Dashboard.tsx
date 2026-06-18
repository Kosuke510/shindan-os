"use client";

import { useMemo } from "react";
import { AlertTriangle, ArrowRight, BarChart3, BookOpen, CheckCircle2, Clock3, Database, DatabaseBackup, Flame, LayoutDashboard, ListChecks, RotateCcw, ShieldCheck, Shuffle, Sparkles, Target } from "lucide-react";
import { Brand } from "@/components/Brand";
import { ReviewBadge } from "@/components/ReviewBadge";
import { SubjectCards } from "@/components/SubjectCards";
import { WeakPointList } from "@/components/WeakPointList";
import { questions } from "@/data/questionCatalog";
import { subjectMap } from "@/data/subjects";
import type { AppView, ContentReviewFilter, LearningState, PersistenceStatus, StudySessionConfig } from "@/types";
import { getContentReviewStats } from "@/utils/contentReview";
import { isReviewDue } from "@/utils/reviewScheduler";
import { getOverallAccuracy, getSubjectStats, getTodayAnswerCount } from "@/utils/stats";

interface DashboardProps {
  state: LearningState;
  persistenceStatus: PersistenceStatus;
  onStart: (config: StudySessionConfig) => void;
  onStartQuestion: (questionId: string) => void;
  onOpenContentReviews: (filter?: ContentReviewFilter) => void;
  onNavigate: (view: AppView) => void;
  onReset: () => void;
}

const knownQuestionIds = new Set(questions.map((question) => question.id));

export function Dashboard({ state, persistenceStatus, onStart, onStartQuestion, onOpenContentReviews, onNavigate, onReset }: DashboardProps) {
  const todayAnswers = useMemo(() => getTodayAnswerCount({ answerHistory: state.answerHistory }), [state.answerHistory]);
  const accuracy = useMemo(() => getOverallAccuracy({ answerHistory: state.answerHistory }), [state.answerHistory]);
  const subjectStats = useMemo(() => getSubjectStats({ answerHistory: state.answerHistory }), [state.answerHistory]);
  const dueQuestions = useMemo(() => questions.filter((question) => {
    const progress = state.questionProgress[question.id];
    return progress ? isReviewDue(progress) : false;
  }), [state.questionProgress]);
  const dueCount = dueQuestions.length;
  const validWeakPoints = useMemo(() => state.weakPoints.filter((item) => knownQuestionIds.has(item.questionId)), [state.weakPoints]);
  const contentReviewStats = useMemo(() => getContentReviewStats(questions, state.questionReviews), [state.questionReviews]);
  const estimatedMinutes = dueCount ? Math.min(30, Math.max(5, dueCount * 2)) : 10;

  return (
    <div className="min-h-dvh bg-[#f6f7fb] text-[#17213a]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] border-r border-slate-200/80 bg-white px-5 py-6 lg:flex lg:flex-col">
        <div className="px-2"><Brand /></div>
        <nav className="mt-10 space-y-2" aria-label="メインナビゲーション">
          <button type="button" onClick={() => onNavigate("home")} className="flex w-full items-center gap-3 rounded-xl bg-blue-50 px-3.5 py-3 text-sm font-black text-blue-700"><LayoutDashboard size={18} />ダッシュボード</button>
          <button type="button" onClick={() => onNavigate("practice")} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50"><BookOpen size={18} />Core学習</button>
          <button type="button" onClick={() => onNavigate("weak")} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50"><ListChecks size={18} />Weak論点</button>
          <button type="button" onClick={() => onNavigate("review")} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50"><ShieldCheck size={18} />制度レビュー</button>
          <button type="button" onClick={() => onNavigate("data")} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50"><Database size={18} />問題データ</button>
        </nav>
        <div className="mt-auto rounded-2xl bg-[#17213a] p-4 text-white">
          <ShieldCheck size={19} className="text-blue-300" />
          <p className="mt-3 text-sm font-black">データは端末内だけ</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-300">回答履歴はlocalStorageに安全に保存されます。</p>
          <button type="button" onClick={onReset} className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-white"><RotateCcw size={12} />学習データをリセット</button>
        </div>
      </aside>

      <div className="lg:pl-[232px]">
        <header className="safe-area-top sticky top-0 z-20 border-b border-slate-200/70 bg-[#f6f7fb]/92 backdrop-blur-xl">
          <div className="mx-auto flex h-[72px] max-w-[1240px] items-center gap-3 px-4 sm:px-7">
            <div className="lg:hidden"><Brand compact /></div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-black tracking-[0.12em] text-slate-400">TODAY</p>
              <p className="text-xs font-bold text-slate-600">{new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" }).format(new Date())}</p>
            </div>
            <div className="ml-auto flex items-center gap-2.5">
              <div className="hidden items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-black text-orange-600 sm:flex"><Flame size={15} fill="currentColor" />{state.learningStreak}日連続</div>
              <ReviewBadge count={dueCount} onClick={() => onStart({ mode: "review" })} />
              <div className="grid size-11 place-items-center rounded-full bg-[#dfe5ff] text-[10px] font-black text-blue-700">YOU</div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1240px] px-4 py-5 pb-28 sm:px-7 sm:py-8 lg:pb-20">
          {persistenceStatus !== "available" && <PersistenceNotice status={persistenceStatus} onReset={onReset} />}
          <section>
            <p className="text-sm font-semibold text-slate-500">おかえりなさい</p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <h1 className="text-2xl font-black tracking-[-0.035em] text-[#17213a] sm:text-3xl">今日の一問を、合格の一歩に。</h1>
              <p className="text-xs font-semibold text-slate-400">7科目 · {questions.length}問 · 出典メタデータ付き</p>
            </div>
          </section>

          <section className="mt-5 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
            <div className="relative overflow-hidden rounded-[24px] bg-[#17213a] p-5 text-white shadow-[0_18px_50px_rgba(23,33,58,.17)] sm:p-8">
              <div className="absolute -right-12 -top-20 size-64 rounded-full border-[38px] border-white/[0.035]" />
              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black tracking-[0.14em] text-blue-200"><Sparkles size={12} />今日のアクション</span><span className="rounded-full bg-blue-500/20 px-3 py-1.5 text-[10px] font-black text-blue-100">推定 {estimatedMinutes}分</span></div>
                <h2 className="mt-4 text-xl font-black tracking-[-0.03em] sm:text-2xl">{dueCount ? `復習タスクが${dueCount}件あります` : "新しいAランク問題へ進めます"}</h2>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                  <ActionStat label="今日の復習" value={`${dueCount}件`} alert={dueCount > 0} />
                  <ActionStat label="未確認" value={`${contentReviewStats.unconfirmed}件`} alert={contentReviewStats.unconfirmed > 0} />
                  <ActionStat label="要レビュー" value={`${contentReviewStats.totalDue}件`} alert={contentReviewStats.totalDue > 0} />
                  <ActionStat label="ストリーク" value={`${state.learningStreak}日`} />
                </div>
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  <TodayButton icon={Clock3} label="10分だけやる" primary onClick={() => onStart({ mode: "quick" })} />
                  <TodayButton icon={ArrowRight} label={dueCount ? "復習タスクから始める" : "Aランク問題を1問始める"} onClick={() => onStart({ mode: "review" })} />
                  <TodayButton icon={Shuffle} label="全科目ランダムで1問" onClick={() => onStart({ mode: "random" })} />
                  <TodayButton icon={ShieldCheck} label="未確認レビューを見る" onClick={() => onOpenContentReviews("unconfirmed")} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
              <Metric icon={ListChecks} label="今日の復習" value={`${dueCount}件`} tone="red" />
              <Metric icon={CheckCircle2} label="今日の回答" value={`${todayAnswers}問`} tone="blue" />
              <Metric icon={BookOpen} label="累計回答" value={`${state.answerHistory.length}問`} tone="navy" />
              <Metric icon={Target} label="全体正答率" value={`${accuracy}%`} tone="green" />
              <Metric icon={Flame} label="ストリーク" value={`${state.learningStreak}日`} tone="orange" />
              <Metric icon={BarChart3} label="Weak論点" value={`${validWeakPoints.length}件`} tone="amber" />
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-amber-200 bg-white p-5 shadow-[0_3px_16px_rgba(15,23,42,.04)]" aria-labelledby="freshness-heading">
            <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><AlertTriangle size={21} /></span><div><p className="eyebrow">DATA FRESHNESS</p><h2 id="freshness-heading" className="mt-1 text-sm font-black text-[#26304a]">年度依存データの鮮度</h2><p className="mt-1 text-[11px] leading-5 text-slate-500">確認ソースとレビュー期限を、学習履歴とは別に管理します。</p></div></div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[10px] font-black sm:grid-cols-5">
              <span className="rounded-lg bg-slate-50 px-2 py-2.5 text-slate-600">年度依存 {contentReviewStats.totalSensitive}</span>
              <span className="rounded-lg bg-amber-50 px-2 py-2.5 text-amber-700">未確認 {contentReviewStats.unconfirmed}</span>
              <span className="rounded-lg bg-red-50 px-2 py-2.5 text-red-600">要レビュー {contentReviewStats.totalDue}</span>
              <span className="rounded-lg bg-blue-50 px-2 py-2.5 text-blue-700">証跡あり {contentReviewStats.evidenceCount}</span>
              <span className="col-span-2 rounded-lg bg-orange-50 px-2 py-2.5 text-orange-700 sm:col-span-1">高優先未確認 {contentReviewStats.highPriorityUnconfirmed}</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => onOpenContentReviews("unconfirmed")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#17213a] px-4 text-xs font-black text-white hover:bg-[#223052]">未確認を確認する<ArrowRight size={15} /></button>
              <button type="button" onClick={() => onOpenContentReviews("due")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-600 hover:bg-slate-50">要レビューを見る<ArrowRight size={15} /></button>
            </div>
          </section>

          <div className="mt-9"><SubjectCards stats={subjectStats} progress={state.questionProgress} onSelect={(subject) => onStart({ mode: "subject", subject })} /></div>

          <section className="mt-9 grid gap-4 xl:grid-cols-[1.25fr_1fr]">
            <div className="rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-[0_2px_14px_rgba(15,23,42,.035)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div><p className="eyebrow">SMART REVIEW</p><h2 className="mt-1 text-lg font-black text-[#17213a]">今日の復習タスク</h2></div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${dueCount ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>{dueCount}件</span>
              </div>
              {dueQuestions.length ? (
                <div className="mt-5 space-y-2">
                  {dueQuestions.slice(0, 5).map((question) => {
                    const subject = subjectMap[question.subject];
                    return <button type="button" key={question.id} onClick={() => onStartQuestion(question.id)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:border-blue-100 hover:bg-blue-50/40"><span className="grid size-9 place-items-center rounded-lg text-[10px] font-black" style={{ background: subject.softAccent, color: subject.accent }}>{subject.code}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-slate-700">{question.topic}</span><span className="text-[10px] font-bold text-slate-400">{question.coreName} · {question.difficulty}</span></span><ArrowRight size={15} className="text-slate-300" /></button>;
                  })}
                </div>
              ) : (
                <div className="mt-5 flex min-h-40 flex-col items-center justify-center rounded-2xl bg-slate-50 text-center"><CheckCircle2 size={27} className="text-emerald-500" /><p className="mt-2 text-sm font-black text-slate-700">今日の復習はありません</p><p className="mt-1 text-xs text-slate-400">新しい問題に取り組むと、次回復習日が設定されます。</p></div>
              )}
            </div>
            <WeakPointList weakPoints={validWeakPoints} onSelect={onStartQuestion} />
          </section>
          <button type="button" onClick={onReset} className="mt-6 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-red-600 lg:hidden"><RotateCcw size={13} />学習データをリセット</button>
        </main>
      </div>
    </div>
  );
}

function PersistenceNotice({ status, onReset }: { status: Exclude<PersistenceStatus, "available">; onReset: () => void }) {
  const recovered = status === "recovered";
  return (
    <div role="status" className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-xs leading-5 ${recovered ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700"}`}>
      {recovered ? <DatabaseBackup size={17} className="mt-0.5 shrink-0" /> : <AlertTriangle size={17} className="mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1"><p><span className="font-black">{recovered ? "保存データを自動修復しました。" : "学習データを保存できません。"}</span><br />{recovered ? "読み取れない項目だけを初期化し、利用できる履歴は保持しています。" : "この画面では学習できますが、再読み込みすると今回の履歴が失われる可能性があります。"}</p><button type="button" onClick={onReset} className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-current/20 px-3 text-[10px] font-black"><RotateCcw size={12} />保存データをリセット</button></div>
    </div>
  );
}

type MetricIcon = typeof Target;
function Metric({ icon: Icon, label, value, tone }: { icon: MetricIcon; label: string; value: string; tone: "red" | "blue" | "navy" | "green" | "orange" | "amber" }) {
  const styles = { red: "bg-red-50 text-red-500", blue: "bg-blue-50 text-blue-600", navy: "bg-slate-100 text-slate-600", green: "bg-emerald-50 text-emerald-600", orange: "bg-orange-50 text-orange-500", amber: "bg-amber-50 text-amber-600" }[tone];
  return <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,.03)]"><span className={`grid size-9 place-items-center rounded-xl ${styles}`}><Icon size={17} /></span><p className="mt-3 text-[10px] font-bold text-slate-400">{label}</p><p className="mt-0.5 text-xl font-black text-[#26304a]">{value}</p></div>;
}

function ActionStat({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return <div className={`rounded-xl px-2 py-2.5 ${alert ? "bg-amber-400/15" : "bg-white/[0.07]"}`}><p className="text-[9px] font-bold text-slate-400">{label}</p><p className={`mt-0.5 text-sm font-black ${alert ? "text-amber-200" : "text-white"}`}>{value}</p></div>;
}

function TodayButton({ icon: Icon, label, primary = false, onClick }: { icon: typeof Clock3; label: string; primary?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`inline-flex min-h-12 items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-xs font-black transition ${primary ? "bg-blue-600 text-white hover:bg-blue-500" : "border border-white/15 bg-white/10 text-white hover:bg-white/15"}`}><span className="inline-flex items-center gap-2"><Icon size={16} />{label}</span><ArrowRight size={14} className="shrink-0 opacity-70" /></button>;
}
