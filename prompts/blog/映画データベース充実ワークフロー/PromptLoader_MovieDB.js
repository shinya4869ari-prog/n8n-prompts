/**
 * あらすじ生成用 PromptLoader_MovieDB
 * 役割: GitHub上の最新 gemini_movie_db.md を取得し、テンプレート変数を置換して Gemini ノードへ渡す
 */
const baseUrl = 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/%E6%98%A0%E7%94%BB%E3%83%87%E3%83%BC%E3%82%BF%E3%83%99%E3%83%BC%E3%82%B9%E5%85%85%E5%AE%9F%E3%83%AF%E3%83%BC%E3%82%AF%E3%83%95%E3%83%AD%E3%83%BC/';

const files = {
  geminiPrompt: baseUrl + 'gemini_movie_db.md'
};

try {
  const keys = Object.keys(files);
  const responses = await Promise.all(
    keys.map(key => this.helpers.httpRequest({ method: 'GET', url: files[key] }))
  );

  const rawData = {};
  keys.forEach((key, index) => { rawData[key] = responses[index]; });

  const items = $input.all();

  // 1. 各種ノードからデータを収集
  const shaped = (() => {
    try { return $('映画データ整形コード_claude').first()?.json || {}; } catch(e) { return {}; }
  })();

  const castTrans = (() => {
    try {
      const c = $('キャスト・監督翻訳AI1').first()?.json || $('キャスト・監督翻訳AI').first()?.json || {};
      const raw = c?.text || (Array.isArray(c?.content) ? c.content[0]?.text : c?.content) || '';
      return JSON.parse(raw.replace(/```json/gi, '').replace(/```/g, '').trim());
    } catch(e) { return {}; }
  })();

  const brave = (() => {
    try {
      const b = $('Brave Search').first()?.json || $input.first()?.json || {};
      return (b?.web?.results || []).slice(0, 5).map(r => r.movie?.description || r.description || '').filter(Boolean).join('\n');
    } catch(e) { return ''; }
  })();

  const movieTitle = castTrans.title || shaped.title || shaped.origin_title || '';
  const overviewEn = shaped.overview_en || shaped.overview || '';

  // 2. テンプレート変数置換
  let promptText = rawData.geminiPrompt || '';
  promptText = promptText.replace(/\{\{\s*\$json\.title\s*\|\|\s*\$json\.origin_title\s*\|\|\s*''\s*\}\}/g, movieTitle);
  promptText = promptText.replace(/\{\{\s*\$json\.brave_search_result\s*\|\|\s*''\s*\}\}/g, brave);
  promptText = promptText.replace(/\{\{\s*\$json\.overview_en\s*\|\|\s*\$json\.overview\s*\|\|\s*'なし'\s*\}\}/g, overviewEn || 'なし');

  return items.map(item => ({
    json: {
      ...item.json,
      geminiPrompt: promptText,
      movieTitle: movieTitle,
      brave_search_result: brave
    }
  }));
} catch (error) {
  console.error("PromptLoader_MovieDB Error:", error);
  return $input.all().map(item => ({ json: { error: error.message, ...item.json } }));
}
