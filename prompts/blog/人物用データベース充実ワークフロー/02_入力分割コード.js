/**
 * 【02】入力分割コード (Code Node)
 * 
 * 役割: 
 *   1. フォームや手動入力、映画/ドラマワークフロー、Supabase既存行など多種多様な入力元に対応。
 *   2. カンマや改行で複数名入力された場合（例:「尹錫悦, 李在明, 文在寅」「世宗大王、李舜臣」）も自動分割。
 *   3. 俳優・映画監督だけでなく、政治家、歴史上の人物、アイドル、タレント、文化人・学者まで柔軟に1人1アイテムへ展開。
 */

const input = $input.first()?.json || {};

// 1. 映画/ドラマワークフローからの連携（cast / director）判定
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
          category: 'director',
          country: country,
          tmdb_id: input.tmdb_id || null
        }
      });
    });
  }

  // 1-2. キャスト全員の追加
  if (input.cast) {
    const castNames = input.cast.split(/[,/、\n]+/).map(s => s.trim()).filter(Boolean);
    const castEnNames = (input.cast_en || '').split(/[,/、\n]+/).map(s => s.trim()).filter(Boolean);

    castNames.forEach((cName, idx) => {
      if (!results.some(r => r.json.name === cName)) {
        results.push({
          json: {
            name: cName,
            name_en: castEnNames[idx] || '',
            occupation: '俳優',
            category: 'actor',
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

// カテゴリに応じたデフォルト職業マッピング
function getCategoryDefaultOccupation(cat) {
  switch (cat) {
    case 'politician': return '政治家';
    case 'historical': return '歴史上の人物';
    case 'entertainer': return 'タレント';
    case 'idol': return 'アイドル';
    case 'actor': return '俳優';
    case 'director': return '映画監督';
    case 'author': return '学者・文化人';
    default: return '';
  }
}

// 3. n8n の個別アイテム配列として返却（カンマ・改行での複数名一括入力も個別展開）
const results = [];
for (const person of rawData) {
  if (!person || typeof person !== 'object') continue;

  const rawNameStr = person.name || person['人物名'] || person['名前'] || '';
  const qid = person.wikidata_id || person['Wikidata ID (QID)'] || null;
  const category = person.category || person['人物区分（カテゴリ）'] || person['カテゴリ'] || 'all';
  const inputOcc = person.occupation || person['職業・肩書 / 検索ヒント'] || person['職業'] || '';
  const defaultOcc = inputOcc || getCategoryDefaultOccupation(category);
  const country = person.country || person['国籍・活動国'] || 'KR';

  // 3-1. QIDが直接指定されている場合は単一処理
  if (qid) {
    results.push({
      json: {
        id: person.id || null,
        name: rawNameStr,
        name_en: person.name_en || '',
        occupation: defaultOcc,
        category: category,
        country: country,
        gender: person.gender || null,
        profile_url: person.profile_url || null,
        wikidata_id: qid,
        tmdb_id: person.tmdb_id || null,
        x_id: person.x_id || null,
        instagram_id: person.instagram_id || null,
        youtube_id: person.youtube_id || null,
        favorite_youtube: person.favorite_youtube || null,
        official_site: person.official_site || null,
        is_favorite: person.is_favorite !== undefined ? person.is_favorite : undefined,
        created_at: person.created_at || null
      }
    });
    continue;
  }

  // 3-2. 名前入力の分割（カンマ、読点、改行、スラッシュ）
  const splitNames = rawNameStr.split(/[,/、\n]+/).map(s => s.trim()).filter(Boolean);
  const splitEnNames = (person.name_en || '').split(/[,/、\n]+/).map(s => s.trim()).filter(Boolean);

  if (splitNames.length > 0) {
    splitNames.forEach((n, idx) => {
      results.push({
        json: {
          id: person.id || null,
          name: n,
          name_en: splitEnNames[idx] || '',
          occupation: defaultOcc,
          category: category,
          country: country,
          gender: person.gender || null,
          profile_url: person.profile_url || null,
          wikidata_id: null,
          tmdb_id: person.tmdb_id || null,
          x_id: person.x_id || null,
          instagram_id: person.instagram_id || null,
          youtube_id: person.youtube_id || null,
          favorite_youtube: person.favorite_youtube || null,
          official_site: person.official_site || null,
          is_favorite: person.is_favorite !== undefined ? person.is_favorite : undefined,
          created_at: person.created_at || null
        }
      });
    });
  }
}

return results.length > 0 ? results : [{ json: input }];
