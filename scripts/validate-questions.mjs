import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceFiles = [
  { path: join(projectRoot, "src", "data", "questions", "public", "index.ts"), exportName: "publicQuestions", label: "public" },
  { path: join(projectRoot, "src", "data", "questions", "private.generated.ts"), exportName: "privateQuestions", label: "private" },
];

const allowedSubjects = new Set(["economics", "finance", "management", "operations", "law", "information", "policy"]);
const allowedRanks = new Set(["A", "B", "C"]);
const allowedDifficulties = new Set(["基礎", "標準", "応用"]);
const allowedTypes = new Set(["一問一答", "4択", "計算", "比較"]);
const allowedSources = new Set(["過去問", "自作", "教材", "手入力"]);
const allowedReviewPriorities = new Set(["高", "中", "低"]);
const allowedEvidenceSourceTypes = new Set(["公式", "白書", "法令", "過去問", "教材", "自作メモ", "その他"]);
const forcedYearSensitiveKeywords = ["補助金", "税制", "信用保証", "制度融資", "日本政策金融公庫", "中小企業白書", "小規模企業白書", "開業率", "廃業率", "労働生産性", "付加価値額", "事業承継", "経営革新計画", "経営力向上計画", "下請法", "個人情報保護法", "消費者契約法", "労働基準法", "育児・介護休業法", "労働安全衛生", "社会保険", "ハラスメント"];
const requiredTextFields = ["id", "coreName", "field", "topic", "question", "answer", "explanation", "commonMistake", "examPoint"];
const optionalSourceFields = ["sourceYear", "sourceSubject", "sourceQuestionNumber", "sourceNote"];

const moduleCache = new Map();

function resolveLocalModule(fromPath, specifier) {
  const basePath = resolve(dirname(fromPath), specifier);
  const candidates = [basePath, `${basePath}.ts`, join(basePath, "index.ts")];
  const matched = candidates.find((candidate) => existsSync(candidate));
  if (!matched) throw new Error(`${fromPath} から ${specifier} を解決できません。`);
  return matched;
}

