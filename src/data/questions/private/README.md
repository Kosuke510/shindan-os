# Private question data

個人学習用の過去問本文・市販教材由来の本文・手入力データは、このディレクトリにJSON配列として保存します。

- `*.example.json` は書式例としてGit管理できます。
- 実データは `questions.local.json` など、`.example.json` 以外の名前にしてください。
- 実データと生成される `private.generated.ts` は `.gitignore` 対象です。
- `npm run dev` / `npm run build` / `npm run validate:questions` の前処理で自動的に統合されます。
- 市販教材を入力する場合は、利用条件を確認し、非公開・個人利用の範囲で管理してください。

複数ファイルやサブディレクトリに分割しても読み込まれます。各問題には `source` を必ず指定してください。年度依存問題には任意で `reviewEvidence`（資料名、URL、種別、確認者、確認日、メモ）も記録できます。アプリ上で入力した証跡は問題JSONではなくlocalStorageのレビュー上書きデータへ保存されます。
