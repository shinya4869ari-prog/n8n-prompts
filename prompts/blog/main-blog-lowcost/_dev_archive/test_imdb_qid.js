async function test() {
  const item = {
    title: 'タクシー運転手 ～約束は海を越えて～',
    origin_title: '택시운전사',
    tmdb_id: 437068,
    imdb_url: 'https://www.imdb.com/title/tt6878306/'
  };

  // Method 1: Search by IMDb ID (wdt:P345) -> 100% exact match for any movie on Earth!
  const imdbId = item.imdb_url ? item.imdb_url.match(/tt\d+/)?.[0] : null;
  console.log('IMDb ID:', imdbId);
  if (imdbId) {
    const sparql = `SELECT ?m WHERE { ?m wdt:P345 "${imdbId}" . } LIMIT 1`;
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'NationalScalesBot/1.0 (contact@example.com)', 'Accept': 'application/sparql-results+json' } }).then(r => r.json()).catch(() => ({}));
    const qid = res.results?.bindings?.[0]?.m?.value?.split('/')?.pop();
    console.log('QID via IMDb ID:', qid);
  }

  // Method 2: TMDb movie external ID (P4983)
  if (item.tmdb_id) {
    const sparql = `SELECT ?m WHERE { ?m wdt:P4983 "${item.tmdb_id}" . } LIMIT 1`;
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'NationalScalesBot/1.0 (contact@example.com)', 'Accept': 'application/sparql-results+json' } }).then(r => r.json()).catch(() => ({}));
    const qid = res.results?.bindings?.[0]?.m?.value?.split('/')?.pop();
    console.log('QID via TMDb ID:', qid);
  }

  // Method 3: wbsearchentities
  const sUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(item.origin_title)}&language=ko&limit=5&format=json`;
  const sRes = await fetch(sUrl, { headers: { 'User-Agent': 'NationalScalesBot/1.0 (contact@example.com)' } }).then(r => r.json()).catch(() => ({}));
  console.log('wbsearchentities results:');
  (sRes.search || []).forEach(s => console.log(`  ${s.id}: ${s.label} (${s.description})`));
}
test();
