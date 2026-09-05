/**
 * 【n8n用】Google News RSS XML 解析＆全カテゴリ（8件）一括抽出コード
 * 
 * 役割:
 *  1. Google News RSS取得ノードから渡された全8カテゴリのXMLデータをループ処理。
 *  2. 各カテゴリのトップ1記事（タイトル、リンク、発行日時、メディア名）を抽出。
 *  3. 後続の Gemini 本格報道記事生成ノードへ渡すクリーンな配列を生成。
 */

const allInputs = $input.all();
const results = [];

// 渡された全8カテゴリ（5大カテゴリ ＋ 推し3人）をすべてループ処理
for (const inputItem of allInputs) {
  const rawXml = inputItem.json.data || inputItem.json.body || inputItem.json.response || '';
  const meta = inputItem.json;

  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const match = itemRegex.exec(rawXml);

  if (match) {
    const content = match[1];
    let rawTitle = (content.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
    const link = (content.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '').trim();
    const pubDate = (content.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || '').trim();
    const sourceMatch = content.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    let sourceName = sourceMatch ? sourceMatch[1].trim() : '';

    // メディア名を分離（例: "기사 제목 - 연합뉴스"）
    let cleanTitle = rawTitle;
    if (rawTitle.includes(' - ')) {
      const parts = rawTitle.split(' - ');
      sourceName = sourceName || parts.pop().trim();
      cleanTitle = parts.join(' - ').trim();
    }

    results.push({
      json: {
        category: meta.category,
        category_name: meta.category_name || meta.category,
        person_id: meta.person_id || null,
        person_name: meta.person_name || null,
        person_profile_url: meta.person_profile_url || null,
        news_title: cleanTitle,
        raw_title: rawTitle,
        source_name: sourceName || '한국 언론',
        source_url: link,
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
      }
    });
  }
}

return results;
