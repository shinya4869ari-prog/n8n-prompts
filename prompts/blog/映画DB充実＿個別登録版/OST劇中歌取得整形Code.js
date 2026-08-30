/**
 * 【n8n用】映画・ドラマ音楽（主題歌・劇中歌・OST Single）特定＆整形コード (OST劇中歌取得整形Code.js)
 * 
 * 役割:
 * 1. 2段階スマート抽出（アルバム先行取得 ＋ ボーカルトラック展開）:
 *    - 第1段階: 作品名（原題・英題・邦題）で公式OST盤/サントラアルバム（entity=album）を特定
 *    - 第2段階: 特定したアルバムの収録曲から、インストや劇伴BGMを除いた「公式ボーカル歌唱曲」を抽出
 *    - ❌ インスト版（Instrumental / Inst.）は完全除外
 *    - ❌ 劇伴・BGMスコア曲（各種テーマ・Opening・BGMインスト）は自動除外
 * 2. 多言語・各国ストア対応:
 *    - 韓国作品（KR）は韓国iTunesストア優先でハングル原題検索
 *    - 日本作品（JP）は日本ストア、その他はUSストアと相互フォールバック
 * 3. 参照データソース:
 *    - Wikidata: P8330 (オープニング), P8331 (エンディング), P3063 (メイン主題歌), P1657 (劇中歌・挿入歌)
 *    - Apple Music / iTunes API: 公式サントラ盤（OST Album / Single）からの直接抽出
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
const movieCountry = String(rawShaped.country || inputNode.country || '').trim().toUpperCase();
const tmdbId = rawShaped.tmdb_id || inputNode.tmdb_id || null;
const wikidataId = rawShaped.wikidata_id || inputNode.wikidata_id || null;

// 🎯 主要なタイトル候補（原題、英題、邦題）を優先度順に厳選
const titleCandidates = [];

// サブタイトルやキーワードの抽出（例: "쓸쓸하고 찬란하神-도깨비" ➔ "도깨비", "トッケビ〜君がくれた愛しい日々〜" ➔ "トッケビ"）
const extractKeyTitles = (str) => {
  if (!str) return [];
  return str.split(/[-‐‑–—〜~:：·・/]/).map(s => s.trim()).filter(s => s.length >= 2);
};

if (originTitle && originTitle.length >= 2 && originTitle !== '原題不明') {
  titleCandidates.push(originTitle);
  extractKeyTitles(originTitle).forEach(s => { if (!titleCandidates.includes(s)) titleCandidates.push(s); });
}
if (movieTitleJa && movieTitleJa.length >= 2) {
  extractKeyTitles(movieTitleJa).forEach(s => { if (!titleCandidates.includes(s)) titleCandidates.push(s); });
  if (!titleCandidates.includes(movieTitleJa)) titleCandidates.push(movieTitleJa);
}
if (movieTitleRaw && movieTitleRaw.length >= 2 && movieTitleRaw !== '原題不明' && !titleCandidates.includes(movieTitleRaw)) {
  titleCandidates.push(movieTitleRaw);
}

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
  if (/gummy|davichi|lyn|k\.will|chen|punch|xia|kim bo kyung|heo young saeng|eric nam|kim na young|v \(bts\)|jang wooram|suran|ben|an da eun|yoo hwe seung|j\.don/i.test(a)) return 'Ballad';
  if (/mad clown|blasé|dynamic duo|yoon mirae|rap|hip-hop/i.test(a) || /hip-hop|rap/i.test(p)) return 'Hip-Hop/Rap';
  if (/ballad|love|memory|tears|heart|눈물|기억|사랑/i.test(t)) return 'Ballad';
  if (/dance|party|club/i.test(t) || /dance/i.test(p)) return 'Dance';
  if (primaryGenre && primaryGenre !== 'Soundtrack') return primaryGenre;
  return 'K-Pop';
}

const norm = (s) => (s || '').toLowerCase().replace(/[\s\-_!\?\/\(\)\[\]:：・〜~]/g, '');

// ── 1. Wikidata SPARQL プロパティ特定（主題歌・劇中歌の直接定義がある場合） ──
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
      
      const cleanKey = songTitle.replace(/\s*[\(\[].*?(soundtrack|ost|inst|ver\.|television).*?[\)\]]/gi, '').trim().toLowerCase().replace(/[\s\-_!\?\/\(\)\[\]:：・〜~]/g, '');
      if (seenNormalizedTrackKeys.has(cleanKey)) continue;
      seenNormalizedTrackKeys.add(cleanKey);

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

// ── 2. Apple Music / iTunes API 【アルバム先行取得方式】（公式サントラ盤からボーカル曲を展開） ──
const storeCountries = movieCountry === 'KR' ? ['KR', 'US'] : (movieCountry === 'JP' ? ['JP', 'US'] : ['US']);
const albumQueries = new Set();

for (const t of titleCandidates.slice(0, 3)) {
  if (!t || t.length < 2) continue;
  albumQueries.add(`${t} OST`);
  albumQueries.add(`${t} Original Television Soundtrack`);
  albumQueries.add(`${t} Soundtrack`);
  if (movieCountry === 'KR') {
    albumQueries.add(`${t} OST Part`);
  }
}

const albumPromises = [];
for (const store of storeCountries) {
  for (const q of albumQueries) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=${store}&media=music&entity=album&limit=10`;
    albumPromises.push(httpFetch(url, 3000));
  }
}

const albumResults = await Promise.all(albumPromises);
const matchedAlbums = [];
const seenAlbumIds = new Set();

for (const res of albumResults) {
  for (const alb of (res?.results || [])) {
    if (!alb.collectionId || seenAlbumIds.has(alb.collectionId)) continue;

    const albName = (alb.collectionName || '').toLowerCase();
    const albYear = alb.releaseDate ? parseInt(alb.releaseDate.substring(0, 4)) : null;

    // 年代チェック (±2年)
    if (movieYear && albYear && Math.abs(albYear - parseInt(movieYear)) > 2) continue;

    // サントラ判定（ost, soundtrack, pt., part などが含まれていること）
    if (!/ost|soundtrack|sound\s*track|part|pt\.|original\s*television/i.test(albName)) continue;

    // 作品タイトルとの一致判定（原題・英題・邦題のいずれか）
    const matches = titleCandidates.some(t => {
      const tn = norm(t);
      // サブタイトルやコロン等で分割したコアキーワードでも判定
      const subKeys = t.split(/[:：・\-]/).map(s => norm(s.trim())).filter(s => s.length >= 2);
      return (tn.length >= 2 && norm(albName).includes(tn)) || subKeys.some(sk => norm(albName).includes(sk));
    });

    if (matches) {
      seenAlbumIds.add(alb.collectionId);
      matchedAlbums.push(alb);
    }
  }
}

// フルサントラ盤（Various Artists / trackCount大）または OST Part盤を優先
matchedAlbums.sort((a, b) => (b.trackCount || 0) - (a.trackCount || 0));

// 🎯 アルバム内トラックの展開（lookup?entity=song）
for (const alb of matchedAlbums.slice(0, 5)) {
  // 全世界共通の曲情報を取得するため country 指定なしで lookup
  const lookupUrl = `https://itunes.apple.com/lookup?id=${alb.collectionId}&entity=song&limit=50`;
  const lookupRes = await httpFetch(lookupUrl, 3000);
  const tracks = (lookupRes?.results || []).filter(r => r.wrapperType === 'track');

  for (const item of tracks) {
    if (!item.trackId || seenTrackIds.has(String(item.trackId))) continue;

    const trackName = item.trackName || '';
    const artist = item.artistName || '';
    const cleanKey = trackName.replace(/\s*[\(\[].*?(soundtrack|ost|inst|ver\.|television).*?[\)\]]/gi, '').trim().toLowerCase().replace(/[\s\-_!\?\/\(\)\[\]:：・〜~]/g, '');

    // 1. インスト版（Instrumental / Inst.）は除外
    if (/instrumental|inst\.|\[inst\]|\(inst\)/i.test(trackName)) continue;

    // 2. 劇伴BGM（スコア曲・BGMインスト）の除外判定
    const isPureBgm = /테마|theme|opening|ending|score|suite|bgm|scene|cue|dialogue|전망대|낙화|주마등|옥상|코마|상처|안녕|위로|기억|재회|에필로그|넋은\s*별이/i.test(trackName);
    if (isPureBgm && alb.trackCount > 5) continue;

    // 3. Various Artists のままで個人名がないトラックは除外
    if (/various artists|soundtrack/i.test(artist) && alb.trackCount > 5) continue;

    if (!seenNormalizedTrackKeys.has(cleanKey)) {
      seenNormalizedTrackKeys.add(cleanKey);
      seenTrackIds.add(String(item.trackId));

      const realGenre = determineGenre(artist, trackName, item.primaryGenreName);

      tracksToInsert.push({
        json: {
          track_id: String(item.trackId),
          track_name: trackName,
          track_name_en: item.trackCensoredName || trackName,
          artist_name: artist,
          artist_name_en: artist,
          country: movieCountry,
          release_year: item.releaseDate ? String(item.releaseDate).substring(0, 4) : (movieYear || new Date().getFullYear().toString()),
          preview_url: item.previewUrl || "",
          itunes_url: item.trackViewUrl || item.collectionViewUrl || "",
          album_cover: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : (rawShaped.poster_url || inputNode.poster_url || ""),
          description: `ドラマ・映画『${movieTitleJa || movieTitleRaw}』(${originTitle || alb.collectionName}) 公式挿入歌。`,
          ost_for: movieTitleJa || movieTitleRaw,
          tmdb_id: tmdbId,
          wikidata_id: wikidataId,
          genre: realGenre
        }
      });
    }

    if (tracksToInsert.length >= 6) break;
  }

  if (tracksToInsert.length >= 6) break;
}

// ── 3. フォールバック（アルバムが見つからなかった場合のみ、単曲検索を実行） ──
if (tracksToInsert.length === 0) {
  const songQueries = new Set();
  for (const title of titleCandidates.slice(0, 2)) {
    songQueries.add(`${title} OST Part`);
    songQueries.add(`${title} Theme Song`);
    songQueries.add(`${title} OST`);
  }

  const songPromises = Array.from(songQueries).map(q => {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=10`;
    return httpFetch(itunesUrl, 3000);
  });

  const songResults = await Promise.all(songPromises);

  for (const sRes of songResults) {
    for (const item of (sRes?.results || [])) {
      if (!item.trackId || seenTrackIds.has(String(item.trackId))) continue;
      const trackName = item.trackName || '';
      const albName = item.collectionName || '';
      const cleanKey = trackName.replace(/\s*[\(\[].*?(soundtrack|ost|inst|ver\.|television).*?[\)\]]/gi, '').trim().toLowerCase().replace(/[\s\-_!\?\/\(\)\[\]:：・〜~]/g, '');

      if (/instrumental|inst\.|\[inst\]|\(inst\)/i.test(trackName)) continue;
      if (!/part|pt\.|single|theme|ost|soundtrack/i.test(albName + ' ' + trackName)) continue;

      if (!seenNormalizedTrackKeys.has(cleanKey)) {
        seenNormalizedTrackKeys.add(cleanKey);
        seenTrackIds.add(String(item.trackId));

        const artist = item.artistName || movieTitleJa || movieTitleRaw;
        const realGenre = determineGenre(artist, trackName, item.primaryGenreName);

        tracksToInsert.push({
          json: {
            track_id: String(item.trackId),
            track_name: trackName,
            track_name_en: item.trackCensoredName || trackName,
            artist_name: artist,
            artist_name_en: artist,
            country: movieCountry,
            release_year: item.releaseDate ? String(item.releaseDate).substring(0, 4) : (movieYear || new Date().getFullYear().toString()),
            preview_url: item.previewUrl || "",
            itunes_url: item.trackViewUrl || item.collectionViewUrl || "",
            album_cover: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : (rawShaped.poster_url || inputNode.poster_url || ""),
            description: `映画・ドラマ『${movieTitleJa || movieTitleRaw}』(${originTitle || albName}) 挿入歌。`,
            ost_for: movieTitleJa || movieTitleRaw,
            tmdb_id: tmdbId,
            wikidata_id: wikidataId,
            genre: realGenre
          }
        });
      }
      if (tracksToInsert.length >= 6) break;
    }
    if (tracksToInsert.length >= 6) break;
  }
}

// 🎯 iTunes でヒットしなかった場合、Supabase にすでに登録されている曲があれば自動取得して保護
if (tracksToInsert.length === 0 && (tmdbId || movieTitleJa)) {
  try {
    const SUPABASE_URL = "https://uvjpiuinsgklddzhzpio.supabase.co";
    const SUPABASE_KEY = "sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX";
    const filter = tmdbId ? `tmdb_id=eq.${tmdbId}` : `ost_for=ilike.*${encodeURIComponent(movieTitleJa)}*`;
    const res = await httpFetch(`${SUPABASE_URL}/rest/v1/tracks?${filter}&limit=6`, 3000);
    if (Array.isArray(res) && res.length > 0) {
      res.forEach(t => {
        tracksToInsert.push({ json: t });
      });
    }
  } catch (e) {}
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
