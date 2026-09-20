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
// 世界各国の音楽ジャンル・時代を超える名曲（クラシック・ヒット）のマッピングテーブル
const genreMap = {
  'Korea': 'K-POP Korean music hits',
  'South Korea': 'K-POP Korean music hits',
  'Japan': 'J-POP 名曲 ヒット',
  'Jamaica': 'Jamaica reggae classics',
  'Brazil': 'Brazil bossa nova samba classics',
  'Nigeria': 'Nigeria afrobeats classics',
  'India': 'India bollywood classics',
  'Cuba': 'Cuba salsa classics',
  'Spain': 'Spain flamenco classics',
  'Argentina': 'Argentina tango classics',
  'Ireland': 'Ireland celtic folk classics',
  'United Kingdom': 'UK rock pop classics',
  'United States': 'US billboard iconic hits',
  'France': 'France chanson classics',
  'Italy': 'Italy classic songs',
  'Mexico': 'Mexico mariachi classics',
  'Colombia': 'Colombia cumbia classics',
  'Puerto Rico': 'Puerto Rico classic hits',
  'South Africa': 'South Africa amapiano classics',
  'Egypt': 'Egypt arabic classics',
  'Turkey': 'Turkey classic songs',
  'Mongolia': 'Mongolia folk music',
  'Bhutan': 'Bhutanese music',
  'Greece': 'Greece classic songs',
  'Sweden': 'Sweden pop classics'
};

let searchTerm = genreMap[countryEn] || `${countryEn} music`;
for (const key in genreMap) {
  if (countryEn.toLowerCase().includes(key.toLowerCase())) {
    searchTerm = genreMap[key];
    break;
  }
}

// iTunes Search API Endpoint
// ⚠️ 重要: KR・JP・GB等のローカルストアは英語クエリでヒットしない場合があるため、
//          全国コードで"US"ストア（最大カタログ）を使用する
// KRストアで英語クエリを叩くと resultCount=0 になり、AIがURLを捏造するバグが発生していた
const searchMarket = 'US';
const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&country=${searchMarket}&media=music&entity=song&limit=40`;

return [{
  json: {
    countryJa,
    countryEn,
    countryCode: marketCode,
    searchTerm: searchTerm,
    itunes_search_url: searchUrl
  }
}];
