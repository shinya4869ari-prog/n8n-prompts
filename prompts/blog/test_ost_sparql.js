const wikidataId = 'Q25340649'; // One Step

async function test() {
  const sparql = `SELECT ?workType ?music ?musicLabel ?performer ?performerLabel ?mbid ?itunesId ?spotifyId WHERE {
    {
      VALUES (?prop ?workType) {
        (wdt:P8330 "オープニング曲")
        (wdt:P8331 "エンディング曲")
        (wdt:P3063 "メイン主題歌")
        (wdt:P406 "公式サントラ盤")
      }
      wd:${wikidataId} ?prop ?music .
      OPTIONAL { ?music wdt:P175 ?performer . }
      OPTIONAL { ?music wdt:P436 ?mbid . }
      OPTIONAL { ?music wdt:P2850 ?itunesId . }
      OPTIONAL { ?music wdt:P2205 ?spotifyId . }
    }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,ko,en". }
  } LIMIT 30`;

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  console.log('Wikidata Bindings:', data?.results?.bindings);
}

test();
