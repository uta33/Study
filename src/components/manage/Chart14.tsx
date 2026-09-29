import { useState } from "react";
import { SUBJECTS } from "../../data/subjects";
import { hm, md, today } from "../../lib/date";
import { dailyTotals } from "../../lib/stats";
import { useAppData } from "../../store/context";

/* 直近14日の日別・科目別の積み上げ棒。棒をタップ（ホバー）すると内訳を表示する */
export default function Chart14() {
  const { data } = useAppData();
  const days = dailyTotals(data.logs, 14);
  const t = today();
  const [sel, setSel] = useState<string | null>(null);
  const max = Math.max(120, Math.ceil(Math.max(...days.map((d) => d.total)) / 60) * 60);
  const W = 640,
    H = 200,
    L = 36,
    R = 8,
    T = 10,
    B = 28;
  const cw = (W - L - R) / 14,
    bw = cw * 0.6;
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const grid: number[] = [];
  for (let g = 0; g <= max; g += 60) if (!(max > 360 && g % 120)) grid.push(g);
  const shown = days.find((d) => d.date === (sel ?? t))!;

  return (
    <section className="card" aria-labelledby="ch-h">
      <h2 id="ch-h">直近14日</h2>
      <p className="small muted" aria-live="polite" style={{ minHeight: "1.7em" }}>
        <b className="mono">{md(shown.date)}</b>
        {"　合計 "}
        <span className="mono">{hm(shown.total)}</span>
        {SUBJECTS.filter((s) => shown.bySubject[s.k]).map((s) => (
          <span key={s.k}>
            {"　" + s.n + " "}
            <span className="mono">{hm(shown.bySubject[s.k]!)}</span>
          </span>
        ))}
      </p>
      <div className="chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="直近14日の学習時間">
          {grid.map((g) => (
            <g key={g}>
              <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="var(--line)" strokeWidth={1} />
              <text x={L - 6} y={y(g) + 4} textAnchor="end" fontSize={11} fill="var(--muted)" fontFamily="JetBrains Mono,monospace">
                {g / 60}h
              </text>
            </g>
          ))}
          {days.map((d, i) => {
            const x = L + cw * i + (cw - bw) / 2;
            const isT = d.date === t;
            const isSel = d.date === (sel ?? t);
            let acc = 0;
            return (
              <g key={d.date}>
                {isSel && d.total > 0 && (
                  <rect x={L + cw * i + 1} y={T} width={cw - 2} height={H - T - B} fill="var(--sunk)" rx={4} />
                )}
                {SUBJECTS.map((s) => {
                  const v = d.bySubject[s.k];
                  if (!v) return null;
                  const y1 = y(acc + v),
                    y0 = y(acc);
                  acc += v;
                  // 積み上げの境目に背景色の線を入れ、隣り合う色を見分けやすくする
                  return (
                    <rect key={s.k} x={x} y={y1} width={bw} height={Math.max(0, y0 - y1)} fill={s.c} stroke="var(--surface)" strokeWidth={1}>
                      <title>{md(d.date) + " " + s.n + " " + hm(v)}</title>
                    </rect>
                  );
                })}
                <text
                  x={x + bw / 2}
                  y={H - 10}
                  textAnchor="middle"
                  fontSize={10.5}
                  fill={isT ? "var(--accent)" : "var(--muted)"}
                  fontWeight={isT ? 700 : 400}
                  fontFamily="JetBrains Mono,monospace"
                >
                  {md(d.date)}
                </text>
                {/* 当たり判定は棒より広く取る */}
                <rect
                  x={L + cw * i}
                  y={0}
                  width={cw}
                  height={H}
                  fill="transparent"
                  onMouseEnter={() => setSel(d.date)}
                  onMouseLeave={() => setSel(null)}
                  onClick={() => setSel(d.date)}
                />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="legend">
        {SUBJECTS.map((s) => (
          <span key={s.k} style={{ ["--c" as string]: s.c }}>
            {s.n}
          </span>
        ))}
      </div>
    </section>
  );
}
