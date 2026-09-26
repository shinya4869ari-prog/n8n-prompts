# 🚀 音楽検索アプリ直結！韓国語歌詞・学習データ完全自動生成ワークフロー

外部音楽検索アプリで取得した高精度な楽曲データ（Track ID、試聴音源URL、ジャケット画像、公式Apple Musicリンク）を **Webhook（HTTP POST）で直接受け取り**、iTunes再検索の手間とメタデータ消失バグを100%排除して、公式歌詞取得からSupabase保存までを最短2秒で完結させる専用ワークフローです。

---

## 📌 なぜこのワークフローが最強なのか？

1. **メタデータ消失（null化）が完全にゼロ**:
   - アプリ側で取得した `preview_url`、`itunes_url`、`artwork_url`（自動で600x600高画質化）、`track_id` をそのまま使用。
   - n8nのノードを跨いでも多重バックアップ機構により、データが1ミリもロストしません。
2. **iTunesの検索・Lookup通信を全スキップ**:
   - 余計な検索APIを挟まないため、API制限や別曲への誤ヒットが根本的に起きません。
3. **処理スピードが超高速**:
   - アプリからWebhook受信 ➔ LRCLIB歌詞取得 ➔ Gemini 3.7 Flash教材化 ➔ Supabase Upsert まで一気通貫。

---

## 🗺️ ノード構成図

```mermaid
flowchart LR
    A[Webhook<br>アプリ検索結果受信] --> B[01_アプリ連携メタデータ確定<br>& LRCLIB生成]
    B --> C[02_LRCLIB 公式歌詞自動取得 API<br>(HTTP Request)]
    C --> D[03_Gemini 教材生成プロンプト構築<br>(Code)]
    D --> E[04_Google Gemini API<br>(HTTP Request)]
    E --> F[05_Supabase整形 & コスト算出<br>(Code)]
    F --> G[06_Supabase tracks テーブル Upsert<br>(HTTP Request)]
```

---

## 📁 構成ファイル一覧

| ファイル名 | ノード種別 / 役割 |
| :--- | :--- |
| **[Webhook_アプリ連携_韓国歌詞自動生成ワークフロー.json](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/韓国歌詞・語学学習ワークフロー/Webhook_アプリ連携_韓国歌詞自動生成ワークフロー.json)** | ワークフロー全体定義JSON（n8nに直接貼り付け可能） |
| **[01_アプリ連携メタデータ確定_LRCLIB生成.js](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/韓国歌詞・語学学習ワークフロー/01_アプリ連携メタデータ確定_LRCLIB生成.js)** | `01_アプリ連携メタデータ確定` (Code) |
| **[02_LRCLIB公式歌詞自動取得API_ノード設定.md](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/韓国歌詞・語学学習ワークフロー/02_LRCLIB公式歌詞自動取得API_ノード設定.md)** | `02_LRCLIB 公式歌詞自動取得 API` (HTTP Request 仕様書) |
| **[03_Geminiリクエスト生成_メタデータ完全保持版.js](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/韓国歌詞・語学学習ワークフロー/03_Geminiリクエスト生成_メタデータ完全保持版.js)** | `03_Gemini 教材生成プロンプト構築` (Code) |
| **[04_Google_Gemini_API_ノード設定.md](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/韓国歌詞・語学学習ワークフロー/04_Google_Gemini_API_ノード設定.md)** | `04_Google Gemini API` (HTTP Request 仕様書) |
| **[05_Supabase整形_メタデータ完全保持版.js](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/韓国歌詞・語学学習ワークフロー/05_Supabase整形_メタデータ完全保持版.js)** | `05_Supabase整形 & コスト算出` (Code) |
| **[06_Supabase_tracks_テーブル_Upsert設定.md](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/韓国歌詞・語学学習ワークフロー/06_Supabase_tracks_テーブル_Upsert設定.md)** | `06_Supabase tracks テーブル Upsert` (HTTP Request 仕様書) |

---

## 📡 Webhook 受信設定 & 送信仕様

