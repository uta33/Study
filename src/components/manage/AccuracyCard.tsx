import { THEMES } from "../../data";
import { themeAccuracy } from "../../lib/stats";
import { useAppData } from "../../store/context";

export default function AccuracyCard() {
  const { data, questions } = useAppData();
  const rows = themeAccuracy(THEMES, questions, data.quiz);
  return (
    <section className="card" aria-labelledby="ac-h">
      <h2 id="ac-h">テーマ別の正答率</h2>
      <div className="acc">
        {rows.map((r) => (
          <div key={r.key} className={"r" + (r.pct !== null && r.pct < 60 ? " low" : "")}>
            <span>{r.name}</span>
            <div className="bar">
              <i style={{ width: (r.pct ?? 0) + "%" }} />
            </div>
            <span className={"mono small" + (r.pct === null ? " muted" : "")} style={{ textAlign: "right" }}>
              {r.pct === null ? "未回答" : r.pct + "%"}
            </span>
          </div>
        ))}
      </div>
      <p className="note">学習タブの一問一答の結果から集計しています。60%未満はオレンジで表示します。</p>
    </section>
  );
}
