import { useRef, useState } from "react";
import { BUILTIN_QUESTIONS, THEMES, themeName } from "../../data";
import { exportQuestions, MAX_IMPORT_BYTES, parseQuestionFile, planQuestionImport, QUESTION_EXAMPLE, type ImportPlan, type QuestionFileFormat } from "../../lib/questionTransfer";
import { useAppData } from "../../store/context";
import type { QuestionOverride } from "../../types";

const builtinIds = new Set(BUILTIN_QUESTIONS.map((q) => q.id));

/** 日本語をUTF-8でダウンロードする。URLはクリック処理の後に解放する。 */
function download(text: string, name: string, format: QuestionFileFormat) {
  const url = URL.createObjectURL(new Blob([text], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 問題の入出力。ファイル選択だけでは保存せず、確認操作後に一括で書き込む。 */
export default function QuestionTransfer({ filtered }: { filtered: QuestionOverride[] }) {
  const { allQuestions, data, store } = useAppData();
  const [scope, setScope] = useState("all");
  const [incoming, setIncoming] = useState<QuestionOverride[] | null>(null);
  const [source, setSource] = useState("");
  const [replace, setReplace] = useState(false);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [savingPlan, setSavingPlan] = useState<ImportPlan | null>(null);
  // 連続で別ファイルを選んだとき、古い読み込み結果で確認画面を上書きしない。
  const readVersion = useRef(0);
  // Firestoreの保存途中の通知で、確認済みの件数が変わらないように固定する。
  const plan = savingPlan ?? (incoming ? planQuestionImport(incoming, allQuestions, builtinIds, replace) : null);
  const output = scope === "filtered" ? filtered : allQuestions;

  const exportFile = (format: QuestionFileFormat, template = false) => {
    try {
      download(exportQuestions(template ? [QUESTION_EXAMPLE] : output, format, THEMES),
        template ? `問題追加テンプレート.${format}` : `学習問題_${new Date().toISOString().slice(0, 10)}.${format}`, format);
      setError("");
    } catch { setError("ファイルを作成できませんでした。もう一度お試しください。"); }
  };

  const readFile = async (file: File) => {
    const version = ++readVersion.current;
    setIncoming(null); setError(""); setMessage(""); setReading(true); setReplace(false);
    try {
      if (!/\.(json|csv)$/i.test(file.name)) throw new Error("JSONまたはCSVファイルを選択してください。");
      if (file.size > MAX_IMPORT_BYTES) throw new Error("ファイルは5MB以内にしてください。");
      const bytes = await file.arrayBuffer();
      let text: string;
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
      catch { throw new Error("文字コードを読み込めません。Excelでは「CSV UTF-8」で保存してください。"); }
      const questions = parseQuestionFile(text, /\.csv$/i.test(file.name) ? "csv" : "json", THEMES);
      if (version === readVersion.current) { setIncoming(questions); setSource(file.name); }
    } catch (e) { if (version === readVersion.current) setError((e as Error).message); }
    finally { if (version === readVersion.current) setReading(false); }
  };

  const readPasted = () => {
    readVersion.current++; setReading(false); setIncoming(null); setError(""); setMessage(""); setReplace(false);
    try { setIncoming(parseQuestionFile(pasted, "json", THEMES)); setSource("貼り付けたJSON"); }
    catch (e) { setError((e as Error).message); }
  };

  const importFile = async () => {
    if (!plan?.questions.length || busy) return;
    setBusy(true); setSavingPlan(plan); setProgress(0); setError(""); setMessage("");
    const count = plan.questions.length;
    try {
      await store.importQuestions(plan.questions, setProgress);
      setMessage(`${count}問を保存しました（追加${plan.added}問・更新${plan.updated}問）。`);
      setIncoming(null); setPasted("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); setSavingPlan(null); }
  };

  return (
    <section className="card transfer" aria-label="問題のエクスポートとインポート">
      <h2>問題のエクスポート・インポート</h2>
      <p className="small muted">問題をまとめて追加したり、別の端末・アカウントに渡せます。学習履歴は含みません。</p>
      <fieldset disabled={busy || !data.ready}>
        <legend>エクスポート</legend>
        <div className="row">
          <label className="f">対象
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="all">すべての問題（{allQuestions.length}問）</option>
              <option value="filtered">検索・テーマで絞り込んだ問題（{filtered.length}問）</option>
            </select>
          </label>
          <button className="btn" disabled={!output.length} onClick={() => exportFile("json")}>JSONを書き出す</button>
          <button className="btn" disabled={!output.length} onClick={() => exportFile("csv")}>CSVを書き出す</button>
        </div>
        <p className="note">内蔵・追加・編集済み・非表示の問題を含みます。CSVは日本語対応のUTF-8形式です。</p>
      </fieldset>
      <fieldset disabled={busy || !data.ready}>
        <legend>インポート</legend>
        <div className="row">
          <button className="btn" onClick={() => exportFile("json", true)}>JSONテンプレート</button>
          <button className="btn" onClick={() => exportFile("csv", true)}>CSVテンプレート</button>
        </div>
        <label className="f">JSON / CSVファイルを選択（5MB・5,000問まで）
          <input type="file" accept=".json,.csv,application/json,text/csv" onChange={(e) => {
            const file = e.target.files?.[0]; e.target.value = ""; if (file) void readFile(file);
          }} />
        </label>
        <details className="form"><summary>JSONを直接貼り付ける</summary>
          <label className="f">問題のJSON<textarea rows={5} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="テンプレートと同じ形式のJSONを貼り付け" /></label>
          <button className="btn" disabled={!pasted.trim()} onClick={readPasted}>貼り付けた内容を確認</button>
        </details>
        <p className="note">CSVの正解はア〜エ（または1〜4）、JSONのaは0〜3。新規問題のIDは空欄にできます。Excelでは「CSV UTF-8」で保存してください。</p>
      </fieldset>
      {reading && <p role="status">ファイルを確認しています…</p>}
      {plan && <div className="form transfer-preview">
        <h3>取り込み内容を確認</h3>
        <p className="small">{source}：{incoming!.length}問</p>
        <label className="row small"><input type="checkbox" checked={replace} disabled={busy} onChange={(e) => setReplace(e.target.checked)} />同じIDの問題を更新する（内蔵問題も対象）</label>
        {replace && <p className="note">更新する問題の内容・正解・非表示設定を置き換えます。これまでの正答率・回答履歴は引き継ぎます。</p>}
        <p className="banner info">追加 {plan.added}問 ／ 更新 {plan.updated}問 ／ スキップ {plan.skipped}問</p>
        <p className="note">同じ内容の新規問題や、更新しない同じIDの問題はスキップします。ファイルにない既存問題は削除しません。</p>
        <ul className="transfer-list">{plan.questions.slice(0, 5).map((q) => <li key={q.id}><span className="tag">{themeName(q.t)}</span> {q.q}</li>)}</ul>
        {plan.questions.length > 5 && <p className="note">ほか{plan.questions.length - 5}問</p>}
        {!plan.questions.length && <p className="note">追加・更新する問題はありません。</p>}
        <div className="row">
          <button className="btn primary" disabled={busy || !data.ready || !plan.questions.length} onClick={() => void importFile()}>確認して取り込む</button>
          <button className="btn" disabled={busy} onClick={() => setIncoming(null)}>キャンセル</button>
        </div>
      </div>}
      {busy && <p className="banner info" role="status">保存中… {progress}問完了。通信が切れている場合は復帰後に続行します。この画面でお待ちください。</p>}
      {error && <p className="err transfer-error" role="alert">{error}</p>}
      {message && <p className="banner info" role="status">{message}</p>}
      <details className="small"><summary>使えるテーマ一覧</summary><p>{THEMES.map((t) => `${t.name}（${t.key}）`).join(" / ")}</p></details>
    </section>
  );
}
