https://api.themoviedb.org/3/{{ $('Loop Over Items').item.json.tmdb_id ? 'movie/' + $('Loop Over Items').item.json.tmdb_id : 'find/' + $('Wikidata検索').item.json.search[0].id }}

{{
  $('Loop Over Items').item.json.tmdb_id
  ? JSON.stringify({
      "language": "ja-JP",
      "append_to_response": "translations,external_ids"
    })
  : JSON.stringify({
      "external_source": "wikidata_id",
      "language": "ja-JP"
    })
}}
