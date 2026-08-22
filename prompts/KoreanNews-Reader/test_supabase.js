const SUPABASE_URL = 'https://uvjpiuinsgklddzhzpio.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX';

async function testSupabase() {
  const tables = ['Music', 'tracks', 'korean_lyrics', 'lyrics'];
  for (const t of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*&limit=3`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      console.log(`Table "${t}": status ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`Table "${t}" sample (${data.length} rows):`, JSON.stringify(data[0] || {}));
      } else {
        const text = await res.text();
        console.log(`Table "${t}" error:`, text);
      }
    } catch(e) {
      console.log(`Table "${t}" failed:`, e.message);
    }
  }
}

testSupabase();
