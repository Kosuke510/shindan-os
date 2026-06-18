import type { ContentReviewRecord, Question, ReviewPriority, SubjectId } from "../types";
import { toDateKey } from "./date";

const HIGH_RISK_KEYWORDS = [
  "補助金", "税制", "信用保証", "制度融資", "日本政策金融公庫", "中小企業白書", "小規模企業白書",
  "開業率", "廃業率", "労働生産性", "付加価値額", "事業承継", "経営革新計画", "経営力向上計画",
  "下請法", "個人情報保護法", "消費者契約法", "労働基準法", "育児・介護休業法", "労働安全衛生", "社会保険", "ハラスメント",
];
const LABOR_KEYWORDS = ["労働基準法", "育児・介護休業法", "労働安全衛生", "社会保険", "ハラスメント"];
const SYSTEMS_CHANGE_KEYWORDS = ["AI", "DX", "セキュリティ", "暗号", "認証", "マルウェア", "クラウド", "SaaS", "PaaS", "IaaS", "個人情報"];
const PRIORITY_MONTHS: Record<ReviewPriority, number> = { "高": 6, "中": 12, "低": 24 };

type ReviewRuleInput = Pick<Question, "subject" | "field" | "topic" | "isYearSensitive" | "reviewPriority">;

const includesKeyword = (question: Pick<Question, "field" | "topic">, keywords: string[]): boolean => {
  const text = `${question.field} ${question.topic}`;
  return keywords.some((keyword) => text.includes(keyword));
};

export const isYearSensitiveByRule = (question: ReviewRuleInput): boolean =>
  question.isYearSensitive === true
  || question.subject === "policy"
  || question.subject === "law"
  || includesKeyword(question, HIGH_RISK_KEYWORDS)
  || (question.subject === "information" && includesKeyword(question, SYSTEMS_CHANGE_KEYWORDS));

export const getDefaultReviewPriority = (question: ReviewRuleInput): ReviewPriority => {
  if (question.reviewPriority) return question.reviewPriority;
  if (question.subject === "policy" || includesKeyword(question, HIGH_RISK_KEYWORDS) || includesKeyword(question, LABOR_KEYWORDS)) return "高";
  if (question.subject === "law" || (question.subject === "information" && includesKeyword(question, SYSTEMS_CHANGE_KEYWORDS))) return "中";
  return "低";
};

const parseDateKey = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};

const addCalendarMonths = (date: Date, months: number): Date => {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
};

export const calculateContentReviewDue = (
  priority: ReviewPriority,
  dates: { lastReviewedAt?: string; validAsOf?: string } = {},
  now = new Date(),
): string => {
  const base = dates.lastReviewedAt ?? dates.validAsOf;
  const baseDate = base ? parseDateKey(base) : now;
  return toDateKey(addCalendarMonths(baseDate, PRIORITY_MONTHS[priority]));
};

const defaultReviewNote = (question: ReviewRuleInput): string => {
  if (question.subject === "policy") return "制度・統計が年度により変わる可能性あり。最新の公的資料を確認する。";
  if (includesKeyword(question, LABOR_KEYWORDS)) return "法改正の影響を受ける可能性あり。施行日と経過措置を確認する。";
  if (question.subject === "law") return "会社法・知的財産法等の改正状況を定期確認する。";
  if (question.subject === "information") return "技術・セキュリティ・関連制度の更新を定期確認する。";
  return "年度改正・制度変更の影響を定期確認する。";
};

export const applyYearSensitivityDefaults = (question: Question, baselineDate = "2026-06-17"): Question => {
  if (!isYearSensitiveByRule(question)) return question;
  const reviewPriority = getDefaultReviewPriority(question);
  const validAsOf = question.validAsOf ?? baselineDate;
  return {
    ...question,
    isYearSensitive: true,
    confirmedYear: question.confirmedYear ?? "未確認",
    validAsOf,
    nextReviewDue: question.nextReviewDue ?? calculateContentReviewDue(reviewPriority, { lastReviewedAt: question.lastReviewedAt, validAsOf }),
    reviewPriority,
    reviewNote: question.reviewNote ?? defaultReviewNote(question),
  };
};

