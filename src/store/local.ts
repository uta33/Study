import { DEFAULT_SETTINGS } from "../data";
import { applyAnswer } from "../lib/quiz";
import type { Log } from "../types";
import type { AppData, Store, SyncStatus } from "./types";

/* 試作品と同じキー。試作品で記録したデータがあれば引き継ぐ */
const LS = "sc-app-v1";

function load(): AppData {
  const d: AppData = { logs: [], checks: {}, quiz: {}, settings: { ...DEFAULT_SETTINGS }, questions: [], ready: true };
  try {
    const v = JSON.parse(localStorage.getItem(LS) || "null");
    if (v) {
      // 試作品のログは _id を持つ
      d.logs = (v.logs || []).map((l: Log & { _id?: string }) => {
        const { _id, ...rest } = l;
        return { ...rest, id: l.id || _id || "l" + l.createdAt };
      });
      d.checks = v.checks || {};
      d.quiz = v.quiz || {};
      d.settings = { ...d.settings, ...(v.settings || {}) };
      d.questions = v.questions || [];
    }
  } catch {
    /* 読めなければ空で始める */
  }
  return d;
}

export class LocalStore implements Store {
  readonly kind = "local" as const;
  private data: AppData = load();
  private listener: ((d: AppData) => void) | null = null;
  private syncListener: ((s: SyncStatus) => void) | null = null;

  subscribe(onData: (d: AppData) => void, onSync: (s: SyncStatus) => void) {
    this.listener = onData;
    this.syncListener = onSync;
    onData(this.data);
    onSync({ state: "local" });
    return () => {
      this.listener = null;
      this.syncListener = null;
    };
  }

  private update(patch: Partial<AppData>) {
    this.data = { ...this.data, ...patch };
    try {
      const { ready: _ready, ...rest } = this.data;
      localStorage.setItem(LS, JSON.stringify(rest));
    } catch {
      this.syncListener?.({ state: "error", message: "このブラウザに保存できませんでした" });
    }
    this.listener?.(this.data);
  }

  addLog(log: Parameters<Store["addLog"]>[0]) {
    const createdAt = Date.now();
    this.update({ logs: [...this.data.logs, { ...log, id: "l" + createdAt, createdAt }] });
  }

  deleteLog(id: string) {
    this.update({ logs: this.data.logs.filter((l) => l.id !== id) });
  }

  setCheck(taskId: string, done: boolean) {
    this.update({ checks: { ...this.data.checks, [taskId]: done } });
  }

  recordAnswer(questionId: string, ok: boolean) {
    this.update({ quiz: applyAnswer(this.data.quiz, questionId, ok) });
  }

  saveSettings(patch: Parameters<Store["saveSettings"]>[0]) {
    this.update({ settings: { ...this.data.settings, ...patch } });
  }

  saveQuestion(q: Parameters<Store["saveQuestion"]>[0]) {
    const rest = this.data.questions.filter((x) => x.id !== q.id);
    this.update({ questions: [...rest, { ...q, updatedAt: Date.now() }] });
  }

  deleteQuestion(id: string) {
    this.update({ questions: this.data.questions.filter((x) => x.id !== id) });
  }
}
