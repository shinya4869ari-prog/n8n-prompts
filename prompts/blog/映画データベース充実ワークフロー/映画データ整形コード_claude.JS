const brave = $input.first()?.json || $input.item?.json || {};
const credits = getNodeData('TMDb credits取得');
const t1 = getNodeData('TMDb検索');
const t2 = getNodeData('TMDb検索_タイトル');
const resultsList = [
  ...(t1?.results || t1?.movie_results || (t1?.id ? [t1] : [])),
  ...(t2?.results || t2?.movie_results || (t2?.id ? [t2] : []))
];
let sourceData = {};
function getSourceNodeData() {
  const isValid = (d) => d && (d.title || d.country || d.target_country || d.overview);
  
  // 1. First, check direct input
  let d = $input.first()?.json || $input.item?.json;
  if (isValid(d)) return d;

  // 2. Check fallback nodes if direct input doesn't have movie data
  try {
    d = $('Loop Over Items').first()?.json || $('Loop Over Items').item?.json;
    if (isValid(d)) return d;
  } catch (e) {}
  try {
    d = $('Loop Over Items1').first()?.json || $('Loop Over Items1').item?.json;
    if (isValid(d)) return d;
  } catch (e) {}
  try {
    d = $('映画ごとにループ実行').first()?.json || $('映画ごとにループ実行').item?.json;
    if (isValid(d)) return d;
  } catch (e) {}
  
  // 3. Ultimate fallback
  return $input.first()?.json || $input.item?.json || {};
}
sourceData = getSourceNodeData();

// 実行されていないノードでも安全にデータを取得するヘルパー関数
function getNodeData(nodeName) {
  try {
    return $(nodeName).first()?.json || $(nodeName).item?.json || {};
  } catch (e) {
    return {};
  }
}

