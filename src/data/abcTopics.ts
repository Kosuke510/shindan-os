import rawMap from "./abcTopicMap.json";
import type { AbcImportance, AbcSubjectMap, AbcTopic, Question, SubjectId } from "../types";

interface RawTopic {
  importance: AbcImportance;
  topic: string;
  past_question_pattern: string;
  study_task: string;
  codex_tag: string;
}

interface RawSubject {
  id: string;
  name: string;
  strategy: string;
  topics: RawTopic[];
}

interface RawMap {
  title: string;
  created_at: string;
  classification_policy: Record<string, string>;
  sources: Array<{ name: string; url: string; note: string }>;
  priority: Array<{ rank: number; subject: string; reason: string }>;
  subjects: RawSubject[];
}

const subjectByMapId: Record<string, SubjectId> = {
  market_core: "economics",
  finance_core: "finance",
  strategy_core: "management",
  operations_core: "operations",
  legal_core: "law",
  systems_core: "information",
  sme_core: "policy",
};

const data = rawMap as unknown as RawMap;

export const abcTopicMap = {
  title: data.title,
  createdAt: data.created_at,
  classificationPolicy: data.classification_policy,
  sources: data.sources,
  priority: data.priority,
  subjects: data.subjects.map((subject): AbcSubjectMap => ({
    id: subject.id,
    subject: subjectByMapId[subject.id],
    name: subject.name.replace(/^\d+\.\s*/, ""),
    strategy: subject.strategy,
    topics: subject.topics.map((topic): AbcTopic => ({
      importance: topic.importance,
      topic: topic.topic,
      pastQuestionPattern: topic.past_question_pattern,
      studyTask: topic.study_task,
      codexTag: topic.codex_tag,
    })),
  })),
};

export const abcTopics = abcTopicMap.subjects.flatMap((subject) =>
  subject.topics.map((topic) => ({ ...topic, subject: subject.subject })),
);

export const abcTopicByTag = new Map(abcTopics.map((topic) => [topic.codexTag, topic]));

export const abcTopicCounts = abcTopics.reduce(
  (counts, topic) => ({ ...counts, total: counts.total + 1, [topic.importance]: counts[topic.importance] + 1 }),
  { total: 0, A: 0, B: 0, C: 0 },
);

const stopWords = new Set(["など", "基本", "確認", "整理", "問題", "理論", "分析", "管理", "制度", "支援", "細部"]);

const tokens = (value: string): string[] => value
  .replace(/[（）()「」『』]/g, " ")
  .split(/[\s、，,。・／/:：=]+/)
  .map((token) => token.trim())
  .filter((token) => token.length >= 2 && !stopWords.has(token));

const normalize = (value: string): string => value.replace(/[\s、，,。・／/：:（）()・-]/g, "").toLowerCase();

/**
 * 手動マッピング: 自動スコアが低い・誤割当の問題に対して明示的なタグを指定する。
 * 2026-06-18 監査で確認済み。変更時は audit-abc-mapping.mjs で再確認すること。
 */
