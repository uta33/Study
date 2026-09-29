import type { SubjectKey } from "../types";

export interface Subject {
  k: SubjectKey;
  n: string;
  c: string;
}

export const SUBJECTS: Subject[] = [
  { k: "A1", n: "科目A-1", c: "#6a8caf" },
  { k: "A2", n: "科目A-2", c: "#0f6b5c" },
  { k: "B", n: "科目B", c: "#b5561b" },
  { k: "IN", n: "インプット", c: "#8a7a3a" },
  { k: "QZ", n: "一問一答", c: "#7a5c9a" },
];

export function subj(k: string): Subject {
  return SUBJECTS.find((s) => s.k === k) ?? SUBJECTS[3];
}