const translateHangulToKatakana = (text) => {
  if (!text) return text;
  const hangulMap = {
    '가': 'ガ', '강': 'カン', '건': 'ゴン', '검': 'ゴム', '경': 'ギョン', '계': 'ギェ', '고': 'コ', '곤': 'ゴン', '공': 'コン', '과': 'グァ', '관': 'グァン', '광': 'グァン', '구': 'ク', '국': 'グク', '권': 'クォン', '귀': 'グィ', '규': 'ギュ', '균': 'ギュン', '근': 'グン', '금': 'グム', '기': 'ギ', '길': 'ギル', '김': 'キム',
    '나': 'ナ', '남': 'ナム', '노': 'ノ', '뇌': 'ノィ',
    '다': 'ダ', '단': 'ダン', '담': 'ダム', '대': 'デ', '덕': 'ドク', '도': 'ド', '독': 'ドク', '돈': 'ドン', '동': 'ドン', '두': 'ド', '득': 'ドゥク',
    '라': 'ラ', '란': 'ラン', '람': 'ラム', '래': 'レ', '려': 'リョ', '련': 'リョン', '령': 'リョン', '례': 'リェ', '록': 'ロク', '론': 'ロン', '뢰': 'ロィ', '료': 'リョ', '룡': 'リョン', '루': 'ル', '류': 'リュ', '륙': 'リュク', '륜': 'リュン', '률': 'リュル', '륭': 'リュン', '리': 'リ', 'リム': 'リム',
    '마': 'マ', '만': 'マン', '망': 'マン', '매': 'メ', '맹': 'メン', '명': 'ミョン', '목': 'モク', '묘': 'ミョ', '무': 'ム', '묵': 'ムク', '문': 'ムン', '미': 'ミ', '민': 'ミン', '밀': 'ミル',
    '박': 'パク', '반': 'バン', '방': 'バン', '배': 'ペ', '백': 'ベク', '번': 'ボン', '범': 'ボム', '법': 'ボプ', '변': 'ビョン', '병': 'ビョン', '보': 'ボ', '복': 'ボク', '본': 'ボン', '봉': 'ボン', '부': 'ブ', '북': 'ブク', '분': 'ブン', '비': 'ビ', 'ビン': 'ビン', '빙': 'ビン',
    '사': 'サ', '삭': 'サク', 'san': 'サン', '산': 'サン', '살': 'サル', '삼': 'サム', '상': 'サン', '새': 'セ', '서': 'ソ', '석': 'ソク', '선': 'ソン', '설': 'ソル', '섭': 'ソプ', '성': 'ソン', '세': 'セ', '속': 'ソク', '손': 'ソン', '송': 'ソン', '쇄': 'スェ', '수': 'ス', '숙': 'スク', '순': 'スン', '숭': 'スン', '슬': 'スル', '승': 'スン', '시': 'シ', '식': 'シク', '신': 'シン', '심': 'シム', '십': 'シプ', '아': 'ア', '악': 'アク', '안': 'アン', 'アル': 'アル', '암': 'アム', '圧': 'アプ', '앙': 'アン', '애': 'エ', '야': 'ヤ', '약': 'ヤク', '양': 'ヤン', '어': 'オ', '억': 'オク', '언': 'オン', '엄': 'オム', '업': 'オプ', '여': 'ヨ', '역': 'ヨク', 'ヨン': 'ヨン', 'ヨル': 'ヨル', '塩': 'ヨム', '葉': 'ヨプ', '英': 'ヨン', '예': 'イェ', '오': 'オ', '옥': 'オク', '온': 'オン', '옹': 'オン', 'ワ': 'ワ', 'ワン': 'ワン', '王': 'ワン', '요': 'ヨ', '욕': 'ヨク', '용': 'ヨン', '우': 'ウ', '욱': 'ウク', '운': 'ウン', 'ウル': 'ウル', '웅': 'ウン', '원': 'ウォン', '月': 'ウォル', '위': 'ウィ', '유': 'ユ', '육': 'ユク', '윤': 'ユン', '율': 'ユル', '륭': 'ユン', '銀': 'ウン', '을': 'ウル', '음': 'ウム', '응': 'ウン', '의': 'ウィ', '이': 'イ', 'イク': 'イク', '인': 'イン', '일': 'イル', '임': 'イム', '입': 'イプ', '자': 'ジャ', '작': 'ジャク', '잔': 'ジャン', '잠': 'ジャム', '雑': 'ジャプ', '張': 'ジャン', '再': 'ジェ', '쟁': 'ジェン', '저': 'ジョ', '적': 'ジョク', '전': 'チョン', '節': 'ジョル', '点': 'ジョム', '接': 'ジョプ', '정': 'ジョン', '제': 'ジェ', '조': 'ジョ', '族': 'ジョク', '존': 'ジョン', '卒': 'ジョル', '종': 'ジョン', '座': 'ジュァ', '주': 'ジュ', '竹': 'ジュク', '准': 'ジュン', '줄': 'ジュル', '中': 'ジュン', '汁': 'ジュプ', '証': 'ジュン', '지': 'ジ', '直': 'ジク', '진': 'ジン', '質': 'ジル', '짐': 'ジム', '執': 'ジップ', '徴': 'ジン',
    '차': 'チャ', '着': 'チャク', '賛': 'チャン', '찰': 'チャル', '参': 'チャム', '創': 'チャン', '採': 'チェ', '冊': 'チェク', '処': 'チョ', '척': 'チョク', '千': 'チョン', '哲': 'チョル', '添': 'チョム', '妾': 'チョプ', '清': 'チョン', '体': 'チェ', '初': 'チョ', '燭': 'チョク', '村': 'チョン', '総': 'チョン', '최': 'チェ', '秋': 'チュ', '築': 'チュク', '春': 'チュン', '忠': 'チュン', '膵': 'チェ', '取': 'チュィ', '側': 'チュク', '治': 'チ', '勅': 'チク', '親': 'チン', '七': 'チル', '針': 'チム', 'チップ': 'チップ', '称': 'チン',
    '快': 'クェ',
    '卓': 'タク', '炭': 'タン', '脱': 'タル', '探': 'タム', '塔': 'タプ', '湯': 'タン', '太': 'テ', '択': 'テク', '탱': 'テン', '土': 'ト', '通': 'トン', '退': 'トゥィ', '闘': 'トゥ', '特': 'トゥク', '틈': 'トゥム',
    '波': 'パ', '板': 'パン', '八': 'パル', '覇': 'ペ', '팽': 'ペン', '便': 'ピョン', '平': 'ピョン', '幣': 'ピェ', '捕': 'ポ', '爆': 'ポク', '表': 'ピョ', '푸': 'プ', '品': 'プム', '風': 'プン', '피': 'ピ', '筆': 'ピル', '하': 'ハ', '鶴': 'ハク', '韓': 'ハン', '割': 'ハル', '咸': 'ハム', '合': 'ハプ', '港': 'ハン', '海': 'ヘ', '核': 'ヘク', '幸': 'ヘン', '香': 'ヒャン', '許': 'ホ', '憲': 'ホン', '革': 'ヒョク', '賢': 'ヒョン', '穴': 'ヒョル', '協': 'ヒョプ', '形': 'ヒョン', '恵': 'ヘ', '湖': 'ホ', '惑': 'ホク', '混': 'ホン', '紅': 'ホン', '華': 'ファ', '確': 'ファク', '歓': 'ファン', '活': 'ファル', '黄': 'ファン', '会': 'フェ', '画': 'フェク', '孝': 'ヒョ', '後': 'フ', '訓': 'フン', '雄': 'ウン', '揮': 'フィ', '休': 'ヒュ', '恤': 'ヒュル', '凶': 'ヒュン', '痕': 'フン', '興': 'フン', '희': 'ヒ', '詰': 'ヒル'
  };
  return text.split('').map(char => hangulMap[char] || char).join('');
};

