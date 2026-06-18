import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();

const resolveLocalModule = (fromPath, specifier) => {
  const basePath = resolve(dirname(fromPath), specifier);
  const matched = [basePath, `${basePath}.ts`, join(basePath, "index.ts")].find((candidate) => existsSync(candidate));
  if (!matched) throw new Error(`${specifier} cannot be resolved from ${fromPath}`);
  return matched;
};

const loadTsModule = (path) => {
  if (moduleCache.has(path)) return moduleCache.get(path).exports;
  const output = ts.transpileModule(readFileSync(path, "utf8"), {
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
};

const backupModule = loadTsModule(join(projectRoot, "src", "utils", "backup.ts"));
const storageModule = loadTsModule(join(projectRoot, "src", "utils", "storage.ts"));
const exportedAt = new Date("2026-06-18T03:00:00.000Z");
const backup = backupModule.createShindanBackup(storageModule.initialLearningState, exportedAt);
const parsed = backupModule.parseShindanBackup(JSON.stringify(backup));

if (parsed.backup.appName !== "Shindan OS" || parsed.backup.version !== "1.0.0") throw new Error("Backup metadata validation failed.");
if (parsed.state.answerHistory.length !== 0 || parsed.state.learningStreak !== 0) throw new Error("Learning state round trip failed.");

const invalidCases = [
  "{invalid-json",
  JSON.stringify({ ...backup, appName: "Other App" }),
  JSON.stringify({ ...backup, version: "2.0.0" }),
  JSON.stringify({ ...backup, data: { ...backup.data, answerHistory: [{ broken: true }] } }),
  JSON.stringify({ ...backup, data: { ...backup.data, qaChecklist: "not-an-array" } }),
];

for (const invalid of invalidCases) {
  let rejected = false;
  try { backupModule.parseShindanBackup(invalid); } catch { rejected = true; }
  if (!rejected) throw new Error("Invalid backup was accepted.");
}

console.log(`validate:backup OK — round trip=1, invalid rejected=${invalidCases.length}`);
