# 使い始めるまでの作業手順

アプリの本体はできています。ここに書いてあるのは、**本人のアカウントでしか操作できない作業**です。上から順に進めてください。全部で1〜2時間ほどです。

| 記号 | 操作する場所 |
|---|---|
| 🌐 GitHub | ブラウザで https://github.com/uta33/Study を開いて操作 |
| 🔥 Firebase | ブラウザで https://console.firebase.google.com/ を開いて操作 |
| 💻 PC | PCのターミナル（PowerShell、ターミナル.appなど） |
| 📱 スマホ | スマホのブラウザ |

---

## 0. 準備するもの（5分）

- [ ] Googleアカウント（アプリのログインとFirebaseの両方で使う）
- [ ] PCに Node.js 22 以上が入っている（💻 `node -v` で確認。入っていなければ https://nodejs.org/ から LTS 版を入れる）
- [ ] PCに git が入っている（💻 `git --version` で確認）
- [ ] スマホ（iPhoneならSafari、AndroidならChrome）

## 1. 作業ブランチを main に取り込む（10分）🌐

Claudeの作業は `claude/github-based-development-3v4e4z` ブランチにあります。

- [ ] リポジトリのページに出る「Compare & pull request」を押す（出ていなければ「Pull requests」→「New pull request」で、base を `main`、compare を上のブランチにする）
- [ ] 「Create pull request」→ 内容を確認して「Merge pull request」

Claudeに「PRを作って」と頼めば、PRの作成までは任せられます。マージは本人が行ってください。

**完了の目安**：main ブランチに `src/` フォルダが見える。

## 2. CIの設定ファイルを追加する（5分）🌐

プッシュのたびに型チェック・テスト・ビルドを自動で走らせる設定です。ClaudeのGitHub連携には `.github/workflows/` を書き込む権限がなく、プッシュが拒否されたため、本人の操作で追加します。

- [ ] main ブランチで「Add file」→「Create new file」
- [ ] ファイル名に `.github/workflows/ci.yml` と入力（`/` を打つとフォルダになる）
- [ ] 下の内容をそのまま貼り付けて「Commit changes」

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

**完了の目安**：「Actions」タブで CI が緑のチェックになる。

## 3. PCで動かしてみる（10分）💻

Firebaseの設定前でも、ブラウザ内に保存するモードで一通り動きます。

```sh
git clone https://github.com/uta33/Study.git
cd Study
npm install
npm run dev
```

- [ ] 表示された http://localhost:5173 をブラウザで開く
- [ ] 上部に「Firebaseが未設定のため、このブラウザ内にだけ保存しています」と出る
- [ ] 学習時間を1件追加し、一問一答を5問解いてみる

確認できたら `Ctrl + C` で止めます。ここで入れた記録はこのブラウザ内だけのもので、Firebaseには引き継がれません。

## 4. Firebaseプロジェクトを作る（20分）🔥

スマホとPCで同じデータを使うための保存先です。無料の Spark プランで足ります。

### 4-1. プロジェクトの作成

- [ ] 「プロジェクトを作成」→ 名前を入力（例：`sc-study`）。ここで決まる**プロジェクトID**（例：`sc-study-1a2b3`）を控える
- [ ] Google アナリティクスは「無効」でよい

### 4-2. Googleログインを有効にする

- [ ] 左メニュー「構築」→「Authentication」→「始める」
- [ ] 「ログイン方法」タブ →「Google」→「有効にする」をオン → サポートメールに自分のアドレスを選んで「保存」

### 4-3. データベースを作る

- [ ] 左メニュー「構築」→「Firestore Database」→「データベースを作成」
- [ ] ロケーションは `asia-northeast1`（東京）。**後から変えられません**
- [ ] 「本番環境モードで開始」を選ぶ（読み書きのルールは手順5でアプリ側のものを反映します）

### 4-4. ウェブアプリを登録して設定値を控える

- [ ] 左上の歯車 →「プロジェクトの設定」→「マイアプリ」の `</>`（ウェブ）を押す
- [ ] アプリのニックネームを入力（例：`web`）。「Firebase Hosting も設定する」のチェックは不要 →「アプリを登録」
- [ ] 表示された `firebaseConfig` の値を、PCの `Study` フォルダで `.env` に写す

```sh
cp .env.example .env    # Windows の PowerShell なら copy .env.example .env
```

