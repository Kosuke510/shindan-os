export type SubjectId =
  | "economics"
  | "finance"
  | "management"
  | "operations"
  | "law"
  | "information"
  | "policy";

export type QuestionRank = "A" | "B" | "C";
export type QuestionDifficulty = "基礎" | "標準" | "応用";
export type QuestionType = "一問一答" | "4択" | "計算" | "比較";
export type QuestionSource = "過去問" | "自作" | "教材" | "手入力";
export type ReviewPriority = "高" | "中" | "低";
export type ReviewEvidenceSourceType = "公式" | "白書" | "法令" | "過去問" | "教材" | "自作メモ" | "その他";
export type ContentReviewFilter = "all" | "unconfirmed" | "due" | "high" | "policy" | "law" | "labor" | "no-evidence";
export type AppView = "home" | "practice" | "weak" | "review" | "data";
export type QAAction = "sample-history" | "overdue-review" | "weak-point" | "unconfirmed-review" | "streak-3";
export type SelfGrade = "correct" | "almost" | "incorrect";
export type PersistenceStatus = "available" | "recovered" | "unavailable" | "error";

export interface Subject {
  id: SubjectId;
  shortName: string;
  name: string;
  code: string;
  accent: string;
  softAccent: string;
}

export interface Question {
  id: string;
  subject: SubjectId;
  coreName: string;
  field: string;
  topic: string;
  rank: QuestionRank;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  question: string;
  choices?: string[];
  answer: string;
  explanation: string;
  commonMistake: string;
  examPoint: string;
  relatedTopics: string[];
  source: QuestionSource;
  sourceYear?: string;
  sourceSubject?: string;
  sourceQuestionNumber?: string;
  sourceNote?: string;
  isYearSensitive?: boolean;
  confirmedYear?: string;
  validAsOf?: string;
  lastReviewedAt?: string;
  nextReviewDue?: string;
  reviewPriority?: ReviewPriority;
  reviewNote?: string;
  reviewEvidence?: ReviewEvidence;
}

export interface ReviewEvidence {
  sourceTitle?: string;
  sourceUrl?: string;
  sourceType?: ReviewEvidenceSourceType;
  checkedBy?: string;
  checkedAt?: string;
  memo?: string;
}

export interface ReviewOverride {
  questionId: string;
  confirmedYear?: string;
  validAsOf?: string;
  lastReviewedAt?: string;
  nextReviewDue?: string;
  reviewPriority?: ReviewPriority;
  reviewNote?: string;
  reviewEvidence?: ReviewEvidence;
}

export type ContentReviewRecord = ReviewOverride;

export interface AnswerHistoryItem {
  id: string;
  questionId: string;
  subject: SubjectId;
  selectedAnswer: string;
  grade: SelfGrade;
  score: 10 | 6 | 0;
  answeredAt: string;
}

export interface WeakPoint {
  questionId: string;
  addedAt: string;
  updatedAt: string;
  lastGrade: Exclude<SelfGrade, "correct">;
}

export interface QuestionProgress {
  questionId: string;
  attempts: number;
  correctCount: number;
  totalScore: number;
  currentIntervalDays: number;
  lastGrade: SelfGrade;
  lastAnsweredAt: string;
  nextReviewAt: string;
}

export interface LearningState {
  answerHistory: AnswerHistoryItem[];
  weakPoints: WeakPoint[];
  questionProgress: Record<string, QuestionProgress>;
  questionReviews: Record<string, ContentReviewRecord>;
  learningStreak: number;
  lastStudyDate: string | null;
}

export interface GradeResult {
  nextReviewAt: string;
  intervalDays: number;
  addedToWeakPoints: boolean;
}

export type StudyMode = "random" | "subject" | "review" | "quick";

export interface StudySessionConfig {
  mode: StudyMode;
  subject?: SubjectId;
}

export interface SubjectStat {
  subject: SubjectId;
  answers: number;
  correct: number;
  accuracy: number;
}

export interface QAValidationResult {
  passed: boolean;
  checkedAt: string;
  errors: string[];
  warnings: string[];
}

export interface ShindanBackup {
  appName: "Shindan OS";
  version: string;
  exportedAt: string;
  data: {
    answerHistory: unknown;
    weakPoints: unknown;
    questionProgress: unknown;
    learningStreak: unknown;
    lastStudyDate: unknown;
    reviewOverrides?: unknown;
    qaChecklist?: unknown;
    lastExportAt?: unknown;
    lastImportAt?: unknown;
    additionalStorage?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export interface BackupActivity {
  lastExportAt: string | null;
  lastImportAt: string | null;
}