const translateKoreanNames = (namesStr) => {
  if (!namesStr) return namesStr;
  return namesStr.split(', ').map(name => {
    const trimmed = name.trim();
    if (/[\uAC00-\uD7A3]/.test(trimmed)) {
      if (trimmed.length >= 2 && trimmed.length <= 4) {
        const doubleSurnames = ['남궁', '황보', '제갈', '사공', '독고'];
        const surnameLen = (trimmed.length === 4 && doubleSurnames.includes(trimmed.substring(0, 2))) ? 2 : 1;
        const surname = trimmed.substring(0, surnameLen);
        const given = trimmed.substring(surnameLen);
        return translateHangulToKatakana(surname) + '・' + translateHangulToKatakana(given);
      }
      return translateHangulToKatakana(trimmed);
    }
    return trimmed;
  }).join(', ');
};

const correctMovieId = credits?.id;

// 対象国と言語にマッチする映画を検索結果（resultsList）から探す
let result = null;
if (correctMovieId && resultsList.length > 0) {
  // 0. creditsのIDと完全一致するものを最優先（最も確実）
  result = resultsList.find(m => m.id === correctMovieId);
}

if (!result && resultsList.length > 0) {
  // 1. 国コードとオリジナル言語の両方が一致するものを最優先
  result = resultsList.find(m => 
    (m.original_language === sourceData.target_lang) || 
    (m.origin_country && m.origin_country.includes(sourceData.target_country))
  );
  
  // 2. マッチするものがない場合は、最初の検索結果をフォールバックとして使用
  if (!result) {
    result = resultsList[0];
  }
}

if (!sourceData?.title && !result?.title) return [];

const langToCountry = {
  'ko': 'KR', 'ja': 'JP', 'en': 'US', 'fr': 'FR', 'de': 'DE',
  'zh': 'CN', 'ar': 'SA', 'fa': 'IR', 'hi': 'IN', 'th': 'TH',
  'vi': 'VN', 'id': 'ID', 'tr': 'TR', 'ru': 'RU', 'es': 'ES',
  'pt': 'BR', 'it': 'IT', 'nl': 'NL', 'pl': 'PL', 'da': 'DK',
  'sv': 'SE', 'nb': 'NO', 'fi': 'FI',
};
const nameToCountryCode = {
  'ブータン': 'BT',
  '韓国': 'KR',
  '大韓民国': 'KR',
  'アメリカ': 'US',
  'アメリカ合衆国': 'US',
  '日本': 'JP',
  'フランス': 'FR',
  'ドイツ': 'DE',
  '中国': 'CN',
  '中華人民共和国': 'CN',
  'インド': 'IN',
  'イギリス': 'GB',
  'グレートブリテン': 'GB',
  'イタリア': 'IT',
  'カナダ': 'CA',
  'オーストラリア': 'AU',
  'スペイン': 'ES',
  'ロシア': 'RU',
  'ロシア連邦': 'RU',
  '台湾': 'TW',
  'タイ': 'TH',
  'ベトナム': 'VN',
  'インドネシア': 'ID',
  'トルコ': 'TR',
  'ブラジル': 'BR',
  'メキシコ': 'MX',
  'ニュージーランド': 'NZ',
};
const lang = result?.original_language;

// カタカナ国名が流れてきた場合は2文字コードに変換する
let rawCountry = sourceData.target_country || sourceData.country || '';
if (nameToCountryCode[rawCountry]) {
  rawCountry = nameToCountryCode[rawCountry];
}

