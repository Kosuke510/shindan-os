"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FlaskConical, RefreshCw } from "lucide-react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Dashboard } from "@/components/Dashboard";
import { DataView } from "@/components/DataView";
import { ContentReviewPanel } from "@/components/ContentReviewPanel";
import { PracticeView } from "@/components/PracticeView";
import { QAPanel } from "@/components/QAPanel";
import { QuestionCard } from "@/components/QuestionCard";
import { ReviewBadge } from "@/components/ReviewBadge";
import { WeakView } from "@/components/WeakView";
import { questions } from "@/data/questionCatalog";
import { subjectMap } from "@/data/subjects";
import { useLearningStore } from "@/hooks/useLearningStore";
import type { AppView, ContentReviewFilter, QAAction, Question, StudySessionConfig } from "@/types";
import { getContentReviewStats } from "@/utils/contentReview";
import { applyQAAction } from "@/utils/qa";
import { isReviewDue } from "@/utils/reviewScheduler";

interface ActiveSession {
  config: StudySessionConfig;
  queue: Question[];
  index: number;
  secondsLeft?: number;
  label?: string;
}

const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
};

const questionImportance = (question: Question) => question.importance ?? question.rank;
type ImportanceWeights = Record<"A" | "B" | "C", number>;
const defaultWeights: ImportanceWeights = { A: 0.7, B: 0.25, C: 0.05 };

const weightedOrder = (items: Question[], weight: ImportanceWeights = defaultWeights): Question[] => {
  return [...items].sort((left, right) => {
    const leftKey = -Math.log(Math.max(Math.random(), Number.EPSILON)) / Math.max(weight[questionImportance(left)], 0.001);
    const rightKey = -Math.log(Math.max(Math.random(), Number.EPSILON)) / Math.max(weight[questionImportance(right)], 0.001);
    return leftKey - rightKey;
  });
};

const avoidAdjacentTopics = (items: Question[]): Question[] => {
  const remaining = [...items];
  const result: Question[] = [];
  while (remaining.length) {
    const previousTag = result.at(-1)?.primaryExamTopicTag;
    const nextIndex = remaining.findIndex((question) => !previousTag || question.primaryExamTopicTag !== previousTag);
    result.push(...remaining.splice(nextIndex >= 0 ? nextIndex : 0, 1));
  }
  return result;
};

const pickWeightedQuestion = (items: Question[], previous?: { id?: string; topicTag?: string }, weights: ImportanceWeights = defaultWeights): Question | undefined => {
  const available = items.filter((question) => question.id !== previous?.id && question.primaryExamTopicTag !== previous?.topicTag);
  const pool = available.length ? available : items.filter((question) => question.id !== previous?.id);
  if (!pool.length) return items[0];
  const totalWeight = weights.A + weights.B + weights.C;
  const roll = Math.random() * totalWeight;
  const target = roll < weights.A ? "A" : roll < weights.A + weights.B ? "B" : "C";
  const bucket = pool.filter((question) => questionImportance(question) === target);
  return shuffle(bucket.length ? bucket : pool)[0];
};

