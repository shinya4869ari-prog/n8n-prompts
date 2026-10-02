# 【05】Supabase人物保存 (HTTP Request Node)

## 📌 ノード概要
* **ノード名**: `Supabase人物保存`
* **ノードタイプ**: `n8n-nodes-base.httpRequest`
* **Method**: `POST`
* **URL**: `https://<あなたのSupabaseプロジェクトID>.supabase.co/rest/v1/Persons`
* **役割**: 整形された人物レコードを Supabase の `Persons` テーブルに保存します。既存データがある場合は重複を自動マージ（Upsert）します。

---

## ⚙️ HTTP Request 設定

### 1. Basic Settings
* **Method**: `POST`
* **URL**: `https://<あなたのSupabaseプロジェクトID>.supabase.co/rest/v1/Persons`
* **Send Headers**: `true`
* **Send Body**: `true`
* **Body Content Type**: `JSON`
* **Specify Body**: `Using Fields Below` または `Using JSON`
  - JSONの場合: `{{ $json }}`

### 2. Request Headers

| Header Name | Header Value | 説明 |
| :--- | :--- | :--- |
| `apikey` | `<あなたのSupabase anonキーまたはservice_roleキー>` | 認証APIキー |
| `Authorization` | `Bearer <あなたのSupabase anonキーまたはservice_roleキー>` | Bearerトークン |
| `Content-Type` | `application/json` | JSONリクエスト |
| `Prefer` | `resolution=merge-duplicates, return=minimal` | **重複時の自動更新（Upsert）指示** |

> **💡 on_conflict の指定**:
> 重複判定キー（ユニークキー）として `name` または `wikidata_id` を指定する場合は、URLにパラメータを付与します：
> `https://<PROJECT_ID>.supabase.co/rest/v1/Persons?on_conflict=name`
