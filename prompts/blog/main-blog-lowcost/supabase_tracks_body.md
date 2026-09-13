# 🎵 Supabase tracks保存 ノード用 JSON Body 設定

以下の内容を、n8nの「Supabase tracks保存」ノードの **「JSON Body」** にそのまま貼り付けてください。
式（Expression）として評価され、どんな値（nullや未定義）が来ても100%安全にJSONが生成されます。

```json
{{
  JSON.stringify({
    track_id: String($json.track_id || ''),
    track_name: String($json.track_name || ''),
    track_name_en: String($json.track_name_en || ''),
    artist_name: String($json.artist_name || ''),
    artist_name_en: String($json.artist_name_en || ''),
    country: String($json.country || 'ID'),
    release_year: String($json.release_year || ''),
    preview_url: String($json.preview_url || ''),
    itunes_url: String($json.itunes_url || ''),
    album_cover: String($json.album_cover || ''),
    description: String($json.description || ''),
    ost_for: String($json.ost_for || ''),
    tmdb_id: $json.tmdb_id ? Number($json.tmdb_id) : null,
    wikidata_id: $json.wikidata_id ? String($json.wikidata_id) : null,
    genre: String($json.genre || 'OST')
  })
}}
```
