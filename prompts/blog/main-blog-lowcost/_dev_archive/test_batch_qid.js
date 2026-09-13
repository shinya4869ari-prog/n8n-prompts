async function testBatch() {
  const movies = [
    { title: 'タクシー運転手 ～約束は海を越えて～', origin_title: '택시운전사', tmdb_id: 437068 },
    { title: '1987、ある闘いの真実', origin_title: '1987', tmdb_id: 491418 },
    { title: 'パラサイト 半地下の家族', origin_title: '기생충', tmdb_id: 496243 },
    { title: '哭声／コクソン', origin_title: '곡성', tmdb_id: 293646 },
    { title: 'オールド・ボーイ', origin_title: '올드보이', tmdb_id: 670 }
  ];

  const t0 = Date.now();
  const qids = await Promise.all(movies.map(async (m) => {
    try {
      const searchKey = m.origin_title || m.title;
      const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(searchKey)}&language=ko&limit=3&format=json`;
      const res = await fetch(url, { headers: { 'User-Agent': 'NationalScalesBot/1.0 (contact@example.com)' } }).then(r => r.json());
      const hit = (res.search || []).find(s => {
        const desc = (s.description || '').toLowerCase();
        return desc.includes('film') || desc.includes('movie') || desc.includes('영화') || desc.includes('映画');
      }) || res.search?.[0];
      return hit ? hit.id : null;
    } catch(e) {
      return null;
    }
  }));

  console.log(`Resolved ${movies.length} QIDs in ${Date.now() - t0}ms:`);
  movies.forEach((m, i) => console.log(`  ${m.title} -> ${qids[i]}`));
}
testBatch();
