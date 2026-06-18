const assert = require("node:assert/strict");
const { questions } = require("../src/data/questions.ts");
const review = require("./runtime/utils/reviewScheduler.ts");
const storage = require("../src/utils/storage.ts");
const stats = require("./runtime/utils/stats.ts");

const subjects = ["economics", "finance", "management", "operations", "law", "information", "policy"];
const ranks = ["A", "B"];
const difficulties = ["基礎", "標準", "応用"];
const types = ["一問一答", "4択", "計算", "比較"];

assert.equal(questions.length, 35, "問題は35問であること");
for (const subject of subjects) assert.ok(questions.filter((q) => q.subject === subject).length >= 5, `${subject}は5問以上`);
for (const question of questions) {
  assert.ok(ranks.includes(question.rank), `${question.id}: rank`);
  assert.ok(difficulties.includes(question.difficulty), `${question.id}: difficulty`);
  assert.ok(types.includes(question.type), `${question.id}: type`);
  if (question.type === "4択") assert.equal(question.choices.length, 4, `${question.id}: 4択は4選択肢`);
  assert.ok(question.choices.includes(question.answer), `${question.id}: answerはchoicesに含まれる`);
  assert.ok(question.explanation.trim(), `${question.id}: explanation`);
  assert.ok(question.commonMistake.trim(), `${question.id}: commonMistake`);
  assert.ok(question.examPoint.trim(), `${question.id}: examPoint`);
  assert.ok(question.relatedTopics.length >= 1 && question.relatedTopics.length <= 3, `${question.id}: relatedTopics`);
}

const intervalCases = [
  ["incorrect", undefined, 1], ["almost", undefined, 3], ["correct", undefined, 7],
  ["incorrect", 18, 1], ["almost", 7, 11], ["correct", 7, 14],
  ["almost", 25, 30], ["correct", 20, 30],
];
for (const [grade, current, expected] of intervalCases) assert.equal(review.calculateReviewInterval(grade, current), expected);

const progress = { questionId: "q", attempts: 1, correctCount: 0, totalScore: 0, currentIntervalDays: 1, lastGrade: "incorrect", lastAnsweredAt: new Date().toISOString(), nextReviewAt: new Date(2026, 5, 17, 23, 59).toISOString() };
assert.equal(review.isReviewDue(progress, new Date(2026, 5, 17, 0, 1)), true, "同日なら時刻に関係なく期限到来");
progress.nextReviewAt = new Date(2026, 5, 18, 0, 1).toISOString();
assert.equal(review.isReviewDue(progress, new Date(2026, 5, 17, 23, 59)), false, "翌日は未到来");

class MemoryStorage {
  constructor(seed = {}) { this.values = new Map(Object.entries(seed)); }
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  removeItem(key) { this.values.delete(key); }
  setItem(key, value) { this.values.set(key, String(value)); }
}

delete global.window;
assert.equal(storage.loadLearningState().storageAvailable, false, "SSRではstorageを参照しない");

global.window = { localStorage: new MemoryStorage() };
let loaded = storage.loadLearningState();
assert.deepEqual(loaded.state, storage.initialLearningState, "初回は空状態");

global.window = { localStorage: new MemoryStorage({
  [storage.STORAGE_KEYS.answerHistory]: "not-json",
  [storage.STORAGE_KEYS.weakPoints]: "{}",
  [storage.STORAGE_KEYS.questionProgress]: JSON.stringify({ broken: { attempts: "many" } }),
  [storage.STORAGE_KEYS.learningStreak]: "-10",
  [storage.STORAGE_KEYS.lastStudyDate]: JSON.stringify("not-a-date"),
}) };
loaded = storage.loadLearningState();
assert.equal(loaded.recovered, true, "破損を検出");
assert.deepEqual(loaded.state, storage.initialLearningState, "破損時は安全な空状態へ復旧");

global.window = { localStorage: new MemoryStorage() };
const validState = { answerHistory: [{ id: "1", questionId: "ec-001", subject: "economics", selectedAnswer: "1.5", grade: "almost", score: 6, answeredAt: new Date().toISOString() }], weakPoints: [{ questionId: "ec-001", addedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastGrade: "almost" }], questionProgress: { "ec-001": { ...progress, questionId: "ec-001", attempts: 1, totalScore: 6, currentIntervalDays: 3, lastGrade: "almost" } }, learningStreak: 2, lastStudyDate: "2026-06-17" };
assert.equal(storage.saveLearningState(validState), true, "保存成功");
loaded = storage.loadLearningState();
assert.equal(loaded.state.answerHistory.length, 1, "履歴の往復");
assert.equal(loaded.state.weakPoints.length, 1, "Weakの往復");
assert.equal(loaded.state.questionProgress["ec-001"].currentIntervalDays, 3, "progressの往復");

assert.deepEqual(stats.updateLearningStreak(4, "2026-06-16", new Date(2026, 5, 17, 8)), { learningStreak: 5, lastStudyDate: "2026-06-17" });
assert.deepEqual(stats.updateLearningStreak(5, "2026-06-17", new Date(2026, 5, 17, 20)), { learningStreak: 5, lastStudyDate: "2026-06-17" });
assert.deepEqual(stats.updateLearningStreak(5, "2026-06-15", new Date(2026, 5, 17, 8)), { learningStreak: 1, lastStudyDate: "2026-06-17" });

console.log("Data quality: 35/35 passed");
console.log("Review scheduler: 8/8 cases passed");
console.log("Date boundary: passed");
console.log("Storage empty/corrupt/round-trip: passed");
console.log("Learning streak day boundaries: passed");
