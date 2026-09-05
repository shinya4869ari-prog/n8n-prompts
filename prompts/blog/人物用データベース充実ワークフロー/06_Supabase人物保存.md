# 【06】Supabase人物保存 (HTTP Request Node)

## 📌 ノード概要
* **ノード名**: `Supabase人物保存`
* **ノードタイプ**: `n8n-nodes-base.httpRequest`
* **Method**: `POST`
* **URL**: `https://uvjpiuinsgklddzhzpio.supabase.co/rest/v1/Persons`
* **役割**: `05_Supabase_Upsert整形` で生成された人物レコード（俳優、映画監督、政治家、歴史上の人物、アイドル等）を、Supabaseの `Persons` テーブルへ Upsert（新規登録または既存データの更新）保存します。

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

> [!TIP]
> `Prefer: resolution=merge-duplicates` により、同一人物（主キーまたはユニーク制約一致）が既に存在する場合、渡されたフィールドのみがスマートに更新され、未指定のフィールド（ユーザーが画面でお気に入り登録した `is_favorite` 星フラグ等）は安全に保護されます。

---

### 3. オプション設定 (Options)
* **Batching**:
  * 複数人物（カンマ区切り登録や映画キャスト一括など）をまとめて保存する場合は `Batching` を ON にし、`Batch Size: 10` 程度にすると安定します。
* **Retry On Fail**: `true` (ON)
  * **Max Tries**: `3`
  * **Wait Between Tries**: `1000` (ms)

---

## 📋 保存される Persons テーブル主要スキーマ

| カラム | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | uuid / int | レコードID（新規時は自動生成） |
| `name` | text | 人物名（日本語表記、例: 尹錫悦、世宗大王、イ・ジェフン） |
| `name_en` | text | 原語表記（韓国人の場合はハングル最優先: 윤석열、이제훈） |
| `occupation` | text | 職業・公職（大統領、政治家、歴史上の人物、映画監督、俳優等） |
| `profile_url`| text | Wikimedia Commons 高画質写真URL |
| `gender` | text | `male` / `female` |
| `country` | text | 国コード（`KR`, `JP`, `US` 等） |
| `wikidata_id`| text | Wikidata QID（例: `Q16090635`, `Q37682`, `Q496314`） |
| `tmdb_id` | int | TMDb Person ID（映画・ドラマ関係者の場合） |
| `favorite_youtube` | text | YouTube 代表動画URLまたはID |
| `is_favorite`| bool | 推しフラグ（アプリの★お気に入り） |
| `x_id` | text | 公式 X (Twitter) アカウント |
| `instagram_id` | text | 公式 Instagram アカウント |
| `youtube_id` | text | 公式 YouTube チャンネルID |
| `official_site` | text | 公式サイトまたは公報サイトURL |
| `bio` | text | Geminiが生成した150〜250文字の高品質プロフィール紹介文 |
