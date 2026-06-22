import type { LearningState, QAAction, QAValidationResult, Question, QuestionProgress, SelfGrade, SubjectId, WeakPoint } from "../types";
import { toDateKey } from "./date";

const QA_HISTORY_PREFIX = "qa-sample-";

const scoreByGrade: Record<SelfGrade, 10 | 6 | 0> = { correct: 10, almost: 6, incorrect: 0 };

const createProgress = (question: Question, grade: SelfGrade, answeredAt: Date, nextReviewAt: Date): QuestionProgress => ({
  questionId: question.id,
  attempts: 1,
  correctCount: grade === "correct" ? 1 : 0,
  totalScore: scoreByGrade[grade],
  currentIntervalDays: grade === "correct" ? 7 : grade === "almost" ? 3 : 1,
  lastGrade: grade,
  lastAnsweredAt: answeredAt.toISOString(),
  nextReviewAt: nextReviewAt.toISOString(),
});

export const applyQAAction = (state: LearningState, action: QAAction, questions: Question[], now = new Date()): LearningState => {
  if (!questions.length) return state;

  if (action === "sample-history") {
    const samples = questions.slice(0, 3);
    const grades: SelfGrade[] = ["correct", "almost", "incorrect"];
    const qaIds = new Set(samples.map((question) => `${QA_HISTORY_PREFIX}${question.id}`));
    const answerHistory = state.answerHistory.filter((item) => !qaIds.has(item.id));
    const questionProgress = { ...state.questionProgress };
    samples.forEach((question, index) => {
      const answeredAt = new Date(now);
      const nextReviewAt = new Date(now);
      nextReviewAt.setDate(nextReviewAt.getDate() + [7, 3, 1][index]);
      const grade = grades[index];
      answerHistory.push({
        id: `${QA_HISTORY_PREFIX}${question.id}`,
        questionId: question.id,
        subject: question.subject,
        selectedAnswer: `QAサンプル回答${index + 1}`,
        grade,
        score: scoreByGrade[grade],
        answeredAt: answeredAt.toISOString(),
      });
      questionProgress[question.id] = createProgress(question, grade, answeredAt, nextReviewAt);
    });
    return { ...state, answerHistory, questionProgress };
  }

  if (action === "overdue-review") {
    const question = questions[3] ?? questions[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      ...state,
      questionProgress: { ...state.questionProgress, [question.id]: createProgress(question, "incorrect", now, yesterday) },
    };
  }

  if (action === "weak-point") {
    const question = questions[4] ?? questions[0];
    const existing = state.weakPoints.find((item) => item.questionId === question.id);
    const weakPoint: WeakPoint = {
      questionId: question.id,
      addedAt: existing?.addedAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
      lastGrade: "incorrect",
    };
    return { ...state, weakPoints: [...state.weakPoints.filter((item) => item.questionId !== question.id), weakPoint] };
  }

  if (action === "unconfirmed-review") {
    const question = questions.find((item) => item.isYearSensitive) ?? questions[0];
    const current = state.questionReviews[question.id];
    return {
      ...state,
      questionReviews: {
        ...state.questionReviews,
        [question.id]: {
          ...current,
          questionId: question.id,
          confirmedYear: "未確認",
          validAsOf: question.validAsOf,
          nextReviewDue: question.nextReviewDue,
          reviewPriority: question.reviewPriority ?? "高",
          reviewNote: question.reviewNote,
          reviewEvidence: undefined,
          lastReviewedAt: undefined,
        },
      },
    };
  }

  if (action === "streak-3") return { ...state, learningStreak: 3, lastStudyDate: toDateKey(now) };
  return state;
};

export const runQAValidation = (questions: Question[]): QAValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  const subjects: SubjectId[] = ["economics", "finance", "management", "operations", "law", "information", "policy"];

  questions.forEach((question) => {
    if (ids.has(question.id)) errors.push(`ID重複: ${question.id}`);
    ids.add(question.id);
    if (!question.question.trim() || !question.answer.trim() || !question.explanation.trim()) errors.push(`必須本文不足: ${question.id}`);
    if (question.type === "4択" && question.choices?.length !== 4) errors.push(`4択の選択肢不足: ${question.id}`);
    if (question.relatedTopics.length < 1 || question.relatedTopics.length > 3) errors.push(`関連論点数が不正: ${question.id}`);
    if (!question.importance || !["A", "B", "C"].includes(question.importance)) errors.push(`ABC重要度不足: ${question.id}`);
    if (!question.topicTag || question.primaryExamTopicTag !== question.topicTag) errors.push(`ABC論点タグ不足: ${question.id}`);
    if (question.examStage !== "primary") errors.push(`試験区分不足: ${question.id}`);
    if (question.isYearSensitive && !question.reviewPriority) errors.push(`レビュー優先度不足: ${question.id}`);
    if (question.isYearSensitive && (!question.confirmedYear || question.confirmedYear === "未確認" || !question.reviewEvidence)) warnings.push(`未確認: ${question.id}`);
  });

  subjects.forEach((subject) => {
    const count = questions.filter((question) => question.subject === subject).length;
    if (count < 20) errors.push(`${subject}は${count}問（20問未満）`);
  });
  if (questions.length < 140) errors.push(`合計${questions.length}問（140問未満）`);

  return { passed: errors.length === 0, checkedAt: new Date().toISOString(), errors, warnings };
};
