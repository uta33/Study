import { useState } from "react";
import type { Question } from "../../types";
import QuizResult from "./QuizResult";
import QuizRun, { type RunResult } from "./QuizRun";
import QuizSetup from "./QuizSetup";

type View = { kind: "setup" } | { kind: "run"; list: Question[]; key: number } | { kind: "result"; result: RunResult };

export default function StudyPanel() {
  const [view, setView] = useState<View>({ kind: "setup" });
  const start = (list: Question[]) => setView({ kind: "run", list, key: Date.now() });
  return (
    <main className="panel" aria-label="学習">
      {view.kind === "setup" && <QuizSetup onStart={start} />}
      {view.kind === "run" && (
        <QuizRun key={view.key} list={view.list} onFinish={(result) => setView({ kind: "result", result })} onQuit={() => setView({ kind: "setup" })} />
      )}
      {view.kind === "result" && <QuizResult result={view.result} onRetry={start} onBack={() => setView({ kind: "setup" })} />}
    </main>
  );
}
