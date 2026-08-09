/**
 * iTunes Search API 検索クエリ作成コード
 * 入力: country-master-lookup から渡された国情報
 * 出力: iTunes Search API GET Request用クエリパラメータ
 * 認証: 不要（完全無料・オープンAPI）
 */
const input = items[0].json;

const countryJa = input.country || input.countryJa || '韓国';
const countryEn = input.countryEn || input.englishName || 'South Korea';
const countryCode = input.countryCode || input.iso2 || 'KR';

// ISO国コード（2文字）を大文字化
const marketCode = (countryCode && countryCode.length === 2) ? countryCode.toUpperCase() : 'JP';

// iTunes検索用クエリの生成
// 世界各国の音楽ジャンル・特徴的キーワードのマッピングテーブル
const genreMap = {
  'Korea': 'K-Pop',
  'South Korea': 'K-Pop',
  'Japan': 'J-Pop',
  'Jamaica': 'Reggae Jamaica',
  'Brazil': 'Samba Bossa Nova Brazil',
  'Nigeria': 'Afrobeats Nigeria',
  'India': 'Bollywood India',
  'Cuba': 'Salsa Cuba',
  'Spain': 'Flamenco Spain',
  'Argentina': 'Tango Argentina',
  'Ireland': 'Celtic Irish music',
  'United Kingdom': 'UK Pop',
  'United States': 'US Pop',
  'France': 'Chanson French music',
  'Italy': 'Italian music',
  'Mexico': 'Regional Mexican',
  'Colombia': 'Cumbia Colombia',
  'Puerto Rico': 'Reggaeton Puerto Rico',
  'South Africa': 'Amapiano South Africa',
  'Egypt': 'Arabic Egyptian music',
  'Turkey': 'Turkish music',
  'Mongolia': 'Mongolian music',
  'Bhutan': 'Bhutanese music',
  'Greece': 'Greek music',
  'Sweden': 'Swedish pop'
};

let searchTerm = genreMap[countryEn] || `${countryEn} music`;
for (const key in genreMap) {
  if (countryEn.toLowerCase().includes(key.toLowerCase())) {
    searchTerm = genreMap[key];
    break;
  }
}

// iTunes Search API Endpoint
// 全世界のiTunesストアから代表曲を最大40件取得
const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&country=${marketCode}&media=music&entity=song&limit=40`;

return [{
  json: {
    countryJa,
    countryEn,
    countryCode: marketCode,
    searchTerm: searchTerm,
    itunes_search_url: searchUrl
  }
}];
