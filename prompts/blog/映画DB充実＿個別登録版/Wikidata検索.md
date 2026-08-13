{
  "action": "wbsearchentities",
  "search": "{{ $json.search_key || $json.name_en || $json.name || '' }}",
  "language": "ko",
  "type": "item",
  "format": "json",
  "limit": "3"
}
