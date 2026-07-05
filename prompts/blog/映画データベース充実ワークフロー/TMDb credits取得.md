https://api.themoviedb.org/3/movie/{{ (() => { const tmdb = $('TMDb検索').first().json; const sourceData = $('Loop Over Items').first().json; const resultsList = tmdb.results || tmdb.movie_results || (tmdb.id ? [tmdb] : []); let result = resultsList.length > 0 ? resultsList.find(m => (m.original_language === sourceData.target_lang) || (m.origin_country && m.origin_country.includes(sourceData.target_country))) : null; if (!result && resultsList.length > 0) { result = resultsList[0]; } return result?.id || ''; })() }}/credits

{{
  JSON.stringify({
    "language": "ja-JP"
  })
}}
