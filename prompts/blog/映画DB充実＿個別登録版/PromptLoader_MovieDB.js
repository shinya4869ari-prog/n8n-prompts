/**
 * 全AIプロンプト自動ローダー (PromptLoader_MovieDB.js)
 * 役割: GitHub上の最新プロンプト（あらすじ用 & キャスト翻訳用）をまとめて取得し、
 *       n8nの各AIノード（キャスト・監督翻訳AI / gemini_movie_db）へ完全自動で供給する
 */
const baseUrl = 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/%E6%98%A0%E7%94%BBDB%E5%85%85%E5%AE%9F%EF%BC%BF%E5%80%8B%E5%88%A5%E7%99%BB%E9%8C%B2%E7%89%88/';

const files = {
  geminiPrompt: baseUrl + 'gemini_movie_db.md',
  castTransPrompt: baseUrl + '%E3%82%AD%E3%83%A3%E3%82%B9%E3%83%88%E3%83%BB%E7%9B%A3%E7%9D%A3%E6%97%A5%E6%9C%AC%E8%AA%9E%E5%8C%96%E3%83%97%E3%83%AD%E3%83%B3%E3%83%97%E3%83%88.md'
};

try {
  const keys = Object.keys(files);
  const responses = await Promise.all(
    keys.map(key => this.helpers.httpRequest({ method: 'GET', url: files[key] }))
  );

  const rawData = {};
  keys.forEach((key, index) => { rawData[key] = responses[index]; });

  const items = $input.all();

  // 1. 各種ノードからデータを自動収集
  const shaped = (() => {
    try { return $('映画データ整形コード').first()?.json || $('映画データ整形コード_claude').first()?.json || {}; } catch(e) { return {}; }
  })();

  const brave = (() => {
    try {
      const b = $('Brave Search_movie').first()?.json || $('Brave Search').first()?.json || $input.first()?.json || {};
      const resList = b?.web?.results || b?.results || [];
      if (Array.isArray(resList) && resList.length > 0) {
        return resList.slice(0, 5).map(r => r.movie?.description || r.description || '').filter(Boolean).join('\n');
      }
    } catch(e) { return ''; }
    return '';
  })();

  const country = shaped.country || 'KR';
  const title = shaped.title || shaped.origin_title || '';
  const directorEn = shaped.director_en || shaped.director || 'なし';
  const castEn = shaped.cast_en || shaped.cast || 'なし';
  const overviewEn = shaped.overview_en || shaped.overview || 'なし';

  // 2. あらすじ用プロンプトの変数置換
  let geminiPromptText = rawData.geminiPrompt || '';
  geminiPromptText = geminiPromptText.replace(/\{\{\s*\$json\.title\s*\|\|\s*\$json\.origin_title\s*\|\|\s*''\s*\}\}/g, title);
  geminiPromptText = geminiPromptText.replace(/\{\{\s*\$json\.brave_search_result\s*\|\|\s*''\s*\}\}/g, brave);
  geminiPromptText = geminiPromptText.replace(/\{\{\s*\$json\.overview_en\s*\|\|\s*\$json\.overview\s*\|\|\s*'なし'\s*\}\}/g, overviewEn);

  // 3. キャスト・監督翻訳用プロンプトの変数置換
  let castTransPromptText = rawData.castTransPrompt || '';
  castTransPromptText = castTransPromptText.replace(/\{\{\s*\$\('映画データ整形コード'\)\.item\.json\.country\s*\|\|\s*'KR'\s*\}\}/g, country);
  castTransPromptText = castTransPromptText.replace(/\{\{\s*\$\('映画データ整形コード'\)\.item\.json\.title\s*\|\|\s*'なし'\s*\}\}/g, title || 'なし');
  castTransPromptText = castTransPromptText.replace(/\{\{\s*\$\('映画データ整形コード'\)\.item\.json\.director_en\s*\|\|\s*'なし'\s*\}\}/g, directorEn);
  castTransPromptText = castTransPromptText.replace(/\{\{\s*\$\('映画データ整形コード'\)\.item\.json\.cast_en\s*\|\|\s*'なし'\s*\}\}/g, castEn);

  return items.map(item => ({
    json: {
      ...item.json,
      geminiPrompt: geminiPromptText,
      castTransPrompt: castTransPromptText,
      movieTitle: title,
      brave_search_result: brave,
      overview_en: overviewEn
    }
  }));
} catch (error) {
  console.error("PromptLoader Error:", error);
  return $input.all().map(item => ({ json: { error: error.message, ...item.json } }));
}
