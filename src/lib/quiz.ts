import type { Question, QuestionOverride, QuizStat, QuizStats } from "../types";

export type QuizMode = "weak" | "random" | "wrong";

export function shuffle<T>(a: T[], rnd: () => number = Math.random): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const THREE_DAYS = 3 * 86400000;

/* 苦手度。未回答は最優先、それ以外は不正解数÷回答数。最終回答から3日以上経つと少し上げる */
export function weakScore(st: QuizStat | undefined, now: number = Date.now()): number {
  if (!st) return 1.5;
  const c = st.c || 0;
  const w = st.w || 0;
  if (c + w === 0) return 1.5;
  return w / (c + w) + (st.last && st.last < now - THREE_DAYS ? 0.3 : 0);
}

/* 最後の回答が不正解だった問題か（復習モードの対象） */
export function isMissed(st: QuizStat | undefined): boolean {
  if (!st) return false;
  if (st.lastOk !== undefined) return !st.lastOk;
  return (st.w || 0) > 0; // lastOk を持たない古い記録は不正解が1回でもあれば対象
}

/* 苦手判定（試作品と同じ基準：不正解数が正解数の半分を超える） */
export function isWeak(st: QuizStat | undefined): boolean {
  return !!st && (st.w || 0) > (st.c || 0) * 0.5;
}

export function pickQuestions(
  all: Question[],
  opts: { mode: QuizMode; theme: string; count: number },
  stats: QuizStats,
  rnd: () => number = Math.random,
  now: number = Date.now(),
): Question[] {
  let pool = all.filter((q) => opts.theme === "all" || q.t === opts.theme);
  if (opts.mode === "wrong") pool = pool.filter((q) => isMissed(stats[q.id]));
  shuffle(pool, rnd);
  if (opts.mode === "weak") {
    // シャッフル後の安定ソートなので、同じ苦手度の中ではランダムな順になる
    pool.sort((a, b) => weakScore(stats[b.id], now) - weakScore(stats[a.id], now));
  }
  return pool.slice(0, opts.count);
}

/* 内蔵問題と利用者の追加・編集を統合する。非表示のものも含めて返す */
export function mergeQuestions(builtin: Question[], overrides: QuestionOverride[]): (QuestionOverride & { builtin: boolean })[] {
  const byId = new Map(overrides.map((o) => [o.id, o]));
  const list: (QuestionOverride & { builtin: boolean })[] = builtin.map((q) => {
    const o = byId.get(q.id);
    return o ? { ...o, custom: false, builtin: true } : { ...q, builtin: true };
  });
  const builtinIds = new Set(builtin.map((q) => q.id));
  for (const o of overrides) {
    if (!builtinIds.has(o.id)) list.push({ ...o, custom: true, builtin: false });
  }
  return list;
}

/* 出題できる問題だけ */
export function activeQuestions(builtin: Question[], overrides: QuestionOverride[]): Question[] {
  return mergeQuestions(builtin, overrides)
    .filter((q) => !q.hidden)
    .map(({ id, t, q, c, a, e }) => ({ id, t, q, c, a, e }));
}

/* 入力検証。問題がなければ空配列 */
export function validateQuestion(q: Pick<Question, "t" | "q" | "c" | "a" | "e">, themeKeys: string[]): string[] {
  const errs: string[] = [];
  if (!themeKeys.includes(q.t)) errs.push("テーマを選んでください。");
  if (!q.q.trim()) errs.push("問題文を入れてください。");
  if (q.c.length !== 4 || q.c.some((c) => !c.trim())) errs.push("選択肢を4つとも入れてください。");
  else if (new Set(q.c.map((c) => c.trim())).size !== 4) errs.push("同じ選択肢が重複しています。");
  if (!(q.a >= 0 && q.a <= 3)) errs.push("正解を選んでください。");
  if (!q.e.trim()) errs.push("解説を入れてください。");
  return errs;
}

export function newQuestionId(now: number = Date.now()): string {
  return "u" + now.toString(36) + Math.floor(Math.random() * 1296).toString(36).padStart(2, "0");
}

/* 1問の回答を成績に反映した新しい成績を返す */
export function applyAnswer(stats: QuizStats, qid: string, ok: boolean, now: number = Date.now()): QuizStats {
  const st = stats[qid] ?? { c: 0, w: 0 };
  return {
    ...stats,
    [qid]: { c: (st.c || 0) + (ok ? 1 : 0), w: (st.w || 0) + (ok ? 0 : 1), last: now, lastOk: ok },
  };
}
