# Shindan OS

Shindan OSは、中小企業診断士一次試験7科目を、復習スケジュールと弱点管理で回すスマホファーストの学習OSです。バックエンドやアカウント登録は不要で、回答履歴・復習予定・レビュー証跡はブラウザの`localStorage`へ保存されます。

## 主な機能

- 7科目・143問の問題演習と科目別Core
- 4択、一問一答、計算、比較問題
- 正解／ほぼ正解／不正解の自己採点と解説
- Weak論点、忘却曲線ベースの復習タスク、学習ストリーク
- 年度依存論点、法改正リスク、確認ソースの証跡管理
- Home / Practice / Weak / Review / Dataのモバイルナビゲーション
- JSONによる学習データのバックアップ／復元
- ホーム画面追加と最低限のオフライン利用に対応するPWA
- `?debug=1`で有効になる手動QAモード

## 技術スタック

- Next.js 16（App Router）
- React 19
- TypeScript 6
- Tailwind CSS 4
- lucide-react
- localStorage / Service Worker / Web App Manifest

## セットアップ

Node.js 20.9.0以上（LTS推奨）を用意してください。リポジトリには`pnpm-lock.yaml`があるため、pnpmを推奨します。

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

npmを使用する場合：

```bash
npm install
npm run dev
```

開発画面は`http://localhost:3000`です。QAモードは`http://localhost:3000/?debug=1`で開きます。通常の本番URLではQAボタンは表示されません。

## ビルドと品質チェック

```bash
pnpm lint
pnpm validate:questions
pnpm validate:backup
pnpm build
pnpm start
```

すべてを順番に実行する場合：

```bash
pnpm check
```

npmでは各コマンドの`pnpm`を`npm run`へ読み替えてください。`validate:questions`は問題数、型、選択肢、出典、年度依存metadataを検査します。初期48問の証跡未登録は警告として表示されます。`validate:backup`は正常なバックアップ往復と不正データ拒否を検査します。

## バックアップと復元

Data画面の「学習データを守る」から、回答履歴、Weak論点、復習予定、ストリーク、レビュー証跡、QAチェックを`shindan-os-backup-YYYY-MM-DD.json`へ出力できます。

インポート時はアプリ名、バージョン、各データ構造を検証し、確認後に既存データを上書きします。不正JSONは状態へ反映しません。リセットには「リセット」の入力が必要です。

> 学習データは端末・ブラウザ単位です。端末変更、Safariのサイトデータ削除、プライベートブラウズ等に備えて定期的にエクスポートしてください。

## PWAとしてホーム画面へ追加

### iPhone / iPad

1. HTTPSで公開したShindan OSをSafariで開く
2. 共有ボタンを押す
3. 「ホーム画面に追加」を選ぶ
4. 追加されたShindan OSアイコンから起動する

### Android / Chrome

ブラウザメニューの「アプリをインストール」または「ホーム画面に追加」を選びます。

Service Workerは本番ビルドで登録され、アプリ本体とNext.jsの静的アセットをキャッシュします。初回オンライン表示後にオフライン動作を確認してください。localhost以外ではHTTPSが必要です。

## Vercelへデプロイ

1. GitHub等の非公開または公開リポジトリへpushする
2. Vercelで「Add New Project」からリポジトリを選ぶ
3. Framework Presetが`Next.js`であることを確認する
4. Install Commandは`pnpm install --frozen-lockfile`、Build Commandは`pnpm build`を使用する（通常は自動判定で可）
5. デプロイ後、`/manifest.json`、`/sw.js`、`/icon.svg`、`/apple-touch-icon.png`が200で返ることを確認する
6. 実機Safariでホーム画面追加、演習、バックアップ、オフライン表示を確認する

環境変数や`basePath`は不要です。Service Workerには再検証ヘッダーとルートスコープを設定しています。

## 問題データとprivateデータ

公開用問題は`src/data/questions/public/`に科目別で配置しています。各問題は出典種別と、必要に応じて年度・問題番号・年度依存情報を保持します。

個人利用の過去問本文、市販教材本文、手入力データは`src/data/questions/private/`へ置いてください。`.example.json`以外のprivate JSONと生成カタログは`.gitignore`対象です。

> 市販教材本文や公開権限を確認していない問題データを、公開リポジトリやVercelの公開デプロイへ含めないでください。

## ディレクトリ構成

```text
src/app/                 App Router、metadata、グローバルCSS
src/components/          ダッシュボード、演習、レビュー、Data、QA
src/data/questions/      公開問題とGit管理外private問題
src/hooks/               学習状態とlocalStorage管理
src/types/               ドメイン型
src/utils/               復習、統計、保存、バックアップ検証
public/                  manifest、アイコン、Service Worker
scripts/                 問題・バックアップ検証
docs/                    リリースチェックリスト
```

公開前は[リリースチェックリスト](docs/RELEASE_CHECKLIST.md)を実施してください。