const tmdbOriginCountry = (Array.isArray(result?.origin_country) && result.origin_country[0]) || (typeof result?.origin_country === 'string' ? result.origin_country : null);
const country = (rawCountry && rawCountry.length === 2 ? rawCountry.toUpperCase() : null) || 
                (tmdbOriginCountry && tmdbOriginCountry.length === 2 ? tmdbOriginCountry.toUpperCase() : null) ||
                langToCountry[lang] || 
                lang?.toUpperCase() || 
                null;
const posterPath = result?.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null;
let wikidata_id = result?.external_ids?.wikidata_id || null;
if (!wikidata_id) {
  try {
    const wikiJson1 = getNodeData('Wikidata検索');
    let fallbackId = wikiJson1?.query?.search?.[0]?.title || wikiJson1?.search?.[0]?.id || null;
    
    const wikiJson2 = getNodeData('Wikidata検索 (タイトル検索用)');
    if (!fallbackId && wikiJson2) {
      fallbackId = wikiJson2?.search?.[0]?.id || wikiJson2?.query?.[0]?.title || null;
    }
    
    wikidata_id = fallbackId;
  } catch (e) {}
}
const cast = Array.isArray(credits?.cast) ? credits.cast.map(c => c.name || c.original_name).join(', ') : null;
const director = Array.isArray(credits?.crew) ? (credits.crew.find(c => c.job === 'Director')?.name || credits.crew.find(c => c.job === 'Director')?.original_name || null) : null;
const cast_en = Array.isArray(credits?.cast) ? credits.cast.map(c => c.original_name).join(', ') : null;
const director_en = Array.isArray(credits?.crew) ? (credits.crew.find(c => c.job === 'Director')?.original_name || null) : null;
const claude = getNodeData('Message a model');
let rawText = '';
if (typeof claude?.text === 'string') {
  rawText = claude.text;
} else if (typeof claude?.content === 'string') {
  rawText = claude.content;
} else if (Array.isArray(claude?.content) && claude.content[0]?.text) {
  rawText = claude.content[0].text;
} else if (typeof claude?.output === 'string') {
  rawText = claude.output;
}
const ai_summary = rawText.replace(/[\x00-\x1F\x7F]/g, ' ').trim() || null;
const braveSearchData = getNodeData('Brave Search_movie');
const braveTrailer = getNodeData('Brave Search_trailer');
const braveVideos = braveTrailer?.results || braveTrailer?.videos?.results || [];
const videoResults = brave?.results || brave?.videos?.results || braveVideos;

const youtubeVideo = videoResults.find(v => {
  const url = v.url || v.profile?.url || '';
  const title = (v.title || v.description || '').toLowerCase();
  
  // YouTubeの動画リンクであること
  const isYouTube = url.includes('youtube.com/watch') || url.includes('youtu.be/');
  if (!isYouTube) return false;
  
  // YouTubeのエラー画面（ノイズ）を除外する
  const isNoise = title.includes('not currently available') || title.includes('利用できません') || title.includes('device');
  if (isNoise) return false;
  
  // 映画の予告編に関連するキーワードが含まれているものを厳格に判定（「映画」などの広すぎる言葉は除外）
  const hasKeyword = title.includes('予告') || 
                    title.includes('特報') || 
                    title.includes('trailer') || 
                    title.includes('teaser') || 
                    title.includes('preview') || 
                    title.includes('promo') || 
                    title.includes('예고'); // 韓国語の「予告」
  return hasKeyword;
});

const trailer_url = youtubeVideo?.url || youtubeVideo?.profile?.url || null;

const rawOverview = result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.overview || 
                    result?.overview || 
                    result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || 
                    result?.translations?.translations?.find(t => t.data?.overview)?.data?.overview || 
                    null;

// ベースとなる日本語あらすじを定義（TMDb公式日本語 ＞ Supabaseの既存日本語 ＞ 上流ブログでAIが取得した日本語）
const tmdbJaOverview = result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.overview || null;

let supabaseJaOverview = null;
try {
  const sbData = $('Supabaseから既存データを取得').item?.json || {};
  const record = Array.isArray(sbData) ? sbData[0] : sbData;
  supabaseJaOverview = record?.overview || record?.overview_en || record?.ai_summary || null;
} catch(e){}

const sourceJaOverview = sourceData.overview || null;
const baseOverview = tmdbJaOverview || supabaseJaOverview || sourceJaOverview || null;

