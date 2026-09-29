import { describe, expect, it } from "vitest";
import { BUILTIN_QUESTIONS, THEMES } from "../src/data";
import { exportQuestions, MAX_IMPORT_BYTES, MAX_IMPORT_QUESTIONS, parseQuestionFile, planQuestionImport, QUESTION_EXAMPLE } from "../src/lib/questionTransfer";
import type { QuestionOverride } from "../src/types";

const mk = (id = "test1", q = "問題"): QuestionOverride => ({ id, t: "auth", q, c: ["A", "B", "C", "D"], a: 2, e: "解説" });
const parse = (values: unknown) => parseQuestionFile(JSON.stringify(values), "json", THEMES);
const builtinIds = new Set(["b1"]);

describe("問題ファイルの入出力", () => {
  it.each(["json", "csv"] as const)("%sで日本語・引用符・カンマ・改行・非表示を往復できる", (format) => {
    const question = { ...mk("test1", '問題「引用」, "引用符"\n次の行'), e: "解説\r\n二行目", hidden: true, custom: true, updatedAt: 123 };
    const file = exportQuestions([question], format, THEMES);
    expect(parseQuestionFile(file, format, THEMES)).toEqual([{ ...mk(), q: question.q, e: question.e, hidden: true }]);
    expect(file).not.toContain("updatedAt");
    expect(file).not.toContain("custom");
    if (format === "csv") expect(file.startsWith("\uFEFF")).toBe(true);
  });

  it.each(["json", "csv"] as const)("%sで内蔵53問と追加テンプレートが読み込める", (format) => {
    const questions = parseQuestionFile(exportQuestions(BUILTIN_QUESTIONS, format, THEMES), format, THEMES);
    expect(questions).toEqual(BUILTIN_QUESTIONS.map((q) => ({ ...q, hidden: false })));
    const [example] = parseQuestionFile(exportQuestions([QUESTION_EXAMPLE], format, THEMES), format, THEMES);
    expect(example.id).toMatch(/^u[\w-]+$/);
    expect(example.q).toBe(QUESTION_EXAMPLE.q);
  });

  it("CSVで数式の開始文字を無効化して元の文字列へ戻す", () => {
    const question = { ...mk(), q: '=HYPERLINK("https://example.com")', c: ["+SUM(1,2)", "-1", "@A1", "'引用"] as QuestionOverride["c"] };
    const file = exportQuestions([question], "csv", THEMES);
    expect(file).toContain("'=HYPERLINK");
    expect(file).toContain("'+SUM");
    expect(file).toContain("''引用");
    expect(parseQuestionFile(file, "csv", THEMES)).toEqual([{ ...question, hidden: false }]);
  });

  it("CSVの列の並べ替え、正解番号1〜4、空欄の非表示を受け付ける", () => {
    const file = "問題文,ID,テーマ,選択肢ア,選択肢イ,選択肢ウ,選択肢エ,正解,解説,非表示\n問題,test1,auth,A,B,C,D,3,解説,\n";
    expect(parseQuestionFile(file, "csv", THEMES)).toEqual([{ ...mk(), hidden: false }]);
  });

  it("JSON配列・BOM・日本語テーマ名と空欄IDに対応する", () => {
    const questions = parseQuestionFile("\uFEFF" + JSON.stringify([{ ...mk(""), t: THEMES.find((t) => t.key === "auth")!.name }, mk("", "別の問題")]), "json", THEMES);
    expect(questions.map((q) => q.t)).toEqual(["auth", "auth"]);
    expect(questions[0].id).not.toBe(questions[1].id);
  });

  it.each([
    ["未知のテーマ", { t: "unknown" }],
    ["範囲外の正解", { a: 4 }],
    ["小数の正解", { a: 1.5 }],
    ["文字列の正解", { a: "1" }],
    ["足りない選択肢", { c: ["A", "B", "C"] }],
    ["重複した選択肢", { c: ["A", "A", "C", "D"] }],
    ["文字列以外の選択肢", { c: [1, "B", "C", "D"] }],
    ["空欄の解説", { e: " " }],
    ["不正な非表示", { hidden: "false" }],
    ["パスを含むID", { id: "nested/path" }],
    ["予約ID", { id: "__proto__" }],
  ])("%sがあればファイル全体を拒否して問題位置を示す", (_label, patch) => {
    expect(() => parse([mk("ok"), { ...mk(), ...patch }])).toThrow("2問目:");
  });

  it("ファイル内の同じIDは黙って上書きしない", () => {
    expect(() => parse([mk(), mk()])).toThrow("重複");
  });

  it("空ファイル・不正JSON・未知のバージョンを拒否する", () => {
    expect(() => parse([])).toThrow("問題がありません");
    expect(() => parseQuestionFile("{", "json", THEMES)).toThrow("JSONを読み込めません");
    expect(() => parse({ format: "sc-study-questions", version: 2, questions: [mk()] })).toThrow("バージョン");
  });

  it("壊れたCSVの引用符・列数・ヘッダーを拒否する", () => {
    const file = exportQuestions([mk()], "csv", THEMES);
    expect(() => parseQuestionFile(file.slice(0, -3), "csv", THEMES)).toThrow("引用符が閉じていません");
    expect(() => parseQuestionFile(file.replace('"ID",', '"ID"x,'), "csv", THEMES)).toThrow("閉じ引用符の後");
    expect(() => parseQuestionFile(file.replace('"test1",', ""), "csv", THEMES)).toThrow("列数");
    expect(() => parseQuestionFile(file.replace("問題文", "不明な列"), "csv", THEMES)).toThrow("列名");
  });

  it("ファイル容量と問題数の上限を検証する", () => {
    expect(() => parseQuestionFile(" ".repeat(MAX_IMPORT_BYTES + 1), "json", THEMES)).toThrow("5MB");
    expect(() => parse(Array.from({ length: MAX_IMPORT_QUESTIONS + 1 }, (_, i) => mk("q" + i)))).toThrow("5000問");
  });
});

describe("取り込み内容の確認", () => {
  it("初期設定では既存IDを上書きせず、新しい問題だけ追加する", () => {
    const plan = planQuestionImport([mk("b1", "更新"), mk("u1", "追加")], [mk("b1")], builtinIds, false);
    expect(plan).toMatchObject({ added: 1, updated: 0, skipped: 1 });
    expect(plan.questions).toEqual([{ ...mk("u1", "追加"), hidden: false, custom: true }]);
  });

  it("許可した更新では内蔵問題も更新し、非表示も復元する", () => {
    const plan = planQuestionImport([{ ...mk("b1", "更新"), hidden: true }, mk("u1", "追加")], [mk("b1")], builtinIds, true);
    expect(plan).toMatchObject({ added: 1, updated: 1, skipped: 0 });
    expect(plan.questions[0]).toMatchObject({ custom: false, hidden: true, q: "更新" });
  });

  it("同じファイルの再取り込みとIDを変えた同内容を重複追加しない", () => {
    const plan = planQuestionImport([mk("b1"), mk("u1"), mk("u2", "新規"), mk("u3", "新規")], [mk("b1")], builtinIds, true);
    expect(plan).toMatchObject({ added: 1, updated: 0, skipped: 3 });
    expect(plan.questions[0].id).toBe("u2");
  });

  it("問題内容が同じでも非表示設定が違えば更新する", () => {
    expect(planQuestionImport([{ ...mk("b1"), hidden: true }], [mk("b1")], builtinIds, true)).toMatchObject({ updated: 1, skipped: 0 });
  });
});
