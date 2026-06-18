import type { AnswerHistoryItem, ContentReviewRecord, LearningState, QuestionProgress, SelfGrade, SubjectId, WeakPoint } from "../types";

export const STORAGE_KEYS = {
  answerHistory: "shindan-os:answerHistory",
  weakPoints: "shindan-os:weakPoints",
  questionProgress: "shindan-os:questionProgress",
  questionReviews: "shindan-os:questionReviews",
  qaChecklist: "shindan-os:qaChecklist",
  lastExportAt: "shindan-os:lastExportAt",
  lastImportAt: "shindan-os:lastImportAt",
  learningStreak: "shindan-os:learningStreak",
  lastStudyDate: "shindan-os:lastStudyDate",
} as const;

export const initialLearningState: LearningState = {
  answerHistory: [],
  weakPoints: [],
  questionProgress: {},
  questionReviews: {},
  learningStreak: 0,
  lastStudyDate: null,
};

export interface LoadLearningStateResult {
  state: LearningState;
  storageAvailable: boolean;
  recovered: boolean;
}

const subjectIds: SubjectId[] = ["economics", "finance", "management", "operations", "law", "information", "policy"];
const grades: SelfGrade[] = ["correct", "almost", "incorrect"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isValidIsoDate = (value: unknown): value is string => isString(value) && !Number.isNaN(Date.parse(value));
const isOptionalHttpUrl = (value: unknown): value is string => {
  if (!isString(value) || !value.trim()) return isString(value);
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};
const isSubjectId = (value: unknown): value is SubjectId => isString(value) && subjectIds.includes(value as SubjectId);
const isGrade = (value: unknown): value is SelfGrade => isString(value) && grades.includes(value as SelfGrade);

const isAnswerHistoryItem = (value: unknown): value is AnswerHistoryItem => {
  if (!isRecord(value)) return false;
  return isString(value.id)
    && isString(value.questionId)
    && isSubjectId(value.subject)
    && isString(value.selectedAnswer)
    && isGrade(value.grade)
    && (value.score === 0 || value.score === 6 || value.score === 10)
    && isValidIsoDate(value.answeredAt);
};

const isWeakPoint = (value: unknown): value is WeakPoint => {
  if (!isRecord(value)) return false;
  return isString(value.questionId)
    && isValidIsoDate(value.addedAt)
    && isValidIsoDate(value.updatedAt)
    && (value.lastGrade === "almost" || value.lastGrade === "incorrect");
};

const isQuestionProgress = (value: unknown): value is QuestionProgress => {
  if (!isRecord(value)) return false;
  return isString(value.questionId)
    && isFiniteNumber(value.attempts) && Number.isInteger(value.attempts) && value.attempts >= 1
    && isFiniteNumber(value.correctCount) && Number.isInteger(value.correctCount) && value.correctCount >= 0 && value.correctCount <= value.attempts
    && isFiniteNumber(value.totalScore) && Number.isInteger(value.totalScore) && value.totalScore >= 0 && value.totalScore <= value.attempts * 10
    && isFiniteNumber(value.currentIntervalDays) && Number.isInteger(value.currentIntervalDays) && value.currentIntervalDays >= 1 && value.currentIntervalDays <= 30
    && isGrade(value.lastGrade)
    && isValidIsoDate(value.lastAnsweredAt)
    && isValidIsoDate(value.nextReviewAt);
};

const isDateKey = (value: unknown): value is string => {
  if (!isString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const isContentReviewRecord = (value: unknown): value is ContentReviewRecord => {
  if (!isRecord(value)) return false;
  const evidence = value.reviewEvidence;
  const validEvidence = evidence === undefined || (isRecord(evidence)
    && (evidence.sourceTitle === undefined || isString(evidence.sourceTitle))
    && (evidence.sourceUrl === undefined || isOptionalHttpUrl(evidence.sourceUrl))
    && (evidence.sourceType === undefined || (isString(evidence.sourceType) && ["公式", "白書", "法令", "過去問", "教材", "自作メモ", "その他"].includes(evidence.sourceType)))
    && (evidence.checkedBy === undefined || isString(evidence.checkedBy))
    && (evidence.checkedAt === undefined || isDateKey(evidence.checkedAt))
    && (evidence.memo === undefined || isString(evidence.memo)));
  return isString(value.questionId)
    && (value.confirmedYear === undefined || (isString(value.confirmedYear) && (/^\d{4}(年度)?$/.test(value.confirmedYear) || value.confirmedYear === "未確認")))
    && (value.validAsOf === undefined || isDateKey(value.validAsOf))
    && (value.lastReviewedAt === undefined || isDateKey(value.lastReviewedAt))
    && (value.nextReviewDue === undefined || isDateKey(value.nextReviewDue))
    && (value.reviewPriority === undefined || (isString(value.reviewPriority) && ["高", "中", "低"].includes(value.reviewPriority)))
    && (value.reviewNote === undefined || isString(value.reviewNote))
    && validEvidence;
};

export const validateLearningStateSnapshot = (value: unknown): LearningState | null => {
  if (!isRecord(value)
    || !Array.isArray(value.answerHistory) || !value.answerHistory.every(isAnswerHistoryItem)
    || !Array.isArray(value.weakPoints) || !value.weakPoints.every(isWeakPoint)
    || !isRecord(value.questionProgress)
    || !isRecord(value.questionReviews)
    || !isFiniteNumber(value.learningStreak) || !Number.isInteger(value.learningStreak) || value.learningStreak < 0
    || !(value.lastStudyDate === null || isDateKey(value.lastStudyDate))) return null;

  const answerHistory = value.answerHistory as AnswerHistoryItem[];
  const weakPoints = value.weakPoints as WeakPoint[];

  const questionProgress: Record<string, QuestionProgress> = {};
  for (const [key, progress] of Object.entries(value.questionProgress)) {
    if (!isQuestionProgress(progress) || progress.questionId !== key) return null;
    questionProgress[key] = progress;
  }
  const questionReviews: Record<string, ContentReviewRecord> = {};
  for (const [key, review] of Object.entries(value.questionReviews)) {
    if (!isContentReviewRecord(review) || review.questionId !== key) return null;
    questionReviews[key] = review;
  }
  const weakPointMap = new Map<string, WeakPoint>();
  weakPoints
    .slice()
    .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
    .forEach((item) => weakPointMap.set(item.questionId, item));

  return {
    answerHistory: [...answerHistory],
    weakPoints: [...weakPointMap.values()],
    questionProgress,
    questionReviews,
    learningStreak: value.learningStreak,
    lastStudyDate: value.lastStudyDate,
  };
};

const getStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.localStorage;
    const testKey = "__shindan_os_storage_test__";
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return storage;
  } catch {
    return null;
  }
};

const parseStoredValue = (storage: Storage, key: string): { value: unknown; validJson: boolean; exists: boolean } => {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return { value: undefined, validJson: true, exists: false };
    return { value: JSON.parse(raw) as unknown, validJson: true, exists: true };
  } catch {
    return { value: undefined, validJson: false, exists: true };
  }
};

