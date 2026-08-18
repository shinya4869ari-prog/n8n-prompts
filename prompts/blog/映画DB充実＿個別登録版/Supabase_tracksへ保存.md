# Supabase (tracks テーブル) への保存ノード設定ガイド

## 📌 ノード概要
* **ノード名**: `Supabase_tracksへ保存`
* **タイプ**: `Supabase` または `HTTP Request`

---

## ⚙️ 設定方法 (Supabase ノードを使用する場合)

1. **Resource**: `Row`
2. **Operation**: `Create or Update (Upsert)`
3. **Schema**: `public`
4. **Table**: `tracks`
5. **Conflict Columns**: `track_id`
6. **Fields to Send**: `Auto-Map Input Data` (または `Define Below`)

---

## 🌐 HTTP Request ノードを使用する場合（API直接投函）

* **Method**: `POST`
* **URL**: `https://uvjpiuinsgklddzhzpio.supabase.co/rest/v1/tracks`
* **Headers**:
  * `apikey`: `sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX`
  * `Authorization`: `Bearer sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX`
  * `Content-Type`: `application/json`
  * `Prefer`: `resolution=merge-duplicates`
* **Body Parameters / JSON**:
```json
{
  "track_id": {{ JSON.stringify($json.track_id) }},
  "track_name": {{ JSON.stringify($json.track_name || '') }},
  "track_name_en": {{ JSON.stringify($json.track_name_en || '') }},
  "artist_name": {{ JSON.stringify($json.artist_name || '') }},
  "artist_name_en": {{ JSON.stringify($json.artist_name_en || '') }},
  "country": {{ JSON.stringify($json.country || 'KR') }},
  "release_year": {{ JSON.stringify(String($json.release_year || '')) }},
  "preview_url": {{ JSON.stringify($json.preview_url || '') }},
  "itunes_url": {{ JSON.stringify($json.itunes_url || '') }},
  "album_cover": {{ JSON.stringify($json.album_cover || '') }},
  "description": {{ JSON.stringify($json.description || '') }},
  "ost_for": {{ JSON.stringify($json.ost_for || '') }},
  "tmdb_id": {{ $json.tmdb_id || null }},
  "wikidata_id": {{ JSON.stringify($json.wikidata_id || null) }},
  "genre": {{ JSON.stringify($json.genre || 'OST') }}
}
```