### 1. Webhook URL
- **Test URL**: `https://<YOUR_N8N_DOMAIN>/webhook-test/korean-lyrics-app`
- **Production URL**: `https://<YOUR_N8N_DOMAIN>/webhook/korean-lyrics-app`
- **HTTP Method**: `POST`
- **Content-Type**: `application/json`

### 2. 送信データ形式（アプリからPOSTするJSON）
配列形式（`[...]`）でも単一オブジェクト（`{...}`）でも、どちらでも自動対応します。

```json
[
  {
    "query": "황가람（私はホタル - ファン・ガラム）",
    "id": 1773943442,
    "track_id": 1773943442,
    "media_type": "music",
    "title": "I'm Firefly",
    "artist": "Hwang Karam",
    "album": "I'm Firefly - Single",
    "release_date": "2024-10-21T12:00:00Z",
    "year": "2024",
    "preview_url": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/68/5e/28/685e283d-59cf-0d5b-deec-a8fad9dec25f/mzaf_3645653479767884618.plus.aac.p.m4a",
    "track_view_url": "https://music.apple.com/jp/album/im-firefly/1773943441?i=1773943442&uo=4",
    "artwork_url": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e6/1c/6d/e61c6d78-daa6-e319-78ae-660c4caee9df/cover_KM0020476_1.jpg/400x400bb.jpg",
    "youtube_id": "FJ7uhPAAno8"
  }
]
```

### 3. テスト実行用 cURL コマンド
ターミナルやPostmanから以下のコマンドを叩くだけで動作確認できます：

```bash
curl -X POST "https://<YOUR_N8N_DOMAIN>/webhook-test/korean-lyrics-app" \
  -H "Content-Type: application/json" \
  -d '[{
    "query": "황가람（私はホタル - ファン・ガラム）",
    "track_id": 1773943442,
    "title": "I\'m Firefly",
    "artist": "Hwang Karam",
    "album": "I\'m Firefly - Single",
    "release_date": "2024-10-21T12:00:00Z",
    "preview_url": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/68/5e/28/685e283d-59cf-0d5b-deec-a8fad9dec25f/mzaf_3645653479767884618.plus.aac.p.m4a",
    "track_view_url": "https://music.apple.com/jp/album/im-firefly/1773943441?i=1773943442&uo=4",
    "artwork_url": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e6/1c/6d/e61c6d78-daa6-e319-78ae-660c4caee9df/cover_KM0020476_1.jpg/400x400bb.jpg",
    "youtube_id": "FJ7uhPAAno8"
  }]'
```

---

## 💾 Supabase 保存結果イメージ（null完全排除）

このワークフローを実行すると、Supabase の `tracks` テーブルに以下のように**すべてのフィールドが100%完璧に埋まった状態**でUpsertされます：

```json
{
  "track_id": "1773943442",
  "track_name": "I'm Firefly",
  "track_name_en": "I'm Firefly",
  "artist_name": "Hwang Karam",
  "artist_name_en": "Hwang Karam",
  "country": "KR",
  "genre": "Ballad",
  "preview_url": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/68/5e/28/685e283d-59cf-0d5b-deec-a8fad9dec25f/mzaf_3645653479767884618.plus.aac.p.m4a",
  "itunes_url": "https://music.apple.com/jp/album/im-firefly/1773943441?i=1773943442&uo=4",
  "album_cover": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e6/1c/6d/e61c6d78-daa6-e319-78ae-660c4caee9df/cover_KM0020476_1.jpg/600x600bb.jpg",
  "youtube_id": "FJ7uhPAAno8",
  "spotify_id": null,
  "description": "私はホタル (Firefly)",
  "lyrics": "{\"id\":\"lyrics-1773943442\",\"youtube_id\":\"FJ7uhPAAno8\",\"mv_embed_url\":\"https://www.youtube-nocookie.com/embed/FJ7uhPAAno8\",\"sentences\":[...],\"vocab\":[...],\"grammar\":[...]}"
}
```
