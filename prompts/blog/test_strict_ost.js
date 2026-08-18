const httpFetch = async (url) => {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    return await res.json();
  } catch (e) {
    return null;
  }
};

function isCleanMatch(albumName, trackName, movieTitle, originTitle, movieYear, itemYear) {
  if (!albumName) return false;
  const aNorm = albumName.toLowerCase().replace(/[\s\-_!\?\/\(\)\[\]:：・〜~]/g, '');
  const tNorm = (trackName || '').toLowerCase().replace(/[\s\-_!\?\/\(\)\[\]:：・〜~]/g, '');

  const isOst = /soundtrack|ost|score|motion\s*picture|original\s*television\s*soundtrack|original\s*soundtrack|original\s*score|劇中歌|主題歌/i.test(albumName);
  if (!isOst) return false;

  // 公開年チェック (±2年以内必須)
  if (movieYear && itemYear) {
    if (Math.abs(parseInt(itemYear) - parseInt(movieYear)) > 2) {
      return false;
    }
  }

  // タイトル境界マッチ
  const checkTitle = (target) => {
    if (!target || target.length < 2) return false;
    const cleanT = target.toLowerCase().trim();
    // 英語等の場合は単語単位またはプレフィックス
    const cleanAlbum = albumName.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
    if (cleanAlbum === cleanT) return true;
    if (cleanAlbum.startsWith(cleanT + ' ') || cleanAlbum.startsWith(cleanT + ':') || cleanAlbum.startsWith(cleanT + ' -')) return true;
    if (aNorm.includes(cleanT.replace(/[\s\-_]/g, '')) && (cleanT.length >= 4 || target === originTitle)) return true;
    return false;
  };

  return checkTitle(movieTitle) || checkTitle(originTitle);
}

async function testMovie(title, originTitle, year) {
  console.log(`\n=== テスト: ${title} (${originTitle}, ${year}) ===`);
  const searchQueries = [
    `${title} (Original Soundtrack)`,
    `${title} OST`,
    `${originTitle} OST`
  ].filter(Boolean);

  const found = [];
  for (const q of searchQueries) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=15`;
    const res = await httpFetch(url);
    for (const item of (res?.results || [])) {
      const itemYear = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null;
      if (isCleanMatch(item.collectionName, item.trackName, title, originTitle, year, itemYear)) {
        found.push({
          track: item.trackName,
          album: item.collectionName,
          year: itemYear,
          artist: item.artistName
        });
      }
    }
  }
  console.log(`ヒット曲数: ${found.length}`);
  if (found.length > 0) {
    console.log('サンプル:', found.slice(0, 3));
  }
}

async function run() {
  await testMovie('One Step', '원스텝', '2017');
  await testMovie('Face', '얼굴', '2025');
}
run();
