import type { QuestionProgress, SelfGrade } from "../types";
import { isLocalDateOnOrBefore } from "./date.ts";

export const MAX_REVIEW_INTERVAL_DAYS = 30;

const INITIAL_INTERVALS: Record<SelfGrade, number> = {
  incorrect: 1,
  almost: 3,
  correct: 7,
};

export interface ReviewSchedule {
  intervalDays: number;
  nextReviewAt: string;
}

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const calculateReviewInterval = (grade: SelfGrade, currentIntervalDays?: number): number => {
  if (!currentIntervalDays) return INITIAL_INTERVALS[grade];
  if (grade === "incorrect") return 1;
  if (grade === "almost") return Math.min(MAX_REVIEW_INTERVAL_DAYS, Math.ceil(currentIntervalDays * 1.5));
  return Math.min(MAX_REVIEW_INTERVAL_DAYS, currentIntervalDays * 2);
};

export const scheduleNextReview = (
  grade: SelfGrade,
  previousProgress?: QuestionProgress,
  reviewedAt = new Date(),
): ReviewSchedule => {
  const intervalDays = calculateReviewInterval(grade, previousProgress?.currentIntervalDays);
  return { intervalDays, nextReviewAt: addDays(reviewedAt, intervalDays).toISOString() };
};

export const isReviewDue = (progress: QuestionProgress, now = new Date()): boolean =>
  isLocalDateOnOrBefore(new Date(progress.nextReviewAt), now);

export const getDueReviewCount = (progress: Record<string, QuestionProgress>, now = new Date()): number =>
  Object.values(progress).filter((item) => isReviewDue(item, now)).length;
