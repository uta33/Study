import { useState } from "react";
import { subj } from "../../data/subjects";
import { hm, md } from "../../lib/date";
import { sortLogs } from "../../lib/stats";
import { useAppData } from "../../store/context";
import ConfirmButton from "../ConfirmButton";

const PAGE = 40;

export default function LogList() {
  const { data, store } = useAppData();
  const [limit, setLimit] = useState(PAGE);
  const all = sortLogs(data.logs);
  const list = all.slice(0, limit);
  return (
    <section className="card" aria-labelledby="lg-h">
      <h2 id="lg-h">学習ログ</h2>
      <ul className="logs">
        {!list.length && (
          <li className="muted small" style={{ display: "block" }}>
            まだ記録がありません。タイマーか「追加」で最初の学習を記録しましょう。
          </li>
        )}
        {list.map((l) => {
          const sb = subj(l.subject);
          return (
            <li key={l.id}>
              <span className="mono small">{md(l.date)}</span>
              <span className="chip" style={{ ["--c" as string]: sb.c }} title={sb.n}>
                {hm(l.minutes)}
              </span>
              <span className="memo">
                {sb.n}
                {l.memo ? "　" + l.memo : ""}
              </span>
              <ConfirmButton label="削除" confirmLabel="本当に削除" ariaLabel={md(l.date) + "の記録を削除"} onConfirm={() => store.deleteLog(l.id)} />
            </li>
          );
        })}
      </ul>
      {all.length > limit && (
        <div className="row">
          <button className="btn" onClick={() => setLimit(limit + PAGE)}>
            さらに表示（残り{all.length - limit}件）
          </button>
        </div>
      )}
    </section>
  );
}
