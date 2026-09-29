import { useEffect, useState } from "react";
import { useAppData } from "../../store/context";

/* 週の目標（分）。確定したときだけ保存する */
export default function GoalInput() {
  const { data, store } = useAppData();
  const [v, setV] = useState(String(data.settings.goal));
  useEffect(() => setV(String(data.settings.goal)), [data.settings.goal]);
  const commit = () => {
    const n = parseInt(v, 10);
    if (n >= 60 && n <= 6000 && n !== data.settings.goal) store.saveSettings({ goal: n });
    else setV(String(data.settings.goal));
  };
  return (
    <input
      type="number"
      min={60}
      max={6000}
      step={30}
      aria-label="週の目標（分）"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}
