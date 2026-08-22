const SUPABASE_URL = 'https://uvjpiuinsgklddzhzpio.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX';

async function checkCols() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tracks?select=*&limit=5`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  if (res.ok) {
    const data = await res.json();
    console.log(`Found ${data.length} tracks.`);
    data.forEach(t => console.log(`- ${t.artist_name} - ${t.track_name}`));
  } else {
    console.log('Error:', res.status, await res.text());
  }
}
checkCols();
