import { publicQuestions } from "./questions/public";
import { privateQuestions } from "./questions/private.generated";
import type { Question } from "../types";
import { applyAbcMetadata } from "./abcTopics";
import { applyYearSensitivityDefaults } from "../utils/contentReview";

export const allQuestions: Question[] = [...publicQuestions, ...privateQuestions.map((question) => applyAbcMetadata(applyYearSensitivityDefaults(question)))];

// Rank C is retained for optional deep-study data, but is excluded from normal sessions.
export const questions: Question[] = allQuestions.filter((question) => question.rank === "A" || question.rank === "B");
