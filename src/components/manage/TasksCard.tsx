import { useEffect, useState } from "react";
import { TASKS } from "../../data";
import { md } from "../../lib/date";
import { currentTaskGroup } from "../../lib/stats";
import { useAppData } from "../../store/context";

export default function TasksCard() {
  const { data, store } = useAppData();
  const cur = currentTaskGroup(TASKS);
  // 保存結果が届くまでのわずかな間もチェックが戻らないよう、押した値を先に表示する
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  useEffect(() => setOptimistic({}), [data.checks]);
  const checked = (id: string) => optimistic[id] ?? !!data.checks[id];
  return (
    <section className="card" aria-labelledby="tk-h">
      <h2 id="tk-h">計画のタスク</h2>
      <div>
        {TASKS.map((g, i) => {
          const done = g.items.filter((it) => checked(it.id)).length;
          return (
            <details key={g.week} className="wk" open={i === cur}>
              <summary>
                <span>
                  {g.week}
                  {i === cur && <span className="cur">今</span>}
                </span>
                <span className="mono">
                  {md(g.from)}〜{md(g.to)}　{done}/{g.items.length}
                </span>
              </summary>
              <ul className="tasks">
                {g.items.map((it) => (
                  <li key={it.id}>
                    <input
                      type="checkbox"
                      id={"ck-" + it.id}
                      checked={checked(it.id)}
                      onChange={(e) => {
                        setOptimistic({ ...optimistic, [it.id]: e.target.checked });
                        store.setCheck(it.id, e.target.checked);
                      }}
                    />
                    <label htmlFor={"ck-" + it.id}>{it.text}</label>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </section>
  );
}
