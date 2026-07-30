# 【セクション個別更新サブワークフロー 構築ガイド】

このサブワークフローは、WordPress記事の特定のセクション（映画、物価、治安、貿易、制度、歴史、動向、Deep Dive等）を指定し、保存済みデータ（Supabase / Google Sheets）またはAI再検索結果を基に、該当セクションのみを自動生成・上書き置換（Update）する万能型サブワークフローです。

---

## 🛠️ n8n ノード接続全体図

```text
[1. Form Trigger / Webhook (国名, section_type, post_id)]
       │
[2. Switch / Router ノード (section_typeによる分岐)]
       ├─ 'eizou' / 'osusume' ➔ [3A. Supabase (movies / recommend_movies 取得)] ➔ [4A. Code (movie_section_html.js)]
       ├─ 'bukka' / 'boeki' / 'chian' ➔ [3B. Google Sheets / DB (既存固定データ取得)] ➔ [4B. Code (専用HTML整形)]
       └─ 'doukou' / 'deep_dive' ➔ [3C. AI node (単体再リサーチ・再生成)] ➔ [4C. Code (HTML整形)]
                                 │
                                 ▼ (各整形済みHTML `section_html` を合流)
                  [5. WordPress (Get a Post: wp REST API /wp-json/wp/v2/posts/{post_id})]
                                 │
                  [6. Code (section_wp_updater.js: 正規表現でマーカー間を安全上書き)]
                                 │
                  [7. WordPress (Update a Post: POST/PUT /wp-json/wp/v2/posts/{post_id})]
```

---

## 📝 1. 入力パラメータ (Trigger Input)

- **country** (Text): 対象国名（例: `韓国`, `ブータン`, `Korea`）
- **post_id** (Number/Text): 更新対象のWordPress投稿ID（例: `1234`）
- **section_type** (Dropdown/Text): 更新したいセクションID
  - `seido` : ① 制度の9つの皿
  - `chiri_keizai` : ② 地理と経済の衡量
  - `chian` : ③ 治安と平和の衡量
  - `boeki` : ④ 貿易の衡量
  - `bukka` : ⑤ 生活・価値の衡量（物価比較）
  - `rekishi` : ⑥ 歴史的背景
  - `doukou` : ⑦ 直近の動向
  - `eizou` : ⑧ 映像作品
  - `osusume` : ⑨ おすすめ映画
  - `deep_dive` : ✦ Deep Dive

---

## 🏷️ 2. WordPressマーカーコメント仕様

`最終Code.js` から出力された記事本文内には、各セクションごとに以下の識別タグが埋め込まれています。

- `<!-- SECTION:seido:START -->` ... `<!-- SECTION:seido:END -->`
- `<!-- SECTION:chiri_keizai:START -->` ... `<!-- SECTION:chiri_keizai:END -->`
- `<!-- SECTION:chian:START -->` ... `<!-- SECTION:chian:END -->`
- `<!-- SECTION:boeki:START -->` ... `<!-- SECTION:boeki:END -->`
- `<!-- SECTION:bukka:START -->` ... `<!-- SECTION:bukka:END -->`
- `<!-- SECTION:rekishi:START -->` ... `<!-- SECTION:rekishi:END -->`
- `<!-- SECTION:doukou:START -->` ... `<!-- SECTION:doukou:END -->`
- `<!-- SECTION:eizou:START -->` ... `<!-- SECTION:eizou:END -->`
- `<!-- SECTION:osusume:START -->` ... `<!-- SECTION:osusume:END -->`
- `<!-- SECTION:deep_dive:START -->` ... `<!-- SECTION:deep_dive:END -->`

---

## ⚙️ 3. 置換ノード (`section_wp_updater.js`)

`WP Get a Post` で取得した `content.rendered` に対し、指定された `section_type` のマーカー間コンテンツを生成済み `section_html` で正規表現置換します。

- コメントタグが存在する場合: マーカー内のみを上書き置換。
- コメントタグがまだ存在しない過去記事等の場合: 安全に本文末尾へセクションを追加追記。

---

## 🎬 4. 映画セクション更新の例 (Supabase連携)

1. Supabaseの `movies` または `recommend_movies` テーブルから、`country = 入力国名` でレコードを取得。
2. `movie_section_html.js` ノードに流し込んでセクションHTMLを構築。
3. `section_wp_updater.js` で本文の `<!-- SECTION:eizou:START -->` または `<!-- SECTION:osusume:START -->` 内を置換。
4. WordPress POSTノードで投稿本文を更新。
