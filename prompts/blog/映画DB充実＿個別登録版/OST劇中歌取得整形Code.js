/**
 * 【n8n用】映画・ドラマ音楽（主題歌・劇中歌・OST）特定＆整形コード (OST劇中歌取得整形Code.js)
 * 
 * 役割:
 * 1. 言語と表記の厳守:
 *    - 原題（original_title）、英題（TMDb translation）、邦題、別名（Manager Kim / Agent Kim等）を全網羅して検索。
 * 2. 優先順位の厳格化:
 *    - 第1優先: ボーカル入りの「主題歌（Theme Song）」「オープニング/エンディング曲」「挿入歌（OST Single）」
 *    - 第2優先: 公式スコア盤・サウンドトラック全集（Original Soundtrack / OST Album）
 * 3. 参照データソース:
 *    - Wikidata: P8330 (オープニング), P8331 (エンディング), P3063 (メイン主題歌), P406 (サントラ盤), P1657 (劇中歌)
 *    - Apple Music / iTunes API: 原題＋OSTによる公式音源、試聴URL、高画質ジャケ写のダイレクト抽出
 */

// ── HTTP リクエスト用共通関数 (n8n this.helpers.httpRequest 完全バインド) ──
const self = this;
const httpFetch = async (url) => {
  try {
    if (typeof self?.helpers?.httpRequest === 'function') {
      const res = await self.helpers.httpRequest({
        method: 'GET',
        url: url,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        json: true
      });
      return (typeof res === 'string') ? JSON.parse(res) : res;
    }
  } catch (e) {}

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    return await res.json();
  } catch (e) {
    return null;
  }
};

function getNodeData(name) {
  try {
    return $(name).first()?.json || $(name).item?.json || {};
  } catch (e) {
    return {};
  }
}

// 🎯 映画データの取得（原題・英語タイトル・公開年・IDを最優先取得）
const rawShaped = getNodeData('映画データ整形コード') || getNodeData('映画データ整形コード_claude') || {};
const creditsNode = getNodeData('TMDb credits取得');
const tmdbSearchNode = getNodeData('TMDb検索') || {};
const tmdbTitleNode = getNodeData('TMDb検索_タイトル') || {};
const inputNode = $input.first()?.json || getNodeData('補完結果整形コード') || {};

const movieTitleJa = String(inputNode.title || rawShaped.title || '').trim();
const movieTitleRaw = String(rawShaped.title || inputNode.title || '').trim();
const originTitle = String(rawShaped.origin_title || inputNode.origin_title || '').trim();
const movieYear = String(rawShaped.year || inputNode.year || '').trim();
const movieCountry = String(rawShaped.country || inputNode.country || 'KR').trim().toUpperCase();
const tmdbId = rawShaped.tmdb_id || inputNode.tmdb_id || null;
const wikidataId = rawShaped.wikidata_id || inputNode.wikidata_id || null;

// 🎯 全ての作品名候補（原題、英題、邦題、TMDb翻訳名、エイリアス）を網羅
const titleCandidates = new Set();
if (originTitle && originTitle.length >= 2 && originTitle !== '原題不明') titleCandidates.add(originTitle);
if (movieTitleRaw && movieTitleRaw.length >= 2 && movieTitleRaw !== '原題不明') titleCandidates.add(movieTitleRaw);
if (movieTitleJa && movieTitleJa.length >= 2) titleCandidates.add(movieTitleJa);

// TMDbオブジェクトから原題・タイトル・英語翻訳タイトルを抽出
const tmdbObjs = [creditsNode, tmdbSearchNode, tmdbTitleNode].filter(Boolean);
for (const obj of tmdbObjs) {
  if (obj.original_name) titleCandidates.add(obj.original_name);
  if (obj.original_title) titleCandidates.add(obj.original_title);
  if (obj.name) titleCandidates.add(obj.name);
  if (obj.title) titleCandidates.add(obj.title);
  
  const enTrans = obj.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.name || 
                  obj.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.title;
  if (enTrans) titleCandidates.add(enTrans);
}

const allTitles = Array.from(titleCandidates).filter(t => t && t.trim().length >= 2);

if (allTitles.length === 0) {
  return [{
    json: {
      has_tracks: false,
      message: "映画タイトルが取得できませんでした",
      ost_for: ""
    }
  }];
}

const tracksToInsert = [];
const seenTrackIds = new Set();
const seenTrackNames = new Set();
const seenAlbumIds = new Set();

