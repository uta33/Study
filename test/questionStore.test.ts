import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase/firestore";
import { LocalStore } from "../src/store/local";
import { FirestoreStore } from "../src/store/firestore";
import type { QuestionOverride } from "../src/types";

const firebase = vi.hoisted(() => ({ commit: vi.fn(), set: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, path: string) => path,
  writeBatch: () => ({ set: firebase.set, commit: firebase.commit }),
}));
const mk = (id: string): QuestionOverride => ({ id, t: "auth", q: "問題" + id, c: ["A", "B", "C", "D"], a: 0, e: "解説", custom: true });

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("ブラウザへの一括保存", () => {
  let saved: string;
  const initial = { logs: [{ id: "l1", createdAt: 1 }], checks: { t01: true }, quiz: { u1: { c: 3, w: 1 } }, settings: { goal: 400 }, questions: [mk("u1"), mk("u2")] };
  beforeEach(() => {
    saved = JSON.stringify(initial);
    vi.stubGlobal("localStorage", { getItem: () => saved, setItem: vi.fn((_key: string, value: string) => { saved = value; }) });
  });

  it("既存問題をIDで更新し、他の問題と学習履歴・設定を維持する", async () => {
    const store = new LocalStore(), listener = vi.fn(), progress = vi.fn();
    store.subscribe(listener, vi.fn());
    await store.importQuestions([{ ...mk("u1"), q: "編集後" }, mk("u3")], progress);
    const restored = JSON.parse(saved);
    expect(restored).toMatchObject({ logs: initial.logs, checks: initial.checks, quiz: initial.quiz, settings: initial.settings });
    expect(restored.questions).toHaveLength(3);
    expect(restored.questions.find((q: QuestionOverride) => q.id === "u1").q).toBe("編集後");
    expect(restored.questions.find((q: QuestionOverride) => q.id === "u2")).toEqual(mk("u2"));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenCalledWith(2);
  });

  it("容量不足なら保存内容と画面の状態を変更せず失敗を返す", async () => {
    const store = new LocalStore(), listener = vi.fn(), progress = vi.fn();
    store.subscribe(listener, vi.fn());
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error("QuotaExceededError"); });
    await expect(store.importQuestions([mk("u3")], progress)).rejects.toThrow("問題は取り込んでいません");
    expect(JSON.parse(saved)).toEqual(initial);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(progress).not.toHaveBeenCalled();
  });
});

describe("Firestoreへの一括保存", () => {
  beforeEach(() => {
    firebase.commit.mockReset().mockResolvedValue(undefined);
    firebase.set.mockReset();
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("多数の問題を分割し、本人の問題だけを保存して完了件数を通知する", async () => {
    const store = new FirestoreStore({} as Firestore, "user1"), progress = vi.fn();
    await store.importQuestions(Array.from({ length: 801 }, (_, i) => mk("q" + i)), progress);
    expect(firebase.commit).toHaveBeenCalledTimes(3);
    expect(firebase.set).toHaveBeenCalledTimes(801);
    expect(firebase.set.mock.calls[0][0]).toBe("users/user1/questions/q0");
    expect(firebase.set.mock.calls[800][0]).toBe("users/user1/questions/q800");
    expect(progress.mock.calls).toEqual([[400], [800], [801]]);
  });

  it("途中の保存失敗を成功扱いせず、確定済み件数を通知して停止する", async () => {
    firebase.commit.mockResolvedValueOnce(undefined).mockRejectedValueOnce({ code: "permission-denied" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const store = new FirestoreStore({} as Firestore, "user1"), progress = vi.fn();
    await expect(store.importQuestions(Array.from({ length: 801 }, (_, i) => mk("q" + i)), progress)).rejects.toThrow("801問中400問を保存済み");
    expect(firebase.commit).toHaveBeenCalledTimes(2);
    expect(progress.mock.calls).toEqual([[400]]);
  });
});
