import { useState } from "react";
import { THEMES, themeName } from "../../data";
import { isMissed } from "../../lib/quiz";
import { useAppData } from "../../store/context";
import type { QuestionOverride } from "../../types";
import ConfirmButton from "../ConfirmButton";
import QuestionForm from "./QuestionForm";

type Editing = { kind: "none" } | { kind: "new" } | { kind: "edit"; q: QuestionOverride & { builtin: boolean } };

export default function QuestionsPanel() {
  const { data, store, allQuestions } = useAppData();
  const [theme, setTheme] = useState("all");
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<Editing>({ kind: "none" });

  const list = allQuestions.filter(
    (q) => (theme === "all" || q.t === theme) && (!text.trim() || (q.q + q.e + q.c.join("")).includes(text.trim())),
  );

  // 内蔵問題の非表示は、内容をそのまま写して hidden を付けた上書きとして保存する
  const toStored = ({ builtin: _b, ...q }: QuestionOverride & { builtin: boolean }): QuestionOverride => q;
  const setHidden = (q: QuestionOverride & { builtin: boolean }, hidden: boolean) => store.saveQuestion({ ...toStored(q), hidden });

  if (editing.kind !== "none") {
    return (
      <main className="panel" aria-label="問題">
        <QuestionForm initial={editing.kind === "edit" ? editing.q : null} onDone={() => setEditing({ kind: "none" })} />
      </main>
    );
  }

  return (
    <main className="panel" aria-label="問題">
      <section className="card">
        <div className="weekhead">
          <h2>問題の管理</h2>
          <button className="btn primary" onClick={() => setEditing({ kind: "new" })}>
            問題を追加
          </button>
        </div>
        <p className="small muted">
          内蔵の問題を編集した場合は、編集後の内容で出題します。非表示にした問題は一問一答と正答率の集計から外れます。
        </p>
        <div className="row" style={{ alignItems: "end" }}>
          <label className="f">
            テーマ
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="all">すべて</option>
              {THEMES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="f" style={{ flex: 1, minWidth: 160 }}>
            検索
            <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="問題文・選択肢・解説から探す" />
          </label>
        </div>
        <p className="note">{list.length}問</p>
        <ul className="qlist">
          {list.map((q) => {
            const st = data.quiz[q.id];
            const edited = q.builtin && data.questions.some((o) => o.id === q.id);
            return (
              <li key={q.id} className={q.hidden ? "hid" : ""}>
                <div>
                  <div className="qt">{q.q}</div>
                  <div className="meta">
                    <span className="tag">{themeName(q.t)}</span>
                    {q.custom && <span className="tag u">追加</span>}
                    {edited && !q.hidden && <span className="tag u">編集済み</span>}
                    {q.hidden && <span className="tag">非表示</span>}
                    {isMissed(st) && <span className="tag m">直近で不正解</span>}
                    {st && (
                      <span className="tag">
                        {st.c}正 {st.w}誤
                      </span>
                    )}
                  </div>
                </div>
                <div className="row" style={{ gap: 2, justifyContent: "end" }}>
                  <button className="x" onClick={() => setEditing({ kind: "edit", q })}>
                    編集
                  </button>
                  {q.builtin ? (
                    <>
                      <button className="x" onClick={() => setHidden(q, !q.hidden)}>
                        {q.hidden ? "表示する" : "非表示"}
                      </button>
                      {edited && !q.hidden && (
                        <ConfirmButton label="元に戻す" confirmLabel="本当に戻す" onConfirm={() => store.deleteQuestion(q.id)} />
                      )}
                    </>
                  ) : (
                    <ConfirmButton label="削除" confirmLabel="本当に削除" ariaLabel="この問題を削除" onConfirm={() => store.deleteQuestion(q.id)} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
