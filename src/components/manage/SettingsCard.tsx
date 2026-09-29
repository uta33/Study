import { signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, EXAMS } from "../../data";
import { firebase } from "../../firebase";
import { isValidDate } from "../../lib/date";
import { useAppData } from "../../store/context";
import type { Settings } from "../../types";

type ExamKey = (typeof EXAMS)[number]["key"];

export default function SettingsCard({ user }: { user: User | null }) {
  const { data, store } = useAppData();
  const pick = (s: Settings) => Object.fromEntries(EXAMS.map((x) => [x.key, s[x.key]])) as Record<ExamKey, string>;
  const [dates, setDates] = useState(() => pick(data.settings));
  const [msg, setMsg] = useState("");
  useEffect(() => setDates(pick(data.settings)), [data.settings]);

  const save = () => {
    if (EXAMS.some((x) => !isValidDate(dates[x.key]))) return setMsg("日付を正しく入れてください。");
    store.saveSettings(dates);
    setMsg("試験日を保存しました。");
  };

  return (
    <section className="card" aria-labelledby="st-h">
      <h2 id="st-h">設定</h2>
      <p className="small muted">試験日は変わることがあります。IPAの発表に合わせて変更してください。</p>
      <div className="settings">
        {EXAMS.map((x) => (
          <label key={x.key} className="f">
            {x.label}
            <input type="date" value={dates[x.key]} onChange={(e) => setDates({ ...dates, [x.key]: e.target.value })} />
          </label>
        ))}
      </div>
      <div className="row">
        <button className="btn primary" onClick={save}>
          試験日を保存
        </button>
        <button className="btn" onClick={() => setDates(pick(DEFAULT_SETTINGS))}>
          初期値に戻す
        </button>
      </div>
      <p className="note" aria-live="polite">
        {msg}
      </p>
      {user && firebase && (
        <div className="row small muted" style={{ justifyContent: "space-between" }}>
          <span>{user.email} でログイン中</span>
          <button className="btn" onClick={() => signOut(firebase!.auth)}>
            ログアウト
          </button>
        </div>
      )}
    </section>
  );
}
