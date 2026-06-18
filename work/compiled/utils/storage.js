"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearLearningState = exports.saveLearningState = exports.loadLearningState = exports.initialLearningState = exports.STORAGE_KEYS = void 0;
exports.STORAGE_KEYS = {
    answerHistory: "shindan-os:answerHistory",
    weakPoints: "shindan-os:weakPoints",
    questionProgress: "shindan-os:questionProgress",
    learningStreak: "shindan-os:learningStreak",
    lastStudyDate: "shindan-os:lastStudyDate",
};
exports.initialLearningState = {
    answerHistory: [],
    weakPoints: [],
    questionProgress: {},
    learningStreak: 0,
    lastStudyDate: null,
};
const subjectIds = ["economics", "finance", "management", "operations", "law", "information", "policy"];
const grades = ["correct", "almost", "incorrect"];
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value) => typeof value === "string";
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const isValidIsoDate = (value) => isString(value) && !Number.isNaN(Date.parse(value));
const isSubjectId = (value) => isString(value) && subjectIds.includes(value);
const isGrade = (value) => isString(value) && grades.includes(value);
const isAnswerHistoryItem = (value) => {
    if (!isRecord(value))
        return false;
    return isString(value.id)
        && isString(value.questionId)
        && isSubjectId(value.subject)
        && isString(value.selectedAnswer)
        && isGrade(value.grade)
        && (value.score === 0 || value.score === 6 || value.score === 10)
        && isValidIsoDate(value.answeredAt);
};
const isWeakPoint = (value) => {
    if (!isRecord(value))
        return false;
    return isString(value.questionId)
        && isValidIsoDate(value.addedAt)
        && isValidIsoDate(value.updatedAt)
        && (value.lastGrade === "almost" || value.lastGrade === "incorrect");
};
const isQuestionProgress = (value) => {
    if (!isRecord(value))
        return false;
    return isString(value.questionId)
        && isFiniteNumber(value.attempts) && Number.isInteger(value.attempts) && value.attempts >= 1
        && isFiniteNumber(value.correctCount) && Number.isInteger(value.correctCount) && value.correctCount >= 0 && value.correctCount <= value.attempts
        && isFiniteNumber(value.totalScore) && Number.isInteger(value.totalScore) && value.totalScore >= 0 && value.totalScore <= value.attempts * 10
        && isFiniteNumber(value.currentIntervalDays) && Number.isInteger(value.currentIntervalDays) && value.currentIntervalDays >= 1 && value.currentIntervalDays <= 30
        && isGrade(value.lastGrade)
        && isValidIsoDate(value.lastAnsweredAt)
        && isValidIsoDate(value.nextReviewAt);
};
const isDateKey = (value) => {
    if (!isString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};
const getStorage = () => {
    if (typeof window === "undefined")
        return null;
    try {
        const storage = window.localStorage;
        const testKey = "__shindan_os_storage_test__";
        storage.setItem(testKey, "1");
        storage.removeItem(testKey);
        return storage;
    }
    catch {
        return null;
    }
};
const parseStoredValue = (storage, key) => {
    try {
        const raw = storage.getItem(key);
        if (raw === null)
            return { value: undefined, validJson: true, exists: false };
        return { value: JSON.parse(raw), validJson: true, exists: true };
    }
    catch {
        return { value: undefined, validJson: false, exists: true };
    }
};
const loadLearningState = () => {
    const storage = getStorage();
    if (!storage)
        return { state: exports.initialLearningState, storageAvailable: false, recovered: false };
    let recovered = false;
    const historyRaw = parseStoredValue(storage, exports.STORAGE_KEYS.answerHistory);
    const weakRaw = parseStoredValue(storage, exports.STORAGE_KEYS.weakPoints);
    const progressRaw = parseStoredValue(storage, exports.STORAGE_KEYS.questionProgress);
    const streakRaw = parseStoredValue(storage, exports.STORAGE_KEYS.learningStreak);
    const dateRaw = parseStoredValue(storage, exports.STORAGE_KEYS.lastStudyDate);
    const sanitizeArray = (raw, guard) => {
        if (!raw.exists)
            return [];
        if (!raw.validJson || !Array.isArray(raw.value)) {
            recovered = true;
            return [];
        }
        const sanitized = raw.value.filter(guard);
        if (sanitized.length !== raw.value.length)
            recovered = true;
        return sanitized;
    };
    const answerHistory = sanitizeArray(historyRaw, isAnswerHistoryItem);
    const sanitizedWeakPoints = sanitizeArray(weakRaw, isWeakPoint);
    const weakPointMap = new Map();
    sanitizedWeakPoints
        .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
        .forEach((item) => weakPointMap.set(item.questionId, item));
    const weakPoints = [...weakPointMap.values()];
    if (weakPoints.length !== sanitizedWeakPoints.length)
        recovered = true;
    const questionProgress = {};
    if (progressRaw.exists) {
        if (!progressRaw.validJson || !isRecord(progressRaw.value)) {
            recovered = true;
        }
        else {
            Object.entries(progressRaw.value).forEach(([key, value]) => {
                if (isQuestionProgress(value) && value.questionId === key)
                    questionProgress[key] = value;
                else
                    recovered = true;
            });
        }
    }
    let learningStreak = 0;
    if (streakRaw.exists) {
        if (streakRaw.validJson && isFiniteNumber(streakRaw.value) && Number.isInteger(streakRaw.value) && streakRaw.value >= 0)
            learningStreak = streakRaw.value;
        else
            recovered = true;
    }
    let lastStudyDate = null;
    if (dateRaw.exists) {
        if (dateRaw.validJson && (dateRaw.value === null || isDateKey(dateRaw.value)))
            lastStudyDate = dateRaw.value;
        else
            recovered = true;
    }
    return {
        state: { answerHistory, weakPoints, questionProgress, learningStreak, lastStudyDate },
        storageAvailable: true,
        recovered,
    };
};
exports.loadLearningState = loadLearningState;
const saveLearningState = (state) => {
    const storage = getStorage();
    if (!storage)
        return false;
    try {
        storage.setItem(exports.STORAGE_KEYS.answerHistory, JSON.stringify(state.answerHistory));
        storage.setItem(exports.STORAGE_KEYS.weakPoints, JSON.stringify(state.weakPoints));
        storage.setItem(exports.STORAGE_KEYS.questionProgress, JSON.stringify(state.questionProgress));
        storage.setItem(exports.STORAGE_KEYS.learningStreak, JSON.stringify(state.learningStreak));
        storage.setItem(exports.STORAGE_KEYS.lastStudyDate, JSON.stringify(state.lastStudyDate));
        return true;
    }
    catch {
        return false;
    }
};
exports.saveLearningState = saveLearningState;
const clearLearningState = () => {
    const storage = getStorage();
    if (!storage)
        return false;
    try {
        Object.values(exports.STORAGE_KEYS).forEach((key) => storage.removeItem(key));
        return true;
    }
    catch {
        return false;
    }
};
exports.clearLearningState = clearLearningState;
