import { useEffect, useState } from "react";
import { SUBJECTS } from "../../data/subjects";
import { hm, md, pad, today, ymd } from "../../lib/date";
import { useAppData } from "../../store/context";
import type { SubjectKey } from "../../types";

/* タイマーの開始時刻はこの端末に保存する（リロードしても計測を続けるため） */
const TK = "sc-timer";
interface TimerState {
  start: number;
  subject: SubjectKey;
}
function tGet(): TimerState | null {
  try {
    return JSON.parse(localStorage.getItem(TK) || "null");
  } catch {
    return null;
  }
}
function tSet(v: TimerState | null) {
  try {
    if (v) localStorage.setItem(TK, JSON.stringify(v));
    else localStorage.removeItem(TK);
  } catch {
    /* 保存できなくても計測は続ける */
  }
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return Math.floor(s / 3600) + ":" + pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60);
}

export default function RecordCard() {
  const { store } = useAppData();
  const [timer, setTimer] = useState<TimerState | null>(tGet);
  const [tSubject, setTSubject] = useState<SubjectKey>(timer?.subject ?? "A1");
  const [now, setNow] = useState(Date.now());
  const [date, setDate] = useState(today());
  const [subject, setSubject] = useState<SubjectKey>("A1");
  const [min, setMin] = useState("60");
  const [memo, setMemo] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer]);

  // 別のタブで開始・終了した場合も合わせる
  useEffect(() => {
    const onStorage = (e: StorageEvent) => e.key === TK && setTimer(tGet());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleTimer = () => {
    if (!timer) {
      const t = { start: Date.now(), subject: tSubject };
      tSet(t);
      setTimer(t);
      setNow(t.start);
      setMsg("");
      return;
    }
    const m = Math.round((Date.now() - timer.start) / 60000);
    if (m >= 1) {
      const minutes = Math.min(m, 600);
      store.addLog({ date: ymd(new Date(timer.start)), minutes, subject: timer.subject, memo: "タイマー" });
      setMsg(hm(minutes) + "を記録しました。" + (m > 600 ? "（上限の600分で記録）" : ""));
    } else setMsg("1分未満のため記録しませんでした。");
    tSet(null);
    setTimer(null);
  };

  const add = () => {
    const m = parseInt(min, 10);
    if (!date) return setMsg("日付を入れてください。");
    if (!(m >= 1 && m <= 600)) return setMsg("分は1〜600の範囲で入れてください。");
    store.addLog({ date, minutes: m, subject, memo: memo.trim().slice(0, 120) });
    setMemo("");
    setMsg(md(date) + "に" + hm(m) + "を記録しました。");
  };

  return (
    <section className="card" aria-labelledby="rec-h">
      <h2 id="rec-h">記録する</h2>
      <div className="timer">
        <select
          aria-label="タイマーの科目"
          value={timer ? timer.subject : tSubject}
          disabled={!!timer}
          onChange={(e) => setTSubject(e.target.value as SubjectKey)}
        >
          {SUBJECTS.filter((s) => s.k !== "QZ").map((s) => (
            <option key={s.k} value={s.k}>
              {s.n}
            </option>
          ))}
        </select>
        <span className="clock">{timer ? clock(now - timer.start) : "0:00:00"}</span>
        <button className={"btn " + (timer ? "warn" : "primary")} onClick={toggleTimer}>
          {timer ? "終了して記録" : "タイマー開始"}
        </button>
      </div>
      <div className="row" style={{ alignItems: "end" }}>
        <label className="f">
          日付
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="f">
          科目
          <select value={subject} onChange={(e) => setSubject(e.target.value as SubjectKey)}>
            {SUBJECTS.map((s) => (
              <option key={s.k} value={s.k}>
                {s.n}
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          分
          <input type="number" min={1} max={600} value={min} onChange={(e) => setMin(e.target.value)} />
        </label>
        <label className="f" style={{ flex: 1, minWidth: 160 }}>
          メモ
          <input type="text" maxLength={120} placeholder="例：午前Ⅱ R6 20問 16/20" value={memo} onChange={(e) => setMemo(e.target.value)} />
        </label>
        <button className="btn primary" onClick={add}>
          追加
        </button>
      </div>
      <p className="note" aria-live="polite">
        {msg}
      </p>
    </section>
  );
}
