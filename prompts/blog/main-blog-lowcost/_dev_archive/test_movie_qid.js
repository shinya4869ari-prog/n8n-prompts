async function test() {
  const movies = [
    { title: 'タクシー運転手 ～約束は海を越えて～', origin: '택시운전사', tmdb: 437068 },
    { title: '1987、ある闘いの真実', origin: '1987: When the Day Comes', tmdb: 491418 },
    { title: 'パラサイト 半地下の家族', origin: '기생충', tmdb: 496243 }
  ];

  for (const m of movies) {
    // 1. SPARQL lookup by TMDb ID (P4983)
    const sparql = `SELECT ?m WHERE { ?m wdt:P4983 "${m.tmdb}" . } LIMIT 1`;
    const sqUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
    const sqRes = await fetch(sqUrl, {
      headers: {
        'User-Agent': 'NationalScalesBot/1.0 (contact@example.com)',
        'Accept': 'application/sparql-results+json'
      }
    }).then(r => r.json()).catch(e => ({}));

    const qidFromTmd = sqRes.results?.bindings?.[0]?.m?.value?.split('/')?.pop();
    console.log(`${m.title} (TMDb: ${m.tmdb}) => Wikidata QID via TMDb ID: ${qidFromTmd || 'none'}`);

    // 2. Search by Hangul / Japanese title
    if (!qidFromTmd) {
      const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(m.origin || m.title)}&language=ko&limit=3&format=json`;
      const sRes = await fetch(searchUrl, {
        headers: { 'User-Agent': 'NationalScalesBot/1.0 (contact@example.com)' }
      }).then(r => r.json()).catch(() => ({}));
      const firstHit = sRes.search?.[0]?.id;
      console.log(`   Fallback Search QID: ${firstHit || 'none'}`);
    }
  }
}
test();
