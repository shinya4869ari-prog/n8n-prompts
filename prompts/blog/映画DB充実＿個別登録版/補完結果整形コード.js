/**
 * 【AI (Gemini) 映画データ整合性検証＆空欄補完・マージコード】
 * 
 * Geminiからの検証＆補完結果JSONを受け取り、元データと安全にマージします。
 * ハルシネーション（嘘の補完）を防ぐため、元データを最優先しつつ空欄のみを正確に補完します。
 */

const items = $input.all();

return items.map((item, index) => {
  // 1. 元データ (source) の安全取得（変数参照エラーを防ぐため最優先で初期化）
  function getNodeData(name) {
    try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
  }
  
  let source = getNodeData('補完ブリッジ整形コード');
  if (!source.title && !source.origin_title) source = getNodeData('映画データ整形コード');
  if (!source.title && !source.origin_title) source = getNodeData('入力統一・分割コード');
  if (!source.title && !source.origin_title) source = getNodeData('On form submission1');
  if (!source.title && !source.origin_title) source = item.json || {};

  // 2. AIデータ (targetAi) のパース
  let aiData = {};
  try {
    let rawText = "";
    const j = item.json || {};
    
    if (typeof j === 'string') {
      rawText = j;
    } else if (j.text) {
      rawText = j.text;
    } else if (j.content?.parts && Array.isArray(j.content.parts)) {
      rawText = j.content.parts.map(p => p.text || '').join('\n');
    } else if (j.candidates?.[0]?.content?.parts) {
      rawText = j.candidates[0].content.parts.map(p => p.text || '').join('\n');
    } else if (j.message?.content) {
      rawText = typeof j.message.content === 'string' ? j.message.content : JSON.stringify(j.message.content);
    } else {
      rawText = JSON.stringify(j);
    }

    const cleanJson = String(rawText)
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    aiData = JSON.parse(cleanJson);
  } catch(e) {
    aiData = item.json || {};
  }

  // aiDataが配列の場合は現在のインデックス(index)のデータを取り出す
  const targetAi = Array.isArray(aiData) ? (aiData[index] || aiData[0] || {}) : aiData;

  // 3. ID / メディアURLの安全判定
  const isCorrected = targetAi.audit_status && String(targetAi.audit_status).includes('CORRECTED');

  // 本当に異なる映画の誤データとAIが検証・判定した場合はクリアし、それ以外はAPI/元の入力データの正常な値を最優先採択
  const tmdb_id = (isCorrected && targetAi.tmdb_id === null) ? null : (source.tmdb_id || targetAi.tmdb_id || null);
  // 🎯 poster_url / trailer_url: APIから取得した実在URL (source) を最優先保護！AIのハルシネーションURLを除外
  const poster_url = (isCorrected && (targetAi.poster_url === "" || targetAi.poster_url === null)) ? "" : (source.poster_url || targetAi.poster_url || "");
  const trailer_url = (isCorrected && (targetAi.trailer_url === "" || targetAi.trailer_url === null)) ? "" : (source.trailer_url || targetAi.trailer_url || "");

  // 4. 言語判定関数
  const isHangul = (str) => /[\uac00-\ud7af]/.test(str || '');
  const isJapanese = (str) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(str || '');

  const isKorea = (source.country === 'KR' || targetAi.country === 'KR' || targetAi.cast_en?.includes('송') || targetAi.director_en?.includes('이'));

  // title: AIの日本語タイトル ➔ 元データ ➔ targetAi
  const title = (targetAi.title && isJapanese(targetAi.title)) ? targetAi.title : (source.title || targetAi.title || null);
  // origin_title: 韓国作品の場合はハングル優先
  const origin_title = (isKorea && targetAi.origin_title && isHangul(targetAi.origin_title)) ? targetAi.origin_title : (source.origin_title || targetAi.origin_title || null);

  // director / director_en
  const director = (targetAi.director && isJapanese(targetAi.director)) ? targetAi.director : (source.director || targetAi.director || null);
  const director_en = (targetAi.director_en) ? targetAi.director_en : (source.director_en || null);

  // cast / cast_en: AI(targetAi)の補完結果を素直に優先採用
  const cast = (targetAi.cast && isJapanese(targetAi.cast)) ? targetAi.cast : (source.cast || targetAi.cast || null);
  const cast_en = (targetAi.cast_en) ? targetAi.cast_en : (source.cast_en || null);

  // overview / overview_en: AI(targetAi)の補完結果を優先採用
  const overview = (targetAi.overview && targetAi.overview.length > 20) ? targetAi.overview : (source.overview || targetAi.overview || null);
  const overview_en = (targetAi.overview_en) ? targetAi.overview_en : (source.overview_en || null);

  // ノイズ除去用関数 (例: "イ-・イダム" ➔ "イ・イダム" へ自動クレンジング)
  const cleanKatakanaHyphens = (str) => {
    if (!str) return str;
    return String(str).replace(/([アカ-ンa-zA-Z])-・/g, '$1・').replace(/-・/g, '・');
  };

  // ジャンル自動翻訳＆クレンジング関数
  const cleanGenres = (raw) => {
    if (!raw) return null;
    let str = String(raw);
    try {
      if (str.startsWith('[')) {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) str = parsed.join(', ');
      }
    } catch(e) {}

    const genreMap = {
      'Historical': '時代劇', 'Drama': 'ドラマ', 'Thriller': 'スリラー',
      'Dark Comedy': 'ブラックコメディ', 'Comedy': 'コメディ', 'Action': 'アクション',
      'Horror': 'ホラー', 'Mystery': 'ミステリー', 'Romance': 'ロマンス',
      'Documentary': 'ドキュメンタリー', 'Animation': 'アニメ', 'Sci-Fi': 'SF',
      'Crime': '犯罪', 'Adventure': 'アドベンチャー', 'Fantasy': 'ファンタジー',
      'Family': 'ファミリー', 'Music': '音楽', 'War': '戦争', 'Western': '西部劇'
    };

    Object.keys(genreMap).forEach(eng => {
      const reg = new RegExp('\\b' + eng + '\\b', 'gi');
      str = str.replace(reg, genreMap[eng]);
    });

    return str.replace(/[\[\]"']/g, '').trim();
  };

  // プラットフォームの自動判別（放送局 ➔ 配信プラットフォーム ➔ TVドラマ/映画判定）
  const resolvePlatform = () => {
    const corpus = [
      title, origin_title, overview, overview_en, source.platform || '',
      JSON.stringify(targetAi), JSON.stringify(source)
    ].join(' ').toLowerCase();

    const isTv = Boolean(
      source.first_air_date || 
      source.genres?.includes('ドラマ') || 
      corpus.includes('ドラマ') || 
      corpus.includes('tvn') || 
      corpus.includes('jtbc') || 
      corpus.includes('sbs') || 
      corpus.includes('kbs')
    );

    // 既存データが「劇場公開」でも、TVドラマなら「劇場公開」を採用せず是正
    if (source.platform && (!isTv || source.platform !== '劇場公開')) {
      return source.platform;
    }
    if (targetAi.platform && (!isTv || targetAi.platform !== '劇場公開')) {
      return targetAi.platform;
    }

    // 放送局・TVネットワークの判定
    if (corpus.includes('tvn')) return 'tvN';
    if (corpus.includes('jtbc')) return 'JTBC';
    if (corpus.includes('sbs')) return 'SBS';
    if (corpus.includes('kbs')) return 'KBS';
    if (corpus.includes('mbc')) return 'MBC';
    if (corpus.includes('ena')) return 'ENA';
    if (corpus.includes('nhk')) return 'NHK';
    if (corpus.includes('tbs')) return 'TBS';
    if (corpus.includes('fuji') || corpus.includes('フジテレビ')) return 'フジテレビ';
    if (corpus.includes('asahi') || corpus.includes('テレビ朝日')) return 'テレビ朝日';
    if (corpus.includes('ntv') || corpus.includes('日本テレビ')) return '日本テレビ';
    if (corpus.includes('tokyo') || corpus.includes('テレビ東京')) return 'テレビ東京';
    if (corpus.includes('wowow')) return 'WOWOW';

    // 配信プラットフォームの判定
    if (corpus.includes('netflix') || corpus.includes('ネットフリックス')) return 'Netflix';
    if (corpus.includes('disney') || corpus.includes('ディズニー')) return 'Disney+';
    if (corpus.includes('prime') || corpus.includes('amazon') || corpus.includes('アマプラ')) return 'Amazon Prime Video';
    if (corpus.includes('apple') || corpus.includes('アップル')) return 'Apple TV+';
    if (corpus.includes('watcha') || corpus.includes('ワッチャ')) return 'Watcha';
    if (corpus.includes('tving') || corpus.includes('ティービング')) return 'TVING';
    if (corpus.includes('u-next') || corpus.includes('ユーネクスト')) return 'U-NEXT';

    return isTv ? 'テレビドラマ' : '劇場公開';
  };

  const rawGenre = targetAi.genres || source.genres || null;

  // 5. レコード構築
  const updatedRecord = {
    idx: source.idx ?? null,
    created_at: source.created_at || null,
    country: targetAi.country || source.country || null,
    year: targetAi.year || source.year || null,
    genres: cleanGenres(rawGenre),
    platform: resolvePlatform(),

    wikidata_id: (() => {
      const rawId = source.wikidata_id || targetAi.wikidata_id || null;
      return (rawId && /^Q\d+$/.test(rawId)) ? rawId : null;
    })(),
    tmdb_id: tmdb_id,

    title: cleanKatakanaHyphens(title),
    origin_title: origin_title,

    director: cleanKatakanaHyphens(director),
    director_en: director_en,

    cast: cleanKatakanaHyphens(cast),
    cast_en: cast_en,

    overview: overview,
    overview_en: overview_en,

    poster_url: poster_url,
    trailer_url: trailer_url,

    imdb_id: source.imdb_id || targetAi.imdb_id || null,
    imdb_url: source.imdb_url || targetAi.imdb_url || (source.imdb_id ? `https://www.imdb.com/title/${source.imdb_id}/` : null),

    audit_status: targetAi.audit_status || "OK"
  };

  // 6. 変更履歴 (changes_summary) の自動解析
  const changes = [];
  if ((!source.title || source.title !== updatedRecord.title) && updatedRecord.title) changes.push("補完: title");
  if ((!source.origin_title || source.origin_title !== updatedRecord.origin_title) && updatedRecord.origin_title) changes.push("補完: origin_title");
  if ((!source.director || source.director !== updatedRecord.director) && updatedRecord.director) changes.push("補完: director");
  if ((!source.director_en || source.director_en !== updatedRecord.director_en) && updatedRecord.director_en) changes.push("補完: director_en");
  if ((!source.cast || source.cast !== updatedRecord.cast) && updatedRecord.cast) changes.push("補完: cast");
  if ((!source.cast_en || source.cast_en !== updatedRecord.cast_en) && updatedRecord.cast_en) changes.push("補完: cast_en");
  if ((!source.overview || source.overview !== updatedRecord.overview) && updatedRecord.overview) changes.push("補完: overview");
  if ((!source.overview_en || source.overview_en !== updatedRecord.overview_en) && updatedRecord.overview_en) changes.push("補完: overview_en");
  if ((!source.genres || source.genres !== updatedRecord.genres) && updatedRecord.genres) changes.push("補完: genres");
  if ((!source.wikidata_id || source.wikidata_id !== updatedRecord.wikidata_id) && updatedRecord.wikidata_id) changes.push("補完: wikidata_id");
  if ((!source.tmdb_id || source.tmdb_id !== updatedRecord.tmdb_id) && updatedRecord.tmdb_id) changes.push("補完: tmdb_id");
  if ((!source.imdb_id || source.imdb_id !== updatedRecord.imdb_id) && updatedRecord.imdb_id) changes.push("補完: imdb_id");

  if (source.tmdb_id && updatedRecord.tmdb_id === null) changes.push("誤データ削除: tmdb_id");
  if (source.poster_url && updatedRecord.poster_url === "") changes.push("誤データ削除: poster_url");
  if (source.trailer_url && updatedRecord.trailer_url === "") changes.push("誤データ削除: trailer_url");

  if (!source.poster_url && !updatedRecord.poster_url) changes.push("元から空欄: poster_url");
  if (!source.trailer_url && !updatedRecord.trailer_url) changes.push("元から空欄: trailer_url");

  updatedRecord.changes_summary = changes.length > 0 ? changes.join(" | ") : "変更なし (完全一致)";

  return {
    json: updatedRecord
  };
});
