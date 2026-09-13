async function searchWikidataForSister() {
  console.log("=== 1. Checking Wikidata by TMDb ID 1394098 (P4947) ===");
  const sparqlTmdb = `
    SELECT ?item ?itemLabel ?itemDescription WHERE {
      ?item wdt:P4947 "1394098" .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,ko,en". }
    }
  `;
  const urlTmdb = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlTmdb)}&format=json`;
  const rTmdb = await fetch(urlTmdb, { headers: { 'User-Agent': 'AntigravityBot/1.0' } }).then(r => r.json()).catch(e => ({ results: { bindings: [] } }));
  console.log("SPARQL P4947 result:", JSON.stringify(rTmdb.results.bindings, null, 2));

  console.log("\n=== 2. Checking Wikidata by Korean Title '시스터' ===");
  const wbRes = await fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent('시스터')}&language=ko&type=item&limit=15&format=json&origin=*`).then(r => r.json());
  console.log("Search '시스터' result count:", wbRes.search?.length);
  for (const s of (wbRes.search || [])) {
    console.log(`- ${s.id}: ${s.label} (${s.description || 'no desc'})`);
  }

  console.log("\n=== 3. Checking Wikidata SPARQL with Director 진성문 or Cast 정지소, 이수혁 ===");
  const sparqlActors = `
    SELECT DISTINCT ?movie ?movieLabel ?directorLabel WHERE {
      ?movie wdt:P31 wd:Q11424 .
      { ?movie wdt:P161 wd:Q12616016 . } UNION # Jung Ji-so
      { ?movie wdt:P161 wd:Q487085 . } # Lee Soo-hyuk
      SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,ko,en". }
    }
    LIMIT 10
  `;
  const urlActors = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlActors)}&format=json`;
  const rActors = await fetch(urlActors, { headers: { 'User-Agent': 'AntigravityBot/1.0' } }).then(r => r.json()).catch(e => ({ results: { bindings: [] } }));
  console.log("Movies with Jung Ji-so or Lee Soo-hyuk:", JSON.stringify(rActors.results.bindings, null, 2));
}

searchWikidataForSister();
