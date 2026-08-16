const SUPABASE_URL = 'https://uvjpiuinsgklddzhzpio.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX';

async function checkCastGenders() {
  const names = ['チョン・ジソ', 'チャ・ジュヨン', 'イ・スヒョク', 'ジョン・ジウ'];
  for (const name of names) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/Persons?name=ilike.*${encodeURIComponent(name)}*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    }).then(r => r.json());
    console.log(`Person ${name}:`, res);
  }
}

checkCastGenders();
