const SUPABASE_URL = 'https://uvjpiuinsgklddzhzpio.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX';

async function fetchItunesMetadata(term) {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=3&country=KR`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const t = data.results[0];
      return {
        preview_url: t.previewUrl || null,
        itunes_url: t.trackViewUrl || null,
        album_cover: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb', '600x600bb') : null
      };
    }
  } catch(e) {
    console.error('iTunes fetch failed:', e.message);
  }
  return null;
}

async function updateNullTracks() {
  // 1. Update G-DRAGON WHO YOU
  const gdMeta = await fetchItunesMetadata('G-DRAGON WHO YOU');
  console.log('GD Meta:', gdMeta);
  if (gdMeta) {
    const resGD = await fetch(`${SUPABASE_URL}/rest/v1/tracks?track_id=eq.gd_who_you_2013`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(gdMeta)
    });
    console.log('GD Update status:', resGD.status);
  }

  // 2. Update Kim Na Young / Bubble Sisters
  const knMeta = await fetchItunesMetadata('그렇게 사랑하고 그렇게 웃었습니다');
  console.log('Kim Na Young Meta:', knMeta);
  if (knMeta) {
    const resKN = await fetch(`${SUPABASE_URL}/rest/v1/tracks?track_id=eq.kimnayoung_love_laugh_2007`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(knMeta)
    });
    console.log('Kim Na Young Update status:', resKN.status);
  }
}

updateNullTracks();
