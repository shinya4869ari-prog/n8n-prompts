/**
 * 【n8n用】Gemini出力パース ＆ Supabase (newsテーブル) 保存用整形コード
 * 
 * 役割:
 *  1. Gemini Flash が出力した4段落報道記事＋単語リストを安全にパース。
 *  2. 前段ノード（RSS解析・トップ記事抽出）の「本物のカテゴリ・URL・メディア名・推し情報」を強制適用。
 *     （※AIが勝手にカテゴリをlifeにしたり、URLに{{ $json... }}を出力する問題を完全遮断）
 *  3. 同一バッチ内での重複URL排除 ＆ タイトルの未翻訳ハングル自動補正。
 *  4. Supabase REST API (POST /rest/v1/news) への完全対応オブジェクト配列を出力。
 */

const items = $input.all();
const now = new Date().toISOString();
const validCategories = ['crime', 'life', 'politics', 'economy', 'diplomacy', 'celeb'];

const formattedResults = [];
const seenUrls = new Set();

// タイトル日本語訳にハングルが混ざっていた場合の簡易クリーニング辞書
const hangulFixMap = {
  '정부': '政府',
  '선포': '宣言',
  '국회': '国会',
  '검찰': '検察',
  '경찰': '警察',
  '대통령': '大統領',
  '법원': '裁判所',
  '대법원': '大法院'
};

function cleanJapaneseText(text) {
  if (!text) return '';
  let cleaned = String(text);
  for (const [ko, ja] of Object.entries(hangulFixMap)) {
    cleaned = cleaned.split(ko).join(ja);
  }
  return cleaned.trim();
}

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

  // 1. カテゴリの決定: 前段RSSノードで決めたカテゴリを【最優先】にする
  let cat = String(orig.category || parsed.category || 'life').toLowerCase().trim();
  if (!validCategories.includes(cat)) {
    cat = String(parsed.category || 'life').toLowerCase().trim();
    if (!validCategories.includes(cat)) cat = 'life';
  }

  // 2. 記事URLの決定: 前段RSSの【本物のURL】を強制採用（AIのテンプレート誤出力を完全遮断）
  let sourceUrl = String(orig.source_url || parsed.source_url || '').trim();
  if (sourceUrl.includes('{{') || sourceUrl.includes('$json') || !sourceUrl.startsWith('http')) {
    sourceUrl = String(orig.source_url || '').trim();
  }
  // それでもURLが取れない場合のフォールバック（重複エラー防止）
  if (!sourceUrl || !sourceUrl.startsWith('http')) {
    sourceUrl = `https://news.google.com/articles/generated_${Date.now()}_${i}`;
  }

  // 同一実行バッチ内での重複URLチェック
  if (seenUrls.has(sourceUrl)) {
    continue; // 重複記事はスキップ
  }
  seenUrls.add(sourceUrl);

  // 3. 発信メディア名: 前段RSSのメディア名を最優先
  let sourceName = String(orig.source_name || parsed.source_name || '한국 언론').trim();
  if (sourceName.includes('{{') || sourceName.includes('$json')) {
    sourceName = String(orig.source_name || '한국 언론').trim();
  }

  // 4. 日本語タイトルのハングル混入補正
  let titleJa = cleanJapaneseText(parsed.title_ja || '');

  // 5. 段落配列 (4段落構成)
  let paragraphs = Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [];
  if (paragraphs.length === 0 && (parsed.summary_ko || parsed.summary_ja)) {
    paragraphs = [{
      para_num: 1,
      title: '기사 요약',
      ko: String(parsed.summary_ko || ''),
      ja: cleanJapaneseText(parsed.summary_ja || '')
    }];
  } else {
    paragraphs = paragraphs.map(p => ({
      para_num: p.para_num || 1,
      title: p.title || '',
      ko: p.ko || '',
      ja: cleanJapaneseText(p.ja || '')
    }));
  }

  // 6. 重要語彙
  const vocab = Array.isArray(parsed.key_vocabulary) ? parsed.key_vocabulary : [];

  formattedResults.push({
    json: {
      category: cat,
      rank: parseInt(parsed.rank, 10) || 1,
      title_ko: String(parsed.title_ko || orig.news_title || '').trim(),
      title_ja: titleJa,
      summary_ko: String(parsed.summary_ko || paragraphs[0]?.ko || '').trim(),
      summary_ja: cleanJapaneseText(parsed.summary_ja || paragraphs[0]?.ja || ''),
      paragraphs: paragraphs,
      key_vocabulary: vocab,
      source_name: sourceName,
      source_url: sourceUrl,
      person_id: orig.person_id || (parsed.person_id ? parseInt(parsed.person_id, 10) : null),
      person_name: orig.person_name || parsed.person_name || null,
      person_profile_url: orig.person_profile_url || parsed.person_profile_url || null,
      published_at: orig.published_at || now,
      created_at: now
    }
  });
}

return formattedResults;
