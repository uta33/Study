import { useEffect, useMemo, useRef, useState } from "react";
import { themeName } from "../../data";
import { shuffle } from "../../lib/quiz";
import { useAppData } from "../../store/context";
import type { Question } from "../../types";

export interface RunResult {
  list: Question[];
  right: number;
  miss: Question[];
  minutes: number;
}

const KEYS = ["ア", "イ", "ウ", "エ"];

export default function QuizRun({ list, onFinish, onQuit }: { list: Question[]; onFinish: (r: RunResult) => void; onQuit: () => void }) {
  const { store } = useAppData();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [miss, setMiss] = useState<Question[]>([]);
  const startAt = useRef(Date.now());
  const firstBtn = useRef<HTMLButtonElement>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);

  const q = list[i];
  // 正解の位置を覚えないよう、問題ごとに選択肢の並びを変える
  const order = useMemo(() => shuffle([0, 1, 2, 3]), [q]);
  const last = i === list.length - 1;

  useEffect(() => {
    (picked === null ? firstBtn : nextBtn).current?.focus({ preventScroll: true });
  }, [picked, i]);

  const answer = (ci: number) => {
    if (picked !== null) return;
    const ok = ci === q.a;
    setPicked(ci);
    store.recordAnswer(q.id, ok);
    if (ok) setRight(right + 1);
    else setMiss([...miss, q]);
  };

  const next = () => {
    if (last) {
      onFinish({ list, right, miss, minutes: Math.max(1, Math.round((Date.now() - startAt.current) / 60000)) });
      return;
    }
    setI(i + 1);
    setPicked(null);
  };

  const ok = picked === q.a;
  return (
    <section className="card">
      <div className="qhead">
        <span className="theme">{themeName(q.t)}</span>
        <span className="row">
          <span className="mono small muted">
            {i + 1} / {list.length}
          </span>
          <button className="x" onClick={onQuit}>
            中断
          </button>
        </span>
      </div>
      <div className="prog">
        <i style={{ width: ((i + (picked !== null ? 1 : 0)) / list.length) * 100 + "%" }} />
      </div>
      <p className="q">{q.q}</p>
      <div className="choices">
        {order.map((ci, pos) => {
          const cls = picked === null ? "" : ci === q.a ? " right" : ci === picked ? " wrong" : "";
          return (
            <button key={ci} ref={pos === 0 ? firstBtn : undefined} type="button" className={"choice" + cls} disabled={picked !== null} onClick={() => answer(ci)}>
              <span className="k">{KEYS[pos]}</span>
              <span>{q.c[ci]}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <>
          <div className="exp" aria-live="polite">
            <b className={ok ? "ok" : "ng"}>{ok ? "正解" : "不正解"}</b>
            <p>{q.e}</p>
          </div>
          <div className="row">
            <button ref={nextBtn} type="button" className="btn primary" onClick={next}>
              {last ? "結果を見る" : "次の問題"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
