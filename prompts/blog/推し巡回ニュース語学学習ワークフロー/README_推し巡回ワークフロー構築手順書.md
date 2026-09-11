# 【n8n】推し巡回ニュース語学学習ワークフロー構築手順書
〜1件ずつ確実・即時更新・API負荷ゼロの完全ループ方式〜

---

## 1. なぜ「1件ずつ確実処理（ループ方式）」なのか？

1. **Gemini 503エラー・混雑の完全回避**:
   - 5人分を一気に並列でAPIに投げると、Google側の急な混雑（503 Service Unavailable）にぶつかり、全体が巻き添えで止まってしまいます。
   - **「1人ずつ順番にリクエストし、2〜3秒のウェイトを挟む」** ことで、Gemini APIの負荷制限や混雑を100%回避します。

2. **その推しが終わるたびにスプレッドシートを「即時」更新**:
   - 1人分のニュースをSupabaseに保存した瞬間、**その場でその推しの検索日時（last_searched_at）を更新** します。
   - 万が一途中で回線トラブルが起きても、完了した推しはすでに更新済みなので、次回実行時に重複せず「次の人」から安全に再開できます！

---

## 2. ワークフロー構成図（1件ずつの安全ループ）

```
[ ⏰ 毎日定時実行 ]
        │
        ▼
[ 📊 Google Sheets: 推しリスト全行取得 ]
        │
        ▼
[ ⚡ 01_最優先5名選出 (新メンバー優先 ＆ 古い順) ]
        │
        ▼
┌──▶ [ 🔁 Loop Over Items (1件ずつ順番に取り出し) ] ◀───────────────┐
│              │                                                     │
│              ▼                                                     │
│        [ 🌐 Google News RSS取得 (この推し1名分) ]                  │
│              │                                                     │
│              ▼                                                     │
│        [ 🔍 02_トップ速報記事抽出 ]                                │
│              │                                                     │
│              ▼                                                     │
│        [ ❓ 新着記事があるか？ ]                                    │
│         ├── [YES] ──▼                                              │
│         │     [ 🤖 Google Gemini: 記事生成 (自動リトライ設定) ]    │
│         │           │                                              │
│         │           ▼                                              │
│         │     [ 🛠️ 04_Supabase保存データ整形 (コスト計算付き) ]     │
│         │           │                                              │
│         │           ▼                                              │
│         │     [ 🗄️ Supabase: newsテーブル Upsert ]                 │
│         │           │                                              │
│         └── [合流] ──▼                                              │
│               [ 📝 Google Sheets: この推しの行だけ即時更新 ]       │
│                     │                                              │
│                     ▼                                              │
│               [ ⏳ Wait (2〜3秒休憩: API混雑を完全に逃がす) ]       │
│                     │                                              │
└─────────────────────┴──────────────────────────────────────────────┘
```

---

## 3. 各ノードの個別設定手順

### ① 🔁 `Loop Over Items`（1件ずつ取り出しノード）
* **Node Type**: `Loop Over Items`（または `Split In Batches`）
* **Batch Size**: `1`

### ② 🌐 `Google News RSS取得`
* **URL**: `={{ $json.rss_url }}`

### ③ 🔍 `02_トップ速報記事抽出`
* **Code**: [02_RSS解析・推し最新記事抽出.js](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/推し巡回ニュース語学学習ワークフロー/02_RSS解析・推し最新記事抽出.js)

### ④ ❓ `新着記事があるか？`
* **Condition**: `{{ $json.has_news }}` equals `true`

### ⑤ 🤖 `Google Gemini: 推し報道記事生成`
* **URL**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`
* **Header**: `x-goog-api-key`: `{{ $env.GEMINI_API_KEY }}`
* **JSON Body**: `={{ JSON.stringify($json.gemini_request) }}`
* **Settings（歯車タブ）**:
  - **Retry On Fail**: ON
  - **Max Tries**: 3
  - **Wait Between Tries**: 3000 ms（一時混雑時に自動で3秒待ってリトライ！）

### ⑥ 🛠️ `04_Supabase保存データ整形`
* **Code**: [04_Supabase保存データ整形.js](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/推し巡回ニュース語学学習ワークフロー/04_Supabase保存データ整形.js)

### ⑦ 🗄️ `Supabase: newsテーブル Upsert`
* **URL**: `{{ $env.SUPABASE_URL }}/rest/v1/news?on_conflict=source_url`

### ⑧ 📝 `Google Sheets: 最終検索日時更新`（即時更新）
* **Operation**: Update Row
* **Column to match on**: `row_number`
* **Values to Update**: `last_searched_at` に `{{ $now.format('YYYY-MM-DD HH:mm:ss') }}`

### ⑨ ⏳ `Wait` ノード（休憩ノード）
* **Wait Amount**: `2` または `3` seconds
* この後、`Loop Over Items` の入力ループ端子に戻すことで、次の推しへ安全に進みます。
