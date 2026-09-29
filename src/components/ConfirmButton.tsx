import { useEffect, useRef, useState } from "react";

/* 1回目で「本当に〜」に変わり、3秒以内にもう一度押すと実行する2段階確認のボタン */
export default function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  className = "x",
  ariaLabel,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      className={className}
      aria-label={armed ? undefined : ariaLabel}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          timer.current = setTimeout(() => setArmed(false), 3000);
          return;
        }
        clearTimeout(timer.current);
        setArmed(false);
        onConfirm();
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
