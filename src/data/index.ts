import type { Question, Settings, TaskGroup, Theme } from "../types";
import questions from "./questions.json";
import tasks from "./tasks.json";
import themes from "./themes.json";

export const BUILTIN_QUESTIONS = questions as Question[];
export const TASKS = tasks as TaskGroup[];
export const THEMES = themes as Theme[];

export function themeName(key: string): string {
  return THEMES.find((t) => t.key === key)?.name ?? key;
}

/* 初期値は依頼書3章の受験予定日。設定画面から変更できる */
export const DEFAULT_SETTINGS: Settings = {
  goal: 600,
  examA: "2026-10-26",
  examB: "2026-11-21",
  exam2A: "2027-02-20",
  exam2B: "2027-03-16",
};

export const EXAMS: { key: keyof Omit<Settings, "goal">; label: string }[] = [
  { key: "examA", label: "前期 科目A" },
  { key: "examB", label: "前期 科目B" },
  { key: "exam2A", label: "後期 科目A-2" },
  { key: "exam2B", label: "後期 科目B" },
];
