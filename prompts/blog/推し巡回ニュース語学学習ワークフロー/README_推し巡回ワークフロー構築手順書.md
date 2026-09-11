# 【n8n】推し巡回ニュース語学学習ワークフロー構築手順書
〜スプレッドシート連動・1日数名じゅんぐりローテーション方式〜

---

## 1. ワークフローの目的・設計思想

1. **完全無料・低コスト枠の維持**:
   - 推し（セレブ）が50名〜100名いても、1日に一気に全員検索せず、**「1日5名ずつ」** 検索・生成を実行します。
   - Gemini APIのレートリミット（無料枠の上限）に引っかからず、毎日安定稼働します。

2. **「新メンバー最優先」＆「じゅんぐり自動巡回（エンドレス）」**:
   - **新しく追加した推し**: 「最終検索日」が空欄のため、既存の誰よりも**最優先（一番上）**で翌日即座に検索されます。
   - **全員一巡後のループ**: 検索が終わると今日の日付に上書きされるため、50名（10日）全員が終わったら**自動的に10日前の1人目に戻って2巡目がスタート**します。手動メンテは一切不要です。

3. **スマホから追加・削除できる手軽さ**:
   - Googleスプレッドシートの末尾に、推しの「名前（日本語・韓国語）」を1行足すだけで自動で巡回リストに組み込まれます。

---

## 2. Googleスプレッドシートの準備

Googleドライブでスプレッドシートを新規作成し、シート名を「**推しリスト**」として以下のヘッダー（1行目）を設定してください。

### 列構成（ヘッダー行）
| 列 | カラム名 (1行目) | 説明・入力例 |
| :--- | :--- | :--- |
| **A列** | `id` | 連番 (1, 2, 3...) |
| **B列** | `name_ja` | 日本語名 (例: `キム・ナムギル`, `パク・ウンビン`, `IU`) |
| **C列** | `name_ko` | 韓国語名【必須・検索用】 (例: `김남길`, `박은빈`, `아이유`) |
| **D列** | `last_searched_at` | 最終検索日時 (自動更新・初回は**空欄**のままでOK) |
| **E列** | `is_active` | 有効フラグ (`TRUE` または `FALSE`) |

> 💡 **ポイント**:
> 新しく推しを追加するときは、**D列（`last_searched_at`）を空欄のまま**にしておいてください。システムが「未検索＝過去最古」と自動判定し、次回の実行で最優先で検索されます！

---

## 3. n8nワークフローの全体構成（ノードの流れ）

```
[ ⏰ 毎日定時実行 (Schedule Trigger) ]
                   │
                   ▼
[ 📊 Google Sheets: 全行読み込み (Read Rows) ]
                   │
                   ▼
[ ⚡ Code: 最優先5名選出 & RSS URL生成 (01_スプレッドシート設計と5名抽出コード.js) ]
                   │
                   ▼
[ 🌐 HTTP Request: Google News RSS取得 ]
                   │
                   ▼
[ 🔍 Code: トップ速報記事抽出 (02_RSS解析・推し最新記事抽出.js) ]
                   │
                   ▼
[ ❓ If: 新着記事があるか？ ]
       ├── [YES] ──▼
       │     [ 🤖 Gemini: 本格報道記事＆語彙生成 (03_Gemini推し本格報道記事生成_AIプロンプト.md) ]
       │           │
       │           ▼
       │     [ 🛠️ Code: Supabase用整形 (04_Supabase保存データ整形.js) ]
       │           │
       │           ▼
       │     [ 🗄️ Supabase: news テーブル保存 (Upsert) ]
       │
       └── [共通合流] ──▼
             [ 📝 Google Sheets: 検索した5名の最終検索日時を更新 (05_スプレッドシート更新データ整形.js) ]
```

---

## 4. 各ノードの個別設定手順

### ノード ①: ⏰ Schedule Trigger（スケジュールトリガー）
* **Trigger Times**: Every Day（毎日）
* **Hour**: 12（お昼12:00）または 20（夜20:00）など、一般ニュース（朝7時）と被らない時間帯がおすすめ。

### ノード ②: 📊 Google Sheets（推しリスト取得）
* **Resource**: Document
* **Operation**: Get Row(s)
* **Document**: 先ほど作成したスプレッドシートを選択
* **Sheet Name**: `推しリスト`

