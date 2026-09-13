const SUPABASE_URL = 'https://uvjpiuinsgklddzhzpio.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX';

async function checkTmdb1394098() {
  const mRes = await fetch(`${SUPABASE_URL}/rest/v1/Movies?tmdb_id=eq.1394098`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  }).then(r => r.json());
  console.log("Movies with tmdb_id=1394098:", mRes);

  const pRes = await fetch(`${SUPABASE_URL}/rest/v1/Persons?tmdb_id=eq.1394098`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  }).then(r => r.json());
  console.log("Persons with tmdb_id=1394098:", pRes);
}

checkTmdb1394098();
