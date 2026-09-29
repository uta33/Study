import { describe, expect, it } from "vitest";
import { BUILTIN_QUESTIONS, TASKS, THEMES } from "../src/data";
import { currentTaskGroup, dailyTotals, sortLogs, themeAccuracy, weekSummary } from "../src/lib/stats";
import type { Log } from "../src/types";

const log = (date: string, minutes: number, subject: Log["subject"], createdAt = 0): Log => ({ id: date + createdAt, date, minutes, subject, memo: "", createdAt });

describe("集計", () => {
  const now = new Date(2026, 9, 1); // 木曜
  const logs = [log("2026-09-27", 30, "A1"), log("2026-09-28", 60, "A1"), log("2026-10-01", 45, "B"), log("2026-10-04", 15, "A1"), log("2026-10-05", 90, "A2")];

  it("今週（月〜日）の科目別合計", () => {
    const w = weekSummary(logs, now);
    expect(w.from).toBe("2026-09-28");
    expect(w.to).toBe("2026-10-04");
    expect(w.total).toBe(120);
    expect(w.bySubject).toEqual({ A1: 75, B: 45 });
  });

  it("直近14日は今日を最後にした14日分", () => {
    const d = dailyTotals(logs, 14, now);
    expect(d).toHaveLength(14);
    expect(d[13].date).toBe("2026-10-01");
    expect(d[0].date).toBe("2026-09-18");
    expect(d.find((x) => x.date === "2026-09-28")!.total).toBe(60);
  });

  it("ログは新しい順", () => {
    const s = sortLogs([log("2026-10-01", 1, "A1", 1), log("2026-10-02", 1, "A1", 0), log("2026-10-01", 1, "A1", 5)]);
    expect(s.map((l) => l.date + ":" + l.createdAt)).toEqual(["2026-10-02:0", "2026-10-01:5", "2026-10-01:1"]);
  });

  it("テーマ別正答率。未回答は null", () => {
    const r = themeAccuracy(THEMES, BUILTIN_QUESTIONS, { au1: { c: 1, w: 1 }, au2: { c: 1, w: 0 } });
    expect(r.find((x) => x.key === "auth")!.pct).toBe(67);
    expect(r.find((x) => x.key === "crypto")!.pct).toBeNull();
  });

  it("今日を含む週のタスクを開く", () => {
    expect(TASKS[currentTaskGroup(TASKS, new Date(2026, 9, 7))].week).toBe("第2週");
    expect(currentTaskGroup(TASKS, new Date(2028, 0, 1))).toBe(TASKS.length - 1);
  });
});

describe("データファイル", () => {
  it("問題はすべて形式どおりでidが重複しない", () => {
    const keys = THEMES.map((t) => t.key);
    expect(new Set(BUILTIN_QUESTIONS.map((q) => q.id)).size).toBe(BUILTIN_QUESTIONS.length);
    for (const q of BUILTIN_QUESTIONS) {
      expect(keys).toContain(q.t);
      expect(q.c).toHaveLength(4);
      expect(q.a).toBeGreaterThanOrEqual(0);
      expect(q.a).toBeLessThan(4);
    }
  });
  it("計画タスクは t01〜t31", () => {
    const ids = TASKS.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toHaveLength(31);
    expect(ids[0]).toBe("t01");
    expect(ids[30]).toBe("t31");
  });
});
