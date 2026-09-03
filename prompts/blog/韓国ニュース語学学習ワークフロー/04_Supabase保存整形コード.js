/**
 * 【n8n用】ニュースデータ Supabase (newsテーブル) 保存用整形コード
 * 
 * 役割:
 *  1. Gemini Flash が出力した要約・単語付きニュースJSONを安全にパース。
 *  2. 必須項目（title_ko, title_ja, category 等）のバリデーションとサニタイズ。
 *  3. Supabase REST API (POST /rest/v1/news) で1発Upsertできる配列に整形して出力。
 */

const input = $input.first()?.json || {};
let rawText = input.output || input.text || input.response || '';

// オブジェクトが直接渡された場合
if (typeof input === 'object' && Array.isArray(input)) {
  rawText = JSON.stringify(input);
} else if (input.news && Array.isArray(input.news)) {
  rawText = JSON.stringify(input.news);
}

// マークダウンのコードブロック除去
if (typeof rawText === 'string') {
  rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
}

let newsList = [];
try {
  newsList = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
} catch (e) {
  // 配列部分の切り出しフォールバック
  const match = String(rawText).match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (match) {
    try {
      newsList = JSON.parse(match[0]);
    } catch (e2) {}
  }
}

if (!Array.isArray(newsList)) {
  newsList = newsList ? [newsList] : [];
}

const validCategories = ['crime', 'life', 'politics', 'economy', 'diplomacy', 'celeb'];
const now = new Date().toISOString();

const formattedItems = newsList
  .filter(item => item && (item.title_ko || item.title_ja))
  .map(item => {
    // カテゴリの正規化
    let cat = String(item.category || '').toLowerCase().trim();
    if (!validCategories.includes(cat)) {
      if (/사건|사고|경찰|검찰|범죄|재판/i.test(cat)) cat = 'crime';
      else if (/물가|생활|부동산|주거|건강/i.test(cat)) cat = 'life';
      else if (/정치|국회|대통령/i.test(cat)) cat = 'politics';
      else if (/경제|금융|금리|환율|기업/i.test(cat)) cat = 'economy';
      else if (/외교|국제|안보/i.test(cat)) cat = 'diplomacy';
      else if (/연예|인물|스타|배우|가수/i.test(cat)) cat = 'celeb';
      else cat = 'life'; // デフォルト
    }

    // 単語リストのバリデーション
    const vocab = Array.isArray(item.key_vocabulary) ? item.key_vocabulary : [];

    return {
      category: cat,
      rank: parseInt(item.rank, 10) || 99,
      title_ko: String(item.title_ko || '').trim(),
      title_ja: String(item.title_ja || '').trim(),
      summary_ko: String(item.summary_ko || '').trim(),
      summary_ja: String(item.summary_ja || '').trim(),
      key_vocabulary: vocab,
      source_name: String(item.source_name || '韓国メディア').trim(),
      source_url: String(item.source_url || '').trim(),
      person_id: item.person_id ? parseInt(item.person_id, 10) : null,
      person_name: item.person_name ? String(item.person_name).trim() : null,
      person_profile_url: item.person_profile_url ? String(item.person_profile_url).trim() : null,
      published_at: item.published_at || now,
      created_at: now
    };
  });

// HTTP Request ノードで 1件ずつ、または一括で送信できるようにアイテムを返却
return formattedItems.map(item => ({ json: item }));
