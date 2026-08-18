async function test() {
  const sparql = `SELECT DISTINCT ?movie ?movieLabel ?year ?poster WHERE {
    wd:Q497041 ^wdt:P161 ?movie .
    OPTIONAL { ?movie wdt:P577 ?date. BIND(YEAR(?date) AS ?year) }
    OPTIONAL { ?movie wdt:P18 ?poster . }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,en,ko". }
  } ORDER BY DESC(?year) LIMIT 15`;

  const r = await fetch('https://query.wikidata.org/sparql?query=' + encodeURIComponent(sparql) + '&format=json', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const data = await r.json();
  console.log(JSON.stringify(data.results.bindings.map(b => ({
    id: b.movie?.value?.split('/').pop(),
    title: b.movieLabel?.value,
    year: b.year?.value
  })), null, 2));
}
test();
