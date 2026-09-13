const SUPABASE_URL = 'https://uvjpiuinsgklddzhzpio.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX';

const HANGUL_REGEX = /[\uac00-\ud7af]/;
const JAPANESE_REGEX = /[ぁ-んァ-ヶー一-龠]/;

async function checkWeirdNames() {
  console.log("Fetching all Persons from Supabase...");
  const resP = await fetch(`${SUPABASE_URL}/rest/v1/Persons?select=id,name,name_en,occupation,country,wikidata_id,profile_url&limit=1000`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const persons = await resP.json();

  console.log(`Total Persons: ${persons.length}`);
  const weirdPersons = [];

  persons.forEach(p => {
    const name = p.name || '';
    const hasHangul = HANGUL_REGEX.test(name);
    const hasJapanese = JAPANESE_REGEX.test(name);
    const isMixed = hasHangul && hasJapanese;
    const isPureHangul = hasHangul && !hasJapanese;
    const hasBadChars = /[\{\}\[\]\<\>\(\)\"\']|EMPTY|undefined|null|欠測|データなし|・\s*・|^\s*・|・\s*$/.test(name);

    if (isMixed || isPureHangul || hasBadChars || name.length <= 1) {
      weirdPersons.push({
        id: p.id,
        name: p.name,
        name_en: p.name_en,
        occupation: p.occupation,
        reason: isMixed ? 'ハングルと日本語が混在' : (isPureHangul ? '名前がハングルのまま' : '記号や不正な文字')
      });
    }
  });

  console.log("\n=== 異常またはハングル混在の Persons ===");
  console.table(weirdPersons);

  console.log("\nFetching all Movies from Supabase...");
  const resM = await fetch(`${SUPABASE_URL}/rest/v1/Movies?select=tmdb_id,title,origin_title,director,cast&limit=1000`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const movies = await resM.json();
  console.log(`Total Movies: ${movies.length}`);

  const weirdMovies = [];
  movies.forEach(m => {
    const title = m.title || '';
    const director = m.director || '';
    const cast = m.cast || '';

    const titleMixed = HANGUL_REGEX.test(title) && JAPANESE_REGEX.test(title);
    const dirMixed = HANGUL_REGEX.test(director) && JAPANESE_REGEX.test(director);
    const castMixed = HANGUL_REGEX.test(cast) && JAPANESE_REGEX.test(cast);

    if (titleMixed || dirMixed || castMixed || HANGUL_REGEX.test(title)) {
      weirdMovies.push({
        tmdb_id: m.tmdb_id,
        title: m.title,
        origin_title: m.origin_title,
        director: m.director,
        cast_sample: cast.slice(0, 50),
        reason: titleMixed ? 'タイトルにハングル混在' : (HANGUL_REGEX.test(title) ? 'タイトルがハングルのまま' : (dirMixed ? '監督にハングル混在' : 'キャストにハングル混在'))
      });
    }
  });

  console.log("\n=== 異常またはハングル混在の Movies ===");
  console.table(weirdMovies);
}

checkWeirdNames();
