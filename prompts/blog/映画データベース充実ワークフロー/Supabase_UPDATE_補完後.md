# 🎬 映画データ保存（Moviesテーブル）HTTP Request 設定ガイド

ユーザー様のプロジェクト情報に合わせて更新した、映画データ（`Movies` テーブル）自動保存用の確実な HTTP Request ノードの設定値です。

---

## HTTP Request ノード設定値 (映画データ保存用)

* **Node Name**: `Supabaseへ保存`
* **Method**: `POST`  *(※`on_conflict` を使用するため POST に設定)*
* **URL**: `https://uvjpiuinsgklddzhzpio.supabase.co/rest/v1/Movies?on_conflict=tmdb_id`
* **Headers**:
  - `apikey`: `<YOUR_SUPABASE_ANON_KEY>`
  - `Authorization`: `Bearer <YOUR_SUPABASE_SERVICE_ROLE_KEY>`
  - `Content-Type`: `application/json`
  - `Prefer`: `resolution=merge-duplicates`  *(※重複時に最新データで自動上書き更新)*
* **Send Body**: `ON`
* **Body Content Type**: `JSON`
* **JSON Body**:
```json
={{ JSON.stringify($json) }}
```

---

## 特長
`on_conflict=tmdb_id` と `Prefer: resolution=merge-duplicates` を指定することにより：
- 該当する `tmdb_id` の映画が未保存の場合は **新規追加 (INSERT)** されます。
- 該当する `tmdb_id` の映画が既に保存されている場合は **自動上書き更新 (UPDATE)** されます。
