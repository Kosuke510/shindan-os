"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatShortDate = exports.addDays = exports.endOfToday = exports.startOfToday = exports.toDateKey = void 0;
const toDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
exports.toDateKey = toDateKey;
const startOfToday = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};
exports.startOfToday = startOfToday;
const endOfToday = () => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
};
exports.endOfToday = endOfToday;
const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};
exports.addDays = addDays;
const formatShortDate = (value) => new Intl.DateTimeFormat("ja-JP", { month: "short", day: "numeric" }).format(new Date(value));
exports.formatShortDate = formatShortDate;
