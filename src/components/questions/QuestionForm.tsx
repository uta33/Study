import { useState } from "react";
import { BUILTIN_QUESTIONS, THEMES } from "../../data";
import { newQuestionId, validateQuestion } from "../../lib/quiz";
import { useAppData } from "../../store/context";
import type { Question, QuestionOverride } from "../../types";

const KEYS = ["ア", "イ", "ウ", "エ"];

export default function QuestionForm({ initial, onDone }: { initial: (QuestionOverride & { builtin: boolean }) | null; onDone: () => void }) {
  const { store } = useAppData();
  const [t, setT] = useState(initial?.t ?? THEMES[0].key);
  const [q, setQ] = useState(initial?.q ?? "");
  const [c, setC] = useState<Question["c"]>(initial ? [...initial.c] : ["", "", "", ""]);
  const [a, setA] = useState(initial?.a ?? 0);
  const [e, setE] = useState(initial?.e ?? "");
  const [errs, setErrs] = useState<string[]>([]);
  const original = initial?.builtin ? BUILTIN_QUESTIONS.find((x) => x.id === initial.id) : undefined;

  const save = () => {
    const body = { t, q: q.trim(), c: c.map((x) => x.trim()) as Question["c"], a, e: e.trim() };
    const v = validateQuestion(body, THEMES.map((x) => x.key));
    setErrs(v);
    if (v.length) return;
    const id = initial?.id ?? newQuestionId();
    const saved: QuestionOverride = { id, ...body };
    if (initial?.hidden) saved.hidden = true;
    if (!initial?.builtin) saved.custom = true;
    store.saveQuestion(saved);
    onDone();
  };

  return (
    <section className="card">
      <h2>{initial ? "問題を編集" : "問題を追加"}</h2>
      {original && <p className="small muted">内蔵の問題です。保存すると編集後の内容で出題し、一覧の「元に戻す」でいつでも戻せます。</p>}
      <div className="form">
        <label className="f">
          テーマ
          <select value={t} onChange={(ev) => setT(ev.target.value)}>
            {THEMES.map((x) => (
              <option key={x.key} value={x.key}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          問題文
          <textarea value={q} onChange={(ev) => setQ(ev.target.value)} rows={3} />
        </label>
        <fieldset className="form" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="small muted">選択肢（正解に印を付ける。出題時は並び順を毎回シャッフルします）</legend>
          {c.map((val, i) => (
            <div key={i} className="chrow">
              <input type="radio" name="answer" checked={a === i} onChange={() => setA(i)} aria-label={KEYS[i] + "を正解にする"} />
              <input
                type="text"
                value={val}
                placeholder={"選択肢" + KEYS[i]}
                aria-label={"選択肢" + KEYS[i]}
                onChange={(ev) => setC(c.map((x, j) => (j === i ? ev.target.value : x)) as Question["c"])}
              />
            </div>
          ))}
        </fieldset>
        <label className="f">
          解説
          <textarea value={e} onChange={(ev) => setE(ev.target.value)} rows={4} />
        </label>
        {errs.length > 0 && (
          <ul className="err" role="alert">
            {errs.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        )}
        <div className="row">
          <button className="btn primary" onClick={save}>
            保存
          </button>
          <button className="btn" onClick={onDone}>
            キャンセル
          </button>
        </div>
      </div>
    </section>
  );
}
