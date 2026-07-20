// 実行されていないノードでも安全にデータを取得するヘルパー関数
function getNodeData(nodeName) {
  try {
    return $(nodeName).first()?.json || {};
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
    '라': 'ラ', '란': 'ラン', '람': 'ラム', '래': 'レ', '려': 'リョ', '련': 'リョン', '령': 'リョン', '례': 'リェ', '록': 'ロク', '론': 'ロン', '뢰': 'ロィ', '료': 'リョ', '룡': 'リョン', '루': 'ル', '류': 'リュ', '륙': 'リュク', '륜': 'リュン', '률': 'リュル', '륭': 'リュン', '리': 'リ', '림': 'リム',
    '마': 'マ', '만': 'マン', '망': 'マン', '매': 'メ', '맹': 'メン', '명': 'ミョン', '목': 'モク', '묘': 'ミョ', '무': 'ム', '묵': 'ムク', '문': 'ムン', '미': 'ミ', '민': 'ミン', '밀': 'ミル',
    '박': 'パク', '반': 'バン', '방': 'バン', '배': 'ペ', '백': 'ベク', '번': 'ボン', '범': 'ボム', '법': 'ボプ', '변': 'ビョン', '병': 'ビョン', '보': 'ボ', '복': 'ボク', '본': 'ボン', '봉': 'ボン', '부': 'ブ', '북': 'ブク', '분': 'ブン', '비': 'ビ', '빈': 'ビン', '빙': 'ビン',
    '사': 'サ', '삭': 'サク', 'san': 'サン', '산': 'サン', '살': 'サル', 'サム': 'サム', '상': 'サン', '새': 'セ', '서': 'ソ', '석': 'ソク', '선': 'ソン', '설': 'ソル', '섭': 'ソプ', '성': 'ソン', 'се': 'セ', '세': 'セ', '속': 'ソク', '손': 'ソン', '송': 'ソン', '쇄': 'スェ', '수': 'ス', '숙': 'スク', '순': 'スン', '숭': 'スン', '슬': 'スル', '승': 'スン', '시': 'シ', '식': 'シク', '신': 'シン', '심': 'シム', '십': 'シプ', '아': 'ア', '악': 'アク', '안': 'アン', '알': 'アル', '암': 'アム', '압': 'アプ', '앙': 'アン', '애': 'エ', '야': 'ヤ', '약': 'ヤク', '양': 'ヤン', '어': 'オ', '억': 'オク', '언': 'オン', '엄': 'オム', '업': 'オプ', '여': 'ヨ', '역': 'ヨク', '연': 'ヨン', '열': 'ヨル', '염': 'ヨム', '엽': 'ヨプ', '영': 'ヨン', '예': 'イェ', '오': 'オ', '옥': 'オク', '온': 'オン', '옹': 'オン', '와': 'ワ', '완': 'ワン', '왕': 'ワン', '요': 'ヨ', '욕': 'ヨク', '용': 'ヨン', '우': 'ウ', '욱': 'ウク', '운': 'ウン', '울': 'ウル', '웅': 'ウン', '원': 'ウォン', '월': 'ウォル', '위': 'ウィ', '유': 'ユ', '육': 'ユク', '윤': 'ユン', '율': 'ユル', '융': 'ユン', '은': 'ウン', '을': 'ウル', '음': 'ウム', '응': 'ウン', '의': 'ウィ', '이': 'イ', '익': 'イク', '인': 'イン', '일': 'イル', '임': 'イム', '입': 'イプ', '자': 'ジャ', '작': 'ジャク', '잔': 'ジャン', '잠': 'ジャム', '잡': 'ジャプ', '장': 'ジャン', '재': 'ジェ', '쟁': 'ジェン', '저': 'ジョ', '적': 'ジョク', '전': 'チョン', '절': 'ジョル', '점': 'ジョム', '접': 'ジョプ', '정': 'ジョン', '제': 'ジェ', '조': 'ジョ', '족': 'ジョク', '존': 'ジョン', '졸': 'ジョル', '종': 'ジョン', '좌': 'ジュァ', '주': 'ジュ', '죽': 'ジュク', '준': 'ジュン', '줄': 'ジュル', '중': 'ジュン', '즙': 'ジュプ', '증': 'ジュン', '지': 'ジ', '직': 'ジク', '진': 'ジン', '질': 'ジル', '짐': 'ジム', '집': 'ジップ', '징': 'ジン',
    '차': 'チャ', '착': 'チャク', '찬': 'チャン', '찰': 'チャル', '참': 'チャム', '창': 'チャン', '채': 'チェ', '책': 'チェク', '처': 'チョ', '척': 'チョク', '천': 'チョン', '철': 'チョル', '첨': 'チョム', '첩': 'チョプ', '청': 'チョン', '체': 'チェ', '초': 'チョ', '촉': 'チョク', '촌': 'チョン', '총': 'チョン', '최': 'チェ', '추': 'チュ', '축': 'チュク', '춘': 'チュン', '충': 'チュン', '췌': 'チェ', '취': 'チュィ', '측': 'チュク', '치': 'チ', '칙': 'チク', '친': 'チン', '칠': 'チル', '침': 'チム', '칩': 'チップ', '칭': 'チン',
    '쾌': 'クェ',
    '탁': 'タク', '탄': 'タン', '탈': 'タル', '탐': 'タム', '탑': 'タプ', '탕': 'タン', '태': 'テ', '택': 'テク', '탱': 'テン', '토': 'ト', '통': 'トン', '퇴': 'トゥィ', '투': 'トゥ', '특': 'トゥク', '틈': 'トゥム',
    '파': 'パ', '판': 'パン', '팔': 'パル', '패': 'ペ', '팽': 'ペン', '편': 'ピョン', '평': 'ピョン', '폐': 'ピェ', '포': 'ポ', '폭': 'ポク', '표': 'ピョ', '푸': 'プ', '품': 'プム', '풍': 'プン', '피': 'ピ', '필': 'ピル', '하': 'ハ', '학': 'ハク', '한': 'ハン', '할': 'ハル', '함': 'ハム', '합': 'ハプ', '항': 'ハン', '해': 'ヘ', '핵': 'ヘク', '행': 'ヘン', '향': 'ヒャン', '허': 'ホ', '헌': 'ホン', '혁': 'ヒョク', '현': 'ヒョン', '혈': 'ヒョル', '협': 'ヒョプ', '형': 'ヒョン', '혜': 'ヘ', '호': 'ホ', '혹': 'ホク', '혼': 'ホン', '홍': 'ホン', '화': 'ファ', '확': 'ファク', '환': 'ファン', '활': 'ファル', '황': 'ファン', '회': 'フェ', '획': 'フェク', '효': 'ヒョ', '후': 'フ', '훈': 'フン', '웅': 'ウン', '휘': 'フィ', '휴': 'ヒュ', '휼': 'ヒュル', '흉': 'ヒュン', '흔': 'フン', '흥': 'フン', '희': 'ヒ', '힐': 'ヒル'
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

const credits = getNodeData('TMDb credits取得');
const tmdb = getNodeData('TMDb検索');
let sourceData = {};
try {
  sourceData = $('映画ごとにループ実行').item?.json || {};
} catch (e) {
  sourceData = $input.item?.json || {};
}

const resultsList = tmdb?.results || tmdb?.movie_results || (tmdb?.id ? [tmdb] : []);

// 対象国と言語にマッチする映画を検索結果（resultsList）から探す
let result = null;
if (resultsList.length > 0) {
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
const lang = result?.original_language;
// 判定された国、または指定された対象国を格納
const country = sourceData.target_country || sourceData.country || langToCountry[lang] || lang?.toUpperCase() || null;
const posterPath = result?.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : (sourceData.poster_url || null);
const wikidata_id = sourceData.wikidata_id || null;
const cast = Array.isArray(credits?.cast) ? translateKoreanNames(credits.cast.map(c => c.name || c.original_name).join(', ')) : null;
const director = Array.isArray(credits?.crew) ? translateKoreanNames(credits.crew.find(c => c.job === 'Director')?.name || credits.crew.find(c => c.job === 'Director')?.original_name || null) : null;
const cast_en = Array.isArray(credits?.cast) ? credits.cast.map(c => c.original_name).join(', ') : null;
const director_en = Array.isArray(credits?.crew) ? (credits.crew.find(c => c.job === 'Director')?.original_name || null) : null;

// ==========================================
// AI翻訳テキストの取得（Claude & Ollama 両対応ロジック）
// ==========================================
const claudeDbNode = getNodeData('claude_movie_db');
const claudeNode = getNodeData('Claude');
const ollamaNode = getNodeData('Ollama');

let rawAiText = '';

// 1. Claude系ノードからテキストを自動抽出（claude_movie_db または Claude）
const targetClaude = (claudeDbNode?.content || claudeDbNode?.message || claudeDbNode?.text) ? claudeDbNode : (claudeNode?.content || claudeNode?.message || claudeNode?.text ? claudeNode : null);

if (targetClaude) {
  if (Array.isArray(targetClaude.content)) {
    const textContent = targetClaude.content.find(item => item?.type === 'text' || item?.text);
    if (textContent) {
      rawAiText = (textContent.text || '').trim();
    } else if (typeof targetClaude.content[0] === 'string') {
      rawAiText = targetClaude.content.join('\n').trim();
    }
  } else if (typeof targetClaude.content === 'string') {
    rawAiText = targetClaude.content.trim();
  } else if (typeof targetClaude.text === 'string') {
    rawAiText = targetClaude.text.trim();
  } else if (targetClaude.message && typeof targetClaude.message.content === 'string') {
    rawAiText = targetClaude.message.content.trim();
  }
}

// 2. Claudeから取得できない場合、Ollamaノードから取得
if (!rawAiText && ollamaNode) {
  if (typeof ollamaNode.content === 'string') {
    rawAiText = ollamaNode.content.trim();
  } else if (typeof ollamaNode.text === 'string') {
    rawAiText = ollamaNode.text.trim();
  }
}

let ai_title = null;
let ai_summary = null;
if (rawAiText) {
  const titleMatch = rawAiText.match(/\[TITLE:\s*(.+?)\]/i);
  if (titleMatch) {
    ai_title = titleMatch[1].trim();
    ai_summary = rawAiText.replace(/\[TITLE:\s*(.+?)\]/i, '').replace(/[\x00-\x1F\x7F]/g, ' ').trim() || null;
  } else {
    ai_summary = rawAiText.replace(/[\x00-\x1F\x7F]/g, ' ').trim() || null;
  }
}

// Braveの動画結果およびウェブ検索結果（動画が含まれるため）を統合して安全に取得
const braveMovie = getNodeData('Brave Search_movie');
const braveTrailer = getNodeData('Brave Search_trailer');
const videoResults = [
  ...(braveMovie?.videos?.results || []),
  ...(braveMovie?.web?.results || []),
  ...(braveMovie?.results || []),
  ...(braveTrailer?.videos?.results || []),
  ...(braveTrailer?.web?.results || []),
  ...(braveTrailer?.results || [])
];

const youtubeVideo = videoResults.find(v => {
  const url = v.url || v.profile?.url || '';
  const videoTitle = (v.title || '') + ' ' + (v.description || '');
  
  // YouTubeの動画リンク（通常の動画、短縮URL、またはShorts）であること
  const isYouTube = url.includes('youtube.com/watch') || url.includes('youtu.be/') || url.includes('youtube.com/shorts/');
  if (!isYouTube) return false;
  
  // YouTubeのエラー画面（ノイズ）を除外する
  const isNoise = videoTitle.toLowerCase().includes('not currently available') || videoTitle.toLowerCase().includes('利用できません') || videoTitle.toLowerCase().includes('device');
  if (isNoise) return false;
  
  // 映画の予告編に関連するキーワードが含まれているものを厳格に判定
  const hasKeyword = videoTitle.toLowerCase().includes('予告') || 
                    videoTitle.toLowerCase().includes('特報') || 
                    videoTitle.toLowerCase().includes('trailer') || 
                    videoTitle.toLowerCase().includes('teaser') || 
                    videoTitle.toLowerCase().includes('preview') || 
                    videoTitle.toLowerCase().includes('promo') || 
                    videoTitle.toLowerCase().includes('예고'); // 韓国語の「予告」
  if (!hasKeyword) return false;

  // 比較のためにスペースや記号を除去・小文字化するヘルパー関数
  const normalize = (str) => {
    if (!str) return '';
    return String(str).toLowerCase().replace(/[\s\-_!\?\/\(\)\[\]]/g, '');
  };

  const normalizedVideo = normalize(videoTitle);

  // 映画のタイトル（日本語・英語・原題 of いずれか）が動画タイトルに含まれているかをチェック（スペースの有無や表記揺れを無視）
  const movieTitleKeywords = [
    sourceData.title,
    sourceData.origin_title,
    result?.title,
    result?.original_title,
    result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.title,
    result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.title
  ].filter(Boolean).map(normalize);

  const containsMovieTitle = movieTitleKeywords.some(keyword => {
    if (keyword.length <= 1) return false;
    return normalizedVideo.includes(keyword);
  });

  return containsMovieTitle;
});

const trailer_url = youtubeVideo?.url || youtubeVideo?.profile?.url || null;

const rawOverview = result?.overview || 
                    result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || 
                    result?.translations?.translations?.find(t => t.data?.overview)?.data?.overview || 
                    null;

// AI（Claude/Ollama）で翻訳した日本語あらすじ（rawAiText）があればそれをそのまま overview にセット
const finalOverview = rawAiText || rawOverview;
// 元々あった英語あらすじ（rawOverview）をそのまま overview_en にセット
const overviewEn = rawOverview;

const inputTitle = (/^\d+$/.test(sourceData.title || '') ? null : sourceData.title);
const isInputTitleJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(inputTitle || '');
const isTmdbTitleJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(result?.title || '');
const tmdbJaTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.title || null;
const tmdbEnTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.title || null;
const finalTitle = (isInputTitleJapanese ? inputTitle : null) || tmdbJaTitle || (isTmdbTitleJapanese ? result?.title : null) || tmdbEnTitle || (result?.original_language === 'en' ? result?.original_title : null) || inputTitle || result?.title || result?.original_title || null;

// JSON壊れ（パースエラー）を防ぐため、文字列の特殊文字をエスケープするヘルパー関数
const escapeJsonString = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
};

return [{
  json: {
    title: escapeJsonString(finalTitle),
    origin_title: escapeJsonString(sourceData.origin_title || result?.original_title || null),
    year: (result?.release_date ? result.release_date.substring(0, 4) : null) || sourceData.year || null,
    poster_url: posterPath,
    country,
    wikidata_id,
    tmdb_id: result?.id || null,
    overview: escapeJsonString(finalOverview),
    overview_en: escapeJsonString(overviewEn),
    director: escapeJsonString(director || sourceData.director_name || null),
    cast: escapeJsonString(cast),
    director_en: escapeJsonString(director_en),
    cast_en: escapeJsonString(cast_en),
    trailer_url,
  }
}];
