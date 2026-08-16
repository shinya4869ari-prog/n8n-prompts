{
  "title": {{ JSON.stringify($json.title || '') }},
  "origin_title": {{ JSON.stringify($json.origin_title || '') }},
  "year": {{ JSON.stringify(String($json.year || '')) }},
  "country": {{ JSON.stringify($json.country || '') }},
  "genres": {{ JSON.stringify($json.genres || '') }},
  "director": {{ JSON.stringify($json.director || '') }},
  "director_en": {{ JSON.stringify($json.director_en || '') }},
  "cast": {{ JSON.stringify($json.cast || '') }},
  "cast_en": {{ JSON.stringify($json.cast_en || '') }},
  "overview": {{ JSON.stringify($json.overview || '') }},
  "overview_en": {{ JSON.stringify($json.overview_en || '') }},
  "poster_url": {{ JSON.stringify($json.poster_url || '') }},
  "trailer_url": {{ JSON.stringify($json.trailer_url || '') }},
  "imdb_id": {{ JSON.stringify($json.imdb_id || null) }},
  "imdb_url": {{ JSON.stringify($json.imdb_url || '') }},
  "tmdb_id": {{ $json.tmdb_id || null }},
  "wikidata_id": {{ JSON.stringify($json.wikidata_id || '') }}
}
