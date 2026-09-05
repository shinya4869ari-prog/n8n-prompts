/**
 * 【n8n用】Gemini出力パース ＆ Supabase (newsテーブル) 保存用整形コード
 * 
 * 役割:
 *  1. Gemini Flash が出力した4段落報道記事＋単語リストを安全にパース。
 *  2. 前段ノード（RSS解析）から元のカテゴリや推し情報（person_id/name）を確実にマージ。
 *  3. Supabase REST API (POST /rest/v1/news) への完全対応オブジェクト配列を出力。
 */

const items = $input.all();
const now = new Date().toISOString();
const validCategories = ['crime', 'life', 'politics', 'economy', 'diplomacy', 'celeb'];

const formattedResults = [];

for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const orig = $('RSS解析・トップ記事抽出').all()[i]?.json || {};
  
  let rawText = item.json.text || item.json.output || item.json.response || '';
  if (typeof rawText === 'object') {
    rawText = JSON.stringify(rawText);
  }
  
  // マークダウン記法除去
  if (typeof rawText === 'string') {
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  }

  let parsed = null;
  try {
    parsed = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
  } catch (e) {
    const match = String(rawText).match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch (e2) {}
    }
  }

  if (!parsed || typeof parsed !== 'object') continue;
  if (Array.isArray(parsed)) parsed = parsed[0];
  if (!parsed || (!parsed.title_ko && !parsed.title_ja)) continue;

  // カテゴリの決定
  let cat = String(parsed.category || orig.category || 'life').toLowerCase().trim();
  if (!validCategories.includes(cat)) cat = orig.category || 'life';

  // 段落配列 (4段落構成)
  let paragraphs = Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [];
  if (paragraphs.length === 0 && (parsed.summary_ko || parsed.summary_ja)) {
    paragraphs = [{
      para_num: 1,
      title: '기사 요약',
      ko: String(parsed.summary_ko || ''),
      ja: String(parsed.summary_ja || '')
    }];
  }

  // 重要語彙
  const vocab = Array.isArray(parsed.key_vocabulary) ? parsed.key_vocabulary : [];

  formattedResults.push({
    json: {
      category: cat,
      rank: parseInt(parsed.rank, 10) || 1,
      title_ko: String(parsed.title_ko || orig.news_title || '').trim(),
      title_ja: String(parsed.title_ja || '').trim(),
      summary_ko: String(parsed.summary_ko || paragraphs[0]?.ko || '').trim(),
      summary_ja: String(parsed.summary_ja || paragraphs[0]?.ja || '').trim(),
      paragraphs: paragraphs,
      key_vocabulary: vocab,
      source_name: String(parsed.source_name || orig.source_name || '한국 언론').trim(),
      source_url: String(parsed.source_url || orig.source_url || '').trim(),
      person_id: orig.person_id || (parsed.person_id ? parseInt(parsed.person_id, 10) : null),
      person_name: orig.person_name || parsed.person_name || null,
      person_profile_url: orig.person_profile_url || parsed.person_profile_url || null,
      published_at: orig.published_at || now,
      created_at: now
    }
  });
}

return formattedResults;
