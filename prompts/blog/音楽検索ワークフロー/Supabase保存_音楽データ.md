# 【Supabase 音楽データ保存 & 歴史館ツール（ID統合）連携ガイド】

このドキュメントは、音楽検索ワークフローで取得・AIスクリーニングした楽曲データを **Supabase** に自動保存し、**「歴史館ツール（ナレッジグラフWiki）」** と相互リンクさせるためのDB設計およびn8n設定ガイドです。

---

## 🏛️ 1. データベース設計（Supabase テーブル構造）

歴史館ツールで「人物（監督・キャスト・アーティスト・グループ）」を中心に映画と音楽を網の目のように繋ぐため、**「人物（persons）ハブ構造」** を採用します。

### ① `persons` テーブル（人物ハブ - ID統合マッピング）
映画監督、キャスト、K-POPメンバー、ソロアーティストを1つのIDで統合管理します。

| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | `uuid` / `serial` | **Primary Key (歴史館共通 Person ID)** |
| `name` | `text` | 名前（日本語 / 例: パク・ソジュン, V） |
| `name_en` | `text` | 英語名 / 本名 (例: Park Seo-jun, Kim Tae-hyung) |
| `tmdb_person_id` | `integer` | TMDbの人物ID (映画用) |
| `itunes_artist_id` | `text` | iTunesのアーティストID |
| `mbid` | `text` | MusicBrainz ID (グループ・メンバー関係用) |
| `profile_img` | `text` | 顔写真・画像URL |
| `country` | `text` | 国名 (例: 韓国) |

---

### ② `tracks` テーブル（楽曲データベース）
音楽検索サブワークフローから届いたデータを保存・蓄積します。

| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `track_id` | `text` | **Primary Key (iTunes Track ID)** |
| `track_name` | `text` | 曲名 (現地語表記) |
| `track_name_en` | `text` | 曲名 (英語表記) |
| `artist_name` | `text` | アーティスト名 (現地語表記 / 表示用) |
| `artist_name_en` | `text` | アーティスト名 (英語表記) |
| `person_id` | `uuid` / `integer` | `persons.id` への Foreign Key (歴史館紐付け用) |
| `country` | `text` | 対象国名・国コード |
| `release_year` | `text` | リリース年 (例: 2026) |
| `preview_url` | `text` | 30秒音声試聴URL |
| `itunes_url` | `text` | Apple Music / iTunes リンク |
| `album_cover` | `text` | 600×600 高画質ジャケットURL |
| `description` | `text` | AI選定解説文 |
| `created_at` | `timestamp` | 保存日時 |

---

## ⚙️ 2. n8n 音楽検索ワークフローでの Supabase 保存設定

`Music_AI_Screener`（AIノード）の直後に保存ノードを追加します。

### パターンA：n8nの `Supabase` ノードを使う場合

1. **新規登録の場合**:
   - **Resource**: `Row`
   - **Operation**: `Create`
   - **Table**: `tracks`

2. **既存レコードの更新の場合**:
   - **Resource**: `Row`
   - **Operation**: `Update`
   - **Table**: `tracks`
   - **Must Match**: `track_id`

---

### パターンB：既存の映画保存と同じ `HTTP Request` ノードを使う場合（推奨・完全自動アップサート）

HTTP POST に `Prefer: resolution=merge-duplicates` ヘッダーを付与することで、**「存在しなければ新規追加、存在すれば上書き（Upsert）」** が1発で実行できます。

- **Method**: `POST`
- **URL**: `https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/rest/v1/tracks`
- **Headers**:
  - `Prefer`: `resolution=merge-duplicates` 👈 **(これで完全Upsert動作になります)**
  - `apikey`: `<YOUR_SUPABASE_ANON_OR_SERVICE_KEY>`
  - `Authorization`: `Bearer <YOUR_SUPABASE_ANON_OR_SERVICE_KEY>`
  - `Content-Type`: `application/json`

### データのマッピングJSON (Body)

#### 共通：一番簡単な貼り付け方法（標準JSONモード用）
`JSON Body` の入力欄にそのまま貼り付けます（Expressionボタンを押す必要はありません）：

```json
{
  "track_id": "={{ String($json.track_id || '') }}",
  "track_name": "={{ $json.track_name || '' }}",
  "track_name_en": "={{ ($json.track_name_en && $json.track_name_en.trim().toLowerCase() !== String($json.track_name || '').trim().toLowerCase()) ? $json.track_name_en : '' }}",
  "artist_name": "={{ $json.artist_name || '' }}",
  "artist_name_en": "={{ ($json.artist_name_en && $json.artist_name_en.trim().toLowerCase() !== String($json.artist_name || '').trim().toLowerCase()) ? $json.artist_name_en : '' }}",
  "country": "={{ $('country-master-lookup').first()?.json?.countryCode || $('iTunes検索_クエリ作成').first()?.json?.countryCode || 'KR' }}",
  "release_year": "={{ String($json.release_year || '') }}",
  "preview_url": "={{ $json.preview_url || '' }}",
  "itunes_url": "={{ $json.itunes_url || '' }}",
  "album_cover": "={{ $json.album_cover || '' }}",
  "description": "={{ $json.description || '' }}"
}
```

※ もし `Expression` モード（`{{ }}` タブ）を有効にして設定する場合は、以下の1行式を貼り付けます：

```json
={{ JSON.stringify({ "track_id": String($json.track_id || ''), "track_name": $json.track_name || '', "track_name_en": ($json.track_name_en && $json.track_name_en.trim().toLowerCase() !== String($json.track_name || '').trim().toLowerCase()) ? $json.track_name_en : '', "artist_name": $json.artist_name || '', "artist_name_en": ($json.artist_name_en && $json.artist_name_en.trim().toLowerCase() !== String($json.artist_name || '').trim().toLowerCase()) ? $json.artist_name_en : '', "country": $('country-master-lookup').first()?.json?.countryCode || $('iTunes検索_クエリ作成').first()?.json?.countryCode || 'KR', "release_year": String($json.release_year || ''), "preview_url": $json.preview_url || '', "itunes_url": $json.itunes_url || '', "album_cover": $json.album_cover || '', "description": $json.description || '' }) }}
```

---

## 🔗 3. 歴史館ツール（Wiki）との連動ロジック

1. **ブログ ➔ 歴史館ツールへジャンプ**:
   - ブログの音楽カードに表示されている `https://map.seronworks.dev/?mode=music&q=TrackID` をクリック。
2. **歴史館ツール内での深掘り探索**:
   - `tracks.track_id` から `person_id` を参照。
   - その `person_id` が持つ **「他の参加楽曲」「ソロ曲」「出演映画 (`movies.cast`)」** をSupabaseから一括取得し、無限に辿れるナレッジグラフ画面を表示。
