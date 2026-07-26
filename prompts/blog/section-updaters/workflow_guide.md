# 【各セクション個別更新サブワークフロー 構築ガイド】

このサブワークフローは、既存のWordPress記事の特定セクション（映画、Deep Dive、制度、歴史、危険・犯罪）を指定して、その部分だけを再生成・置換更新（Update）するための万能ワークフローです。

---

## 🛠️ n8n ノードの接続全体像

```
[1. On form submission (Form Trigger)]
       │
[2. Switch / Router ノード (section_typeによる分岐)]
       ├─ 'movie' ➔ [3A. Supabase (Get 10 Movies)] ➔ [4A. Code (movie_section_html.js)]
       ├─ 'deep_dive' ➔ [3B. Perplexity / Claude (Deep Dive単体再執筆)]
       └─ 'institution' ➔ [3C. Perplexity (制度単体リサーチ・執筆)]
                                │ (各生成HTMLを合流)
                                ▼
                 [5. WordPress (Get a Post: 対象post_idの既存記事本文を取得)]
                                │
                 [6. Code (section_wp_updater.js: 該当タグ内のみ置換)]
                                │
                 [7. WordPress (Update a Post: 本文を更新)]
```

---

## 📝 1. Form Trigger (フォーム入力パラメータ)

* **country** (Text): 国コード（例: `KR`, `BT`）
* **post_id** (Number/Text): 更新対象のWordPress投稿ID（例: `1234`）
* **section_type** (Dropdown/Text): 修正したいセクション種別
  * `movie` (映画セクション)
  * `deep_dive` (Deep Diveセクション)
  * `institution` (制度の9つの皿セクション)
  * `history` (歴史・最新動向セクション)
  * `crime` (危険・重大犯罪セクション)

---

## ⚙️ 2. 置換ノードの役割 (`section_wp_updater.js`)

`WP Get a Post` で取得した既存の本文（`wp_content`）に対し、以下の置換タグを自動検出して上書き置換します。

* 映画: `<!-- START_MOVIE_SECTION --> ... <!-- END_MOVIE_SECTION -->`
* Deep Dive: `<!-- START_DEEP_DIVE_SECTION --> ... <!-- END_DEEP_DIVE_SECTION -->`
* 制度: `<!-- START_INSTITUTION_SECTION --> ... <!-- END_INSTITUTION_SECTION -->`
* 歴史: `<!-- START_HISTORY_SECTION --> ... <!-- END_HISTORY_SECTION -->`
* 犯罪: `<!-- START_CRIME_SECTION --> ... <!-- END_CRIME_SECTION -->`

タグが存在しない場合は、安全に記事の末尾に新セクションとして自動追加されます。
