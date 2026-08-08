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
| `track_name` | `text` | 曲名 |
| `artist_name` | `text` | アーティスト名 (表示用) |
| `person_id` | `uuid` / `integer` | `persons.id` への Foreign Key (歴史館紐付け用) |
| `country` | `text` | 対象国名 |
| `release_year` | `text` | リリース年 (例: 2026) |
| `preview_url` | `text` | 30秒音声試聴URL |
| `itunes_url` | `text` | Apple Music / iTunes リンク |
| `album_cover` | `text` | 600×600 高画質ジャケットURL |
| `description` | `text` | AI選定解説文 |
| `created_at` | `timestamp` | 保存日時 |

---

## ⚙️ 2. n8n 音楽検索ワークフローでの Supabase 保存設定

`Music_AI_Screener`（AIノード）の直後に **`Supabase` ノード** を追加します。

### n8n Supabase ノード設定パラメータ
- **Resource**: `Database`
- **Operation**: `Upsert` (重複があれば上書き、無ければ新規挿入)
- **Table**: `tracks`
- **Matching Column**: `track_id`

### データのマッピングJSON (n8n Expression)

```json
{
  "track_id": "={{ $json.track_id }}",
  "track_name": "={{ $json.track_name }}",
  "artist_name": "={{ $json.artist_name }}",
  "country": "={{ $('iTunes検索_クエリ作成').first().json.countryJa }}",
  "release_year": "={{ $json.release_year }}",
  "preview_url": "={{ $json.preview_url }}",
  "itunes_url": "={{ $json.itunes_url }}",
  "album_cover": "={{ $json.album_cover }}",
  "description": "={{ $json.description }}"
}
```

---

## 🔗 3. 歴史館ツール（Wiki）との連動ロジック

1. **ブログ ➔ 歴史館ツールへジャンプ**:
   - ブログの音楽カードに表示されている `https://map.seronworks.dev/?mode=music&q=TrackID` をクリック。
2. **歴史館ツール内での深掘り探索**:
   - `tracks.track_id` から `person_id` を参照。
   - その `person_id` が持つ **「他の参加楽曲」「ソロ曲」「出演映画 (`movies.cast`)」** をSupabaseから一括取得し、無限に辿れるナレッジグラフ画面を表示。
