/* アプリ全体で使う型 */

export type SubjectKey = "A1" | "A2" | "B" | "IN" | "QZ";

export interface Log {
  id: string;
  date: string; // YYYY-MM-DD
  minutes: number;
  subject: SubjectKey;
  memo: string;
  createdAt: number;
}

export type NewLog = Omit<Log, "id" | "createdAt">;

export interface Question {
  id: string;
  t: string; // テーマキー
  q: string;
  c: [string, string, string, string];
  a: number; // 正解のindex
  e: string;
}

/* 利用者が追加・編集した問題。内蔵問題と同じidなら上書きし、hidden なら出題しない */
export interface QuestionOverride extends Question {
  hidden?: boolean;
  custom?: boolean; // 利用者が新しく追加した問題
  updatedAt?: number;
}

export interface QuizStat {
  c: number; // 正解数
  w: number; // 不正解数
  last?: number; // 最終回答のUnix ms
  lastOk?: boolean; // 最後の回答が正解だったか
}

export type QuizStats = Record<string, QuizStat>;
export type Checks = Record<string, boolean>;

export interface Settings {
  goal: number; // 分/週
  examA: string;
  examB: string;
  exam2A: string;
  exam2B: string;
}

export interface Theme {
  key: string;
  name: string;
}

export interface TaskGroup {
  week: string;
  from: string;
  to: string;
  items: { id: string; text: string }[];
}
