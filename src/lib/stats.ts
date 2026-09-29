import type { Log, Question, QuizStats, SubjectKey, TaskGroup, Theme } from "../types";
import { addDays, mondayOf, ymd } from "./date";

export interface WeekSummary {
  from: string;
  to: string;
  total: number;
  bySubject: Partial<Record<SubjectKey, number>>;
}

/* 今日を含む週（月曜〜日曜）の科目別合計 */
export function weekSummary(logs: Log[], now: Date = new Date()): WeekSummary {
  const from = ymd(mondayOf(now));
  const to = addDays(from, 6);
  const bySubject: WeekSummary["bySubject"] = {};
  let total = 0;
  for (const l of logs) {
    if (l.date >= from && l.date <= to) {
      bySubject[l.subject] = (bySubject[l.subject] ?? 0) + l.minutes;
      total += l.minutes;
    }
  }
  return { from, to, total, bySubject };
}

export interface DayTotal {
  date: string;
  total: number;
  bySubject: Partial<Record<SubjectKey, number>>;
}

/* 直近n日（今日を含む）の日別・科目別合計。古い順 */
export function dailyTotals(logs: Log[], days = 14, now: Date = new Date()): DayTotal[] {
  const t = ymd(now);
  const list: DayTotal[] = [];
  for (let i = days - 1; i >= 0; i--) list.push({ date: addDays(t, -i), total: 0, bySubject: {} });
  const idx = new Map(list.map((d, i) => [d.date, i]));
  for (const l of logs) {
    const i = idx.get(l.date);
    if (i === undefined) continue;
    const d = list[i];
    d.bySubject[l.subject] = (d.bySubject[l.subject] ?? 0) + l.minutes;
    d.total += l.minutes;
  }
  return list;
}

export interface ThemeAccuracy {
  key: string;
  name: string;
  count: number; // 問題数
  answered: number; // 回答数の合計
  pct: number | null; // 未回答は null
}

export function themeAccuracy(themes: Theme[], questions: Question[], stats: QuizStats): ThemeAccuracy[] {
  return themes.map((th) => {
    let c = 0;
    let w = 0;
    let count = 0;
    for (const q of questions) {
      if (q.t !== th.key) continue;
      count++;
      const st = stats[q.id];
      if (st) {
        c += st.c || 0;
        w += st.w || 0;
      }
    }
    const answered = c + w;
    return { key: th.key, name: th.name, count, answered, pct: answered ? Math.round((c / answered) * 100) : null };
  });
}

/* 新しい順（同じ日付なら記録が新しい順） */
export function sortLogs(logs: Log[]): Log[] {
  return logs.slice().sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
}

/* 今日を含む週のindex。すべて過ぎていれば最後の週 */
export function currentTaskGroup(tasks: TaskGroup[], now: Date = new Date()): number {
  const t = ymd(now);
  const i = tasks.findIndex((g) => g.to >= t);
  return i < 0 ? tasks.length - 1 : i;
}
