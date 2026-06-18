import type { BackupActivity, LearningState, ShindanBackup } from "../types";
import { STORAGE_KEYS, validateLearningStateSnapshot } from "./storage";
import { toDateKey } from "./date";

export const BACKUP_VERSION = "1.0.0";
const STORAGE_PREFIX = "shindan-os:";
const LEARNING_STORAGE_KEYS = new Set<string>([
  STORAGE_KEYS.answerHistory,
  STORAGE_KEYS.weakPoints,
  STORAGE_KEYS.questionProgress,
  STORAGE_KEYS.questionReviews,
  STORAGE_KEYS.learningStreak,
  STORAGE_KEYS.lastStudyDate,
]);
const KNOWN_STORAGE_KEYS = new Set<string>(Object.values(STORAGE_KEYS));

export interface ParsedShindanBackup {
  backup: ShindanBackup;
  state: LearningState;
  qaChecklist: string[];
  additionalStorage: Record<string, unknown>;
}

const getStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.localStorage;
    const key = "__shindan_backup_test__";
    storage.setItem(key, "1");
    storage.removeItem(key);
    return storage;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isIsoDate = (value: unknown): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value));

const readStoredJson = (storage: Storage, key: string): unknown => {
  const raw = storage.getItem(key);
  if (raw === null) return undefined;
  try { return JSON.parse(raw) as unknown; } catch { return raw; }
};

export const getBackupActivity = (): BackupActivity => {
  const storage = getStorage();
  if (!storage) return { lastExportAt: null, lastImportAt: null };
  const lastExportAt = readStoredJson(storage, STORAGE_KEYS.lastExportAt);
  const lastImportAt = readStoredJson(storage, STORAGE_KEYS.lastImportAt);
  return {
    lastExportAt: isIsoDate(lastExportAt) ? lastExportAt : null,
    lastImportAt: isIsoDate(lastImportAt) ? lastImportAt : null,
  };
};

export const createShindanBackup = (state: LearningState, now = new Date()): ShindanBackup => {
  const storage = getStorage();
  const exportedAt = now.toISOString();
  const qaChecklist = storage ? readStoredJson(storage, STORAGE_KEYS.qaChecklist) : [];
  const activity = getBackupActivity();
  const additionalStorage: Record<string, unknown> = {};
  if (storage) {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(STORAGE_PREFIX) && !KNOWN_STORAGE_KEYS.has(key)) additionalStorage[key] = readStoredJson(storage, key);
    }
  }

  return {
    appName: "Shindan OS",
    version: BACKUP_VERSION,
    exportedAt,
    data: {
      answerHistory: state.answerHistory,
      weakPoints: state.weakPoints,
      questionProgress: state.questionProgress,
      learningStreak: state.learningStreak,
      lastStudyDate: state.lastStudyDate,
      reviewOverrides: state.questionReviews,
      qaChecklist: Array.isArray(qaChecklist) ? qaChecklist : [],
      lastExportAt: exportedAt,
      lastImportAt: activity.lastImportAt,
      additionalStorage,
    },
  };
};

export const downloadShindanBackup = (backup: ShindanBackup): void => {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `shindan-os-backup-${toDateKey(new Date(backup.exportedAt))}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const recordBackupExport = (exportedAt: string): boolean => {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEYS.lastExportAt, JSON.stringify(exportedAt));
    return true;
  } catch {
    return false;
  }
};

export const parseShindanBackup = (text: string): ParsedShindanBackup => {
  let value: unknown;
  try { value = JSON.parse(text) as unknown; } catch { throw new Error("JSONとして読み取れないファイルです。"); }
  if (!isRecord(value) || value.appName !== "Shindan OS" || typeof value.version !== "string" || !isIsoDate(value.exportedAt) || !isRecord(value.data)) {
    throw new Error("Shindan OSのバックアップ形式ではありません。");
  }
  if (value.version.split(".")[0] !== BACKUP_VERSION.split(".")[0]) throw new Error(`未対応のバックアップバージョンです（${value.version}）。`);
  const data = value.data;
  const state = validateLearningStateSnapshot({
    answerHistory: data.answerHistory,
    weakPoints: data.weakPoints,
    questionProgress: data.questionProgress,
    questionReviews: data.reviewOverrides ?? data.questionReviews ?? {},
    learningStreak: data.learningStreak,
    lastStudyDate: data.lastStudyDate,
  });
  if (!state) throw new Error("バックアップ内の学習データが壊れているか、形式が古すぎます。");
  if (data.qaChecklist !== undefined && (!Array.isArray(data.qaChecklist) || data.qaChecklist.some((item) => typeof item !== "string"))) {
    throw new Error("QAチェックリストの形式が不正です。");
  }
  if (data.additionalStorage !== undefined && !isRecord(data.additionalStorage)) throw new Error("追加保存データの形式が不正です。");

  return {
    backup: value as unknown as ShindanBackup,
    state,
    qaChecklist: (data.qaChecklist as string[] | undefined) ?? [],
    additionalStorage: (data.additionalStorage as Record<string, unknown> | undefined) ?? {},
  };
};

export const applyBackupAuxiliaryData = (parsed: ParsedShindanBackup, importedAt = new Date().toISOString()): boolean => {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const removable: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(STORAGE_PREFIX) && !LEARNING_STORAGE_KEYS.has(key)) removable.push(key);
    }
    removable.forEach((key) => storage.removeItem(key));
    storage.setItem(STORAGE_KEYS.qaChecklist, JSON.stringify(parsed.qaChecklist));
    for (const [key, value] of Object.entries(parsed.additionalStorage)) {
      if (key.startsWith(STORAGE_PREFIX) && !KNOWN_STORAGE_KEYS.has(key)) storage.setItem(key, JSON.stringify(value));
    }
    storage.setItem(STORAGE_KEYS.lastExportAt, JSON.stringify(parsed.backup.exportedAt));
    storage.setItem(STORAGE_KEYS.lastImportAt, JSON.stringify(importedAt));
    return true;
  } catch {
    return false;
  }
};