const manualQuestionTags: Record<string, string> = {
  // 経済学・経済政策
  "ec-002": "consumer_choice",      // 機会費用 → 消費者行動（比較優位に言及するが主題は消費者選択）
  "ec-009": "economics_supply_demand", // 従量税・租税帰着 → 需要供給分析（AD-ASではなくミクロ供需）
  "ec-017": "market_failure",       // 逆選択 → 市場の失敗（情報の非対称性による市場失敗）
  "ec-020": "international_finance", // 比較優位 → 国際収支・為替（貿易理論はマクロ国際経済）
  // 財務・会計
  "fa-006": "financial_statements", // 貸借対照表 → 財務諸表の構造（税効果会計ではない）
  "fa-014": "ratio_analysis",       // 総資産回転率 → 経営分析（効率性指標は比率分析）
  "fa-020": "valuation",            // PERとPBR → 企業価値評価（株価指標は企業価値評価）
  // 企業経営理論
  "mc-003": "marketing_basics",     // 製品ライフサイクル → マーケティング基礎
  "mc-007": "competitive_strategy", // ファイブフォース → 競争戦略（外部分析≠資源ベース）
  "mc-020": "marketing_basics",     // 製品とサービス → マーケティング基礎
  // 運営管理
  "om-004": "store_layout",         // ゴールデンゾーン → 店舗施設管理（物流ではない）
  "om-016": "industrial_engineering", // 5S → IE（設備管理ではなく現場改善IE）
  // 経営法務
  "bl-013": "shares",               // 剰余金配当 → 株式（機関設計ではなく株主還元）
  // 中小企業経営・政策
  "sm-002": "sme_white_paper",      // SWOT分析（中小企業政策文脈、白書で活用）
  "sm-003": "productivity_support", // PDCA → 省力化・生産性向上支援
  "sm-011": "sme_finance",          // 運転資金 → 金融支援（資金繰り）
  "sm-013": "business_enhancement_act", // 経営革新支援 → 中小企業等経営強化法
  "sm-017": "regional_commerce",    // 商工会と商工会議所 → 商業・地域支援（重要度B維持）
  "sm-018": "support_orgs",         // よろず支援拠点 → 支援機関の細部（C）
  "sm-019": "support_orgs",         // 中小企業基盤整備機構 → 支援機関の細部（C）
  "sm-020": "support_orgs",         // 認定経営革新等支援機関 → 支援機関の細部（C）
  // 経営情報システム
  "is-009": "sql",                  // SQL問題 → SQL論点（databaseではなくSQL固有）
  "is-021": "reliability",          // 並列稼働率計算 → システム信頼性
  // ── 2026-06-18 追加：未問題化A論点への自作問題 ──────────────────────────
  // 経済学・経済政策
  "ec-021": "price_index",
  "ec-024": "ad_as",               // AD-AS分析 → AD-AS分析          // ラスパイレス・パーシェ → 物価指数
  "ec-022": "is_lm",               // クラウディングアウト → IS-LM分析
  "ec-023": "money_banking",        // 信用創造・マネーストック → 貨幣・金融政策
  // 財務・会計
  "fa-021": "managerial_decision",  // 埋没原価・差額原価 → 意思決定会計
  // 企業経営理論
  "mc-024": "strategy_levels",      // 全社・事業・機能戦略 → 経営戦略の階層
  "mc-025": "organization_design",  // 命令一元化 → 組織設計原理
  "mc-026": "motivation",           // マズロー・ハーズバーグ → モチベーション理論
  "mc-027": "consumer_behavior",    // 購買意思決定プロセス → 消費者行動
  // 運営管理
  "om-021": "toyota_production_system", // 自働化 → トヨタ生産方式
  "om-022": "equipment_management",     // 設備総合効率 → 設備管理
  "om-023": "logistics",               // 3PL・クロスドッキング → 物流・流通
  // 経営法務
  "bl-021": "resolutions",          // 普通決議・特別決議 → 会社法：決議要件
  "bl-022": "unfair_competition",   // 営業秘密三要件 → 不正競争防止法
  // 中小企業経営・政策
  "sm-021": "small_business_white_paper", // 小規模企業の課題 → 小規模企業白書
  "sm-022": "mutual_aid",           // セーフティ共済・小規模企業共済 → 共済制度
  "sm-023": "sme_tax",              // 少額減価償却・賃上げ促進税制 → 税制
};

const scoreTopic = (question: Question, topic: AbcTopic): number => {
  const questionText = normalize([question.coreName, question.field, question.topic, question.question, ...question.relatedTopics].join(" "));
  const normalizedTopic = normalize(topic.topic);
  let score = questionText.includes(normalizedTopic) ? 20 : 0;

  for (const keyword of tokens(`${topic.topic} ${topic.pastQuestionPattern}`)) {
    const normalizedKeyword = normalize(keyword);
    if (!normalizedKeyword || !questionText.includes(normalizedKeyword)) continue;
    score += normalizedKeyword.length >= 6 ? 7 : normalizedKeyword.length >= 4 ? 5 : 2;
    if (normalize(question.topic).includes(normalizedKeyword)) score += 5;
    if (normalize(question.coreName).includes(normalizedKeyword)) score += 3;
  }

  if (topic.importance === question.rank) score += 1;
  return score;
};

/** 自動スコアがこの値未満の場合、低信頼度マッピングとして扱う。 */
export const ABC_MIN_CONFIDENCE_SCORE = 5;

export interface AbcTopicResolution {
  topic: AbcTopic;
  /** 手動マッピングなら true。自動スコアリングなら false。 */
  isManual: boolean;
  /** 自動スコアリング時のスコア。手動マッピング時は undefined。 */
  score?: number;
  /** score が ABC_MIN_CONFIDENCE_SCORE 未満のとき true。手動マッピング時は false。 */
  isLowConfidence: boolean;
}

export const resolveAbcTopicWithMeta = (question: Question): AbcTopicResolution => {
  const subjectMap = abcTopicMap.subjects.find((subject) => subject.subject === question.subject);
  if (!subjectMap) throw new Error(`ABC論点マップに科目がありません: ${question.subject}`);

  const manualTag = manualQuestionTags[question.id];
  const manual = manualTag ? subjectMap.topics.find((topic) => topic.codexTag === manualTag) : undefined;
  if (manual) return { topic: manual, isManual: true, isLowConfidence: false };

  const ranked = [...subjectMap.topics]
    .map((topic) => ({ topic, score: scoreTopic(question, topic) }))
    .sort((left, right) => right.score - left.score || left.topic.codexTag.localeCompare(right.topic.codexTag));
  const best = ranked[0];
  return {
    topic: best.topic,
    isManual: false,
    score: best.score,
    isLowConfidence: best.score < ABC_MIN_CONFIDENCE_SCORE,
  };
};

export const resolveAbcTopic = (question: Question): AbcTopic => resolveAbcTopicWithMeta(question).topic;

export const applyAbcMetadata = (question: Question): Question => {
  const topic = resolveAbcTopic(question);
  return {
    ...question,
    importance: topic.importance,
    topicTag: topic.codexTag,
    primaryExamTopicTag: topic.codexTag,
    sourceType: question.source === "自作" ? "original" : "past_exam_pattern",
    examStage: "primary",
  };
};
