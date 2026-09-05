# 人物用データベース充実ワークフロー 構築マニュアル

## 📌 ワークフローの概要
本ワークフローは、韓国・日本・海外の俳優、映画監督、歌手、アイドル等の人物データを自動収集・整形し、Supabaseの `Persons` テーブルへ高精度に保存・更新（Upsert）するためのn8nワークフローです。

HistoryGallery（映画アーカイブ）や KR-Learner（語学学習アプリ）の「推し（お気に入り人物）」機能と完全に連動します。

---

## 🏗️ n8n ノードの全体配置と接続図

```text
[⚡ 人物データベース登録フォーム]
       │
       ▼
[ { } 入力分割コード ]
       │
       ▼
[ 🌐 Wikidata人物情報取得 ]
       │
       ▼
[ ✦ Gemini人物クレンジング ]
       │
       ▼
[ { } Supabase Upsert整形 ]
       │
       ▼
[ 🌐 Supabase人物保存 ]
```

---

## 📂 構成ファイル一覧 (ファイリング一覧)

| 順序 | ファイル名 | ノード種別 | 役割 |
| :---: | :--- | :--- | :--- |
| **01** | [01_人物データベース登録フォーム.md](./01_人物データベース登録フォーム.md) | Form Trigger | 人物名やQIDの手動入力受付フォーム |
| **02** | [02_入力分割コード.js](./02_入力分割コード.js) | Code | カンマ区切り人物や配列データを1人1アイテムに自動展開 |
| **03** | [03_Wikidata人物情報取得.md](./03_Wikidata人物情報取得.md) | HTTP Request | Wikidata SPARQLから写真・SNS・生年月日等を一括取得 |
| **04** | [04_Gemini人物クレンジング_AIプロンプト.md](./04_Gemini人物クレンジング_AIプロンプト.md) | Google Gemini | 人物の公式プロフィール紹介文（bio）を要約生成 |
| **05** | [05_Supabase_Upsert整形.js](./05_Supabase_Upsert整形.js) | Code | SNS/画像URL/性別等のクレンジングとUpsert用JSON作成 |
| **06** | [06_Supabase人物保存.md](./06_Supabase人物保存.md) | HTTP Request | Supabase `Persons` テーブルへPOST (merge-duplicates) 保存 |

---

## 📊 Supabase Persons テーブル連携仕様

本ワークフローによって保存される主なカラム：

| カラム名 | 型 | 内容 | 例 |
| :--- | :--- | :--- | :--- |
| `name` | text | 人物名（日本語） | `イ・ジェフン` |
| `name_en` | text | 原語名（ハングル/英語） | `이제훈` |
| `occupation` | text | 職業 | `俳優`, `映画監督` |
| `country` | text | 国コード | `KR`, `JP` |
| `profile_url` | text | 高画質顔写真URL | `https://commons.wikimedia.org/...` |
| `wikidata_id` | text | Wikidata QID | `Q496314` |
| `gender` | text | 性別 | `male` / `female` |
| `x_id` | text | X (Twitter) アカウント | `...` |
| `instagram_id`| text | Instagram アカウント | `...` |
| `bio` | text | Geminiが生成した紹介文 | `韓国の俳優。2007年デビュー...` |
| `is_favorite` | bool | 推しフラグ（アプリ連動）| 初期値 `false` |
