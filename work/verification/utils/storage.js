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
const readJson = (storage, key, fallback) => {
    try {
        const value = storage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    }
    catch {
        return fallback;
    }
};
const loadLearningState = () => {
    const storage = getStorage();
    if (!storage)
        return exports.initialLearningState;
    return {
        answerHistory: readJson(storage, exports.STORAGE_KEYS.answerHistory, []),
        weakPoints: readJson(storage, exports.STORAGE_KEYS.weakPoints, []),
        questionProgress: readJson(storage, exports.STORAGE_KEYS.questionProgress, {}),
        learningStreak: readJson(storage, exports.STORAGE_KEYS.learningStreak, 0),
        lastStudyDate: readJson(storage, exports.STORAGE_KEYS.lastStudyDate, null),
    };
};
exports.loadLearningState = loadLearningState;
const saveLearningState = (state) => {
    const storage = getStorage();
    if (!storage)
        return;
    try {
        storage.setItem(exports.STORAGE_KEYS.answerHistory, JSON.stringify(state.answerHistory));
        storage.setItem(exports.STORAGE_KEYS.weakPoints, JSON.stringify(state.weakPoints));
        storage.setItem(exports.STORAGE_KEYS.questionProgress, JSON.stringify(state.questionProgress));
        storage.setItem(exports.STORAGE_KEYS.learningStreak, JSON.stringify(state.learningStreak));
        storage.setItem(exports.STORAGE_KEYS.lastStudyDate, JSON.stringify(state.lastStudyDate));
    }
    catch {
        // Storage can become unavailable or full while the app is open. Learning continues in memory.
    }
};
exports.saveLearningState = saveLearningState;
const clearLearningState = () => {
    const storage = getStorage();
    if (!storage)
        return;
    try {
        Object.values(exports.STORAGE_KEYS).forEach((key) => storage.removeItem(key));
    }
    catch {
        // No-op: storage is optional for the MVP.
    }
};
exports.clearLearningState = clearLearningState;
