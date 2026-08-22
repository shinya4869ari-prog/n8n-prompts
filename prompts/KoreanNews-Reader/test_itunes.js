async function testItunes(term) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=3&country=KR`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log('HTTP error:', res.status);
      return;
    }
    const data = await res.json();
    console.log(`Results for "${term}": ${data.resultCount}`);
    if (data.results && data.results.length > 0) {
      const top = data.results[0];
      console.log({
        trackName: top.trackName,
        artistName: top.artistName,
        preview_url: top.previewUrl,
        itunes_url: top.trackViewUrl,
        album_cover: top.artworkUrl100 ? top.artworkUrl100.replace('100x100bb', '600x600bb') : null
      });
    }
  } catch(e) {
    console.error('Fetch failed:', e.message);
  }
}

async function run() {
  await testItunes('G-DRAGON WHO YOU');
  console.log('---');
  await testItunes('김나영 그렇게 사랑하고 그렇게 웃었습니다');
  console.log('---');
  await testItunes('버블 시스터즈 그렇게 사랑하고 그렇게 웃었습니다');
}

run();
