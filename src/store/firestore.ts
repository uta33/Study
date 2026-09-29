import {
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  setDoc,
  type DocumentReference,
  type Firestore,
  type FirestoreError,
} from "firebase/firestore";
import { DEFAULT_SETTINGS } from "../data";
import type { Checks, Log, QuestionOverride, QuizStats, Settings } from "../types";
import type { AppData, Store, SyncStatus } from "./types";

type Part = "logs" | "checks" | "quiz" | "settings" | "questions";
const PARTS: Part[] = ["logs", "checks", "quiz", "settings", "questions"];

/*
 * データはすべて users/{uid}/ の下に置く。
 *   logs/{id}          学習ログ
 *   meta/checks        計画タスクの完了
 *   meta/quizStats     一問一答の成績
 *   meta/settings      設定
 *   questions/{id}     追加・編集した問題
 * 書込みは待たずに投げる。オフラインでも手元のキャッシュに入り、画面は onSnapshot で即時に更新される。
 */
export class FirestoreStore implements Store {
  readonly kind = "firestore" as const;
  private base: string;
  private data: AppData = { logs: [], checks: {}, quiz: {}, settings: { ...DEFAULT_SETTINGS }, questions: [], ready: false };
  private loaded = new Set<Part>();
  private pending = new Set<Part>();
  private error: string | null = null;
  private onData: ((d: AppData) => void) | null = null;
  private onSync: ((s: SyncStatus) => void) | null = null;

  constructor(
    private db: Firestore,
    uid: string,
  ) {
    this.base = "users/" + uid;
  }

  private ref(path: string): DocumentReference {
    return doc(this.db, this.base + "/" + path);
  }

  subscribe(onData: (d: AppData) => void, onSync: (s: SyncStatus) => void) {
    this.onData = onData;
    this.onSync = onSync;
    const opts = { includeMetadataChanges: true };
    const unsubs = [
      onSnapshot(
        collection(this.db, this.base + "/logs"),
        opts,
        (snap) => {
          const logs = snap.docs.map((d) => ({ ...(d.data() as Omit<Log, "id">), id: d.id }));
          this.set("logs", { logs }, snap.metadata.hasPendingWrites);
        },
        (e) => this.fail(e),
      ),
      onSnapshot(
        this.ref("meta/checks"),
        opts,
        (d) => this.set("checks", { checks: (d.data() as Checks) ?? {} }, d.metadata.hasPendingWrites),
        (e) => this.fail(e),
      ),
      onSnapshot(
        this.ref("meta/quizStats"),
        opts,
        (d) => this.set("quiz", { quiz: (d.data() as QuizStats) ?? {} }, d.metadata.hasPendingWrites),
        (e) => this.fail(e),
      ),
      onSnapshot(
        this.ref("meta/settings"),
        opts,
        (d) =>
          this.set(
            "settings",
            { settings: { ...DEFAULT_SETTINGS, ...((d.data() as Partial<Settings>) ?? {}) } },
            d.metadata.hasPendingWrites,
          ),
        (e) => this.fail(e),
      ),
      onSnapshot(
        collection(this.db, this.base + "/questions"),
        opts,
        (snap) => {
          const questions = snap.docs.map((d) => ({ ...(d.data() as QuestionOverride), id: d.id }));
          this.set("questions", { questions }, snap.metadata.hasPendingWrites);
        },
        (e) => this.fail(e),
      ),
    ];
    const net = () => this.emitSync();
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    return () => {
      unsubs.forEach((u) => u());
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
      this.onData = null;
      this.onSync = null;
    };
  }

  private set(part: Part, patch: Partial<AppData>, hasPending: boolean) {
    this.loaded.add(part);
    if (hasPending) this.pending.add(part);
    else this.pending.delete(part);
    this.data = { ...this.data, ...patch, ready: PARTS.every((p) => this.loaded.has(p)) };
    this.onData?.(this.data);
    this.emitSync();
  }

  private emitSync() {
    if (this.error) this.onSync?.({ state: "error", message: this.error });
    else if (!navigator.onLine) this.onSync?.({ state: "offline" });
    else if (this.pending.size) this.onSync?.({ state: "pending" });
    else this.onSync?.({ state: "synced" });
  }

  private fail(e: FirestoreError) {
    console.error(e);
    this.error =
      e.code === "permission-denied"
        ? "保存が拒否されました。ログインし直してください"
        : e.code === "resource-exhausted"
          ? "保存上限に達しました。古いログを削除してください"
          : "保存に失敗しました。通信を確認してください";
    this.emitSync();
  }

  /* 書込み結果は待たない（オフライン時は復帰するまで解決しないため） */
  private write(p: Promise<unknown>) {
    p.then(
      () => {
        if (this.error) {
          this.error = null;
          this.emitSync();
        }
      },
      (e: FirestoreError) => this.fail(e),
    );
  }

  addLog(log: Parameters<Store["addLog"]>[0]) {
    const ref = doc(collection(this.db, this.base + "/logs"));
    this.write(setDoc(ref, { ...log, createdAt: Date.now() }));
  }

  deleteLog(id: string) {
    this.write(deleteDoc(this.ref("logs/" + id)));
  }

  setCheck(taskId: string, done: boolean) {
    this.write(setDoc(this.ref("meta/checks"), { [taskId]: done }, { merge: true }));
  }

  /* 加算で書くので、スマホとPCで同時に回答しても成績を上書きしない */
  recordAnswer(questionId: string, ok: boolean) {
    this.write(
      setDoc(
        this.ref("meta/quizStats"),
        { [questionId]: { c: increment(ok ? 1 : 0), w: increment(ok ? 0 : 1), last: Date.now(), lastOk: ok } },
        { merge: true },
      ),
    );
  }

  saveSettings(patch: Partial<Settings>) {
    this.write(setDoc(this.ref("meta/settings"), patch, { merge: true }));
  }

  saveQuestion(q: QuestionOverride) {
    const { id, ...rest } = q;
    // Firestore は undefined を保存できないので落とす
    const body = Object.fromEntries(Object.entries({ ...rest, updatedAt: Date.now() }).filter(([, v]) => v !== undefined));
    this.write(setDoc(this.ref("questions/" + id), body));
  }

  deleteQuestion(id: string) {
    this.write(deleteDoc(this.ref("questions/" + id)));
  }
}
