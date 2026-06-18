import type { Subject } from "../types";

export const subjects: Subject[] = [
  { id: "economics", code: "EC", shortName: "経済", name: "経済学・経済政策", accent: "#4f67e8", softAccent: "#eef1ff" },
  { id: "finance", code: "FA", shortName: "財務", name: "財務・会計", accent: "#14866d", softAccent: "#e9f7f2" },
  { id: "management", code: "MC", shortName: "経営", name: "企業経営理論", accent: "#d97732", softAccent: "#fff1e7" },
  { id: "operations", code: "OM", shortName: "運営", name: "運営管理", accent: "#2575bd", softAccent: "#eaf4ff" },
  { id: "law", code: "BL", shortName: "法務", name: "経営法務", accent: "#9857ad", softAccent: "#f7edfa" },
  { id: "information", code: "IS", shortName: "情報", name: "経営情報システム", accent: "#c94e69", softAccent: "#fff0f3" },
  { id: "policy", code: "SM", shortName: "中小", name: "中小企業経営・政策", accent: "#65804e", softAccent: "#eff6e9" },
];

export const subjectMap = Object.fromEntries(subjects.map((subject) => [subject.id, subject])) as Record<Subject["id"], Subject>;
