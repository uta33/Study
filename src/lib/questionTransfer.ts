import type { Question, QuestionOverride, Theme } from "../types";
import { validateQuestion } from "./quiz";
import example from "../data/question-import-template.json";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_QUESTIONS = 5000;
export type QuestionFileFormat = "json" | "csv";
const COLUMNS = ["ID", "テーマ", "問題文", "選択肢ア", "選択肢イ", "選択肢ウ", "選択肢エ", "正解", "解説", "非表示"];
const ANSWERS = ["ア", "イ", "ウ", "エ"];

export interface ImportPlan {
  questions: QuestionOverride[];
  added: number;
  updated: number;
  skipped: number;
}

/** 問題だけを取り出す。学習履歴や保存先固有のメタ情報は転送しない。 */
function portable(q: QuestionOverride): QuestionOverride {
  return { id: q.id, t: q.t, q: q.q, c: [...q.c], a: q.a, e: q.e, hidden: !!q.hidden };
}

/** Excelが文字列を数式として実行しないようにし、再読込時に元に戻せる形にする。 */
function protectCell(value: string): string {
  return /^(?:\s*[=+@-]|[\t\r\n'])/.test(value) ? "'" + value : value;
}

function restoreCell(value: string): string {
  return value.startsWith("'") && /^(?:\s*[=+@-]|[\t\r\n'])/.test(value.slice(1)) ? value.slice(1) : value;
}

/** JSONは0始まりの正解番号、CSVはア〜エを使用する。
 * @example exportQuestions(questions, "csv", themes)
 */
export function exportQuestions(questions: QuestionOverride[], format: QuestionFileFormat, themes: Theme[]): string {
  if (format === "json") return JSON.stringify({ format: "sc-study-questions", version: 1, questions: questions.map(portable) }, null, 2) + "\n";
  const rows = questions.map((q) => [q.id, themes.find((t) => t.key === q.t)?.name ?? q.t, q.q, ...q.c, ANSWERS[q.a], q.e, q.hidden ? "true" : "false"]);
  // BOM付きUTF-8により、日本語版Excelで開いたときの文字化けを防ぐ。
  return "\uFEFF" + [COLUMNS, ...rows].map((row) => row.map((v) => '"' + protectCell(v).replaceAll('"', '""') + '"').join(",")).join("\r\n") + "\r\n";
}

/** 引用符、カンマ、セル内改行を扱うCSV読込。壊れた引用符を黙って補正しない。 */
function readCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, closed = false;
  const finishCell = () => { row.push(restoreCell(cell)); cell = ""; closed = false; };
  const finishRow = () => {
    finishCell();
    if (row.some((v) => v.trim())) rows.push(row);
    row = [];
    if (rows.length > MAX_IMPORT_QUESTIONS + 1) throw new Error(`一度に読み込めるのは${MAX_IMPORT_QUESTIONS}問までです。`);
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') cell += ch;
      else if (text[i + 1] === '"') { cell += '"'; i++; }
      else { quoted = false; closed = true; }
    } else if (ch === ",") finishCell();
    else if (ch === "\r" || ch === "\n") { finishRow(); if (ch === "\r" && text[i + 1] === "\n") i++; }
    else if (closed) throw new Error("CSVの閉じ引用符の後に文字があります。テンプレートの形式を確認してください。");
    else if (ch === '"') {
      if (cell) throw new Error("CSVの引用符が不正です。セル内の引用符は二重にしてください。");
      quoted = true;
    } else cell += ch;
  }
  if (quoted) throw new Error("CSVの引用符が閉じていません。");
  if (cell || closed || row.length) finishRow();
  return rows;
}

function csvObjects(text: string): unknown[] {
  const [header, ...rows] = readCsv(text);
  if (!header || header.length !== COLUMNS.length || COLUMNS.some((key) => !header.includes(key))) {
    throw new Error(`CSVの列名は「${COLUMNS.join("、")}」にしてください。テンプレートを利用できます。`);
  }
  return rows.map((row, i) => {
    if (row.length !== header.length) throw new Error(`CSVのデータ${i + 1}件目の列数が合いません。`);
    const field = (key: string) => row[header.indexOf(key)];
    const answer = field("正解").trim();
    const hidden = field("非表示").trim();
    return { id: field("ID"), t: field("テーマ"), q: field("問題文"), c: ANSWERS.map((key) => field("選択肢" + key)),
      a: ANSWERS.includes(answer) ? ANSWERS.indexOf(answer) : /^[1-4]$/.test(answer) ? Number(answer) - 1 : -1,
      e: field("解説"), hidden: hidden === "" || hidden === "false" ? false : hidden === "true" ? true : hidden };
  });
}

/** ファイル全体を検証してから返す。不正な行があれば保存処理へ渡さない。
 * @example parseQuestionFile('[{"t":"auth","q":"問題","c":["A","B","C","D"],"a":0,"e":"解説"}]', "json", themes)
 */
export function parseQuestionFile(text: string, format: QuestionFileFormat, themes: Theme[]): QuestionOverride[] {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new Error("ファイルは5MB以内にしてください。");
  text = text.replace(/^\uFEFF/, "");
  let values: unknown;
  if (format === "csv") values = csvObjects(text);
  else {
    try { values = JSON.parse(text); } catch { throw new Error("JSONを読み込めません。括弧やカンマ、引用符を確認してください。"); }
    if (values && !Array.isArray(values) && typeof values === "object") {
      const wrapper = values as Record<string, unknown>;
      if (wrapper.format !== "sc-study-questions" || wrapper.version !== 1) throw new Error("対応していないJSON形式・バージョンです。問題の配列またはこのアプリのエクスポートを使用してください。");
      values = wrapper.questions;
    }
  }
  if (!Array.isArray(values) || !values.length) throw new Error("問題がありません。1問以上の問題を指定してください。");
  if (values.length > MAX_IMPORT_QUESTIONS) throw new Error(`一度に読み込めるのは${MAX_IMPORT_QUESTIONS}問までです。`);
  const ids = new Set<string>(), errors: string[] = [], result: QuestionOverride[] = [];
  values.forEach((value: unknown, i: number) => {
    try {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("問題はオブジェクトで指定してください。");
      const v = value as Record<string, unknown>;
      if (typeof v.t !== "string" || typeof v.q !== "string" || typeof v.e !== "string" || !Array.isArray(v.c) || v.c.some((c) => typeof c !== "string")) throw new Error("テーマ・問題文・選択肢・解説は文字列で指定してください。");
      if (typeof v.a !== "number" || !Number.isInteger(v.a)) throw new Error("JSONの正解aは0〜3の整数で指定してください。");
      if (v.hidden !== undefined && typeof v.hidden !== "boolean") throw new Error("非表示はtrueまたはfalseで指定してください。");
      if (v.id !== undefined && typeof v.id !== "string") throw new Error("IDは文字列で指定してください。");
      const id = (v.id as string | undefined)?.trim() || "u" + crypto.randomUUID();
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(id) || ["__proto__", "constructor", "prototype"].includes(id)) throw new Error("IDは128文字以内の半角英数字・ハイフン・アンダースコアにしてください。");
      if (ids.has(id)) throw new Error(`ID「${id}」がファイル内で重複しています。`);
      ids.add(id);
      const themeValue = v.t.trim();
      const theme = themes.find((t) => t.key === themeValue || t.name === themeValue);
      const q: QuestionOverride = { id, t: theme?.key ?? themeValue, q: v.q.trim(), c: v.c.map((c: string) => c.trim()) as Question["c"], a: v.a, e: v.e.trim(), hidden: v.hidden === true };
      const errs = validateQuestion(q, themes.map((t) => t.key));
      if (q.q.length > 20000 || q.e.length > 50000 || q.c.some((c) => c.length > 10000)) errs.push("問題文は2万字、解説は5万字、各選択肢は1万字以内にしてください。");
      if (errs.length) throw new Error(errs.join(" "));
      result.push(q);
    } catch (error) { if (errors.length < 50) errors.push(`${i + 1}問目: ${(error as Error).message}`); }
  });
  if (errors.length) throw new Error("取り込めません。修正して再度読み込んでください（最大50件表示）。\n" + errors.join("\n"));
  return result;
}

/** IDの衝突は利用者が選んだ方針で処理し、IDが異なる同内容の追加も防ぐ。 */
export function planQuestionImport(incoming: QuestionOverride[], existing: QuestionOverride[], builtinIds: Set<string>, replace: boolean): ImportPlan {
  const byId = new Map(existing.map((q) => [q.id, q]));
  const fingerprint = (q: QuestionOverride) => JSON.stringify([q.t, q.q, q.c, q.a, q.e]);
  const same = (a: QuestionOverride, b: QuestionOverride) => fingerprint(a) === fingerprint(b) && !!a.hidden === !!b.hidden;
  const seen = new Map<string, number>();
  const count = (q: QuestionOverride, delta: number) => { const key = fingerprint(q); seen.set(key, (seen.get(key) ?? 0) + delta); };
  existing.forEach((q) => count(q, 1));
  const plan: ImportPlan = { questions: [], added: 0, updated: 0, skipped: 0 };
  incoming.forEach((q) => {
    const previous = byId.get(q.id);
    if (previous && (!replace || same(q, previous))) { plan.skipped++; return; }
    if (!previous && (seen.get(fingerprint(q)) ?? 0) > 0) { plan.skipped++; return; }
    if (previous) { plan.updated++; count(previous, -1); } else plan.added++;
    const saved = { ...portable(q), custom: !builtinIds.has(q.id) };
    plan.questions.push(saved);
    byId.set(q.id, saved);
    count(saved, 1);
  });
  return plan;
}

/** テンプレートは実際に取り込めるオリジナル問題1問。IDは空欄で自動採番する。 */
export const QUESTION_EXAMPLE = example as QuestionOverride;
