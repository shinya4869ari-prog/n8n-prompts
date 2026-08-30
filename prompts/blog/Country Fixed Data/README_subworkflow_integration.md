# Country Fixed Data × 各セクション個別更新サブワークフロー 自動連携ガイド

本手順に従うことで、`Country Fixed Data` ワークフローでスプレッドシート（治安・物価）の更新が完了した直後に、自動的に「各セクション個別更新サブワークフロー」が呼び出され、**WordPressの該当記事の治安・物価テーブルもピンポイントで自動更新**されるようになります。

---

## 🚀 設定手順（2ステップ）

### ステップ1: サブワークフロー側に `Execute Workflow Trigger` を追加
1. **「各セクション生成・個別更新サブワークフロー」** のキャンバスを開きます。
2. [`execute_workflow_trigger_node.json`](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/各セクション生成・個別更新サブワークフロー/execute_workflow_trigger_node.json) の内容を全コピーしてキャンバスに貼り付けます。
3. 出現した **`Execute Workflow Trigger`** ノードから、既存の **`Switch1`（または Switch）** ノードへ線を繋ぎます。
   * ※ 既存の `On form submission`（手動フォーム）も残したままでOKです（手動・自動の両対応になります）。

---

### ステップ2: `Country Fixed Data` ワークフロー末尾に呼び出しノードを配置
1. **「Country Fixed Data」** ワークフローのキャンバスを開きます。
2. [`個別更新呼び出しノード.json`](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/Country%20Fixed%20Data/個別更新呼び出しノード.json) の内容を全コピーしてキャンバス末尾に貼り付けます。
3. 以下の通りに接続します：
   * `管理シート更新`（またはシート書き込み完了ノード） ➔ **`個別更新パラメータ準備Code`**
   * **`個別更新パラメータ準備Code`** ➔ **`サブワークフロー呼び出し（治安）`**
   * **`個別更新パラメータ準備Code`** ➔ **`サブワークフロー呼び出し（物価）`**
4. それぞれの「サブワークフロー呼び出し」ノードの設定を開き、**`Workflow` で「各セクション生成・個別更新サブワークフロー」を選択**します。

---

## 🛡️ 自動更新の安全性
- 治安・物価ともに **「テーブル部分だけをピンポイント置換する」** 安全ロジックが組み込まれています。
- 自動実行時であっても、AIの解説文やグラフ、エラーネコの一言などは **1文字も消えずに100%維持** されます。
