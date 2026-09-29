import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, type Auth } from "firebase/auth";
import { useState } from "react";

export default function Login({ auth }: { auth: Auth }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    setMsg("");
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-environment") {
        // ポップアップが使えない環境（ホーム画面から起動したPWAなど）はページ遷移で認証する
        await signInWithRedirect(auth, provider);
        return;
      }
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setMsg("ログインできませんでした（" + (code ?? "不明なエラー") + "）");
      }
      setBusy(false);
    }
  };

  return (
    <div className="center">
      <section className="card">
        <h1>支援士 学習ノート</h1>
        <p className="small muted">スマホとPCで同じ記録を使うため、Googleアカウントでログインします。</p>
        <button className="btn primary" onClick={signIn} disabled={busy}>
          Googleでログイン
        </button>
        {msg && <p className="note">{msg}</p>}
      </section>
    </div>
  );
}
