# 【セクション個別更新サブワークフロー 構築ガイド】

このサブワークフローは、WordPress記事の特定のセクション（映画、音楽、物価、治安、貿易、制度、歴史、動向、Deep Dive等）を指定し、保存済みデータ（Supabase / Google Sheets）または外部API/AIリアルタイム検索結果を基に、該当セクションのみを自動生成・上書き置換（Update）する万能型サブワークフローです。

---

## 🛠️ n8n ノード接続全体図

```text
[1. Form Trigger / Webhook (国名, section_type, post_id)]
       │
[2. Switch / Router ノード (section_typeによる分岐)]
       ├─ 'eizou'              ➔ [3A. Supabase (movies 取得)] ➔ [4A. Code (movie_section_html.js)]
       ├─ 'deep_dive'          ➔ [3B. AI node (単体再リサーチ・再生成)] ➔ [4B. Code (HTML整形)]
       ├─ 'osusume'            ➔ [3C. Supabase (recommend_movies 取得)] ➔ [4C. Code (HTML整形)]
       ├─ 'music' (Supabase)   ➔ [3D. Supabase (音楽10本の一括取得: tracks)] ➔ [4D. Code (movie_data_source_switch.js)] ➔ [5D. Code (music_section_html.js)]
       ├─ 'music' (API再検索)   ➔ [3E. Execute Sub-Workflow (音楽検索)] ➔ [4E. Code (music_section_html.js)]
       └─ 'bukka' / 'boeki'... ➔ [3F. Google Sheets / DB 取得] ➔ [4F. Code (専用HTML整形)]
                                   │
                                   ▼ (各整形済みHTML `section_html` を合流)
                    [5. WordPress (Get a Post: wp REST API /wp-json/wp/v2/posts/{post_id})]
                                   │
                                   ▼
                    [6. Code (section_wp_updater.js: 正規表現でマーカー間を安全上書き)]
                                   │
                                   ▼
                    [7. WordPress (Update a Post: POST/PUT /wp-json/wp/v2/posts/{post_id})]
```

---

## 📝 1. 入力パラメータ (Trigger Input & セクション順序)

記事のセクション配置順序：

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
  - `deep_dive` : ✦ Deep Dive（ディープダイブ）
  - `osusume` : ⑨ おすすめ映画
  - `music` / `ongaku` : ⑩ おすすめ音楽

---

## 🏷️ 2. WordPressマーカーコメント仕様

`最終Code.js` または `section_wp_updater.js` から出力される記事本文内には、各セクションごとに以下の識別タグが埋め込まれています。

- `<!-- SECTION:seido:START -->` ... `<!-- SECTION:seido:END -->`
- `<!-- SECTION:chiri_keizai:START -->` ... `<!-- SECTION:chiri_keizai:END -->`
- `<!-- SECTION:chian:START -->` ... `<!-- SECTION:chian:END -->`
- `<!-- SECTION:boeki:START -->` ... `<!-- SECTION:boeki:END -->`
- `<!-- SECTION:bukka:START -->` ... `<!-- SECTION:bukka:END -->`
- `<!-- SECTION:rekishi:START -->` ... `<!-- SECTION:rekishi:END -->`
- `<!-- SECTION:doukou:START -->` ... `<!-- SECTION:doukou:END -->`
- `<!-- SECTION:eizou:START -->` ... `<!-- SECTION:eizou:END -->`
- `<!-- SECTION:deep_dive:START -->` ... `<!-- SECTION:deep_dive:END -->`
- `<!-- SECTION:osusume:START -->` ... `<!-- SECTION:osusume:END -->`
- `<!-- SECTION:music:START -->` ... `<!-- SECTION:music:END -->`

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

---

## 🎵 5. 音楽セクション更新の例 (iTunes API 連携)

