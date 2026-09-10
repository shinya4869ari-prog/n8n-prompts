/**
 * 【n8n用】Gemini出力パース ＆ Supabase (newsテーブル) 保存用データ整形コード
 * 
 * 役割:
 *  1. Gemini Flash が生成した推し報道記事（4段落＋語彙リスト）のJSONを安全にパース。
 *  2. 前段（RSS解析）の「本物のURL・メディア名・推し氏名」を確実に注入。
 *  3. 日本語タイトルのハングル混入防止＆重複URLチェック。
 *  4. Supabaseの news テーブルのスキーマに完全準拠したオブジェクト配列を返却。
 */

const items = $input.all();
const now = new Date().toISOString();
const formattedResults = [];
const seenUrls = new Set();

// タイトル日本語訳にハングルが混ざっていた場合の簡易辞書
const hangulFixMap = {
  '배우': '俳優',
  '가수': '歌手',
  '감독': '監督',
  '출연': '出演',
  '개봉': '公開',
  '팬미팅': 'ファンミーティング',
  '콘서트': 'コンサート',
  '공개': '公開',
  '확정': '確定',
  '발표': '発表'
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
  
  // 前段ノード（トップ速報記事抽出）のメタデータを取得
  let orig = {};
  try {
    const rssNode = $('トップ速報記事抽出') || $('02_RSS解析・推し最新記事抽出') || $('Code1');
    orig = rssNode.all()[i]?.json || {};
  } catch (e) {
    orig = item.json;
  }

  let rawText = item.json.text || item.json.output || item.json.response || '';
  if (typeof rawText === 'object') {
    rawText = JSON.stringify(rawText);
  }

  // マークダウン記法（```json ... ```）の除去
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

  // 1. URLの決定: 前段RSSの実URLを最優先（AIの誤出力を遮断）
  let sourceUrl = String(orig.source_url || parsed.source_url || '').trim();
  if (sourceUrl.includes('{{') || sourceUrl.includes('$json') || !sourceUrl.startsWith('http')) {
    sourceUrl = String(orig.source_url || '').trim();
  }
  if (!sourceUrl || !sourceUrl.startsWith('http')) {
    sourceUrl = `https://news.google.com/articles/celeb_${Date.now()}_${i}`;
  }

  // 重複記事のスキップ
  if (seenUrls.has(sourceUrl)) {
    continue;
  }
  seenUrls.add(sourceUrl);

  // 2. メディア名
  let sourceName = String(orig.source_name || parsed.source_name || '한국 연예 언론').trim();
  if (sourceName.includes('{{') || sourceName.includes('$json')) {
    sourceName = String(orig.source_name || '한국 연예 언론').trim();
  }

  // 3. タイトル
  const titleKo = String(parsed.title_ko || orig.news_title || '').trim();
  const titleJa = cleanJapaneseText(parsed.title_ja || '');

  // 4. 段落構成
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

  // 5. 重要語彙リスト
  const vocab = Array.isArray(parsed.key_vocabulary) ? parsed.key_vocabulary : [];

  formattedResults.push({
    json: {
      category: 'celeb',
      rank: 1,
      title_ko: titleKo,
      title_ja: titleJa,
      summary_ko: String(parsed.summary_ko || paragraphs[0]?.ko || '').trim(),
      summary_ja: cleanJapaneseText(parsed.summary_ja || paragraphs[0]?.ja || ''),
      paragraphs: paragraphs,
      key_vocabulary: vocab,
      source_name: sourceName,
      source_url: sourceUrl,
      person_id: orig.person_id || null,
      person_name: orig.person_name || parsed.person_name || null,
      person_profile_url: orig.person_profile_url || null,
      published_at: orig.published_at || now,
      created_at: now
    }
  });
}

return formattedResults;