### ノード ③: ⚡ Code（最優先5名選出 ＆ RSSクエリ生成）
* **Mode**: Run Once for All Items
* **Language**: JavaScript
* **Code**: `01_スプレッドシート設計と5名抽出コード.js` の内容をそのまま貼り付け。
* **役割**:
  - `is_active !== false` の推しを抽出。
  - `last_searched_at` が「空欄（未検索）」の推しを最上位へソート。
  - 次に「検索日時が古い順」にソート。
  - 上位5名を切り出して、Google News RSSの検索URLを生成。

### ノード ④: 🌐 HTTP Request（Google News RSS取得）
* **Method**: GET
* **URL**: `{{ $json.rss_url }}`
* **Response Format**: Text (XML)

### ノード ⑤: 🔍 Code（トップ速報記事抽出）
* **Mode**: Run Once for Each Item
* **Language**: JavaScript
* **Code**: `02_RSS解析・推し最新記事抽出.js` の内容をそのまま貼り付け。
* **役割**: RSSから直近7日間の最新ニュース1件を抽出し、推しの名前（韓国語）をメタデータとして紐付け。

### ノード ⑥: ❓ If（記事存在チェック）
* **Condition**: String -> `{{ $json.news_title }}` is not empty
* ニュースがあった場合のみGeminiへ流し、記事がなかった場合はGeminiをスキップしてスプレッドシートの日時更新へ流します（無駄なAPI呼び出しゼロ）。

### ノード ⑦: 🤖 Gemini（推し本格報道記事 ＆ 重要単語生成）
* **Model**: `gemini-2.5-flash`
* **Prompt**: `03_Gemini推し本格報道記事生成_AIプロンプト.md` の内容を貼り付け。

### ノード ⑧: 🛠️ Code（Supabase保存用整形）
* **Code**: `04_Supabase保存データ整形.js` を貼り付け。

### ノード ⑨: 🗄️ Supabase（ニュース保存）
* **Table**: `news`
* **Operation**: Upsert
* **Conflict Column**: `source_url`

### ノード ⑩: 📝 Google Sheets（最終検索日時の更新）
* **Operation**: Update Row(s)
* **Row Number**: `{{ $json.row_number }}`
* **Fields**: `last_searched_at` に `{{ $now.format('YYYY-MM-DD HH:mm:ss') }}` をセット。
* **効果**: 今回検索した5名の日時が「今日」に更新され、明日は自動的に次の5名が選ばれます！

---

## 5. 📁 構成ファイル一覧 ＆ 一発インポート用完全版JSON

| ファイル名 | ノード名 / 種別 | 役割 |
| :--- | :--- | :--- |
| **[01_スプレッドシート設計と5名抽出コード.js](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/推し巡回ニュース語学学習ワークフロー/01_スプレッドシート設計と5名抽出コード.js)** | `01_最優先5名選出 & RSS URL生成` (Code) | 新メンバー最優先＆過去最古順に5名選出しRSS URL生成 |
| **[02_RSS解析・推し最新記事抽出.js](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/推し巡回ニュース語学学習ワークフロー/02_RSS解析・推し最新記事抽出.js)** | `02_トップ速報記事抽出` (Code) | RSSから推し最新記事を抽出（記事なし時も安全処理） |
| **[03_Gemini推し本格報道記事生成_AIプロンプト.md](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/推し巡回ニュース語学学習ワークフロー/03_Gemini推し本格報道記事生成_AIプロンプト.md)** | `Google Gemini: 推し報道記事生成` (HTTP/AI) | 芸能・ドラマ・音楽等に特化した4段落報道体＋重要語彙10〜15語 |
| **[04_Supabase保存データ整形.js](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/推し巡回ニュース語学学習ワークフロー/04_Supabase保存データ整形.js)** | `04_Supabase保存データ整形` (Code) | Supabase `news` テーブル（`category: celeb`）用整形 |
| **[05_スプレッドシート更新データ整形.js](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/推し巡回ニュース語学学習ワークフロー/05_スプレッドシート更新データ整形.js)** | `05_スプレッドシート更新データ整形` (Code) | 検索完了した5名の日時更新用ペイロード生成 |
| **[推し巡回ニュース語学学習完全版ワークフロー.json](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/推し巡回ニュース語学学習ワークフロー/推し巡回ニュース語学学習完全版ワークフロー.json)** | ワークフロー全体JSON | **n8nのキャンバスにそのまま貼り付けて即座に全構築できる完全定義ファイル** |