export const getEffectiveContentReview = (question: Question, record?: ContentReviewRecord) => ({
  isYearSensitive: question.isYearSensitive === true,
  confirmedYear: record?.confirmedYear ?? question.confirmedYear,
  validAsOf: record?.validAsOf ?? question.validAsOf,
  lastReviewedAt: record?.lastReviewedAt ?? question.lastReviewedAt,
  nextReviewDue: record?.nextReviewDue ?? question.nextReviewDue,
  reviewPriority: record?.reviewPriority ?? question.reviewPriority,
  reviewNote: record?.reviewNote ?? question.reviewNote,
  reviewEvidence: record?.reviewEvidence ?? question.reviewEvidence,
});

export const isContentReviewDue = (question: Question, record?: ContentReviewRecord, today = toDateKey()): boolean => {
  const review = getEffectiveContentReview(question, record);
  if (!review.isYearSensitive) return false;
  return !review.nextReviewDue || review.nextReviewDue <= today;
};

export const isContentReviewUnconfirmed = (question: Question, record?: ContentReviewRecord): boolean => {
  const review = getEffectiveContentReview(question, record);
  if (!review.isYearSensitive) return false;
  return !review.confirmedYear || review.confirmedYear === "未確認" || !review.validAsOf || !review.reviewEvidence;
};

export interface ContentReviewStats {
  totalSensitive: number;
  totalDue: number;
  highPriorityDue: number;
  unconfirmed: number;
  evidenceCount: number;
  highPriorityUnconfirmed: number;
  policyDue: number;
  lawAndLaborDue: number;
  bySubjectSensitive: Record<SubjectId, number>;
  bySubjectDue: Record<SubjectId, number>;
}

const subjectIds: SubjectId[] = ["economics", "finance", "management", "operations", "law", "information", "policy"];

export const getContentReviewStats = (questions: Question[], records: Record<string, ContentReviewRecord>, today = toDateKey()): ContentReviewStats => {
  const bySubjectSensitive = Object.fromEntries(subjectIds.map((subject) => [subject, 0])) as Record<SubjectId, number>;
  const bySubjectDue = Object.fromEntries(subjectIds.map((subject) => [subject, 0])) as Record<SubjectId, number>;
  let totalDue = 0;
  let highPriorityDue = 0;
  let unconfirmed = 0;
  let evidenceCount = 0;
  let highPriorityUnconfirmed = 0;
  let policyDue = 0;
  let lawAndLaborDue = 0;

  questions.forEach((question) => {
    if (!question.isYearSensitive) return;
    bySubjectSensitive[question.subject] += 1;
    const review = getEffectiveContentReview(question, records[question.id]);
    const questionUnconfirmed = isContentReviewUnconfirmed(question, records[question.id]);
    if (review.reviewEvidence) evidenceCount += 1;
    if (questionUnconfirmed) {
      unconfirmed += 1;
      if (review.reviewPriority === "高") highPriorityUnconfirmed += 1;
    }
    if (!isContentReviewDue(question, records[question.id], today)) return;
    totalDue += 1;
    bySubjectDue[question.subject] += 1;
    if (review.reviewPriority === "高") highPriorityDue += 1;
    if (question.subject === "policy") policyDue += 1;
    if (question.subject === "law" || includesKeyword(question, LABOR_KEYWORDS)) lawAndLaborDue += 1;
  });

  const totalSensitive = Object.values(bySubjectSensitive).reduce((sum, count) => sum + count, 0);
  return { totalSensitive, totalDue, highPriorityDue, unconfirmed, evidenceCount, highPriorityUnconfirmed, policyDue, lawAndLaborDue, bySubjectSensitive, bySubjectDue };
};