| `firebaseConfig` の項目 | `.env` に書く変数 |
|---|---|
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` |

`VITE_FIREBASE_EMULATOR` は空のままにします。`.env` は git に含まれない設定になっています。

**完了の目安**：`npm run dev` で開くと「Googleでログイン」の画面が出て、ログインすると空の管理画面になる。

## 5. インターネットに公開する（15分）💻

```sh
npm install -g firebase-tools
firebase login                       # ブラウザが開くのでGoogleアカウントで許可
cp .firebaserc.example .firebaserc   # 中の your-firebase-project-id を 4-1 のプロジェクトIDに書き換える
npm run build
firebase deploy --only hosting,firestore:rules
```

- [ ] 最後に表示される `Hosting URL`（`https://<プロジェクトID>.web.app`）を控える
- [ ] PCでそのURLを開き、ログインできる

`firestore:rules` を付けるのを忘れないでください。付けないと、本番環境モードの初期ルールのままで保存が拒否されます。

## 6. スマホに入れる（5分）📱

- [ ] 手順5のURLをスマホで開き、Googleでログインする
- [ ] ホーム画面に追加する
  - iPhone：Safariの共有ボタン →「ホーム画面に追加」
  - Android：Chromeの右上メニュー →「アプリをインストール」（または「ホーム画面に追加」）
- [ ] ホーム画面のアイコンから開く。iPhoneでは、ここでもう一度ログインを求められることがあります

ホーム画面から開いてログインできない場合は、表示されたメッセージ（`auth/…` のような文字列）をClaudeに伝えてください。対処を実装します。

## 7. 動作確認（10分）

- [ ] PCで学習時間を記録する → 数秒でスマホの「学習ログ」に出る
- [ ] スマホで一問一答を5問解く → PCの「テーマ別の正答率」に反映される
- [ ] スマホを機内モードにして記録する → 右上が「オフライン（復帰後に同期）」になる → 機内モードを切ると「保存済み」に戻り、PCにも出る
- [ ] 管理タブ最下部の「設定」で試験日を変える → 残り日数が変わる（IPAの発表で日程が変わったときはここで直す）

## 8. アプリを更新するとき 💻

Claudeが新しい機能をプッシュし、main に取り込んだあとに行います。

```sh
git pull
npm install
npm run build
firebase deploy --only hosting
```

`firestore.rules` が変わったときだけ `--only hosting,firestore:rules` にします。スマホのアプリは、次に開いたときに自動で新しい版に入れ替わります（反映されなければ一度閉じて開き直す）。

## 9. 決めてほしいこと（Claudeへの返答用）

- [ ] **科目の色**：「科目B」（オレンジ）と「インプット」（黄土色）が近く、グラフで見分けにくい。インプットの色を変えるか、試作品のままにするか
- [ ] **次に作る機能の順番**：依頼書5.3の残り
  1. 通勤用の音声モード（問題と解説の読み上げ）
  2. 用語カード
  3. 科目Bの演習記録（年度、問番号、得点、所要時間、振り返り）
  4. データのエクスポート（JSON/CSV）
- [ ] **ログインできる人を絞るか**（任意）：今は誰のGoogleアカウントでもログインできますが、見えるのはそのアカウント自身のデータだけです。自分のメールアドレス以外をルールで拒否することもできます

## 10. 困ったとき

| 症状 | 対処 |
|---|---|
| ログイン時に `auth/unauthorized-domain` | 🔥 Authentication →「設定」→「承認済みドメイン」に、開いているURLのドメインを追加（`localhost` と `<プロジェクトID>.web.app` は最初から入っている） |
| 右上が「保存が拒否されました」 | 手順5で `firestore:rules` をデプロイしたか確認。ログアウトしてログインし直す |
| 右上がずっと「同期待ち」 | 通信を確認。オフライン中の記録は端末に残っていて、つながれば自動で送られる |
| 更新したのに画面が古い | アプリを閉じて開き直す。PCはブラウザで再読み込み |
| `npm run build` が失敗する | `node -v` が22以上か確認し、`npm install` をやり直す |

## 参考

- **無料枠の目安**：Firestoreは1日あたり読み取り5万回・書き込み2万回、保存1GiBまで。1人で使う範囲なら届きません
- **APIキーについて**：`.env` の `VITE_FIREBASE_API_KEY` は、公開される前提の値です（アプリのJavaScriptに含まれます）。データはセキュリティルール（`firestore.rules`）で本人以外の読み書きを拒否して守っています
- 開発の詳しい情報は [README](../README.md)、要件は [開発依頼書](sc-study-app-spec.md) にあります
