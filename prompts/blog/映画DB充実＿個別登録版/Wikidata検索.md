【n8n JSONモード用（丸ごとコピペOK）】

```json
{
  "action": "wbsearchentities",
  "search": "{{ $('入力統一・分割コード').item?.json?.origin_title || $('入力統一・分割コード').item?.json?.title || $('On form submission1').item?.json?.origin_title || $('On form submission1').item?.json?.title || $json.title || '' }}",
  "language": "{{ $('入力統一・分割コード').item?.json?.target_lang || $('On form submission1').item?.json?.target_lang || 'ja' }}",
  "type": "item",
  "format": "json",
  "limit": "3"
}
```
