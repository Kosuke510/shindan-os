"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLearningStreak = exports.getSubjectStats = exports.getOverallAccuracy = exports.getTodayAnswerCount = void 0;
const subjects_1 = require("../data/subjects");
const date_1 = require("./date");
const getTodayAnswerCount = (state, now = new Date()) => {
    const today = (0, date_1.toDateKey)(now);
    return state.answerHistory.filter((item) => (0, date_1.toDateKey)(new Date(item.answeredAt)) === today).length;
};
exports.getTodayAnswerCount = getTodayAnswerCount;
const getOverallAccuracy = (state) => {
    if (state.answerHistory.length === 0)
        return 0;
    const correct = state.answerHistory.filter((item) => item.grade === "correct").length;
    return Math.round((correct / state.answerHistory.length) * 100);
};
exports.getOverallAccuracy = getOverallAccuracy;
const getSubjectStats = (state) => Object.fromEntries(subjects_1.subjects.map((subject) => {
    const history = state.answerHistory.filter((item) => item.subject === subject.id);
    const correct = history.filter((item) => item.grade === "correct").length;
    return [subject.id, {
            subject: subject.id,
            answers: history.length,
            correct,
            accuracy: history.length ? Math.round((correct / history.length) * 100) : 0,
        }];
}));
exports.getSubjectStats = getSubjectStats;
const updateLearningStreak = (currentStreak, lastStudyDate, now = new Date()) => {
    const today = (0, date_1.toDateKey)(now);
    if (lastStudyDate === today)
        return { learningStreak: currentStreak, lastStudyDate: today };
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const learningStreak = lastStudyDate === (0, date_1.toDateKey)(yesterday) ? currentStreak + 1 : 1;
    return { learningStreak, lastStudyDate: today };
};
exports.updateLearningStreak = updateLearningStreak;
