{
  "title": "{{ (() => { try { const node = $('キャスト・監督翻訳AI').item?.json; const raw = node?.text || (Array.isArray(node?.content) ? node.content[0]?.text : node?.content) || ''; const parsed = JSON.parse(raw.replace(/```json/gi, '').replace(/```/g, '').trim()); return parsed.title || $('映画データ整形コード_claude').item.json.title || ''; } catch(e) { return $('映画データ整形コード_claude').item.json.title || ''; } })() }}",
  "origin_title": "{{ $('映画データ整形コード_claude').item.json.origin_title }}",
  "year": "{{ $('映画データ整形コード_claude').item.json.year }}",
  "poster_url": "{{ $('映画データ整形コード_claude').item.json.poster_url }}",
  "country": "{{ $('映画データ整形コード_claude').item.json.country }}",
  "wikidata_id": "{{ $('映画データ整形コード_claude').item.json.wikidata_id }}",
  "tmdb_id": {{ $('映画データ整形コード_claude').item.json.tmdb_id || null }},
  "overview": "{{ $('映画データ整形コード_claude').item.json.overview || '' }}",
  "overview_en": "{{ (() => { try { const node = $('翻訳用AIノード').item?.json; const text = node?.text || node?.output || (Array.isArray(node?.content) ? node.content[0]?.text : null); if (!text) return ''; return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r'); } catch(e) { return ''; } })() }}",
  "ai_summary": "{{ (() => { try { const node = $('claude_movie_db').item?.json || $('Ollama').item?.json; const text = node?.text || node?.output || (Array.isArray(node?.content) ? node.content[0]?.text : null); if (!text) return ''; return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r'); } catch(e) { return ''; } })() }}",
  "trailer_url": "{{ $('映画データ整形コード_claude').item.json.trailer_url }}",
  "director": "{{ (() => { try { const node = $('キャスト・監督翻訳AI').item?.json; const raw = node?.text || (Array.isArray(node?.content) ? node.content[0]?.text : node?.content) || ''; const parsed = JSON.parse(raw.replace(/```json/gi, '').replace(/```/g, '').trim()); return parsed.director || $('映画データ整形コード_claude').item.json.director || ''; } catch(e) { return $('映画データ整形コード_claude').item.json.director || ''; } })() }}",
  "cast": "{{ (() => { try { const node = $('キャスト・監督翻訳AI').item?.json; const raw = node?.text || (Array.isArray(node?.content) ? node.content[0]?.text : node?.content) || ''; const parsed = JSON.parse(raw.replace(/```json/gi, '').replace(/```/g, '').trim()); return parsed.cast || $('映画データ整形コード_claude').item.json.cast || ''; } catch(e) { return $('映画データ整形コード_claude').item.json.cast || ''; } })() }}",
  "director_en": "{{ $('映画データ整形コード_claude').item.json.director_en }}",
  "cast_en": "{{ $('映画データ整形コード_claude').item.json.cast_en }}"
}
