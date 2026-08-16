{{ (() => {
  const d = $('TMDb検索_ID/Wikidata').first()?.json || $('TMDb検索_ID/Wikidata').item?.json || $input.first()?.json || {};
  const hasMovie = (d.movie_results && d.movie_results.length > 0 && d.movie_results[0].id);
  const hasTv = (d.tv_results && d.tv_results.length > 0 && d.tv_results[0].id);
  const hasDirectId = !!d.id;
  return !!(hasMovie || hasTv || hasDirectId);
})() }}
