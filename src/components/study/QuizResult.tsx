import { useState } from "react";
import { today } from "../../lib/date";
import { shuffle } from "../../lib/quiz";
import { useAppData } from "../../store/context";
import type { Question } from "../../types";
import type { RunResult } from "./QuizRun";

export default function QuizResult({ result, onRetry, onBack }: { result: RunResult; onRetry: (list: Question[]) => void; onBack: () => void }) {
  const { store } = useAppData();
  const [logged, setLogged] = useState(false);
  const { list, right, miss, minutes } = result;
  return (
    <section className="card">
      <div className="result">
        <span className="big">
          {right} / {list.length}
        </span>
        <p className="muted small">
          正答率 {Math.round((right / list.length) * 100)}%　所要 約{minutes}分
        </p>
        {miss.length > 0 && (
          <>
            <h2 style={{ justifySelf: "start" }}>間違えた問題</h2>
            <ul className="misslist">
              {miss.map((q) => (
                <li key={q.id}>
                  {q.q}　→ {q.c[q.a]}
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="row" style={{ justifyContent: "center" }}>
          <button
            className="btn"
            disabled={logged}
            onClick={() => {
              store.addLog({ date: today(), minutes, subject: "QZ", memo: `一問一答 ${right}/${list.length}` });
              setLogged(true);
            }}
          >
            {logged ? "記録しました" : `学習時間に${minutes}分を記録`}
          </button>
          {miss.length > 0 && (
            <button className="btn" onClick={() => onRetry(shuffle(miss.slice()))}>
              間違えた{miss.length}問をもう一度
            </button>
          )}
          <button className="btn primary" onClick={onBack}>
            もう一度
          </button>
        </div>
      </div>
    </section>
  );
}