1. 入力パラメータ `section_type = 'music'`（または `10`, `ongaku`）と `country` を指定。
2. サブワークフロー「音楽検索ワークフロー」（iTunes Search API + AI Screener）を実行し、厳選された 10 曲の `recommend_music` JSONリストを取得。
3. 高画質ジャケット (`album_cover`) や 30 秒音声試聴プレイヤー (`<audio controls src="...">`) を含む HTML セクションを構築。
4. `section_wp_updater.js` で本文の `<!-- SECTION:music:START -->` ... `<!-- SECTION:music:END -->` タグ内を上書き置換。
5. WordPress REST API で投稿本文を自動更新。

---

## 🛡️ 6. 治安と平和 (③ chian) セクション更新の例 (Google Sheets / アップデータ連携)

1. **入力パラメータ**:
   - `section_type = 'chian'`（または `3`, `治安`）
   - `country = 国名`
   - `post_id = 更新対象の投稿ID`
2. **データ取得**:
   - Googleスプレッドシートの「治安」シート（または「国別固定データ_アップデータ」の出力）から最新の治安・社会指標を取得。
3. **`chian_section_html.js`**:
   - 殺人率、交通事故死亡率、自殺率、失業率、貧困率、ジニ係数、刑務所稼働率、総収容者数、GPI（世界平和度指数）、外務省危険レベル警告、エラーネコの一言を公式デザインの美しい指標テーブルHTMLに自動構築。
4. **`section_wp_updater.js`**:
   - 本文内の `<!-- SECTION:chian:START -->` ... `<!-- SECTION:chian:END -->` 内をピンポイントで安全上書き。
5. **WordPress REST API**:
   - 投稿本文を自動更新（他のセクションには一切手を触れず安全に治安のみ更新）。

---

## 🛒 7. 生活・価値の衡量 / 物価比較 (⑤ bukka) セクション更新の例 (Google Sheets / アップデータ連携)

1. **入力パラメータ**:
   - `section_type = 'bukka'`（または `5`, `物価`）
   - `country = 国名`
   - `post_id = 更新対象の投稿ID`
2. **データ取得**:
   - Googleスプレッドシートの「物価」シート（または「国別固定データ_アップデータ」の出力）から最新の10品目物価（ビール、タバコ、水、ビッグマック、ガソリン、外食、光熱費、家賃、平均月収、Netflix）と為替レートを取得。
3. **`bukka_section_html.js`**:
   - 為替レート基準バッジ、現地価格と日本円換算の自動計算、日本価格との比較表、絵文字アイコン、エラーネコの一言付きの美しい物価比較HTMLに自動構築。
4. **`section_wp_updater.js`**:
   - 本文内の `<!-- SECTION:bukka:START -->` ... `<!-- SECTION:bukka:END -->` 内をピンポイントで安全上書き。
5. **WordPress REST API**:
   - 投稿本文を自動更新。

---

## 🏛️ 7. 直近の動向 (⑦ doukou) セクション更新の例（直接手入力・AI修正）

1. **入力パラメータ**:
   - `section_type = 'doukou'`（または `7`, `動向`）
   - `post_id = 更新対象の投稿ID`
   - `country = 国名`
   - （手動修正の場合）フォームから以下のフィールドを入力：
     - `政治経済社会`（最新の情勢・法改正・社会問題など）
     - `驚きの統計・習慣`（文化・国民性・ライフスタイルなど）
     - `日本との関連`（外交・経済・文化交流など）
     - `出典`（メディア名やURL）
     - `neko`（エラーネコの一言）
2. **`doukou_section_html.js`**:
   - 入力された各項目を、公式デザインの `<p>【政治経済社会】</p>`、`🔍 驚きの統計・習慣：`、`🇯🇵 日本との関連：`、出典表記、エラーネコ吹き出し付きの美しい HTML セクションに自動整形。
3. **`section_wp_updater.js`**:
   - 本文内の `<!-- SECTION:doukou:START -->` ... `<!-- SECTION:doukou:END -->` タグ内をピンポイントで安全上書き。
4. **WordPress REST API**:
   - 投稿本文を自動更新（他の①〜⑥、⑧〜⑩セクションは 1文字も崩さず維持）。

