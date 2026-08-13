【TMDb検索_ID_Wikidata ノード設定用】

### 1. URL 欄に貼る文字列（URL Expression）

```text
https://api.themoviedb.org/3/{{ ($json.search?.[0]?.title || $json.search?.[0]?.id || $json.query?.search?.[0]?.title || $json.qid) ? ('find/' + ($json.search?.[0]?.title || $json.search?.[0]?.id || $json.query?.search?.[0]?.title || $json.qid)) : ( $('入力統一・分割コード').item?.json?.tmdb_id ? ('movie/' + $('入力統一・分割コード').item.json.tmdb_id) : 'find/Q18652415' ) }}
```

---

### 2. Query Parameters 欄（JSON モード用）

```json
{
  "external_source": "wikidata_id",
  "language": "{{ $('入力統一・分割コード').item?.json?.target_lang || $('On form submission1').item?.json?.target_lang || 'ja' }}"
}
```
