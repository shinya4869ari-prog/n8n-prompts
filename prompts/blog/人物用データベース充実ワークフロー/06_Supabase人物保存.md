# 【06】Supabase人物保存 (HTTP Request Node)

## 📌 ノード概要
* **ノード名**: `Supabase人物保存`
* **ノードタイプ**: `n8n-nodes-base.httpRequest`
* **Method**: `POST`
* **URL**: `https://uvjpiuinsgklddzhzpio.supabase.co/rest/v1/Persons`
* **役割**: `05_Supabase_Upsert整形` で生成された人物レコードを、Supabaseの `Persons` テーブルへ Upsert（新規登録または既存データの更新）保存します。

---

## ⚙️ HTTP Request 詳細設定

### 1. 基本設定 (Parameters)
* **Method**: `POST`
* **URL**: `https://uvjpiuinsgklddzhzpio.supabase.co/rest/v1/Persons`
* **Authentication**: `None`（ヘッダーで渡すため）
* **Send Headers**: `true` (ON)
* **Send Body**: `true` (ON)
* **Body Content Type**: `JSON`
* **Specify Body**: `Using JSON`
* **JSON**: `{{ JSON.stringify($json) }}`

---

### 2. ヘッダー設定 (Headers)

以下の4つのヘッダーを必ず設定してください：

| Header Name | Header Value | 役割 |
| :--- | :--- | :--- |
| `apikey` | `sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX` | Supabase APIキー（または環境変数） |
| `Authorization` | `Bearer sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX` | 認証トークン |
| `Content-Type` | `application/json` | JSON送信用 |
| `Prefer` | `resolution=merge-duplicates,return=representation` | **【超重要】重複時は上書き更新（Upsert）し、保存後レコードを返却** |

---

### 3. オプション設定 (Options)
* **Batching**:
  * 複数人物をまとめて保存する場合は `Batching` を ON にし、`Batch Size: 10` 程度にすると安定します。
* **Retry On Fail**: `true` (ON)
  * **Max Tries**: `3`
  * **Wait Between Tries**: `1000` (ms)
