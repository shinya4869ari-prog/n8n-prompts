const SUPABASE_URL = 'https://uvjpiuinsgklddzhzpio.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX';

async function testFetchLyrics() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tracks?lyrics=not.is.null&select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  if (res.ok) {
    const data = await res.json();
    console.log(`Fetched ${data.length} tracks with lyrics from Supabase:`);
    data.forEach(d => {
      console.log(`- [${d.track_id}] ${d.artist_name} - ${d.track_name}`);
      try {
        const parsed = JSON.parse(d.lyrics);
        console.log(`  Parsed sentences count: ${parsed.sentences?.length}`);
      } catch(e) {
        console.log(`  Raw lyrics string.`);
      }
    });
  } else {
    console.log('Fetch error:', res.status, await res.text());
  }
}

testFetchLyrics();