// ── 1. Wikidata SPARQL プロパティ特定（P8330, P8331, P3063, P406） ──
if (wikidataId && /^Q\d+$/.test(wikidataId)) {
  try {
    const sparql = `SELECT ?workType ?music ?musicLabel ?performer ?performerLabel ?mbid ?itunesId WHERE {
      {
        VALUES (?prop ?workType) {
          (wdt:P8330 "オープニングテーマ")
          (wdt:P8331 "エンディングテーマ")
          (wdt:P3063 "メイン主題歌")
          (wdt:P406 "公式サントラ盤")
        }
        wd:${wikidataId} ?prop ?music .
        OPTIONAL { ?music wdt:P175 ?performer . }
        OPTIONAL { ?music wdt:P436 ?mbid . }
        OPTIONAL { ?music wdt:P2850 ?itunesId . }
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,ko,en". }
    } LIMIT 30`;

    const wdUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
    const wdRes = await httpFetch(wdUrl);

    for (const b of (wdRes?.results?.bindings || [])) {
      if (b.musicLabel?.value && !seenTrackNames.has(b.musicLabel.value.toLowerCase())) {
        seenTrackNames.add(b.musicLabel.value.toLowerCase());
        const idKey = b.itunesId?.value ? String(b.itunesId.value) : `wd_${b.music?.value?.split('/').pop() || Math.random().toString(36).substring(2, 9)}`;
        seenTrackIds.add(idKey);
        
        const songType = b.workType?.value || '公式劇中歌・OST';
        tracksToInsert.push({
          json: {
            track_id: idKey,
            track_name: b.musicLabel.value,
            track_name_en: b.musicLabel.value,
            artist_name: b.performerLabel?.value || movieTitleJa || movieTitleRaw,
            artist_name_en: b.performerLabel?.value || movieTitleRaw || movieTitleJa,
            country: movieCountry,
            release_year: movieYear || new Date().getFullYear().toString(),
            preview_url: "",
            itunes_url: b.itunesId?.value ? `https://music.apple.com/song/${b.itunesId.value}` : "",
            album_cover: rawShaped.poster_url || inputNode.poster_url || "",
            description: `映画・ドラマ『${movieTitleJa || movieTitleRaw}』(${originTitle}) ${songType}。`,
            ost_for: movieTitleJa || movieTitleRaw,
            tmdb_id: tmdbId,
            wikidata_id: b.music?.value?.split('/').pop() || null,
            mbid: b.mbid?.value || null,
            genre: "OST"
          }
        });
      }
    }
  } catch (e) {}
}

// ── 2. Apple Music / iTunes API 検索（全タイトルエイリアス対応） ──
const searchQueries = [];
for (const title of allTitles) {
  searchQueries.push({ q: `${title} OST`, priority: 1 });
  searchQueries.push({ q: `${title} Theme Song`, priority: 1 });
  searchQueries.push({ q: `${title} (Original Television Soundtrack)`, priority: 1 });
  searchQueries.push({ q: `${title} (Original Motion Picture Soundtrack)`, priority: 2 });
  searchQueries.push({ q: `${title} (Original Soundtrack)`, priority: 2 });
  searchQueries.push({ q: `${title} soundtrack`, priority: 2 });
}

// 🎯 作品名・公開年マッチング関数
function matchesOst(item, titles, mYear) {
  if (!item || !item.collectionName) return false;
  const album = (item.collectionName || '').toLowerCase();
  const track = (item.trackName || '').toLowerCase();
  const itemYear = item.releaseDate ? parseInt(item.releaseDate.substring(0, 4)) : null;

  // 1. 公開年チェック (movieYearがある場合は ±2年以内が必須)
  if (mYear && itemYear && Math.abs(itemYear - parseInt(mYear)) > 2) {
    return false;
  }

  // 2. OSTジャンル・サントラ表記チェック
  const isOst = /soundtrack|ost|score|original\s*television\s*soundtrack|original\s*soundtrack|original\s*motion\s*picture|劇中歌|主題歌|サウンドトラック|theme/i.test(album + ' ' + track);
  if (!isOst) return false;

  // 3. 作品名の一致 (アルバム名が候補タイトルのいずれかにマッチ)
  const albumClean = album.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
  return titles.some(t => {
    const tl = t.toLowerCase();
    return (
      albumClean === tl ||
      albumClean.startsWith(tl + ' ') ||
      albumClean.startsWith(tl + ':') ||
      albumClean.startsWith(tl + '-') ||
      albumClean.startsWith(tl + ',') ||
      album.includes(tl)
    );
  });
}

