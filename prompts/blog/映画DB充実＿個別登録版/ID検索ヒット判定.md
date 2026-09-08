{{ ($('TMDb検索_ID/Wikidata').first()?.json?.movie_results?.length || 0) + ($('TMDb検索_ID/Wikidata').first()?.json?.tv_results?.length || 0) + ($('TMDb検索_ID/Wikidata').first()?.json?.id ? 1 : 0) }}
