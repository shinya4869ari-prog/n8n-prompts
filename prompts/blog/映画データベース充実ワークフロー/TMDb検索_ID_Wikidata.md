https://api.themoviedb.org/3/{{ $('Loop Over Items').first().json.tmdb_id ? 'movie/' + $('Loop Over Items').first().json.tmdb_id : 'find/' + $('Wikidata検索').first().json.search[0].id }}

{{
  $('Loop Over Items').first().json.tmdb_id
  ? JSON.stringify({
      "language": "ja-JP",
      "append_to_response": "translations"
    })
  : JSON.stringify({
      "external_source": "wikidata_id",
      "language": "ja-JP"
    })
}}