export function ShindanApp() {
  const { state, isHydrated, persistenceStatus, recordGrade, markQuestionReviewed, resetLearningData, updateLearningState } = useLearningStore();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [contentReviewFilter, setContentReviewFilter] = useState<ContentReviewFilter | null>(null);
  const [activeView, setActiveView] = useState<AppView>("home");
  const [qaEnabled, setQaEnabled] = useState(process.env.NODE_ENV !== "production");
  const [qaOpen, setQaOpen] = useState(false);
  const lastSessionQuestion = useRef<{ id?: string; topicTag?: string }>({});

  const weakIds = useMemo(() => new Set(state.weakPoints.map((item) => item.questionId)), [state.weakPoints]);
  const dueCount = useMemo(() => questions.filter((question) => state.questionProgress[question.id] && isReviewDue(state.questionProgress[question.id])).length, [state.questionProgress]);
  const reviewStats = useMemo(() => getContentReviewStats(questions, state.questionReviews), [state.questionReviews]);
  const adaptiveWeights = useMemo<ImportanceWeights>(() => {
    const rankAQuestions = questions.filter((question) => questionImportance(question) === "A");
    const rankAProgress = rankAQuestions.map((question) => state.questionProgress[question.id]).filter(Boolean);
    const attempts = rankAProgress.reduce((sum, progress) => sum + progress.attempts, 0);
    const correct = rankAProgress.reduce((sum, progress) => sum + progress.correctCount, 0);
    const coverage = rankAQuestions.length ? rankAProgress.length / rankAQuestions.length : 0;
    const accuracy = attempts ? correct / attempts : 0;
    return coverage >= 0.5 && accuracy >= 0.75 ? defaultWeights : { A: 0.85, B: 0.15, C: 0 };
  }, [state.questionProgress]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || new URLSearchParams(window.location.search).get("debug") !== "1") return;
    const task = window.setTimeout(() => setQaEnabled(true), 0);
    return () => window.clearTimeout(task);
  }, []);

  useEffect(() => {
    if (session?.config.mode !== "quick") return;
    const timer = window.setInterval(() => {
      setSession((current) => {
        if (!current || current.config.mode !== "quick") return current;
        if ((current.secondsLeft ?? 0) <= 1) return null;
        return { ...current, secondsLeft: (current.secondsLeft ?? 0) - 1 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [session?.config.mode]);

  const startSession = (config: StudySessionConfig) => {
    const due = questions
      .filter((question) => {
        const progress = state.questionProgress[question.id];
        return progress ? isReviewDue(progress) : false;
      })
      .sort((left, right) => state.questionProgress[left.id].nextReviewAt.localeCompare(state.questionProgress[right.id].nextReviewAt));

    let queue: Question[];
    if (config.mode === "review") {
      const fallback = pickWeightedQuestion(questions.filter((question) => questionImportance(question) === "A"), lastSessionQuestion.current);
      queue = due.length ? avoidAdjacentTopics(weightedOrder(due, adaptiveWeights)) : fallback ? [fallback] : [];
    } else if (config.mode === "importance") {
      const importance = config.importance ?? "A";
      const matching = questions.filter((question) => questionImportance(question) === importance
        && (!config.subject || question.subject === config.subject)
        && (!config.topicTag || question.primaryExamTopicTag === config.topicTag));
      queue = avoidAdjacentTopics(shuffle(matching));
    } else if (config.mode === "subject" && config.subject) {
      queue = avoidAdjacentTopics(weightedOrder(questions.filter((question) => question.subject === config.subject), adaptiveWeights));
    } else if (config.mode === "quick") {
      const priority = [...due, ...questions.filter((question) => weakIds.has(question.id) && !due.some((dueQuestion) => dueQuestion.id === question.id))];
      const remaining = weightedOrder(questions.filter((question) => !priority.some((priorityQuestion) => priorityQuestion.id === question.id)), adaptiveWeights);
      queue = avoidAdjacentTopics([...priority, ...remaining]).slice(0, 5);
    } else {
      const selected = pickWeightedQuestion(questions, lastSessionQuestion.current, adaptiveWeights);
      queue = selected ? [selected] : [];
    }

    if (!queue.length) return;
    lastSessionQuestion.current = { id: queue[0].id, topicTag: queue[0].primaryExamTopicTag };
    setSession({ config, queue, index: 0, secondsLeft: config.mode === "quick" ? 600 : undefined });
  };

  const startQuestion = (questionId: string) => {
    const question = questions.find((item) => item.id === questionId);
    if (question) setSession({ config: { mode: "review" }, queue: [question], index: 0, label: activeView === "weak" ? "Weak論点の再演習" : activeView === "review" ? "制度レビュー問題" : "個別問題" });
  };

  const closeOrAdvance = () => {
    setSession((current) => {
      if (!current || current.index >= current.queue.length - 1) return null;
      return { ...current, index: current.index + 1 };
    });
  };

  const handleReset = () => {
    const input = window.prompt("すべての学習データを削除します。\n実行前にData画面からエクスポートすることをおすすめします。\n\n続ける場合は「リセット」と入力してください。");
    if (input !== "リセット") return false;
    return resetLearningData();
  };

  const handleNavigate = (view: AppView) => {
    setActiveView(view);
    if (view === "review") setContentReviewFilter("unconfirmed");
    else setContentReviewFilter(null);
  };

  const openContentReviews = (filter: ContentReviewFilter = "unconfirmed") => {
    setActiveView("review");
    setContentReviewFilter(filter);
  };

  const handleQAAction = (action: QAAction) => updateLearningState((current) => applyQAAction(current, action, questions));

  if (!isHydrated) return <LoadingScreen />;
  if (!questions.length) return <QuestionDataError />;

  const currentQuestion = session?.queue[session.index];
  const sessionLabel = session
    ? session.label ?? (session.config.mode === "quick" ? "10分だけやる" : session.config.mode === "review" ? "今日の復習" : session.config.mode === "importance" ? `${session.config.importance ?? "A"}論点演習` : session.config.mode === "subject" && session.config.subject ? `${subjectMap[session.config.subject].name} Core` : "全科目ランダム")
    : "";

  return (
    <>
      {activeView === "home" && <Dashboard state={state} persistenceStatus={persistenceStatus} onStart={startSession} onStartQuestion={startQuestion} onOpenContentReviews={openContentReviews} onNavigate={handleNavigate} onReset={handleReset} />}
      {activeView === "practice" && <PracticeView state={state} onStart={startSession} />}
      {activeView === "weak" && <WeakView state={state} onStartQuestion={startQuestion} />}
      {activeView === "data" && <DataView state={state} onImportState={(next) => updateLearningState(() => next)} onReset={handleReset} />}
      {activeView !== "home" && !session && !contentReviewFilter && !qaOpen && <div className="safe-area-floating-top fixed right-3 z-30 sm:right-6"><ReviewBadge count={dueCount} onClick={() => startSession({ mode: "review" })} /></div>}
      {!session && !contentReviewFilter && !qaOpen && <BottomNavigation active={activeView} practiceBadge={dueCount} reviewBadge={Math.max(reviewStats.unconfirmed, reviewStats.totalDue)} onSelect={handleNavigate} />}
      {qaEnabled && !session && !qaOpen && <button type="button" aria-label="QA Debugモードを開く" onClick={() => setQaOpen(true)} className="fixed bottom-20 right-3 z-50 inline-flex min-h-11 items-center gap-2 rounded-full bg-violet-700 px-4 text-xs font-black text-white shadow-[0_10px_30px_rgba(109,40,217,.3)] hover:bg-violet-800 lg:bottom-5 lg:right-5"><FlaskConical size={15} />QA</button>}
      {contentReviewFilter && (
        <ContentReviewPanel
          questions={questions}
          records={state.questionReviews}
          initialFilter={contentReviewFilter}
          onMarkReviewed={markQuestionReviewed}
          onOpenQuestion={(questionId) => { setContentReviewFilter(null); setActiveView("practice"); startQuestion(questionId); }}
          onClose={() => { setContentReviewFilter(null); setActiveView("home"); }}
        />
      )}
      {qaOpen && <QAPanel state={state} persistenceStatus={persistenceStatus} onAction={handleQAAction} onReset={handleReset} onClose={() => setQaOpen(false)} />}
      {session && currentQuestion && (
        <QuestionCard
          key={`${currentQuestion.id}-${session.index}`}
          question={currentQuestion}
          sessionLabel={sessionLabel}
          current={session.index + 1}
          total={session.queue.length}
          secondsLeft={session.secondsLeft}
          contentReview={state.questionReviews[currentQuestion.id]}
          onGrade={recordGrade}
          onNext={closeOrAdvance}
          onClose={() => setSession(null)}
        />
      )}
    </>
  );
}

function LoadingScreen() {
  return <div className="grid min-h-dvh place-items-center bg-[#f6f7fb]"><div className="text-center"><div className="mx-auto size-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" /><p className="mt-3 text-xs font-bold text-slate-400">学習データを読み込んでいます</p></div></div>;
}

function QuestionDataError() {
  return <div className="grid min-h-dvh place-items-center bg-[#f6f7fb] px-5"><div className="max-w-sm rounded-2xl border border-red-200 bg-white p-6 text-center"><p className="text-base font-black text-slate-800">問題データを読み込めません</p><p className="mt-2 text-sm leading-6 text-slate-500">ページを再読み込みしても改善しない場合は、問題データの検証を実行してください。</p><button type="button" onClick={() => window.location.reload()} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#17213a] px-4 text-sm font-black text-white"><RefreshCw size={16} />再読み込み</button></div></div>;
}
