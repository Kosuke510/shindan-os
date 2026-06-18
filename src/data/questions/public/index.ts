import { financeQuestions } from "./finance";
import { legalQuestions } from "./legal";
import { marketQuestions } from "./market";
import { operationsQuestions } from "./operations";
import { smeQuestions } from "./sme";
import { strategyQuestions } from "./strategy";
import { systemsQuestions } from "./systems";
import type { Question } from "../../../types";
import { applyYearSensitivityDefaults } from "../../../utils/contentReview";

const rawPublicQuestions: Question[] = [
  ...marketQuestions,
  ...financeQuestions,
  ...strategyQuestions,
  ...operationsQuestions,
  ...legalQuestions,
  ...systemsQuestions,
  ...smeQuestions,
];

export const publicQuestions: Question[] = rawPublicQuestions.map((question) => applyYearSensitivityDefaults(question));
