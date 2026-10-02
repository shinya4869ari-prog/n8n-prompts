/**
 * 【n8n用】Googleスプレッドシート「推しリスト」読み込み ＆ 最優先5名選出コード
 * （Supabase新推し差分自動マージ対応版）
 * 
 * 役割:
 *  1. Google Sheets「推しリスト」の全行を取得。
 *  2. 今回新しく検知された新メンバー（差分）があれば、末尾の行番号を自動計算して合流。
 *  3. 有効（is_active !== false）かつ韓国語名（name_ko）が登録されている推しを抽出。
 *  4. 【超重要ソートアルゴリズム】:
 *     - 第1優先: last_searched_at が空欄（新しく追加された推し）を最優先で一番上にする。
 *     - 第2優先: last_searched_at が古い順（昇順: 昔に検索した人ほど先頭へ）。
 *     => これにより「新推し即日検索」＋「全員終わったら自動で1人目に戻る永久ループ」を実現！
 *  5. 上位5名を切り出し、Google News RSS検索用URL（韓国語名クエリ）を生成して出力。
 */

// 1日に検索する推しの人数（デフォルト: 5名）
const BATCH_SIZE = 5;

// 1. スプレッドシート既存行の取得
let sheetRows = [];
try {
  const sheetNode = $('Google Sheets: 推しリスト全行取得') || $('Google Sheets');
  sheetRows = sheetNode.all();
} catch (e) {
  sheetRows = $input.all();
}

// 2. 新推し差分の取得（もし検知されていれば合流）
let newMemberRows = [];
try {
  const diffNode = $('00_新推し差分自動検知') || $('Code');
  newMemberRows = diffNode.all();
} catch (e) {
  newMemberRows = [];
}

const validCelebrities = [];

// 既存シートの行を展開
for (let i = 0; i < sheetRows.length; i++) {
  const row = sheetRows[i].json;
  const rowNumber = row.row_number || row.rowNumber || (i + 2); // 1行目がヘッダーの場合のフォールバック
  const isActive = row.is_active === undefined || row.is_active === true || String(row.is_active).toUpperCase() === 'TRUE';
  
  const nameKo = (row.name_ko || '').trim();
  const nameJa = (row.name_ja || nameKo).trim();

  if (!isActive || !nameKo) continue;

  let lastSearchedRaw = row.last_searched_at;
  let lastSearchedTime = null;
  let isNew = true;

  if (lastSearchedRaw && String(lastSearchedRaw).trim() !== '' && String(lastSearchedRaw).toLowerCase() !== 'null') {
    const parsedDate = new Date(lastSearchedRaw);
    if (!isNaN(parsedDate.getTime())) {
      lastSearchedTime = parsedDate.getTime();
      isNew = false;
    }
  }

  validCelebrities.push({
    row_number: rowNumber,
    id: row.id || null,
    name_ja: nameJa,
    name_ko: nameKo,
    last_searched_at: lastSearchedRaw || null,
    last_searched_time: lastSearchedTime,
    is_new: isNew
  });
}

// 新メンバーがあれば、シート末尾の行番号を付与して合流
const baseRowCount = sheetRows.length;
for (let j = 0; j < newMemberRows.length; j++) {
  const newRow = newMemberRows[j].json;
  const newRowNumber = baseRowCount + 2 + j;
  const nameKo = (newRow.name_ko || '').trim();
  const nameJa = (newRow.name_ja || nameKo).trim();

  if (!nameKo) continue;

  validCelebrities.push({
    row_number: newRowNumber,
    id: newRow.id || null,
    name_ja: nameJa,
    name_ko: nameKo,
    last_searched_at: null,
    last_searched_time: null,
    is_new: true // 新メンバーなので即時最優先！
  });
}

// -------------------------------------------------------------
// ソート処理:
// 1. 新規追加（is_new === true）を最優先（最上位へ）
// 2. 検索履歴がある場合は、最終検索日時が古い順（昇順）
// -------------------------------------------------------------
validCelebrities.sort((a, b) => {
  if (a.is_new && !b.is_new) return -1; // aが新規なら先頭
  if (!a.is_new && b.is_new) return 1;  // bが新規なら先頭
  if (a.is_new && b.is_new) return (a.row_number || 0) - (b.row_number || 0); // 新規同士はシートの上にある順

  // どちらも検索履歴がある場合は、古い日時順
  return a.last_searched_time - b.last_searched_time;
});

// 今日の巡回対象（上位5名）を抽出
const targetCelebrities = validCelebrities.slice(0, BATCH_SIZE);

// 各推しのGoogle News RSS取得用オブジェクトを生成
const outputItems = targetCelebrities.map(celeb => {
  const searchQuery = `"${celeb.name_ko}" when:7d`;
  const encodedQuery = encodeURIComponent(searchQuery);
  const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=ko&gl=KR&ceid=KR:ko`;

  return {
    json: {
      row_number: celeb.row_number,
      person_id: celeb.id,
      person_name: celeb.name_ja,
      person_korean_name: celeb.name_ko,
      category: 'celeb',
      category_name: `⭐ 推し巡回（${celeb.name_ja}）`,
      search_query: celeb.name_ko,
      rss_url: rssUrl,
      last_searched_at_prev: celeb.last_searched_at,
      is_new_member: celeb.is_new
    }
  };
});

return outputItems;
