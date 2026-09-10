/**
 * 【n8n用】Googleスプレッドシート「推しリスト」読み込み ＆ 最優先5名選出コード
 * 
 * 役割:
 *  1. Google Sheetsノード（推しリスト）から渡された全行データを取得。
 *  2. 有効（is_active !== false）かつ韓国語名（name_ko）が登録されている推しを抽出。
 *  3. 【超重要ソートアルゴリズム】:
 *     - 第1優先: last_searched_at が空欄（新しく追加された推し）を最優先で一番上にする。
 *     - 第2優先: last_searched_at が古い順（昇順: 昔に検索した人ほど先頭へ）。
 *     => これにより「新メンバー即時検索」＋「全員終わったら自動で1人目に戻る永久ループ」を実現！
 *  4. 上位5名を切り出し、Google News RSS検索用URL（韓国語名クエリ）を生成して出力。
 */

// 1日に検索する推しの人数（デフォルト: 5名）
const BATCH_SIZE = 5;

const allRows = $input.all();
const validCelebrities = [];

for (let i = 0; i < allRows.length; i++) {
  const row = allRows[i].json;
  
  // n8nのGoogle Sheetsノードは row_number (または rowNumber / 行番号) を提供します
  const rowNumber = row.row_number || row.rowNumber || (i + 2); // 1行目がヘッダーの場合のフォールバック

  // 有効フラグ判定（未設定または true/'TRUE' の場合は有効）
  const isActive = row.is_active === undefined || row.is_active === true || String(row.is_active).toUpperCase() === 'TRUE';
  
  // 韓国語名の取得と検証
  const nameKo = (row.name_ko || '').trim();
  const nameJa = (row.name_ja || nameKo).trim();

  if (!isActive || !nameKo) {
    continue; // 無効または韓国語名が無い行はスキップ
  }

  // 最終検索日時のパース（未検索・空欄チェック）
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
  // 韓国語名を完全一致フレーズ検索 + 直近7日間
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
