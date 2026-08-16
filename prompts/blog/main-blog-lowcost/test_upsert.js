const SUPABASE_URL = 'https://uvjpiuinsgklddzhzpio.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX';

async function testUpsert() {
  const testPerson = {
    name: "ソン・ジェゴン",
    name_en: "손재곤",
    occupation: "監督",
    profile_url: "https://image.tmdb.org/t/p/w500/cwGfkrIKaEex8g0fbjXuJIe7sK9.jpg",
    gender: "male",
    country: "KR",
    wikidata_id: "Q81720480"
  };

  console.log("Testing UPSERT with on_conflict=name and merge-duplicates...");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/Persons?on_conflict=name`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(testPerson)
  });

  console.log("Status:", res.status, res.statusText);
  const text = await res.text();
  console.log("Response Body:", text);
}

testUpsert();