export const loadLearningState = (): LoadLearningStateResult => {
  const storage = getStorage();
  if (!storage) return { state: initialLearningState, storageAvailable: false, recovered: false };

  let recovered = false;
  const historyRaw = parseStoredValue(storage, STORAGE_KEYS.answerHistory);
  const weakRaw = parseStoredValue(storage, STORAGE_KEYS.weakPoints);
  const progressRaw = parseStoredValue(storage, STORAGE_KEYS.questionProgress);
  const reviewsRaw = parseStoredValue(storage, STORAGE_KEYS.questionReviews);
  const streakRaw = parseStoredValue(storage, STORAGE_KEYS.learningStreak);
  const dateRaw = parseStoredValue(storage, STORAGE_KEYS.lastStudyDate);

  const sanitizeArray = <T>(raw: typeof historyRaw, guard: (value: unknown) => value is T): T[] => {
    if (!raw.exists) return [];
    if (!raw.validJson || !Array.isArray(raw.value)) {
      recovered = true;
      return [];
    }
    const sanitized = raw.value.filter(guard);
    if (sanitized.length !== raw.value.length) recovered = true;
    return sanitized;
  };

  const answerHistory = sanitizeArray(historyRaw, isAnswerHistoryItem);
  const sanitizedWeakPoints = sanitizeArray(weakRaw, isWeakPoint);
  const weakPointMap = new Map<string, WeakPoint>();
  sanitizedWeakPoints
    .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
    .forEach((item) => weakPointMap.set(item.questionId, item));
  const weakPoints = [...weakPointMap.values()];
  if (weakPoints.length !== sanitizedWeakPoints.length) recovered = true;
  const questionProgress: Record<string, QuestionProgress> = {};
  if (progressRaw.exists) {
    if (!progressRaw.validJson || !isRecord(progressRaw.value)) {
      recovered = true;
    } else {
      Object.entries(progressRaw.value).forEach(([key, value]) => {
        if (isQuestionProgress(value) && value.questionId === key) questionProgress[key] = value;
        else recovered = true;
      });
    }
  }

  const questionReviews: Record<string, ContentReviewRecord> = {};
  if (reviewsRaw.exists) {
    if (!reviewsRaw.validJson || !isRecord(reviewsRaw.value)) {
      recovered = true;
    } else {
      Object.entries(reviewsRaw.value).forEach(([key, value]) => {
        if (isContentReviewRecord(value) && value.questionId === key) questionReviews[key] = value;
        else recovered = true;
      });
    }
  }

  let learningStreak = 0;
  if (streakRaw.exists) {
    if (streakRaw.validJson && isFiniteNumber(streakRaw.value) && Number.isInteger(streakRaw.value) && streakRaw.value >= 0) learningStreak = streakRaw.value;
    else recovered = true;
  }

  let lastStudyDate: string | null = null;
  if (dateRaw.exists) {
    if (dateRaw.validJson && (dateRaw.value === null || isDateKey(dateRaw.value))) lastStudyDate = dateRaw.value;
    else recovered = true;
  }

  return {
    state: { answerHistory, weakPoints, questionProgress, questionReviews, learningStreak, lastStudyDate },
    storageAvailable: true,
    recovered,
  };
};

export const saveLearningState = (state: LearningState): boolean => {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEYS.answerHistory, JSON.stringify(state.answerHistory));
    storage.setItem(STORAGE_KEYS.weakPoints, JSON.stringify(state.weakPoints));
    storage.setItem(STORAGE_KEYS.questionProgress, JSON.stringify(state.questionProgress));
    storage.setItem(STORAGE_KEYS.questionReviews, JSON.stringify(state.questionReviews));
    storage.setItem(STORAGE_KEYS.learningStreak, JSON.stringify(state.learningStreak));
    storage.setItem(STORAGE_KEYS.lastStudyDate, JSON.stringify(state.lastStudyDate));
    return true;
  } catch {
    return false;
  }
};

export const clearLearningState = (): boolean => {
  const storage = getStorage();
  if (!storage) return false;
  try {
    Object.values(STORAGE_KEYS).forEach((key) => storage.removeItem(key));
    return true;
  } catch {
    return false;
  }
};
