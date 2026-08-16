【n8n JSONモード用（丸ごとコピペOK）】
※映画（P4947）とドラマ・シリーズ（P4983）の両対応版

```json
{
  "action": "query",
  "list": "search",
  "srsearch": "haswbstatement:P4947={{ $json.tmdb_id }}|P4983={{ $json.tmdb_id }}",
  "format": "json"
}
```
