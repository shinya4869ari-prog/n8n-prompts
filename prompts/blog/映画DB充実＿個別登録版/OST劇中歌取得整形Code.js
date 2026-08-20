/**
 * 【n8n用】映画・ドラマ音楽（主題歌・劇中歌・OST Single）特定＆整形コード (OST劇中歌取得整形Code.js)
 * 
 * 役割:
 * 1. 対象の厳格化（主題歌・ボーカル劇中歌のみ）:
 *    - 第1優先: ボーカル入りの「主題歌（Theme Song）」「オープニング/エンディング曲」
 *    - 第2優先: 公式ボーカル挿入歌・OST Single（Part.1, Part.2, 各種Single）
 *    - ❌ 劇伴・BGMスコア全集（インスト曲の全曲展開）は完全除外
 *    - ❌ インスト版（Instrumental / Inst.）は除外し、歌唱ボーカル本編のみ採用
 * 2. 言語と表記の厳守:
 *    - 原題（original_title）、英題（TMDb translation）、邦題を優先度順に網羅。
 * 3. 参照データソース:
 *    - Wikidata: P8330 (オープニング), P8331 (エンディング), P3063 (メイン主題歌), P1657 (劇中歌・挿入歌)
 *    - Apple Music / iTunes API: Single / OST Part / Theme Song による公式音源の抽出
 */

// ── HTTP リクエスト用共通関数 (n8n this.helpers.httpRequest 完全バインド & タイムアウト保護) ──
const self = this;
const httpFetch = async (url, timeoutMs = 4000) => {
  try {
    if (typeof self?.helpers?.httpRequest === 'function') {
      const res = await self.helpers.httpRequest({
        method: 'GET',
        url: url,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        json: true,
        timeout: timeoutMs
      });
      return (typeof res === 'string') ? JSON.parse(res) : res;
    }
  } catch (e) {}

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: controller.signal
    });
    clearTimeout(timer);
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

// 🎯 主要なタイトル候補（原題、英題、邦題）を優先度順に厳選
const titleCandidates = [];
if (originTitle && originTitle.length >= 2 && originTitle !== '原題不明') titleCandidates.push(originTitle);
if (movieTitleRaw && movieTitleRaw.length >= 2 && movieTitleRaw !== '原題不明' && !titleCandidates.includes(movieTitleRaw)) titleCandidates.push(movieTitleRaw);
if (movieTitleJa && movieTitleJa.length >= 2 && !titleCandidates.includes(movieTitleJa)) titleCandidates.push(movieTitleJa);

// TMDb 英語翻訳タイトル
const tmdbObjs = [creditsNode, tmdbSearchNode, tmdbTitleNode].filter(Boolean);
for (const obj of tmdbObjs) {
  const enTrans = obj.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.name || 
                  obj.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.title;
  if (enTrans && enTrans.length >= 2 && !titleCandidates.includes(enTrans)) titleCandidates.push(enTrans);
}

