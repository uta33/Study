import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { BUILTIN_QUESTIONS, DEFAULT_SETTINGS } from "../data";
import { activeQuestions, mergeQuestions } from "../lib/quiz";
import type { Question, QuestionOverride } from "../types";
import type { AppData, Store, SyncStatus } from "./types";

export interface AppContextValue {
  store: Store;
  data: AppData;
  sync: SyncStatus;
  /* 出題できる問題（非表示を除く） */
  questions: Question[];
  /* 内蔵と追加をあわせた全問題（非表示も含む） */
  allQuestions: (QuestionOverride & { builtin: boolean })[];
}

const Ctx = createContext<AppContextValue | null>(null);

const EMPTY: AppData = { logs: [], checks: {}, quiz: {}, settings: DEFAULT_SETTINGS, questions: [], ready: false };

export function AppDataProvider({ store, children }: { store: Store; children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [sync, setSync] = useState<SyncStatus>({ state: "pending" });

  useEffect(() => store.subscribe(setData, setSync), [store]);

  const value = useMemo<AppContextValue>(
    () => ({
      store,
      data,
      sync,
      questions: activeQuestions(BUILTIN_QUESTIONS, data.questions),
      allQuestions: mergeQuestions(BUILTIN_QUESTIONS, data.questions),
    }),
    [store, data, sync],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("AppDataProvider の外で useAppData が呼ばれました");
  return v;
}