// TMDbの公式あらすじ、またはブログ側から流れてきた既存あらすじが日本語であるかを判定
const isOverviewJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3005-\u3006]/.test(rawOverview || '') || 
                           /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3005-\u3006]/.test(baseOverview || '');

// TMDb英語あらすじを抽出
const rawOverviewEn = result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || 
                      (!isOverviewJapanese ? rawOverview : null);

let finalOverview = null;
let finalOverviewEn = null;
let finalAiSummary = null;

if (rawOverview) {
  // パターンA・B: 公式あらすじが存在する場合
  if (isOverviewJapanese) {
    // パターンA: 日本語公式あらすじがある場合
    finalOverview = baseOverview || rawOverview;
    finalOverviewEn = null;
    finalAiSummary = null;
  } else {
    // パターンB: 英語の公式あらすじだけがある場合
    finalOverview = baseOverview; // overviewは日本語専用。英語は入れない
    finalOverviewEn = rawOverview; // ◀ ここに「英語の原文あらすじ」をセットして後ろのAI翻訳に渡す
    finalAiSummary = null;
  }
} else {
  // パターンC: 公式あらすじが無い（Tavily検索ルート）の場合
  finalOverview = baseOverview; // もともとブログ側で作られた日本語あらすじがあれば保持
  finalOverviewEn = null;
  finalAiSummary = null; // 後ろのTavily検索+AI生成で作成されるため、この時点ではnull
}

const tmdbJaTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.title || null;
const tmdbEnTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.title || null;
const finalTitle = (/^\d+$/.test(sourceData.title || '') ? null : sourceData.title) || (isOverviewJapanese ? result?.title : null) || tmdbJaTitle || result?.title || result?.original_title || null;

// オリジナルタイトルの言語判定（日本語、ハングル、英語/ラテン文字のみ許可）
const isAllowedOriginTitle = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3005-\u3006\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\u0020-\u007E\u00C0-\u024F\u1E00-\u1EFF\s\-_:'",\.!\?&\(\)]+$/.test(str.trim());
};

const rawTmdbOrigin = result?.original_title || null;
const rawSourceOrigin = sourceData.origin_title || null;

let finalOriginTitle = null;
if (isAllowedOriginTitle(rawTmdbOrigin)) {
  finalOriginTitle = rawTmdbOrigin;
} else if (isAllowedOriginTitle(tmdbEnTitle)) {
  finalOriginTitle = tmdbEnTitle;
} else if (isAllowedOriginTitle(rawSourceOrigin)) {
  finalOriginTitle = rawSourceOrigin;
} else if (isAllowedOriginTitle(result?.title)) {
  finalOriginTitle = result.title;
}

if (!isAllowedOriginTitle(finalOriginTitle)) {
  finalOriginTitle = null;
}

// TMDbのジャンルID ➔ 日本語変換マッピング
const genreMap = {
  28: "アクション", 12: "アドベンチャー", 16: "アニメ", 35: "コメディ", 80: "犯罪",
  99: "ドキュメンタリー", 18: "ドラマ", 10751: "ファミリー", 14: "ファンタジー", 36: "歴史",
  27: "ホラー", 10402: "音楽", 9648: "ミステリー", 10749: "ロマンス", 878: "SF",
  10770: "テレビ映画", 53: "スリラー", 10752: "戦争", 37: "西部劇"
};
const rawGenreIds = result?.genre_ids || (result?.genres ? result.genres.map(g => g.id) : []);
const genres = (Array.isArray(rawGenreIds) && rawGenreIds.length > 0 ? rawGenreIds.map(id => genreMap[id]).filter(Boolean).join(', ') : '') || sourceData.genres || sourceData.genre || null;

// JSON壊れ（パースエラー）を防ぐため、文字列の特殊文字をエスケープするヘルパー関数
const escapeJsonString = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
};

return [{
  json: {
    title: escapeJsonString(finalTitle),
    origin_title: escapeJsonString(finalOriginTitle),
    year: (result?.release_date ? result.release_date.substring(0, 4) : null) || sourceData.year || null,
    poster_url: posterPath,
    country,
    genres: escapeJsonString(genres),
    wikidata_id,
    tmdb_id: result?.id || null,
    overview: escapeJsonString(finalOverview),
    overview_en: escapeJsonString(finalOverviewEn),
    trailer_url,
    director: escapeJsonString(director),
    cast: escapeJsonString(cast),
    director_en: escapeJsonString(director_en),
    cast_en: escapeJsonString(cast_en),
  }
}];
