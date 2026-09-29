import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import Header, { type Tab } from "./components/Header";
import Login from "./components/Login";
import ManagePanel from "./components/manage/ManagePanel";
import QuestionsPanel from "./components/questions/QuestionsPanel";
import StudyPanel from "./components/study/StudyPanel";
import { firebase } from "./firebase";
import { AppDataProvider, useAppData } from "./store/context";
import { FirestoreStore } from "./store/firestore";
import { LocalStore } from "./store/local";

function initialTab(): Tab {
  const h = location.hash.slice(1);
  return h === "study" || h === "questions" ? h : "manage";
}

function Main({ user }: { user: User | null }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const { store } = useAppData();
  const change = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", t === "manage" ? location.pathname : "#" + t);
  };
  return (
    <div className="wrap">
      <Header tab={tab} onTab={change} />
      {store.kind === "local" && (
        <div className="banner">Firebaseが未設定のため、このブラウザ内にだけ保存しています。スマホとPCで共有するには README の手順で設定してください。</div>
      )}
      {/* 学習の途中でタブを切り替えても状態が消えないよう、非表示にするだけにする */}
      <div hidden={tab !== "manage"}>
        <ManagePanel user={user} />
      </div>
      <div hidden={tab !== "study"}>
        <StudyPanel />
      </div>
      <div hidden={tab !== "questions"}>
        <QuestionsPanel />
      </div>
    </div>
  );
}

function FirebaseApp() {
  const fb = firebase!;
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(fb.auth, setUser), [fb]);
  const store = useMemo(() => (user ? new FirestoreStore(fb.db, user.uid) : null), [fb, user]);

  if (user === undefined) return <div className="center muted">読み込み中…</div>;
  if (!user || !store) return <Login auth={fb.auth} />;
  return (
    <AppDataProvider key={user.uid} store={store}>
      <Main user={user} />
    </AppDataProvider>
  );
}

export default function App() {
  const local = useMemo(() => (firebase ? null : new LocalStore()), []);
  if (local) {
    return (
      <AppDataProvider store={local}>
        <Main user={null} />
      </AppDataProvider>
    );
  }
  return <FirebaseApp />;
}
