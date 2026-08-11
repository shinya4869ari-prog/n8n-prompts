# Supabase UPDATE ノード設定（補完後・完全版保存）

## ノード種別
HTTP Request ノード（PATCH / UPDATE）

## URL
```
https://[YOUR_SUPABASE_URL]/rest/v1/Movies?tmdb_id=eq.{{ $json.tmdb_id }}
```

※ tmdb_id が null の場合は wikidata_id で照合：
```
https://[YOUR_SUPABASE_URL]/rest/v1/Movies?wikidata_id=eq.{{ $json.wikidata_id }}
```

## Method
`PATCH`

## Headers
```json
{
  "apikey": "[YOUR_SUPABASE_ANON_KEY]",
  "Authorization": "Bearer [YOUR_SUPABASE_ANON_KEY]",
  "Content-Type": "application/json",
  "Prefer": "return=representation"
}
```

## Body (JSON)
```json
{
  "title": "{{ $json.title }}",
  "origin_title": "{{ $json.origin_title }}",
  "year": "{{ $json.year }}",
  "country": "{{ $json.country }}",
  "genres": "{{ $json.genres }}",
  "director": "{{ $json.director }}",
  "director_en": "{{ $json.director_en }}",
  "cast": "{{ $json.cast }}",
  "cast_en": "{{ $json.cast_en }}",
  "overview": "{{ $json.overview }}",
  "overview_en": "{{ $json.overview_en }}",
  "poster_url": "{{ $json.poster_url }}",
  "trailer_url": "{{ $json.trailer_url }}",
  "tmdb_id": {{ $json.tmdb_id || null }},
  "wikidata_id": "{{ $json.wikidata_id }}"
}
```

---

## ワークフロー接続順序（充実 + 補完 統合フロー）

```
[On form submission]
       │
[入力統一・分割コード]
       │
[Wikidata検索] → [Wiki検索ヒット判定]
       │
[TMDb検索_ID/Wikidata] または [TMDb検索_タイトル]
       │
[ID検索ヒット判定]
       │
[TMDb検索] → [TMDb credits取得]
       │
[Brave Search_trailer]
       │
[Supabaseから既存データを取得]
       │
[映画データ整形コード_claude]
       │
[キャスト・監督翻訳AI] (Claude or Gemini)
       │
[Brave Search_movie]  ←── Gemini あらすじ生成のコンテキスト用
       │
[gemini_movie_db] ← 新規追加: Gemini があらすじ日本語生成
       │
[あらすじあり？] (If/Else 判定)
       │
[Supabaseへ保存] (POST / INSERT) ← 初回保存
       │
[補完ブリッジ整形コード] ← 新規追加: INSERT 後のデータを補完用に整形
       │
[PromptLoader_MovieAudit] ← 映画データ補完ワークフローから流用
       │
[Gemini 補完ノード] ← gemini_prompt.md を System Prompt に設定
       │
[補完結果整形コード] ← 映画データ補完ワークフローから流用
       │
[Supabase UPDATE（完全版）] ← このノード（PATCH で上書き）
```

---

## 注意点
- `Supabaseから既存データを取得` ノードの Settings で **Always Output Data = ON** にすること（新規映画でも止まらないように）
- `Supabaseへ保存` は INSERT（POST）、`Supabase UPDATE（完全版）` は UPDATE（PATCH）
- 補完 Gemini は Gemini 2.5 Pro / Flash 推奨（長いJSONを処理するため）
