# 【国家の天秤】Supabase ID管理 & 歴史館ツール完全連動構想（マスター設計書）

このドキュメントは、「ブログ（WordPress/n8n）」と「Webアプリ（歴史館ツール）」を **Supabase ID管理（TMDb ID / iTunes ID / Person ID）** で100%正確に接続し、同姓同名や表記揺れによる誤爆（違う監督・アーティストの混同）を完全にゼロにするためのアーキテクチャ設計書です。

---

## 🎯 1. なぜ ID 管理 ＋ Supabase なのか？

| | ❌ 従来の文字列（名前）検索 | ⭕ Supabase ＋ ID管理（完全一致） |
| :--- | :--- | :--- |
| **例: 「V」** | 同姓同名の海外バンドや他ジャンルが大量混ざる | BTSのV（Spotify/iTunes ID: `3Nrf12...`）だけが100%ヒット |
| **例: 「パク・チャヌク」** | 他の「パク・チャヌク」や解説文中の同名テキストが誤爆 | パク・チャヌク監督（TMDb Person ID: `10738`）の作品のみ表示 |
| **検索速度** | 毎回外部ネット検索・AI呼び出し（数秒〜十数秒） | Supabaseから1秒以内でキャッシュ高速呼び出し |
| **APIコスト** | 毎回API実行でコスト＆クオータ消費 | 初回保存後は自前DBから呼び出し（コスト最小化） |

---

## 🏛️ 2. 全体データ連携フロー

```text
【ブログ記事 (WordPress)】
  │ 記事内の映画・音楽・人物リンクに IDパラメータを埋め込み
  │ 例: https://map.seronworks.dev/?mode=music&track_id=15928374
  │ 例: https://map.seronworks.dev/?mode=person&tmdb_person_id=10738
  ▼
【Webアプリ (歴史館ツール / map.seronworks.dev)】
  │ ① URLクエリパラメータの ID で Supabase を検索
  │
  ├─ ⭕ Supabaseにデータあり (Hit)
  │    └─ 100%正確な作品・人物データを1秒で高速表示（誤爆ゼロ！）
  │
  └─ ❌ Supabaseにデータなし (Miss)
       └─ バックエンド/n8nで外部検索API (iTunes API / TMDb API) を実行
       └─ 正確なID付きデータを Supabase へ自動保存 (次回から爆速キャッシュ)
```

---

## 🗄️ 3. Supabase テーブル構造（ID設計）

### ① `persons` テーブル (人物共通ハブ)
- `id` (UUID / Serial, PK): 歴史館内共通Person ID
- `tmdb_person_id` (Integer): TMDbの人名ID (映画用)
- `itunes_artist_id` (Text): iTunesのアーティストID (音楽用)
- `name` (Text): 日本語表記 (例: パク・ソジュン)
- `name_en` (Text): 英語表記 (例: Park Seo-jun)
- `profile_img` (Text): 画像URL

### ② `movies` テーブル (映画データベース)
- `tmdb_id` (Integer, PK): TMDb映画ID
- `title` (Text): タイトル日本語
- `origin_title` (Text): 原題
- `director_person_id` (FK): `persons.id`
- `poster_url` (Text): ポスター画像
- `trailer_url` (Text): YouTube予告編

### ③ `tracks` テーブル (音楽データベース)
- `track_id` (Text, PK): iTunes Track ID
- `track_name` (Text): 曲名
- `artist_name` (Text): アーティスト名
- `artist_person_id` (FK): `persons.id`
- `country` (Text): 国名
- `preview_url` (Text): 30秒音声試聴URL
- `album_cover` (Text): 600×600 ジャケット画像URL
- `itunes_url` (Text): Apple Musicリンク

---

## 🤖 4. Webアプリ側への開発指示プロンプト（AI引き継ぎ用）

Webアプリ（歴史館）の開発時、以下のプロンプトをそのままAIへ渡すことで一発で意図が伝わります。

```text
「ブログから TMDb ID や iTunes Track ID（tmdb_id, track_id, person_id 等）をURLのクエリパラメータで受け取れるようにして、まず Supabase のデータベースを ID で優先検索する仕組みにして。Supabase にデータがない場合だけ外部API/ネット検索を叩いて、取得した結果を Supabase に自動保存するように改修して！」
```

---

## 📋 5. タスクロードマップ（今後の進め方）

1. **ブログ側 (n8n)**:
   - iTunes API検索結果（`track_id`, `artist_id`）および TMDb API検索結果（`tmdb_id`, `tmdb_person_id`）を `music_section_html.js` / `movie_section_html.js` 内のリンクにIDとして埋め込む。
   - `music_section_html` および `movie_section_html` から Supabase ノードを通して `tracks` / `movies` テーブルへ自動 Upsert。
2. **歴史館Webアプリ側**:
   - `id` パラメータ判定 ➔ Supabase優先検索 ➔ フォールバック検索＆保存のルーティングを構築。
