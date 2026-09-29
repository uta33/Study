import type { Checks, Log, NewLog, QuestionOverride, QuizStats, Settings } from "../types";

export interface AppData {
  logs: Log[];
  checks: Checks;
  quiz: QuizStats;
  settings: Settings;
  questions: QuestionOverride[]; // 利用者が追加・編集した問題
  ready: boolean;
}

/* local: このブラウザだけに保存 / synced: 保存済み / pending: 同期待ち / offline: オフライン / error: 失敗 */
export type SyncState = "local" | "synced" | "pending" | "offline" | "error";

export interface SyncStatus {
  state: SyncState;
  message?: string;
}

/* 保存先の差（Firestore / localStorage）を隠すための共通の窓口 */
export interface Store {
  readonly kind: "firestore" | "local";
  subscribe(onData: (d: AppData) => void, onSync: (s: SyncStatus) => void): () => void;
  addLog(log: NewLog): void;
  deleteLog(id: string): void;
  setCheck(taskId: string, done: boolean): void;
  recordAnswer(questionId: string, ok: boolean): void;
  saveSettings(patch: Partial<Settings>): void;
  saveQuestion(q: QuestionOverride): void;
  /** 一括保存。完了した件数を通知し、保存拒否時は例外を返す。 */
  importQuestions(questions: QuestionOverride[], onProgress?: (saved: number) => void): Promise<void>;
  deleteQuestion(id: string): void;
}
