import { SUBJECTS } from "../../data/subjects";
import { hm, md } from "../../lib/date";
import { weekSummary } from "../../lib/stats";
import { useAppData } from "../../store/context";
import GoalInput from "./GoalInput";

export default function WeekCard() {
  const { data } = useAppData();
  const w = weekSummary(data.logs);
  const goal = data.settings.goal || 600;
  const scale = Math.max(goal, w.total);
  return (
    <section className="card" aria-labelledby="wk-h">
      <div className="weekhead">
        <h2 id="wk-h">今週の学習時間</h2>
        <span className="small muted">
          目標 <GoalInput /> 分
        </span>
      </div>
      <div className="row" style={{ alignItems: "baseline", gap: 6 }}>
        <span className="big">{hm(w.total)}</span>
        <span className="muted small">
          ／ {hm(goal)}（{Math.round((w.total / goal) * 100)}%）　{md(w.from)}〜{md(w.to)}
        </span>
      </div>
      <div className="meter">
        {SUBJECTS.map((s) =>
          w.bySubject[s.k] ? (
            <i key={s.k} style={{ width: (w.bySubject[s.k]! / scale) * 100 + "%", background: s.c }} title={s.n + " " + hm(w.bySubject[s.k]!)} />
          ) : null,
        )}
      </div>
      <div className="legend">
        {SUBJECTS.map((s) => (
          <span key={s.k} style={{ ["--c" as string]: s.c }}>
            {s.n} {hm(w.bySubject[s.k] ?? 0)}
          </span>
        ))}
      </div>
    </section>
  );
}
