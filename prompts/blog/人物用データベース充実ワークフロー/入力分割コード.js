/**
 * 【n8n用】Supabase JSON配列 受付・自動分割コード
 * 
 * 役割: フォームの "json" 欄（または直接入力）から渡された
 *       Supabase の JSON 配列を 1 人ずつの個別アイテムに自動展開します。
 */

const input = $input.first()?.json || {};

// 1. "json" キーを含むあらゆる入力形式から生データを抽出
let rawData = input.json || input['json'] || input.json_data || input['json_data'] || input.body?.json || input.body?.json_data || input.data || input;

// 文字列の場合は JSON パースして配列に変換
if (typeof rawData === 'string') {
  try {
    rawData = JSON.parse(rawData);
  } catch (e) {
    rawData = [input];
  }
}

// 単一オブジェクトの場合は配列化
if (!Array.isArray(rawData)) {
  rawData = [rawData];
}

// 2. n8n の個別アイテム配列として返却
const results = [];
for (const person of rawData) {
  if (!person || typeof person !== 'object') continue;
  
  // 名前またはQIDが存在する有効なデータのみ抽出
  const name = person.name || person['人物名'] || '';
  const qid = person.wikidata_id || person['Wikidata ID (QID)'] || null;
  
  if (name || qid) {
    results.push({
      json: {
        id: person.id || null,
        name: name,
        name_en: person.name_en || '',
        occupation: person.occupation || person['職業・肩書 / 検索ヒント'] || '俳優',
        country: person.country || 'KR',
        gender: person.gender || null,
        profile_url: person.profile_url || null,
        wikidata_id: qid,
        x_id: person.x_id || null,
        instagram_id: person.instagram_id || null,
        youtube_id: person.youtube_id || null,
        official_site: person.official_site || null,
        created_at: person.created_at || null
      }
    });
  }
}

return results.length > 0 ? results : [{ json: input }];
