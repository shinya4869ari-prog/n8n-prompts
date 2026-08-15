/**
 * 【n8n用】人物データ 受付・自動分割コード（映画/ドラマワークフロー連携対応）
 * 
 * 役割: 
 *   1. 映画ワークフローから渡された cast, director, cast_en, director_en を自動で1人ずつの個別アイテムに展開
 *   2. Supabase の JSON 配列やフォーム入力も同様に自動展開
 */

const input = $input.first()?.json || {};

// 1. 映画ワークフローからの連携（cast / director）の判定
if (input.cast || input.director) {
  const results = [];
  const country = input.country || 'KR';

  // 1-1. 監督の追加
  if (input.director) {
    const dirNames = input.director.split(/[,/、\n]+/).map(s => s.trim()).filter(Boolean);
    const dirEnNames = (input.director_en || '').split(/[,/、\n]+/).map(s => s.trim()).filter(Boolean);

    dirNames.forEach((dName, idx) => {
      results.push({
        json: {
          name: dName,
          name_en: dirEnNames[idx] || '',
          occupation: '映画監督',
          country: country
        }
      });
    });
  }

  // 1-2. キャスト全員の追加
  if (input.cast) {
    const castNames = input.cast.split(/[,/、\n]+/).map(s => s.trim()).filter(Boolean);
    const castEnNames = (input.cast_en || '').split(/[,/、\n]+/).map(s => s.trim()).filter(Boolean);

    castNames.forEach((cName, idx) => {
      // 監督と重複していないか確認
      if (!results.some(r => r.json.name === cName)) {
        results.push({
          json: {
            name: cName,
            name_en: castEnNames[idx] || '',
            occupation: '俳優',
            country: country
          }
        });
      }
    });
  }

  if (results.length > 0) {
    return results;
  }
}

// 2. "json" キーを含むあらゆる入力形式から生データを抽出（Supabase/フォーム連携）
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

// 3. n8n の個別アイテム配列として返却
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
