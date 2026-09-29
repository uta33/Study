#!/usr/bin/env bash
# 学習アプリを作成済みのFirebaseプロジェクトに公開する。
# 実行例: bash scripts/deploy-sc-study.sh
# 検証だけ行う例: bash scripts/deploy-sc-study.sh --check-only
# Cloud Shellでは事前認証済みの環境を使用する。
# ローカルPCでは事前に npx firebase-tools@15.32.0 login を実行する。
set -euo pipefail

STUDY_SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd -- "$STUDY_SCRIPT_DIR/.."

if [[ $# -gt 1 || (${1:-} != "" && ${1:-} != "--check-only") ]]; then
  printf '%s\n' '使い方: bash scripts/deploy-sc-study.sh [--check-only]' >&2
  exit 2
fi

node -e 'if(Number(process.versions.node.split(".")[0]) < 22) { console.error("Node.js 22以上が必要です"); process.exit(1); }'

# ウェブアプリに含まれる公開設定。管理者の秘密鍵や認証トークンは保存しない。
export VITE_FIREBASE_API_KEY='AIzaSyAylji39xa-yhRe0CmFxCUz1dnUi0WHp5U'
export VITE_FIREBASE_AUTH_DOMAIN='sc-study-f11ab.firebaseapp.com'
export VITE_FIREBASE_PROJECT_ID='sc-study-f11ab'
export VITE_FIREBASE_APP_ID='1:81751482975:web:7d6647ed5273aa6ef071ea'
export VITE_FIREBASE_EMULATOR=''

npm ci
npm run typecheck
npm test
npm run build

if [[ ${1:-} == "--check-only" ]]; then
  printf '%s\n' '検証とビルドが完了しました。公開は行っていません。'
  exit 0
fi

# プロジェクトを明示し、Hostingと本人限定のルールだけを反映する。
# 実行に失敗した場合はset -eで停止し、完了と表示しない。
npx --yes firebase-tools@15.32.0 deploy \
  --project sc-study-f11ab \
  --only hosting,firestore:rules \
  --non-interactive

printf '%s\n' '公開が完了しました。上に表示されたHosting URLを開いてください。'
