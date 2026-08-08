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
// 単に国名「South Korea」だとストア内検索で0件になるため「Korea music」または「K-Pop」等の最適キーワードを設定
let searchTerm = `${countryEn} music`;
if (countryEn.includes('Korea')) {
  searchTerm = 'K-Pop';
}

// iTunes Search API Endpoint
// country=KR に固定しすぎるとストア側のヒット数が0件になる場合があるため、汎用ストアで人気曲をヒットさせる
const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&media=music&entity=song&limit=30`;

return [{
  json: {
    countryJa,
    countryEn,
    countryCode: marketCode,
    searchTerm: searchTerm,
    itunes_search_url: searchUrl
  }
}];
