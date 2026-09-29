import { EXAMS } from "../data";
import { daysUntil, md } from "../lib/date";
import { useAppData } from "../store/context";
import type { SyncStatus } from "../store/types";

export type Tab = "manage" | "study" | "questions";

const TABS: { key: Tab; label: string }[] = [
  { key: "manage", label: "管理" },
  { key: "study", label: "学習" },
  { key: "questions", label: "問題" },
];

function syncLabel(s: SyncStatus, ready: boolean): string {
  if (s.state === "error") return s.message ?? "保存に失敗しました";
  if (s.state === "local") return "このブラウザに保存";
  if (!ready) return "読み込み中…";
  if (s.state === "offline") return "オフライン（復帰後に同期）";
  if (s.state === "pending") return "同期待ち";
  return "保存済み";
}

function Countdown() {
  const { data } = useAppData();
  // 日付順に並べ、今日以降で最も近い試験を強調する
  const list = EXAMS.map((x) => ({ ...x, date: data.settings[x.key] })).sort((a, b) => (a.date < b.date ? -1 : 1));
  const next = list.findIndex((x) => daysUntil(x.date) >= 0);
  return (
    <div className="count">
      {list.map((x, i) => {
        const n = daysUntil(x.date);
        return (
          <div key={x.key} className={"cd" + (i === next ? " next" : "") + (n < 0 ? " done" : "")}>
            <span className="n">
              {n < 0 ? "済" : n === 0 ? "当日" : n}
              {n > 0 && <small>日</small>}
            </span>
            <span className="l">
              {x.label}　{md(x.date)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Header({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const { sync, data } = useAppData();
  return (
    <header className="top">
      <div className="brand">
        <h1>支援士 学習ノート</h1>
        <span className={"status " + sync.state} role="status">
          {syncLabel(sync, data.ready)}
        </span>
      </div>
      <Countdown />
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => onTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
    </header>
  );
}
