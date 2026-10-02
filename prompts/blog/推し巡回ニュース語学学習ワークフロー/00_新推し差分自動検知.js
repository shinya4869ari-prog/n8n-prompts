/**
 * 【n8n用】Supabase（最新お気に入り推し）と Googleスプレッドシートの差分自動検知コード
 * 
 * 役割:
 *  1. Supabaseの Persons テーブル（is_favorite = true）の最新推し一覧を取得。
 *  2. Googleスプレッドシート「推しリスト」に現在登録されている推し一覧と突合。
 *  3. シートにまだ存在しない新メンバー（増えた推し）を自動抽出。
 *  4. 後続の「Google Sheets: Append」ノードに渡して、シート末尾に自動追記させる！
 */

// 1. Google Sheetsの既存データを取得
const sheetRows = $input.all();
const existingIds = new Set();
const existingNames = new Set();

for (const item of sheetRows) {
  const row = item.json;
  if (row.id !== undefined && row.id !== null && String(row.id).trim() !== '') {
    existingIds.add(String(row.id));
  }
  if (row.name_ja) {
    existingNames.add(String(row.name_ja).trim());
  }
}

// 2. Supabaseから取得した最新推しリストを取得
let supabasePersons = [];
try {
  const supaNode = $('Supabase: お気に入り推し取得') || $('HTTP Request');
  supabasePersons = supaNode.all().map(item => item.json);
} catch (e) {
  supabasePersons = [];
}

// 3. 差分（まだシートにいない新推し）を抽出
const newCelebrities = [];

for (const person of supabasePersons) {
  const idStr = String(person.id);
  const nameJa = (person.name || '').trim();
  const nameKo = (person.name_en || person.name || '').trim();

  // IDでも名前でもシートに存在しなければ「新メンバー」と判定
  if (!existingIds.has(idStr) && !existingNames.has(nameJa)) {
    newCelebrities.push({
      json: {
        id: person.id,
        name_ja: nameJa,
        name_ko: nameKo,
        last_searched_at: '', // 未検索（空欄）にしておくことで最優先枠に即時選出！
        is_active: true
      }
    });
  }
}

return newCelebrities;
