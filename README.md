# Study

情報処理安全確保支援士試験（SC）の合格に向けた、個人用の学習管理・一問一答アプリ「支援士 学習ノート」です。スマホとPCで同じデータを使えるPWAです。

## 構成

| パス | 内容 |
|---|---|
| `docs/setup-guide.md` | 使い始めるまでの本人の作業手順（Firebaseの設定、デプロイ、スマホへのインストール） |
| `docs/sc-study-app-spec.md` | 開発依頼書（目的、試験日程、学習計画、機能要件、データモデル） |
| `prototype/sc-study-app-prototype.html` | claude.aiで作った試作品 |
| `src/` | アプリ本体（Vite + React + TypeScript） |
| `src/data/questions.json` | 一問一答の内蔵問題（試作品から抽出した53問、すべてオリジナル） |
| `src/data/tasks.json` / `themes.json` | 計画タスク（t01〜t31）と出題テーマ |
| `firestore.rules` | Firestoreのセキュリティルール（自分のUIDの下だけ読み書き可） |
| `test/` | 単体テスト（Vitest） |

## 技術構成

- **画面**：Vite + React + TypeScript。`vite-plugin-pwa` でホーム画面に追加でき、オフラインでも開ける
- **データ同期**：Firebase Firestore。オフライン中の記録は端末に保存され、通信が戻ると自動で同期する
- **認証**：Googleログイン。データは `users/{uid}/` の下に置き、ルールで本人以外の読み書きを拒否する
- **ホスティング**：Firebase Hosting（無料のSparkプラン）。静的ファイルなのでVercelなどでも動く

Firebaseを設定しない場合は、このブラウザ内（localStorage）だけに保存するモードで動きます。

## 開発

```sh
npm install
npm run dev        # 開発サーバ（http://localhost:5173）
npm run typecheck  # 型チェック
npm test           # 単体テスト
npm run build      # dist/ に本番用ファイルを出力
```

## Firebaseの設定（初回のみ）

mainへの取り込みからスマホへのインストールまでの全手順は [docs/setup-guide.md](docs/setup-guide.md) にチェックリスト形式でまとめています。以下は要点です。

1. [Firebaseコンソール](https://console.firebase.google.com/)でプロジェクトを作る（Google アナリティクスは不要）
2. 「Authentication」→「ログイン方法」で **Google** を有効にする
3. 「Firestore Database」→「データベースを作成」（ロケーションは `asia-northeast1` 東京など）
4. 「プロジェクトの設定」→「マイアプリ」でウェブアプリを追加し、表示された値を `.env` に書く
   ```sh
   cp .env.example .env   # VITE_FIREBASE_API_KEY などを埋める
   ```
5. Firebase CLI でルールを反映してデプロイする
   ```sh
   npm install -g firebase-tools
   firebase login
   cp .firebaserc.example .firebaserc   # プロジェクトIDを書き換える
   npm run build
   firebase deploy --only hosting,firestore:rules
   ```
6. 表示されたURL（`https://<プロジェクトID>.web.app`）をスマホで開き、「ホーム画面に追加」する

Firebaseのウェブ用APIキーは公開される前提の値で、データの保護はセキュリティルールで行います。

### エミュレータで試す

```sh
firebase emulators:start --only auth,firestore --project demo-sc
# 別のターミナルで .env に VITE_FIREBASE_PROJECT_ID=demo-sc と VITE_FIREBASE_EMULATOR=1 を設定して
npm run dev
```

## データの構造（Firestore）

```
users/{uid}/logs/{id}        { date: "YYYY-MM-DD", minutes, subject: "A1"|"A2"|"B"|"IN"|"QZ", memo, createdAt }
users/{uid}/meta/checks      { t01: true, ... }
users/{uid}/meta/quizStats   { [questionId]: { c: 正解数, w: 不正解数, last: 最終回答のUnix ms, lastOk: 最後が正解か } }
users/{uid}/meta/settings    { goal: 分/週, examA, examB, exam2A, exam2B }
users/{uid}/questions/{id}   追加・編集した問題 { t, q, c: [4つ], a, e, hidden?, custom? }
```

一問一答の成績は加算で書き込むため、スマホとPCで同時に回答しても上書きされません。

## 問題とテーマの追加

- 画面の「問題」タブから、問題の追加・編集・非表示ができます（Firestoreに保存）
- 内蔵問題を増やす場合は `src/data/questions.json` に `{ id, t, q, c, a, e }` の形で追記します
- テーマを増やす場合は `src/data/themes.json` に `{ key, name }` を追記します（2027年度の新試験制度への対応を想定）

IPAの過去問題は利用条件を確認するまで取り込みません。2026年度以降の非公開の試験問題を記録する機能は作りません。

## 今後（依頼書5.3の残り）

- 通勤用の音声モード（Web Speech API）
- 用語カード
- 科目Bの演習記録
- データのエクスポート（JSON/CSV）