// 🎯 楽曲種別（使われ方）の自動判定関数
function determineSongRole(trackName, albumName) {
  const text = `${trackName} ${albumName}`.toLowerCase();
  if (/main\s*title|theme|メイン主題歌|主題歌|title\s*track/i.test(text)) return 'メイン主題歌';
  if (/ending|outro|エンディング/i.test(text)) return 'エンディングテーマ';
  if (/opening|intro|オープニング/i.test(text)) return 'オープニングテーマ';
  if (/pt\.\s*1|part\s*1|pt\.1|part\.1/i.test(text)) return 'メイン挿入歌 (OST Part.1)';
  if (/pt\.\s*2|part\s*2|pt\.2|part\.2/i.test(text)) return '挿入歌 (OST Part.2)';
  if (/single|pt\.|part/i.test(text)) return '挿入歌 (OST Single)';
  return '公式サントラ劇中歌';
}

for (const { q } of searchQueries) {
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=15`;
    const itunesRes = await httpFetch(itunesUrl);

    for (const item of (itunesRes?.results || [])) {
      if (!item.trackId) continue;
      const tIdStr = String(item.trackId);
      const tName = (item.trackName || '').toLowerCase();

      // 🎯 厳格照合
      if (matchesOst(item, allTitles, movieYear)) {
        // サントラ盤(collectionId)の全曲一括取得
        if (item.collectionId && !seenAlbumIds.has(item.collectionId)) {
          seenAlbumIds.add(item.collectionId);
          try {
            const albumLookupUrl = `https://itunes.apple.com/lookup?id=${item.collectionId}&entity=song`;
            const albumData = await httpFetch(albumLookupUrl);

            for (const track of (albumData?.results || [])) {
              if (track.wrapperType === 'track' && track.trackId) {
                const trackIdStr = String(track.trackId);
                if (!seenTrackIds.has(trackIdStr)) {
                  seenTrackIds.add(trackIdStr);
                  seenTrackNames.add((track.trackName || '').toLowerCase());
                  
                  const role = determineSongRole(track.trackName || '', track.collectionName || '');
                  tracksToInsert.push({
                    json: {
                      track_id: trackIdStr,
                      track_name: track.trackName || 'OST Track',
                      track_name_en: track.trackCensoredName || track.trackName || 'OST Track',
                      artist_name: track.artistName || movieTitleJa || movieTitleRaw,
                      artist_name_en: track.artistName || movieTitleRaw || movieTitleJa,
                      country: movieCountry,
                      release_year: track.releaseDate ? String(track.releaseDate).substring(0, 4) : (movieYear || new Date().getFullYear().toString()),
                      preview_url: track.previewUrl || "",
                      itunes_url: track.trackViewUrl || track.collectionViewUrl || "",
                      album_cover: track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '600x600bb') : (rawShaped.poster_url || inputNode.poster_url || ""),
                      description: `映画・ドラマ『${movieTitleJa || movieTitleRaw}』(${originTitle || track.collectionName}) ${role}。`,
                      ost_for: movieTitleJa || movieTitleRaw,
                      tmdb_id: tmdbId,
                      wikidata_id: wikidataId,
                      genre: "OST"
                    }
                  });
                }
              }
            }
          } catch (e) {}
        }

        // 単曲追加
        if (!seenTrackIds.has(tIdStr) && !seenTrackNames.has(tName)) {
          seenTrackIds.add(tIdStr);
          seenTrackNames.add(tName);
          const role = determineSongRole(item.trackName || '', item.collectionName || '');
          tracksToInsert.push({
            json: {
              track_id: tIdStr,
              track_name: item.trackName || 'OST Track',
              track_name_en: item.trackCensoredName || item.trackName || 'OST Track',
              artist_name: item.artistName || movieTitleJa || movieTitleRaw,
              artist_name_en: item.artistName || movieTitleRaw || movieTitleJa,
              country: movieCountry,
              release_year: item.releaseDate ? String(item.releaseDate).substring(0, 4) : (movieYear || new Date().getFullYear().toString()),
              preview_url: item.previewUrl || "",
              itunes_url: item.trackViewUrl || "",
              album_cover: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : (rawShaped.poster_url || inputNode.poster_url || ""),
              description: `映画・ドラマ『${movieTitleJa || movieTitleRaw}』(${originTitle || item.collectionName}) ${role}。`,
              ost_for: movieTitleJa || movieTitleRaw,
              tmdb_id: tmdbId,
              wikidata_id: wikidataId,
              genre: "OST"
            }
          });
        }
      }
    }
  } catch (e) {}
}

if (tracksToInsert.length === 0) {
  return [{
    json: {
      has_tracks: false,
      message: `『${movieTitleJa || movieTitleRaw}』の配信OSTは見つかりませんでした`,
      ost_for: movieTitleJa || movieTitleRaw
    }
  }];
}

return tracksToInsert;
