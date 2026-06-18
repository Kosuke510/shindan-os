"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDueReviewCount = exports.isReviewDue = exports.scheduleNextReview = exports.calculateReviewInterval = exports.MAX_REVIEW_INTERVAL_DAYS = void 0;
const date_1 = require("./date");
exports.MAX_REVIEW_INTERVAL_DAYS = 30;
const INITIAL_INTERVALS = {
    incorrect: 1,
    almost: 3,
    correct: 7,
};
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
const calculateReviewInterval = (grade, currentIntervalDays) => {
    if (!currentIntervalDays)
        return INITIAL_INTERVALS[grade];
    if (grade === "incorrect")
        return 1;
    if (grade === "almost")
        return Math.min(exports.MAX_REVIEW_INTERVAL_DAYS, Math.ceil(currentIntervalDays * 1.5));
    return Math.min(exports.MAX_REVIEW_INTERVAL_DAYS, currentIntervalDays * 2);
};
exports.calculateReviewInterval = calculateReviewInterval;
const scheduleNextReview = (grade, previousProgress, reviewedAt = new Date()) => {
    const intervalDays = (0, exports.calculateReviewInterval)(grade, previousProgress === null || previousProgress === void 0 ? void 0 : previousProgress.currentIntervalDays);
    return { intervalDays, nextReviewAt: addDays(reviewedAt, intervalDays).toISOString() };
};
exports.scheduleNextReview = scheduleNextReview;
const isReviewDue = (progress, now = new Date()) => (0, date_1.isLocalDateOnOrBefore)(new Date(progress.nextReviewAt), now);
exports.isReviewDue = isReviewDue;
const getDueReviewCount = (progress, now = new Date()) => Object.values(progress).filter((item) => (0, exports.isReviewDue)(item, now)).length;
exports.getDueReviewCount = getDueReviewCount;
