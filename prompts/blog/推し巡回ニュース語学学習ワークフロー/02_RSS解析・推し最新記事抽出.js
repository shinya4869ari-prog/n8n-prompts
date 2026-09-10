/**
 * 【n8n用】推し巡回 Google News RSS XML解析 ＆ 最新記事抽出コード
 * 
 * 役割:
 *  1. HTTP Requestノードで取得した各推し（最大5名）のRSS XMLを解析。
 *  2. 推し1名につき「最新のトップ1記事」を抽出。
 *  3. メディア名やタイトルの余分なゴミを取り除き、クリーンなオブジェクトに整形。
 *  4. 記事が見つからなかった場合も安全にハンドリング（has_news: false）。
 *     => 後続の「If（記事有無チェック）」ノードで無駄なGemini API消費を完全防止！
 */

const allInputs = $input.all();
const results = [];

for (let i = 0; i < allInputs.length; i++) {
  const inputItem = allInputs[i];
  
  // HTTP RequestノードのレスポンスXMLを取得
  const rawXml = inputItem.json.data || inputItem.json.body || inputItem.json.response || '';
  
  // 前段（01ノード）から渡された推しのメタデータを引き継ぐ
  // ※n8nのHTTP Requestノードの設定で「Include Input Data in Output」がONの場合、
  // または pairedItem / $node 経由で取得します
  let meta = inputItem.json;
  try {
    const prevNode = $('最優先5名選出 & RSS URL生成') || $('01_スプレッドシート設計と5名抽出コード') || $('Code');
    const prevItem = prevNode.all()[i]?.json;
    if (prevItem) {
      meta = { ...prevItem, ...meta };
    }
  } catch (e) {
    // 取得できない場合は inputItem.json そのまま使用
  }

  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const match = itemRegex.exec(rawXml);

  if (match) {
    // ニュース記事が存在する場合
    const content = match[1];
    let rawTitle = (content.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '')
      .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    const link = (content.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '').trim();
    const pubDate = (content.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || '').trim();
    const sourceMatch = content.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    let sourceName = sourceMatch ? sourceMatch[1].trim() : '';

    // "記事タイトル - ニュース提供社" からメディア名を分離
    let cleanTitle = rawTitle;
    if (rawTitle.includes(' - ')) {
      const parts = rawTitle.split(' - ');
      sourceName = sourceName || parts.pop().trim();
      cleanTitle = parts.join(' - ').trim();
    }

    results.push({
      json: {
        has_news: true,
        row_number: meta.row_number,
        person_id: meta.person_id || null,
        person_name: meta.person_name || '',
        person_korean_name: meta.person_korean_name || '',
        category: 'celeb',
        category_name: meta.category_name || `⭐ 推し（${meta.person_name}）`,
        news_title: cleanTitle,
        raw_title: rawTitle,
        source_name: sourceName || '한국 연예 언론',
        source_url: link,
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
      }
    });
  } else {
    // 直近7日間にニュースがなかった場合
    results.push({
      json: {
        has_news: false,
        row_number: meta.row_number,
        person_id: meta.person_id || null,
        person_name: meta.person_name || '',
        person_korean_name: meta.person_korean_name || '',
        category: 'celeb',
        category_name: meta.category_name || `⭐ 推し（${meta.person_name}）`,
        news_title: '',
        raw_title: '',
        source_name: '',
        source_url: '',
        published_at: new Date().toISOString()
      }
    });
  }
}

return results;
