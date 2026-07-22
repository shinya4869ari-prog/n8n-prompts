{
  "title": "{{ $('映画データ整形コード').item.json.title }}",
  "origin_title": "{{ $('映画データ整形コード').item.json.origin_title }}",
  "year": "{{ $('映画データ整形コード').item.json.year }}",
  "poster_url": "{{ $('映画データ整形コード').item.json.poster_url }}",
  "country": "{{ $('映画データ整形コード').item.json.country }}",
  "wikidata_id": "{{ $('映画データ整形コード').item.json.wikidata_id }}",
  "tmdb_id": {{ $('映画データ整形コード').item.json.tmdb_id || null }},
  "overview": "{{ (() => { try { const node = $('Ollama').item?.json; const text = node?.text || node?.content || (Array.isArray(node?.content) ? node.content[0]?.text : null); return text ? text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r') : $('映画データ整形コード').item.json.overview || ''; } catch(e) { return $('映画データ整形コード').item.json.overview || ''; } })() }}",
  "overview_en": "{{ $('映画データ整形コード').item.json.overview_en || '' }}",
  "ai_summary": "",
  "trailer_url": "{{ $('映画データ整形コード').item.json.trailer_url }}",
  "director": "{{ (() => { try { const node = $('キャスト・監督翻訳AI').item?.json; const raw = node?.text || (Array.isArray(node?.content) ? node.content[0]?.text : node?.content) || ''; const parsed = JSON.parse(raw.replace(/```json/gi, '').replace(/```/g, '').trim()); return parsed.director || $('映画データ整形コード').item.json.director || ''; } catch(e) { return $('映画データ整形コード').item.json.director || ''; } })() }}",
  "cast": "{{ (() => { try { const node = $('キャスト・監督翻訳AI').item?.json; const raw = node?.text || (Array.isArray(node?.content) ? node.content[0]?.text : node?.content) || ''; const parsed = JSON.parse(raw.replace(/```json/gi, '').replace(/```/g, '').trim()); return parsed.cast || $('映画データ整形コード').item.json.cast || ''; } catch(e) { return $('映画データ整形コード').item.json.cast || ''; } })() }}",
  "director_en": "{{ $('映画データ整形コード').item.json.director_en }}",
  "cast_en": "{{ $('映画データ整形コード').item.json.cast_en }}"
}
