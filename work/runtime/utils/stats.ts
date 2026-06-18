import { subjects } from "../data/subjects.ts";
import type { LearningState, SubjectId, SubjectStat } from "../types";
import { toDateKey } from "./date.ts";

export const getTodayAnswerCount = (state: LearningState, now = new Date()): number => {
  const today = toDateKey(now);
  return state.answerHistory.filter((item) => toDateKey(new Date(item.answeredAt)) === today).length;
};

export const getOverallAccuracy = (state: LearningState): number => {
  if (state.answerHistory.length === 0) return 0;
  const correct = state.answerHistory.filter((item) => item.grade === "correct").length;
  return Math.round((correct / state.answerHistory.length) * 100);
};

export const getSubjectStats = (state: LearningState): Record<SubjectId, SubjectStat> =>
  Object.fromEntries(
    subjects.map((subject) => {
      const history = state.answerHistory.filter((item) => item.subject === subject.id);
      const correct = history.filter((item) => item.grade === "correct").length;
      return [subject.id, {
        subject: subject.id,
        answers: history.length,
        correct,
        accuracy: history.length ? Math.round((correct / history.length) * 100) : 0,
      }];
    }),
  ) as Record<SubjectId, SubjectStat>;

export const updateLearningStreak = (
  currentStreak: number,
  lastStudyDate: string | null,
  now = new Date(),
): { learningStreak: number; lastStudyDate: string } => {
  const today = toDateKey(now);
  if (lastStudyDate === today) return { learningStreak: currentStreak, lastStudyDate: today };

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const learningStreak = lastStudyDate === toDateKey(yesterday) ? currentStreak + 1 : 1;
  return { learningStreak, lastStudyDate: today };
};
