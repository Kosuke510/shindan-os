import { spawnSync } from "node:child_process";

const checks = [
  ["Prepare questions", ["scripts/prepare-questions.mjs"]],
  ["Lint", ["node_modules/eslint/bin/eslint.js", "."]],
  ["Question data", ["scripts/validate-questions.mjs"]],
  ["Backup format", ["scripts/validate-backup.mjs"]],
  ["Production build", ["node_modules/next/dist/bin/next", "build"]],
];

for (const [label, args] of checks) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(process.execPath, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("\nrelease-check OK");
