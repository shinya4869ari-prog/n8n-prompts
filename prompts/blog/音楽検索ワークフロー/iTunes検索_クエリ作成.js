/**
 * iTunes Search API 検索クエリ作成コード
 * 入力: country-master-lookup から渡された国情報
 * 出力: iTunes Search API GET Request用クエリパラメータ
 * 認証: 不要（完全無料・オープンAPI）
 *
 * ⚠️ 設計方針（重要）:
 *   - マッピング表は廃止。全世界200カ国に対応するため「{国名} music」を動的生成する。
 *   - ストアは常にUSを使用（カタログ最大 / 英語クエリで全言語の音楽が検索可能）。
 *   - 0件の場合はこのノードの後続（iTunes結果整形コード）でエラーを出して即時停止。
 */

const input = $input.first().json;

const countryJa = input.country || input.countryJa || '';
const countryEn = input.countryEn || input.englishName || '';
const countryCode = input.countryCode || input.iso2 || '';

if (!countryEn && !countryJa) {
  throw new Error('❌ iTunes検索: 国名（countryEn / country）が渡されていません。前段ノードの出力を確認してください。');
}

// 検索ターム生成: 常に「{英語国名} music」でUSストアを叩く
// → 世界200カ国すべてでヒット確認済み。マッピング不要。
const searchTerm = `${countryEn || countryJa} music`;

// 常にUSストア（最大カタログ）を使用
// ※KRストア等のローカルストアで英語クエリを叩くと resultCount=0 になるバグが過去に発生
const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&country=US&media=music&entity=song&limit=40`;

return [{
  json: {
    countryJa,
    countryEn,
    countryCode: countryCode.toUpperCase(),
    searchTerm,
    itunes_search_url: searchUrl
  }
}];
