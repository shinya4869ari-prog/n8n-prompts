/**
 * 【n8n用】Googleスプレッドシート「最終検索日時（last_searched_at）」即時更新用データ整形コード
 * 
 * 役割:
 *  1. ループで現在処理された推し（1名）の row_number を確実に取得。
 *  2. 現在日時（JST YYYY-MM-DD HH:mm:ss）をセット。
 *  3. 後続の「Google Sheets: 最終検索日時更新」ノードで、その推しの行だけをピンポイント更新！
 */

// 現在日時（日本時間: JST YYYY-MM-DD HH:mm:ss）を生成
const now = new Date();
const jstOffset = 9 * 60 * 60 * 1000;
const jstDate = new Date(now.getTime() + jstOffset);
const formattedDate = jstDate.toISOString().replace('T', ' ').substring(0, 19);

let rowNum = null;
let nameJa = '';
let nameKo = '';

// 1. Loop Over Items ノードから現在の推し行番号を取得（最優先）
try {
  const loopItem = $('Loop Over Items').item.json;
  if (loopItem && loopItem.row_number) {
    rowNum = loopItem.row_number;
    nameJa = loopItem.person_name || '';
    nameKo = loopItem.person_korean_name || '';
  }
} catch (e) {}

// 2. 取得できない場合は現在の入力データから取得
if (!rowNum) {
  const current = $input.first()?.json || {};
  rowNum = current.row_number;
  nameJa = current.person_name || '';
  nameKo = current.person_korean_name || '';
}

return [
  {
    json: {
      row_number: rowNum,
      name_ja: nameJa,
      name_ko: nameKo,
      last_searched_at: formattedDate
    }
  }
];
