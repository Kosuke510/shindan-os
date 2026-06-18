import type { Question, QuestionDifficulty, QuestionRank, QuestionType, SubjectId } from "../../../types";

export interface PublicQuestionSeed {
  id: string;
  core: string;
  field: string;
  topic: string;
  rank: QuestionRank;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  question: string;
  choices?: string[];
  answer: string;
  explanation: string;
  mistake: string;
  point: string;
  related: string[];
}

export function buildPublicQuestions(subject: SubjectId, sourceSubject: string, seeds: PublicQuestionSeed[]): Question[] {
  return seeds.map(({ core, mistake, point, related, ...seed }) => ({
    ...seed,
    subject,
    coreName: core,
    commonMistake: mistake,
    examPoint: point,
    relatedTopics: related,
    source: "自作",
    sourceSubject,
    sourceNote: "Shindan OS公開用オリジナル問題",
  }));
}
