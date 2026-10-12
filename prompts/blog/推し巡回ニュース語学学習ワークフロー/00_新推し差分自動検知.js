/**
 * 【n8n用】Supabase（最新お気に入り推し）と Googleスプレッドシートの差分自動検知コード
 * 
 * 役割:
 *  1. Googleスプレッドシート「推しリスト」に登録済みの推し一覧を取得。
 *  2. Supabase Persons テーブル（is_favorite = true）の最新推し一覧を取得。
 *  3. シートにまだ存在しない新メンバー（増えた推し）を厳密に抽出（重複100%防止）。
 *  4. ★重要: 新規推しが0件の場合でもn8nが停止しないよう「has_new: false」を返して後続へ継続！
 */

// 1. Google Sheetsの既存データを安全に取得（ノード参照または入力データ）
let sheetRows = [];
try {
  const sheetNode = $('Google Sheets: 推しリスト全行取得') || $('Google Sheets');
  sheetRows = sheetNode.all();
} catch (e) {
  sheetRows = $input.all();
}

// 既存シートのIDおよび名前を正規化（小文字・トリム）してSetに登録
const existingIds = new Set();
const existingNames = new Set();

for (const row of sheetRows) {
  const r = row.json || {};
  if (r.id !== undefined && r.id !== null && String(r.id).trim() !== '') {
    existingIds.add(String(r.id).trim());
  }
  if (r.name_ja) {
    existingNames.add(String(r.name_ja).trim().toLowerCase());
  }
  if (r.name_ko) {
    existingNames.add(String(r.name_ko).trim().toLowerCase());
  }
}

// 2. Supabaseから取得した最新推しリストを取得
let supabaseItems = [];
try {
  const supaNode = $('Supabase: お気に入り推し全件取得') || $('Supabase: お気に入り推し取得') || $('HTTP Request');
  supabaseItems = supaNode.all();
} catch (e) {
  supabaseItems = $input.all();
}

// 3. 差分（まだシートにいない新推し）を厳密に抽出（自己重複も100%排除）
const newCelebrities = [];
const seenNewIds = new Set();

for (const item of supabaseItems) {
  const person = item.json || {};
  
  // is_favorite が true の推しのみを確実に判定
  if (person.is_favorite !== true && person.is_favorite !== 'true') {
    continue;
  }

  const personId = String(person.id || '').trim();
  const nameJa = String(person.name || '').trim();
  const nameKo = String(person.name_en || nameJa).trim();

  if (!personId && !nameJa && !nameKo) continue;

  // ① すでにシートに存在する推しは除外
  const isAlreadyInSheet = (personId && existingIds.has(personId)) ||
                          (nameJa && existingNames.has(nameJa.toLowerCase())) ||
                          (nameKo && existingNames.has(nameKo.toLowerCase()));

  if (isAlreadyInSheet) {
    continue;
  }

  // ② 今回のループ内で既に追加された推しは重複除外（自己重複防止ガード）
  if (seenNewIds.has(personId) || seenNewIds.has(nameJa.toLowerCase())) {
    continue;
  }

  if (personId) seenNewIds.add(personId);
  if (nameJa) seenNewIds.add(nameJa.toLowerCase());

  // スプレッドシート追加用オブジェクト
  newCelebrities.push({
    id: person.id,
    name_ja: nameJa,
    name_ko: nameKo,
    last_searched_at: '', // 未検索（空欄）にしておくことで最優先枠に即時選出！
    is_active: 'TRUE'
  });
}

// 実行ログの可視化
console.log(`[差分自動検知] シート既存: ${existingIds.size}件, Supabase: ${supabaseItems.length}件, 新規検出: ${newCelebrities.length}件`);
if (newCelebrities.length > 0) {
  console.log(`[新規追加対象]`, newCelebrities.map(c => `${c.name_ja}(${c.name_ko})`).join(', '));
}

// 4. 新推しが0件の時でもn8nを停止させず、後続のIFノード（has_new判定）へ流す
if (newCelebrities.length === 0) {
  return [{
    json: {
      has_new: false,
      count: 0
    }
  }];
}

// 新規推しが存在する場合（各推しにフラグを付与して出力）
return newCelebrities.map(c => ({
  json: {
    ...c,
    has_new: true,
    count: newCelebrities.length
  }
}));
