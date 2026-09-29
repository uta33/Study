import { initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

export interface FirebaseHandles {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

/* 設定がそろっていなければ null（localStorage モードで動く） */
function init(): FirebaseHandles | null {
  if (!config.apiKey || !config.projectId) return null;
  const app = initializeApp(config);
  const auth = getAuth(app);
  // オフラインでも読み書きでき、復帰時に自動で同期する。複数タブで開いても共有する
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  if (env.VITE_FIREBASE_EMULATOR === "1") {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    // 自動テスト用。エミュレータは署名なしのIDトークンを受け付けるので、ポップアップを使わずにログインできる
    (window as unknown as { __emulatorSignIn: (email: string) => Promise<unknown> }).__emulatorSignIn = (email) =>
      signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true })));
  }
  return { app, auth, db };
}

export const firebase = init();
