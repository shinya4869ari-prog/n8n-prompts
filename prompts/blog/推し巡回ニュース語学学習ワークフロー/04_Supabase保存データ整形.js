/**
 * 【n8n用】Gemini出力パース ＆ Supabase整形コード
 * 
 * 役割:
 *  1. Gemini 3.8 Flash のレスポンスから生成されたテキストを抽出。
 *  2. 記事JSONをパース・クリーニングし、不要なハングル混入を除去。
 *  3. Supabaseの news テーブル保存用オブジェクト（純粋なカラムのみ）を生成。
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
  '팬미ティング': 'ファンミーティング',
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
  const geminiResponse = item.json;
  
  // 前段ノード（Loop Over Items / 02_トップ速報記事抽出）のメタデータを確実に取得
  let orig = {};
  try {
    const loopItem = $('Loop Over Items')?.item?.json;
    if (loopItem && (loopItem.person_name || loopItem.person_korean_name || loopItem.row_number)) {
      orig = { ...loopItem };
    }
    const rssNode = $('02_トップ速報記事抽出') || $('トップ速報記事抽出') || $('02_RSS解析・推し最新記事抽出') || $('Code1');
    if (rssNode) {
      const allRss = rssNode.all().map(r => r.json);
      const matched = allRss.find(r => (orig.row_number && r.row_number === orig.row_number) || (orig.person_name && r.person_name === orig.person_name));
      if (matched) {
        orig = { ...orig, ...matched };
      } else if (allRss[i]) {
        orig = { ...allRss[i], ...orig };
      }
    }
  } catch (e) {
    orig = item.json;
  }

  // 1. レスポンステキストの抽出（各API形式に対応）
  let rawText = "";
  if (geminiResponse.candidates && geminiResponse.candidates[0]?.content?.parts) {
    // HTTP Request 形式 (Google REST API)
    rawText = geminiResponse.candidates[0].content.parts.map(p => p.text).join("\n");
  } else if (geminiResponse.content && geminiResponse.content.parts) {
    // n8n 公式 Google Gemini / AI ノード形式
    rawText = geminiResponse.content.parts.map(p => p.text).join("\n");
  } else if (geminiResponse.choices && geminiResponse.choices[0]?.message?.content) {
    // OpenAI / 互換形式
    rawText = geminiResponse.choices[0].message.content;
  } else {
    // その他汎用テキスト出力
    rawText = item.json.text || item.json.output || item.json.response || '';
    if (typeof rawText === 'object') {
      rawText = JSON.stringify(rawText);
    }
  }

  // 2. マークダウン記法（```json ... ```）の除去
  if (typeof rawText === 'string') {
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  }

  // 3. JSONパース
  let parsed = null;
  try {
    parsed = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
  } catch (e) {
    const match = String(rawText).match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch (e2) {}
    }
  }

  // パース失敗時または必須項目欠落時は安全にスキップ（Supabaseに不正データを送らない）
  if (!parsed || typeof parsed !== 'object') continue;
  if (Array.isArray(parsed)) parsed = parsed[0];
  if (!parsed || (!parsed.title_ko && !parsed.title_ja)) continue;

  // 4. 記事URLの決定（重複スキップ）
  let sourceUrl = String(orig.source_url || parsed.source_url || '').trim();
  if (sourceUrl.includes('{{') || sourceUrl.includes('$json') || !sourceUrl.startsWith('http')) {
    sourceUrl = String(orig.source_url || '').trim();
  }
  if (!sourceUrl || !sourceUrl.startsWith('http')) {
    sourceUrl = `https://news.google.com/articles/celeb_${Date.now()}_${i}`;
  }

  if (seenUrls.has(sourceUrl)) {
    continue;
  }
  seenUrls.add(sourceUrl);

  // 発信メディア名
  let sourceName = String(orig.source_name || parsed.source_name || '한국 연예 언론').trim();
  if (sourceName.includes('{{') || sourceName.includes('$json')) {
    sourceName = String(orig.source_name || '한국 연예 언론').trim();
  }

  const titleKo = String(parsed.title_ko || orig.news_title || '').trim();
  const titleJa = cleanJapaneseText(parsed.title_ja || '');

  // 段落構成の整形
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

  const vocab = Array.isArray(parsed.key_vocabulary) ? parsed.key_vocabulary : [];

  // 5. Supabase news テーブル保存用オブジェクト（テーブルに実在する正規カラムのみ）
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
