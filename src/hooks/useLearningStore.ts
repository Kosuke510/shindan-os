"use client";

import { useCallback, useEffect, useState } from "react";
import type { ContentReviewRecord, GradeResult, LearningState, PersistenceStatus, Question, QuestionProgress, ReviewOverride, SelfGrade, WeakPoint } from "@/types";
import { calculateContentReviewDue } from "@/utils/contentReview";
import { toDateKey } from "@/utils/date";
import { scheduleNextReview } from "@/utils/reviewScheduler";
import { clearLearningState, initialLearningState, loadLearningState, saveLearningState } from "@/utils/storage";
import { updateLearningStreak } from "@/utils/stats";

const SCORE_BY_GRADE: Record<SelfGrade, 10 | 6 | 0> = { correct: 10, almost: 6, incorrect: 0 };

export const useLearningStore = () => {
  const [state, setState] = useState<LearningState>(initialLearningState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>("available");

  useEffect(() => {
    const task = window.setTimeout(() => {
      const loaded = loadLearningState();
      setState(loaded.state);
      setPersistenceStatus(loaded.storageAvailable ? (loaded.recovered ? "recovered" : "available") : "unavailable");
      if (loaded.storageAvailable && loaded.recovered && !saveLearningState(loaded.state)) setPersistenceStatus("error");
      setIsHydrated(true);
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

  const recordGrade = useCallback((question: Question, selectedAnswer: string, grade: SelfGrade): GradeResult => {
    const now = new Date();
    const previous = state.questionProgress[question.id];
    const schedule = scheduleNextReview(grade, previous, now);
    const progress: QuestionProgress = {
      questionId: question.id,
      attempts: (previous?.attempts ?? 0) + 1,
      correctCount: (previous?.correctCount ?? 0) + (grade === "correct" ? 1 : 0),
      totalScore: (previous?.totalScore ?? 0) + SCORE_BY_GRADE[grade],
      currentIntervalDays: schedule.intervalDays,
      lastGrade: grade,
      lastAnsweredAt: now.toISOString(),
      nextReviewAt: schedule.nextReviewAt,
    };

    let weakPoints = state.weakPoints.filter((item) => item.questionId !== question.id);
    if (grade !== "correct") {
      const existing = state.weakPoints.find((item) => item.questionId === question.id);
      const weakPoint: WeakPoint = {
        questionId: question.id,
        addedAt: existing?.addedAt ?? now.toISOString(),
        updatedAt: now.toISOString(),
        lastGrade: grade,
      };
      weakPoints = [...weakPoints, weakPoint];
    }

    const streak = updateLearningStreak(state.learningStreak, state.lastStudyDate, now);
    const next: LearningState = {
      answerHistory: [...state.answerHistory, {
        id: `${question.id}-${now.getTime()}`,
        questionId: question.id,
        subject: question.subject,
        selectedAnswer,
        grade,
        score: SCORE_BY_GRADE[grade],
        answeredAt: now.toISOString(),
      }],
      weakPoints,
      questionProgress: { ...state.questionProgress, [question.id]: progress },
      questionReviews: state.questionReviews,
      learningStreak: streak.learningStreak,
      lastStudyDate: streak.lastStudyDate,
    };

    setState(next);
    if (!saveLearningState(next)) setPersistenceStatus("error");
    else if (persistenceStatus !== "available") setPersistenceStatus("available");

    return { ...schedule, addedToWeakPoints: grade !== "correct" };
  }, [persistenceStatus, state]);

  const markQuestionReviewed = useCallback((question: Question, update: ReviewOverride): ContentReviewRecord => {
    const today = toDateKey();
    const priority = update.reviewPriority ?? question.reviewPriority ?? "中";
    const evidenceInput = update.reviewEvidence ?? {};
    const review: ContentReviewRecord = {
      ...state.questionReviews[question.id],
      ...update,
      questionId: question.id,
      confirmedYear: update.confirmedYear?.trim() || "未確認",
      validAsOf: update.validAsOf || today,
      lastReviewedAt: today,
      nextReviewDue: calculateContentReviewDue(priority, { lastReviewedAt: today }),
      reviewPriority: priority,
      reviewNote: update.reviewNote ?? question.reviewNote,
      reviewEvidence: {
        sourceTitle: evidenceInput.sourceTitle?.trim() ?? "",
        sourceUrl: evidenceInput.sourceUrl?.trim() ?? "",
        sourceType: evidenceInput.sourceType ?? "その他",
        checkedBy: evidenceInput.checkedBy?.trim() || "user",
        checkedAt: today,
        memo: evidenceInput.memo?.trim() ?? "",
      },
    };
    const next: LearningState = {
      ...state,
      questionReviews: { ...state.questionReviews, [question.id]: review },
    };
    setState(next);
    if (!saveLearningState(next)) setPersistenceStatus("error");
    else if (persistenceStatus !== "available") setPersistenceStatus("available");
    return review;
  }, [persistenceStatus, state]);

  const resetLearningData = useCallback(() => {
    const cleared = clearLearningState();
    setState(initialLearningState);
    setPersistenceStatus(cleared ? "available" : "error");
    return cleared;
  }, []);

  const updateLearningState = useCallback((updater: (current: LearningState) => LearningState) => {
    const next = updater(state);
    setState(next);
    const saved = saveLearningState(next);
    if (!saved) setPersistenceStatus("error");
    else setPersistenceStatus("available");
    return saved;
  }, [state]);

  return { state, isHydrated, persistenceStatus, recordGrade, markQuestionReviewed, resetLearningData, updateLearningState };
};
