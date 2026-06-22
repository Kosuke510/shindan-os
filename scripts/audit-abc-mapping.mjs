/**
 * ABCマッピング監査スクリプト（TypeScript依存なし）
 * node scripts/audit-abc-mapping.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// --- abcTopicMap.json 読み込み ---
const rawMap = JSON.parse(readFileSync(join(projectRoot, "src/data/abcTopicMap.json"), "utf-8"));
const subjectByMapId = {
  market_core: "economics", finance_core: "finance", strategy_core: "management",
  operations_core: "operations", legal_core: "law", systems_core: "information", sme_core: "policy",
};
const abcSubjects = rawMap.subjects.map((s) => ({
  id: s.id, subject: subjectByMapId[s.id],
  topics: s.topics.map((t) => ({
    importance: t.importance, topic: t.topic,
    pastQuestionPattern: t.past_question_pattern,
    studyTask: t.study_task, codexTag: t.codex_tag,
  })),
}));
const abcTopics = abcSubjects.flatMap((s) => s.topics.map((t) => ({ ...t, subject: s.subject })));
const abcTopicByTag = new Map(abcTopics.map((t) => [t.codexTag, t]));

// --- 問題ファイルを文字列解析で抽出 ---
function extractQuestionsFromTs(filePath) {
  const src = readFileSync(filePath, "utf-8");
  const questions = [];
  const idPattern = /\{\s*id:\s*"([^"]+)"/g;
  let m;
  while ((m = idPattern.exec(src)) !== null) {
    const startIdx = m.index;
    let depth = 0, endIdx = startIdx;
    for (let i = startIdx; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") { depth--; if (depth === 0) { endIdx = i; break; } }
    }
    const objStr = src.slice(startIdx, endIdx + 1);
    try {
      const obj = Function('"use strict"; return (' + objStr + ')')();
      if (!obj.source) obj.source = "自作";
      questions.push(obj);
    } catch (_) {}
  }
  return questions;
}

const questionFiles = [
  "src/data/questions/public/legacySamples.ts",
  "src/data/questions/public/market.ts",
  "src/data/questions/public/finance.ts",
  "src/data/questions/public/strategy.ts",
  "src/data/questions/public/operations.ts",
  "src/data/questions/public/legal.ts",
  "src/data/questions/public/systems.ts",
  "src/data/questions/public/sme.ts",
];

const prefixToSubject = {
  ec: "economics", fa: "finance", mc: "management",
  om: "operations", bl: "law", is: "information", sm: "policy",
};

const rawQuestions = questionFiles.flatMap((f) => extractQuestionsFromTs(join(projectRoot, f)));
for (const q of rawQuestions) {
  if (!q.subject) q.subject = prefixToSubject[q.id.split("-")[0]] ?? "unknown";
  if (!q.relatedTopics && q.related) q.relatedTopics = q.related;
  if (!q.relatedTopics) q.relatedTopics = [];
  if (!q.coreName && q.core) q.coreName = q.core;
}

// --- スコアリング ---
const stopWords = new Set(["など", "基本", "確認", "整理", "問題", "理論", "分析", "管理", "制度", "支援", "細部"]);
const tokens = (v) => v.replace(/[（）()「」『』]/g, " ")
  .split(/[\s、，,。・／/:：=]+/)
  .map((t) => t.trim()).filter((t) => t.length >= 2 && !stopWords.has(t));
const normalize = (v) => String(v ?? "").replace(/[\s、，,。・／/：:（）()・-]/g, "").toLowerCase();

function scoreTopic(q, topic) {
  const qText = normalize([q.coreName, q.field, q.topic, q.question, ...(q.relatedTopics ?? [])].join(" "));
  const nt = normalize(topic.topic);
  let score = qText.includes(nt) ? 20 : 0;
  for (const kw of tokens(topic.topic + " " + topic.pastQuestionPattern)) {
    const nk = normalize(kw);
    if (!nk || !qText.includes(nk)) continue;
    score += nk.length >= 6 ? 7 : nk.length >= 4 ? 5 : 2;
    if (normalize(q.topic).includes(nk)) score += 5;
    if (normalize(q.coreName).includes(nk)) score += 3;
  }
  if (topic.importance === q.rank) score += 1;
  return score;
}

const manualQuestionTags = {
  "ec-002": "consumer_choice",
  "ec-009": "economics_supply_demand",
  "ec-017": "market_failure",
  "ec-020": "international_finance",
  "ec-021": "price_index",
  "ec-022": "is_lm",
  "ec-024": "ad_as",
  "ec-023": "money_banking",
  "fa-006": "financial_statements",
  "fa-014": "ratio_analysis",
  "fa-020": "valuation",
  "fa-021": "managerial_decision",
  "mc-003": "marketing_basics",
  "mc-007": "competitive_strategy",
  "mc-020": "marketing_basics",
  "mc-024": "strategy_levels",
  "mc-025": "organization_design",
  "mc-026": "motivation",
  "mc-027": "consumer_behavior",
  "om-004": "store_layout",
  "om-016": "industrial_engineering",
  "om-021": "toyota_production_system",
  "om-022": "equipment_management",
  "om-023": "logistics",
  "bl-013": "shares",
  "bl-021": "resolutions",
  "bl-022": "unfair_competition",
  "is-009": "sql",
  "is-021": "reliability",
  "sm-002": "sme_white_paper",
  "sm-003": "productivity_support",
  "sm-011": "sme_finance",
  "sm-013": "business_enhancement_act",
  "sm-017": "regional_commerce",
  "sm-018": "support_orgs",
  "sm-019": "support_orgs",
  "sm-020": "support_orgs",
  "sm-021": "small_business_white_paper",
  "sm-022": "mutual_aid",
  "sm-023": "sme_tax",
};

const LOW_CONF = 5;
const subjectLabel = {
  economics: "経済", finance: "財務", management: "経営", operations: "運営",
  law: "法務", information: "情報", policy: "中小",
};

// --- 監査実行 ---
const rows = [];
const issues = [];

for (const q of rawQuestions) {
  const sd = abcSubjects.find((s) => s.subject === q.subject);
  if (!sd) { issues.push({ id: q.id, reason: "科目なし: " + q.subject }); continue; }

  const manualTag = manualQuestionTags[q.id];
  const isManual = Boolean(manualTag);

  const scored = sd.topics
    .map((t) => ({ topic: t, score: scoreTopic(q, t) }))
    .sort((a, b) => b.score - a.score || a.topic.codexTag.localeCompare(b.topic.codexTag));

  const top1 = scored[0];
  const top2 = scored[1] ?? { score: 0, topic: { codexTag: "-" } };
  const assignedTag = isManual ? manualTag : top1.topic.codexTag;
  const assignedTopic = abcTopicByTag.get(assignedTag);
  const isLowConf = !isManual && top1.score < LOW_CONF;
  const mismatch = isManual && manualTag !== top1.topic.codexTag;

  let flag = isLowConf ? "⚠LOW" : mismatch ? "△manual!=auto" : "";

  rows.push({
    id: q.id,
    subject: subjectLabel[q.subject] ?? q.subject,
    coreName: (q.coreName ?? "").slice(0, 12),
    topic: (q.topic ?? "").slice(0, 15),
    rank: q.rank ?? "?",
    assignedTag,
    assignedImp: assignedTopic?.importance ?? "?",
    isManual,
    top1Tag: top1.topic.codexTag,
    top1Score: top1.score,
    top2Tag: top2.topic.codexTag,
    top2Score: top2.score,
    margin: top1.score - top2.score,
    flag,
  });

  if (isLowConf || mismatch) {
    issues.push({
      id: q.id,
      reason: isLowConf
        ? "スコア低 score=" + top1.score + " tag=" + top1.topic.codexTag
        : "手動" + manualTag + "!=自動" + top1.topic.codexTag + "(score=" + top1.score + ")",
      top3: scored.slice(0, 3).map((s) => s.topic.codexTag + "(" + s.score + ")").join(", "),
    });
  }
}

// --- テキスト出力 ---
const pad = (s, n) => String(s ?? "").slice(0, n).padEnd(n);
const LINE = "=".repeat(120);
const line = "-".repeat(120);

console.log(LINE);
console.log("  ABCマッピング監査レポート  " + new Date().toISOString().slice(0, 10));
console.log(LINE);
console.log("  手動マッピング: " + rows.filter((r) => r.isManual).length
  + "問 / 自動: " + rows.filter((r) => !r.isManual).length + "問");
console.log("  低信頼度しきい値: スコア < " + LOW_CONF);
console.log("  要確認: " + issues.length + "件");
console.log(LINE);
console.log();

console.log(pad("ID", 9) + pad("科目", 5) + pad("コア名", 14) + pad("トピック", 17)
  + pad("割当タグ", 32) + pad("重", 3) + pad("方法", 5)
  + pad("Score", 7) + pad("2位S", 6) + pad("差", 5) + "フラグ");
console.log(line);

for (const r of rows) {
  console.log(
    pad(r.id, 9) + pad(r.subject, 5) + pad(r.coreName, 14) + pad(r.topic, 17)
    + pad(r.assignedTag, 32) + pad(r.assignedImp, 3) + pad(r.isManual ? "手動" : "自動", 5)
    + pad(r.top1Score, 7) + pad(r.top2Score, 6) + pad(r.margin, 5) + (r.flag || "")
  );
}

// --- 要確認 ---
console.log();
console.log("=".repeat(80));
console.log("  要確認問題 (" + issues.length + "件)");
console.log("=".repeat(80));
if (!issues.length) { console.log("  なし"); }
for (const iss of issues) {
  console.log("  " + iss.id + ": " + iss.reason);
  if (iss.top3) console.log("    上位3候補: " + iss.top3);
}

// --- 未問題化論点 ---
const tagCounts = {};
for (const r of rows) tagCounts[r.assignedTag] = (tagCounts[r.assignedTag] ?? 0) + 1;
const allWithCount = abcTopics.map((t) => ({ ...t, count: tagCounts[t.codexTag] ?? 0 }));
const unmapped = allWithCount.filter((t) => t.count === 0);

console.log();
console.log("=".repeat(80));
console.log("  未問題化論点 (" + unmapped.length + "件 / 135件中)");
console.log("=".repeat(80));

const subjectIds = ["economics","finance","management","operations","law","information","policy"];
let tA = 0, tB = 0, tC = 0;
const subjectNames = { economics:"経済", finance:"財務", management:"経営", operations:"運営", law:"法務", information:"情報", policy:"中小" };
console.log("\n  " + pad("科目", 6) + pad("A", 4) + pad("B", 4) + pad("C", 4) + "合計");
console.log("  " + "-".repeat(26));
for (const sid of subjectIds) {
  const ts = unmapped.filter((x) => x.subject === sid);
  const a = ts.filter((x) => x.importance === "A").length;
  const b = ts.filter((x) => x.importance === "B").length;
  const c = ts.filter((x) => x.importance === "C").length;
  tA += a; tB += b; tC += c;
  console.log("  " + pad(subjectNames[sid], 6) + pad(a, 4) + pad(b, 4) + pad(c, 4) + (a + b + c));
}
console.log("  " + "-".repeat(26));
console.log("  " + pad("合計", 6) + pad(tA, 4) + pad(tB, 4) + pad(tC, 4) + (tA + tB + tC));

console.log("\n  未問題化A論点 (" + tA + "件) - 優先追加候補:");
for (const t of unmapped.filter((x) => x.importance === "A")) {
  console.log("    [" + subjectNames[t.subject] + "] " + t.codexTag.padEnd(32) + t.topic);
}

console.log("\n  未問題化B論点 (" + tB + "件):");
for (const t of unmapped.filter((x) => x.importance === "B")) {
  console.log("    [" + subjectNames[t.subject] + "] " + t.codexTag.padEnd(32) + t.topic);
}

// --- 問題あり論点（多い順） ---
const mapped = allWithCount.filter((t) => t.count > 0).sort((a, b) => b.count - a.count);
console.log();
console.log("=".repeat(80));
console.log("  問題あり論点 (" + mapped.length + "件) - 問題数順");
console.log("=".repeat(80));
for (const t of mapped) {
  const qs = rows.filter((r) => r.assignedTag === t.codexTag).map((r) => r.id).join(", ");
  console.log("  " + t.importance + " " + t.codexTag.padEnd(32)
    + String(t.count).padEnd(4) + "問  [" + qs + "]");
}

console.log("\n監査完了");
