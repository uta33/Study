import { useState } from "react";
import { THEMES } from "../../data";
import { isMissed, isWeak, pickQuestions, type QuizMode } from "../../lib/quiz";
import { useAppData } from "../../store/context";
import type { Question } from "../../types";

export default function QuizSetup({ onStart }: { onStart: (list: Question[]) => void }) {
  const { data, questions } = useAppData();
  const [mode, setMode] = useState<QuizMode>("weak");
  const [theme, setTheme] = useState("all");
  const [count, setCount] = useState(10);
  const [msg, setMsg] = useState("");

  const seen = questions.filter((q) => data.quiz[q.id]).length;
  const weak = questions.filter((q) => isWeak(data.quiz[q.id])).length;
  const missed = questions.filter((q) => isMissed(data.quiz[q.id])).length;

  const start = () => {
    const list = pickQuestions(questions, { mode, theme, count }, data.quiz);
    if (!list.length) {
      setMsg(mode === "wrong" ? "このテーマに間違えた問題はありません。" : "このテーマの問題がありません。");
      return;
    }
    setMsg("");
    onStart(list);
  };

  return (
    <section className="card">
      <h2>一問一答</h2>
      <p className="small muted">重点テーマと科目A-1の頻出分野から作ったオリジナル問題です。結果は自動で記録され、管理タブの正答率に反映されます。</p>
      <div className="row" style={{ alignItems: "end" }}>
        <label className="f">
          出題順
          <select value={mode} onChange={(e) => setMode(e.target.value as QuizMode)}>
            <option value="weak">苦手・未回答を優先</option>
            <option value="random">ランダム</option>
            <option value="wrong">間違えた問題だけ（{missed}問）</option>
          </select>
        </label>
        <label className="f">
          テーマ
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="all">すべて</option>
            {THEMES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}（{questions.filter((q) => q.t === t.key).length}問）
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          問題数
          <select value={count} onChange={(e) => setCount(+e.target.value)}>
            {[5, 10, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button className="btn primary" onClick={start}>
          始める
        </button>
      </div>
      <p className="note" aria-live="polite">
        {msg || `全${questions.length}問中 ${seen}問に回答済み。苦手判定 ${weak}問、直近で間違えた問題 ${missed}問。`}
      </p>
    </section>
  );
}
