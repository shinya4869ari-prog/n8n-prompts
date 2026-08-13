/**
 * 全AIプロンプト自動ローダー (PromptLoader_MovieDB.js)
 * 役割: GitHub上の最新プロンプト（あらすじ用 & キャスト翻訳用）をまとめて取得し、
 *       n8nの各AIノード（キャスト・監督翻訳AI / gemini_movie_db）へ完全自動で供給する
 */
const baseUrl = 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/%E6%98%A0%E7%94%BBDB%E5%85%85%E5%AE%9F%EF%BC%BF%E5%80%8B%E5%88%A5%E7%99%BB%E9%8C%B2%E7%89%88/';

const files = {
  geminiPrompt: baseUrl + 'gemini_movie_db.md',
  castTransPrompt: baseUrl + encodeURIComponent('キャスト・監督日本語化プロンプト.md')
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
      const possibleNodes = ['Brave Search', 'Brave Search_movie', 'Brave Search web', 'Brave Search_trailer'];
      for (const name of possibleNodes) {
        let b = null;
        try { b = $(name).first()?.json || $(name).item?.json; } catch(err) {}
        if (!b) continue;
        const resList = b?.web?.results || b?.results || (Array.isArray(b) ? b : []);
        if (Array.isArray(resList) && resList.length > 0) {
          const textStr = resList.slice(0, 8).map(r => r.description || r.extra_snippets?.join(' ') || r.title || '').filter(Boolean).join('\n\n');
          if (textStr && textStr.length > 20) return textStr;
        }
      }
      if ($input.first()?.json) {
        const b = $input.first().json;
        const resList = b?.web?.results || b?.results || (Array.isArray(b) ? b : []);
        if (Array.isArray(resList) && resList.length > 0) {
          return resList.slice(0, 8).map(r => r.description || r.title || '').filter(Boolean).join('\n\n');
        }
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
