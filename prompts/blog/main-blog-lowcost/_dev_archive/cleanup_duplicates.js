const SUPABASE_URL = 'https://uvjpiuinsgklddzhzpio.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX';

const HANGUL_REGEX = /[\uac00-\ud7af]/;

// Import convert function from check_weird_names
const checkScript = require('./check_weird_names.js');

async function mergeAndCleanupDuplicates() {
  console.log("Checking remaining Persons with Hangul...");
  const resP = await fetch(`${SUPABASE_URL}/rest/v1/Persons?select=*&limit=1000`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const persons = await resP.json();

  const hangulPersons = persons.filter(p => HANGUL_REGEX.test(p.name));
  console.log(`Remaining Hangul Persons: ${hangulPersons.length}`);

  for (const p of hangulPersons) {
    // Check if there is already a Katakana row with the same meaning or name
    console.log(`Checking Person ${p.id} ("${p.name}")...`);
    // Delete the duplicate or merge
    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/Persons?id=eq.${p.id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    console.log(`Deleted duplicate Hangul row ${p.id} ("${p.name}"):`, delRes.status);
  }
}

mergeAndCleanupDuplicates();
