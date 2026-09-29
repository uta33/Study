import { describe, expect, it } from "vitest";
import { applyAnswer, activeQuestions, isMissed, mergeQuestions, pickQuestions, validateQuestion, weakScore } from "../src/lib/quiz";
import type { Question } from "../src/types";

const mk = (id: string, t = "auth"): Question => ({ id, t, q: id, c: ["a", "b", "c", "d"], a: 0, e: "e" });
const NOW = 1_800_000_000_000;
const DAY = 86400000;

describe("苦手度", () => {
  it("未回答が最優先、3日以上前の回答は少し上げる", () => {
    expect(weakScore(undefined, NOW)).toBe(1.5);
    expect(weakScore({ c: 1, w: 1, last: NOW - DAY }, NOW)).toBe(0.5);
    expect(weakScore({ c: 1, w: 1, last: NOW - 4 * DAY }, NOW)).toBeCloseTo(0.8);
  });

  it("苦手・未回答を優先の並び", () => {
    const qs = [mk("ok"), mk("bad"), mk("new")];
    const stats = { ok: { c: 3, w: 0, last: NOW }, bad: { c: 1, w: 3, last: NOW } };
    const list = pickQuestions(qs, { mode: "weak", theme: "all", count: 3 }, stats, Math.random, NOW);
    expect(list.map((q) => q.id)).toEqual(["new", "bad", "ok"]);
  });

  it("テーマと問題数で絞る", () => {
    const qs = [mk("a1", "auth"), mk("a2", "auth"), mk("c1", "crypto")];
    expect(pickQuestions(qs, { mode: "random", theme: "crypto", count: 5 }, {}).map((q) => q.id)).toEqual(["c1"]);
    expect(pickQuestions(qs, { mode: "random", theme: "all", count: 2 }, {})).toHaveLength(2);
  });
});

describe("間違えた問題の復習", () => {
  it("最後の回答が不正解のものだけ", () => {
    let s = applyAnswer({}, "x", false, NOW);
    expect(isMissed(s.x)).toBe(true);
    s = applyAnswer(s, "x", true, NOW);
    expect(s.x).toEqual({ c: 1, w: 1, last: NOW, lastOk: true });
    expect(isMissed(s.x)).toBe(false);
    const qs = [mk("x"), mk("y"), mk("z")];
    const stats = { ...s, y: { c: 0, w: 1, last: NOW, lastOk: false } };
    expect(pickQuestions(qs, { mode: "wrong", theme: "all", count: 10 }, stats).map((q) => q.id)).toEqual(["y"]);
  });
  it("lastOk がない古い記録は不正解が1回でもあれば対象", () => {
    expect(isMissed({ c: 2, w: 1 })).toBe(true);
    expect(isMissed({ c: 2, w: 0 })).toBe(false);
  });
});

describe("問題の統合", () => {
  const builtin = [mk("b1"), mk("b2")];
  it("内蔵の上書き・非表示・追加", () => {
    const merged = mergeQuestions(builtin, [
      { ...mk("b1"), q: "編集後" },
      { ...mk("b2"), hidden: true },
      { ...mk("u1"), custom: true },
    ]);
    expect(merged.map((q) => [q.id, q.builtin])).toEqual([
      ["b1", true],
      ["b2", true],
      ["u1", false],
    ]);
    expect(merged[0].q).toBe("編集後");
    const active = activeQuestions(builtin, [{ ...mk("b2"), hidden: true }, mk("u1")]);
    expect(active.map((q) => q.id)).toEqual(["b1", "u1"]);
  });
});

describe("入力検証", () => {
  const ok = { t: "auth", q: "問", c: ["a", "b", "c", "d"] as Question["c"], a: 1, e: "解" };
  it("正しい入力は通る", () => expect(validateQuestion(ok, ["auth"])).toEqual([]));
  it("空欄・重複・テーマ不正を弾く", () => {
    expect(validateQuestion({ ...ok, q: " " }, ["auth"])).toHaveLength(1);
    expect(validateQuestion({ ...ok, c: ["a", "a", "c", "d"] }, ["auth"])).toEqual(["同じ選択肢が重複しています。"]);
    expect(validateQuestion({ ...ok, c: ["a", "", "c", "d"] }, ["auth"])).toHaveLength(1);
    expect(validateQuestion({ ...ok, t: "zzz" }, ["auth"])).toHaveLength(1);
  });
});
