const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const runtime = path.join(__dirname, "runtime");

const write = (target, contents) => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents, "utf8");
};

const readSource = (relativePath) => fs.readFileSync(path.join(root, "src", relativePath), "utf8");

write(path.join(runtime, "data", "subjects.ts"), readSource("data/subjects.ts"));
write(path.join(runtime, "utils", "date.ts"), readSource("utils/date.ts"));
write(
  path.join(runtime, "utils", "reviewScheduler.ts"),
  readSource("utils/reviewScheduler.ts").replace('from "./date"', 'from "./date.ts"'),
);
write(
  path.join(runtime, "utils", "stats.ts"),
  readSource("utils/stats.ts")
    .replace('from "../data/subjects"', 'from "../data/subjects.ts"')
    .replace('from "./date"', 'from "./date.ts"'),
);