function loadTsModule(path) {
  if (moduleCache.has(path)) return moduleCache.get(path).exports;
  const source = readFileSync(path, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText;
  const loadedModule = { exports: {} };
  moduleCache.set(path, loadedModule);
  Function("module", "exports", "require", output)(loadedModule, loadedModule.exports, (specifier) => {
    if (!specifier.startsWith(".")) return {};
    return loadTsModule(resolveLocalModule(path, specifier));
  });
  return loadedModule.exports;
}

function loadQuestionArray({ path, exportName, label }) {
  const loadedModule = loadTsModule(path);
  const value = loadedModule[exportName];
  if (!Array.isArray(value)) throw new Error(`${label} question data must export an array.`);
  return value.map((question) => ({ ...question, __dataset: label }));
}

const questions = sourceFiles.flatMap(loadQuestionArray);
const { calculateContentReviewDue } = loadTsModule(join(projectRoot, "src", "utils", "contentReview.ts"));
const errors = [];
const warnings = [];
const reviewWarningIds = {
  "年度依存問題にreviewEvidenceがありません": [],
  "年度依存問題のsourceTitleがありません": [],
  "年度依存問題のsourceUrlがありません": [],
  "confirmedYearが未確認です": [],
  "年度依存問題にvalidAsOfがありません": [],
  "年度依存問題にlastReviewedAtがありません": [],
  "年度依存問題にnextReviewDueがありません": [],
  "nextReviewDueを迎えており要レビューです": [],
  "高優先度ですがreviewEvidenceがありません": [],
};
const ids = new Set();
const subjectCounts = Object.fromEntries([...allowedSubjects].map((subject) => [subject, 0]));
const sensitiveBySubject = Object.fromEntries([...allowedSubjects].map((subject) => [subject, 0]));
const dueBySubject = Object.fromEntries([...allowedSubjects].map((subject) => [subject, 0]));
const unconfirmedBySubject = Object.fromEntries([...allowedSubjects].map((subject) => [subject, 0]));
const evidenceSourceTypeCounts = Object.fromEntries([...allowedEvidenceSourceTypes, "未設定"].map((type) => [type, 0]));
const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

const isDateKey = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const isHttpUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const shouldBeYearSensitive = (question) => {
  if (question.subject === "policy") return true;
  const text = `${question.field ?? ""} ${question.topic ?? ""}`;
  return forcedYearSensitiveKeywords.some((keyword) => text.includes(keyword));
};

for (const [priority, expected] of [["高", "2026-12-17"], ["中", "2027-06-17"], ["低", "2028-06-17"]]) {
  const actual = calculateContentReviewDue(priority, { lastReviewedAt: "2026-06-17" });
  if (actual !== expected) errors.push(`レビュー期限計算が不正です: ${priority} expected=${expected} actual=${actual}`);
}

questions.forEach((question, index) => {
  const label = `${question.__dataset ?? "unknown"}[${index}]${typeof question.id === "string" ? ` (${question.id})` : ""}`;
  if (!question || typeof question !== "object" || Array.isArray(question)) {
    errors.push(`${label}: objectではありません。`);
    return;
  }

  for (const field of requiredTextFields) {
    if (typeof question[field] !== "string" || !question[field].trim()) errors.push(`${label}: ${field} は空でない文字列が必要です。`);
  }
  if (typeof question.id === "string") {
    if (ids.has(question.id)) errors.push(`${label}: idが重複しています。`);
    ids.add(question.id);
  }
  if (!allowedSubjects.has(question.subject)) errors.push(`${label}: subject が不正です。`);
  else subjectCounts[question.subject] += 1;
  if (!allowedRanks.has(question.rank)) errors.push(`${label}: rank は A / B / C のいずれかです。`);
  if (question.__dataset === "public" && question.rank === "C") errors.push(`${label}: 公開の通常問題にRank Cは入れられません。`);
  if (!allowedDifficulties.has(question.difficulty)) errors.push(`${label}: difficulty が不正です。`);
  if (!allowedTypes.has(question.type)) errors.push(`${label}: type が不正です。`);
  if (!allowedSources.has(question.source)) errors.push(`${label}: source が必要です（過去問 / 自作 / 教材 / 手入力）。`);
  if (question.reviewPriority !== undefined && !allowedReviewPriorities.has(question.reviewPriority)) errors.push(`${label}: reviewPriority は 高 / 中 / 低 のいずれかです。`);
  if (question.isYearSensitive === true && !question.reviewPriority) errors.push(`${label}: 年度依存問題にはreviewPriorityが必要です。`);
  if (question.confirmedYear !== undefined && (typeof question.confirmedYear !== "string" || (question.confirmedYear !== "未確認" && !/^\d{4}(年度)?$/.test(question.confirmedYear)))) errors.push(`${label}: confirmedYear は4桁年、4桁年+年度、または未確認にしてください。`);
  for (const field of ["validAsOf", "lastReviewedAt", "nextReviewDue"]) {
    if (question[field] !== undefined && !isDateKey(question[field])) errors.push(`${label}: ${field} は実在するYYYY-MM-DD形式の日付にしてください。`);
  }
  if (question.reviewEvidence !== undefined) {
    if (!question.reviewEvidence || typeof question.reviewEvidence !== "object" || Array.isArray(question.reviewEvidence)) {
      errors.push(`${label}: reviewEvidence はオブジェクトにしてください。`);
    } else {
      const evidence = question.reviewEvidence;
      if (evidence.sourceType !== undefined && !allowedEvidenceSourceTypes.has(evidence.sourceType)) errors.push(`${label}: reviewEvidence.sourceType が不正です。`);
      if (evidence.sourceUrl !== undefined && !isHttpUrl(evidence.sourceUrl)) errors.push(`${label}: reviewEvidence.sourceUrl はhttp(s) URLにしてください。`);
      if (evidence.checkedAt !== undefined && !isDateKey(evidence.checkedAt)) errors.push(`${label}: reviewEvidence.checkedAt は実在するYYYY-MM-DD形式の日付にしてください。`);
    }
  }

  if (question.type === "4択" && (!Array.isArray(question.choices) || question.choices.length !== 4 || question.choices.some((choice) => typeof choice !== "string" || !choice.trim()))) {
    errors.push(`${label}: 4択問題には空でない4個の choices が必要です。`);
  }
  if (question.type === "4択" && Array.isArray(question.choices) && new Set(question.choices).size !== question.choices.length) errors.push(`${label}: 4択のchoicesが重複しています。`);
  if (question.type === "4択" && Array.isArray(question.choices) && !question.choices.includes(question.answer)) errors.push(`${label}: answerがchoicesに含まれていません。`);
  if (question.choices !== undefined && (!Array.isArray(question.choices) || question.choices.some((choice) => typeof choice !== "string" || !choice.trim()))) {
    errors.push(`${label}: choices を指定する場合は空でない文字列配列にしてください。`);
  }
  if (!Array.isArray(question.relatedTopics) || question.relatedTopics.length < 1 || question.relatedTopics.length > 3 || question.relatedTopics.some((topic) => typeof topic !== "string" || !topic.trim())) {
    errors.push(`${label}: relatedTopics は1〜3個の文字列が必要です。`);
  }
  for (const field of optionalSourceFields) {
    if (question[field] !== undefined && (typeof question[field] !== "string" || !question[field].trim())) errors.push(`${label}: ${field} は指定する場合、空でない文字列にしてください。`);
  }
  if (question.source === "過去問" && !question.sourceYear && !question.sourceQuestionNumber && !question.sourceNote) {
    warnings.push(`${label}: 過去問の年度・問題番号が分かる場合はmetadataを追加してください。`);
  }
  if (question.source === "教材" && !question.sourceNote) warnings.push(`${label}: 教材名・章名をsourceNoteへ記録することを推奨します。`);
  if (question.subject === "policy" && question.isYearSensitive !== true) warnings.push(`${label}: 中小企業経営・政策はisYearSensitive: trueを推奨します。`);
  if (shouldBeYearSensitive(question) && question.isYearSensitive !== true) warnings.push(`${label}: 制度・法令系キーワードを含むためisYearSensitive: trueを推奨します。`);
  if (question.isYearSensitive === true) {
    sensitiveBySubject[question.subject] += 1;
    const evidence = question.reviewEvidence;
    const hasEvidence = Boolean(evidence);
    const unconfirmed = !question.confirmedYear || question.confirmedYear === "未確認" || !hasEvidence || !question.validAsOf;
    const due = !question.nextReviewDue || question.nextReviewDue <= todayKey;
    if (due) dueBySubject[question.subject] += 1;
    if (unconfirmed) unconfirmedBySubject[question.subject] += 1;
    const evidenceType = allowedEvidenceSourceTypes.has(evidence?.sourceType) ? evidence.sourceType : "未設定";
    evidenceSourceTypeCounts[evidenceType] += 1;
    if (!hasEvidence) reviewWarningIds["年度依存問題にreviewEvidenceがありません"].push(question.id);
    if (!evidence?.sourceTitle?.trim()) reviewWarningIds["年度依存問題のsourceTitleがありません"].push(question.id);
    if (!evidence?.sourceUrl?.trim()) reviewWarningIds["年度依存問題のsourceUrlがありません"].push(question.id);
    if (!question.confirmedYear || question.confirmedYear === "未確認") reviewWarningIds["confirmedYearが未確認です"].push(question.id);
    if (!question.validAsOf) reviewWarningIds["年度依存問題にvalidAsOfがありません"].push(question.id);
    if (!question.lastReviewedAt) reviewWarningIds["年度依存問題にlastReviewedAtがありません"].push(question.id);
    if (!question.nextReviewDue) reviewWarningIds["年度依存問題にnextReviewDueがありません"].push(question.id);
    if (question.nextReviewDue && question.nextReviewDue <= todayKey) reviewWarningIds["nextReviewDueを迎えており要レビューです"].push(question.id);
    if (question.reviewPriority === "高" && !hasEvidence) reviewWarningIds["高優先度ですがreviewEvidenceがありません"].push(question.id);
  }
});

for (const [message, targetIds] of Object.entries(reviewWarningIds)) {
  if (targetIds.length) warnings.push(`${message}: ${targetIds.length}件 [${targetIds.join(", ")}]`);
}

for (const [subject, count] of Object.entries(subjectCounts)) {
  if (count < 20) errors.push(`${subject}: 問題数が${count}問です。最低20問必要です。`);
}
if (questions.length < 140) errors.push(`合計問題数が${questions.length}問です。最低140問必要です。`);

const normalQuestions = questions.filter((question) => question.rank === "A" || question.rank === "B");
const rankACount = normalQuestions.filter((question) => question.rank === "A").length;
const rankARatio = normalQuestions.length ? rankACount / normalQuestions.length : 0;
if (rankARatio < 0.65 || rankARatio > 0.75) warnings.push(`Rank A比率が${Math.round(rankARatio * 100)}%です。目安は70%です。`);

const typeCounts = Object.fromEntries([...allowedTypes].map((type) => [type, questions.filter((question) => question.type === type).length]));
const sensitiveCount = Object.values(sensitiveBySubject).reduce((sum, count) => sum + count, 0);
const dueCount = Object.values(dueBySubject).reduce((sum, count) => sum + count, 0);
const unconfirmedCount = Object.values(unconfirmedBySubject).reduce((sum, count) => sum + count, 0);
const evidenceCount = questions.filter((question) => question.isYearSensitive === true && question.reviewEvidence).length;
const highPriorityUnconfirmedCount = questions.filter((question) => question.isYearSensitive === true && question.reviewPriority === "高" && (!question.confirmedYear || question.confirmedYear === "未確認" || !question.reviewEvidence || !question.validAsOf)).length;

if (warnings.length) {
  console.warn(warnings.map((warning) => `WARN: ${warning}`).join("\n"));
}
if (errors.length) {
  console.error(errors.map((error) => `ERROR: ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  const sourceCounts = questions.reduce((counts, question) => ({ ...counts, [question.source]: (counts[question.source] ?? 0) + 1 }), {});
  console.log(`validate:questions OK — ${questions.length} questions`);
  console.log(`Subjects: ${Object.entries(subjectCounts).map(([subject, count]) => `${subject}=${count}`).join(", ")}`);
  console.log(`Ranks: A=${rankACount}, B=${normalQuestions.length - rankACount}, A ratio=${Math.round(rankARatio * 100)}%`);
  console.log(`Types: ${Object.entries(typeCounts).map(([type, count]) => `${type}=${count}`).join(", ")}`);
  console.log(`Sources: ${Object.entries(sourceCounts).map(([source, count]) => `${source}=${count}`).join(", ")}`);
  console.log(`Content reviews: sensitive=${sensitiveCount}, unconfirmed=${unconfirmedCount}, evidence=${evidenceCount}, no-evidence=${sensitiveCount - evidenceCount}, due=${dueCount}, high-priority unconfirmed=${highPriorityUnconfirmedCount}`);
  console.log(`Evidence source types: ${Object.entries(evidenceSourceTypeCounts).map(([type, count]) => `${type}=${count}`).join(", ")}`);
  console.log(`Sensitive by subject: ${Object.entries(sensitiveBySubject).map(([subject, count]) => `${subject}=${count}`).join(", ")}`);
  console.log(`Unconfirmed by subject: ${Object.entries(unconfirmedBySubject).map(([subject, count]) => `${subject}=${count}`).join(", ")}`);
  console.log(`Due by subject: ${Object.entries(dueBySubject).map(([subject, count]) => `${subject}=${count}`).join(", ")}`);
}