if (titleCandidates.length === 0) {
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
const seenNormalizedTrackKeys = new Set();

// 🎯 音楽ジャンルの自動判定関数
function determineGenre(artistName, trackName, primaryGenre) {
  const a = (artistName || '').toLowerCase();
  const t = (trackName || '').toLowerCase();
  const p = (primaryGenre || '').toLowerCase();

  if (/blackpink|bts|seventeen|red velvet|shinee|girls' generation|stray kids|kara|exo|taeyang|nayeon|izna|exid|artms|sandara park|hyolyn|rosé|alpha drive one/i.test(a)) return 'K-Pop';
  if (/gummy|davichi|lyn|k\.will|chen|punch|xia|kim bo kyung|heo young saeng|eric nam|kim na young|v \(bts\)|jang wooram/i.test(a)) return 'Ballad';
  if (/mad clown|blasé|dynamic duo|yoon mirae|rap|hip-hop/i.test(a) || /hip-hop|rap/i.test(p)) return 'Hip-Hop/Rap';
  if (/ballad|love|memory|tears|heart|눈물|기억|사랑/i.test(t)) return 'Ballad';
  if (/dance|party|club/i.test(t) || /dance/i.test(p)) return 'Dance';
  if (primaryGenre && primaryGenre !== 'Soundtrack') return primaryGenre;
  return 'K-Pop';
}

// ── 1. Wikidata SPARQL プロパティ特定（P8330, P8331, P3063, P1657 - 主題歌・劇中歌のみ） ──
if (wikidataId && /^Q\d+$/.test(wikidataId)) {
  try {
    const sparql = `SELECT ?workType ?music ?musicLabel ?performer ?performerLabel ?mbid ?itunesId WHERE {
      {
        VALUES (?prop ?workType) {
          (wdt:P8330 "オープニングテーマ")
          (wdt:P8331 "エンディングテーマ")
          (wdt:P3063 "メイン主題歌")
          (wdt:P1657 "劇中歌・挿入歌")
        }
        wd:${wikidataId} ?prop ?music .
        OPTIONAL { ?music wdt:P175 ?performer . }
        OPTIONAL { ?music wdt:P436 ?mbid . }
        OPTIONAL { ?music wdt:P2850 ?itunesId . }
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,ko,en". }
    } LIMIT 20`;

    const wdUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
    const wdRes = await httpFetch(wdUrl, 3000);

    for (const b of (wdRes?.results?.bindings || [])) {
      const songTitle = b.musicLabel?.value;
      if (!songTitle) continue;
      
      const normKey = songTitle.toLowerCase().replace(/[\s\-_!\?\/\(\)\[\]:：・〜~]/g, '');
      if (seenNormalizedTrackKeys.has(normKey)) continue;
      seenNormalizedTrackKeys.add(normKey);

      const idKey = b.itunesId?.value ? String(b.itunesId.value) : `wd_${b.music?.value?.split('/').pop() || Math.random().toString(36).substring(2, 9)}`;
      seenTrackIds.add(idKey);
      
      const songType = b.workType?.value || '主題歌・劇中歌';
      const wdArtist = b.performerLabel?.value || movieTitleJa || movieTitleRaw;
      const wdGenre = determineGenre(wdArtist, songTitle, 'Soundtrack');

      tracksToInsert.push({
        json: {
          track_id: idKey,
          track_name: songTitle,
          track_name_en: songTitle,
          artist_name: wdArtist,
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
          genre: wdGenre
        }
      });
    }
  } catch (e) {}
}

// ── 2. Apple Music / iTunes API 検索（主題歌・劇中歌・Singleに特化） ──
const searchQueries = new Set();
for (const title of titleCandidates.slice(0, 2)) {
  searchQueries.add(`${title} OST Part`);
  searchQueries.add(`${title} Single`);
  searchQueries.add(`${title} Theme Song`);
  searchQueries.add(`${title} OST`);
}

// 🎯 単曲が「主題歌・ボーカル劇中歌」であるかの厳格判定
function isVocalOrThemeTrack(item, titles, mYear) {
  if (!item || !item.trackName || !item.collectionName) return false;
  const track = (item.trackName || '').toLowerCase();
  const album = (item.collectionName || '').toLowerCase();
  const artist = (item.artistName || '').toLowerCase();
  const itemYear = item.releaseDate ? parseInt(item.releaseDate.substring(0, 4)) : null;

  // 1. 公開年チェック (movieYearがある場合は ±2年以内)
  if (mYear && itemYear && Math.abs(itemYear - parseInt(mYear)) > 2) {
    return false;
  }

  // 2. インスト版（Instrumental / Inst.）の完全除外
  if (/instrumental|inst\.|\[inst\]|\(inst\)/i.test(track)) {
    return false;
  }

  // 3. 背景BGMスコア曲の除外（インスト専用曲・無名BGMを排除）
  const isPureScoreInstrumental = /score|orchestra|cue|suite|action\s*theme|bgm|instrumental\s*only/i.test(track) && !/part|single|vocal/i.test(track + ' ' + album);
  const isGenericVariousScore = (artist.includes('various artists') || artist.includes('soundtrack')) && !/part|single|theme|vocal|feat/i.test(album + ' ' + track);
  if (isPureScoreInstrumental || isGenericVariousScore) {
    return false;
  }

  // 4. 主題歌・Single・劇中歌のポジティブ判定
  const isVocalSingle = /single|pt\.\s*\d+|part\s*\d+|part\.\d+|theme|主題歌|劇中歌|挿入歌|opening|ending|main\s*title/i.test(album + ' ' + track);
  const isDedicatedArtist = artist && !/various|soundtrack|v\.a\./i.test(artist) && artist.length >= 2;

  // 5. 作品タイトルとの一致
  const norm = (s) => (s || '').toLowerCase().replace(/[\s\-_!\?\/\(\)\[\]:：・〜~]/g, '');
  const albumNorm = norm(album);
  const trackNorm = norm(track);

  const matchesTitle = titles.some(t => {
    const tn = norm(t);
    return tn.length >= 2 && (albumNorm.includes(tn) || trackNorm.includes(tn));
  });

  if (!matchesTitle) return false;

  // 作品タイトルに合致し、かつ「Single/Part/主題歌」または「明確なボーカルアーティスト曲」であること
  return isVocalSingle || isDedicatedArtist;
}

// 🎯 楽曲種別の自動判定
function determineSongRole(trackName, albumName) {
  const text = `${trackName} ${albumName}`.toLowerCase();
  if (/main\s*title|theme|メイン主題歌|主題歌|title\s*track/i.test(text)) return 'メイン主題歌';
  if (/ending|outro|エンディング/i.test(text)) return 'エンディングテーマ';
  if (/opening|intro|オープニング/i.test(text)) return 'オープニングテーマ';
  if (/pt\.\s*1|part\s*1|pt\.1|part\.1/i.test(text)) return 'メイン挿入歌 (OST Part.1)';
  if (/pt\.\s*2|part\s*2|pt\.2|part\.2/i.test(text)) return '挿入歌 (OST Part.2)';
  if (/pt\.\s*\d+|part\s*\d+/i.test(text)) return '挿入歌 (OST Part)';
  if (/single/i.test(text)) return '挿入歌 (OST Single)';
  return '公式劇中歌・OST';
}



const itunesPromises = Array.from(searchQueries).map(q => {
  const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=10`;
  return httpFetch(itunesUrl, 3000);
});

const itunesResults = await Promise.all(itunesPromises);

for (const itunesRes of itunesResults) {
  for (const item of (itunesRes?.results || [])) {
    if (!item.trackId) continue;
    const tIdStr = String(item.trackId);
    const rawTrackName = item.trackName || '';
    
    // タイトルの基幹部分で重複判定（「Song (OST Part.1)」と「Song」を同一集約）
    const cleanKey = rawTrackName.replace(/\s*[\(\[].*?(soundtrack|ost|inst|ver\.|television).*?[\)\]]/gi, '').trim().toLowerCase().replace(/[\s\-_!\?\/\(\)\[\]:：・〜~]/g, '');

    // 🎯 厳格照合（主題歌・劇中歌のみ）
    if (isVocalOrThemeTrack(item, titleCandidates, movieYear)) {
      if (!seenTrackIds.has(tIdStr) && !seenNormalizedTrackKeys.has(cleanKey)) {
        seenTrackIds.add(tIdStr);
        seenNormalizedTrackKeys.add(cleanKey);

        const role = determineSongRole(item.trackName || '', item.collectionName || '');
        const artist = item.artistName || movieTitleJa || movieTitleRaw;
        const realGenre = determineGenre(artist, item.trackName || '', item.primaryGenreName);

        tracksToInsert.push({
          json: {
            track_id: tIdStr,
            track_name: item.trackName || 'OST Track',
            track_name_en: item.trackCensoredName || item.trackName || 'OST Track',
            artist_name: artist,
            artist_name_en: item.artistName || movieTitleRaw || movieTitleJa,
            country: movieCountry,
            release_year: item.releaseDate ? String(item.releaseDate).substring(0, 4) : (movieYear || new Date().getFullYear().toString()),
            preview_url: item.previewUrl || "",
            itunes_url: item.trackViewUrl || item.collectionViewUrl || "",
            album_cover: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : (rawShaped.poster_url || inputNode.poster_url || ""),
            description: `映画・ドラマ『${movieTitleJa || movieTitleRaw}』(${originTitle || item.collectionName}) ${role}。`,
            ost_for: movieTitleJa || movieTitleRaw,
            tmdb_id: tmdbId,
            wikidata_id: wikidataId,
            genre: realGenre
          }
        });
      }
    }
  }
}

if (tracksToInsert.length === 0) {
  return [{
    json: {
      has_tracks: false,
      message: `『${movieTitleJa || movieTitleRaw}』の主題歌・劇中歌は見つかりませんでした`,
      ost_for: movieTitleJa || movieTitleRaw
    }
  }];
}

return tracksToInsert;
