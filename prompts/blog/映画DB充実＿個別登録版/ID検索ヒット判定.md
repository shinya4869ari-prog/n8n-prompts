{{ Boolean($('TMDb検索_ID/Wikidata').first()?.json?.id || $('TMDb検索_ID/Wikidata').first()?.json?.movie_results?.[0]?.id || $('TMDb検索_ID/Wikidata').first()?.json?.tv_results?.[0]?.id) }}
