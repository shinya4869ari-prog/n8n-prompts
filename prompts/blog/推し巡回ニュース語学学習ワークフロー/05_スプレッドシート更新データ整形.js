/**
 * 【n8n用】Googleスプレッドシート「最終検索日時（last_searched_at）」更新用データ整形コード
 * 
 * 役割:
 *  1. 今回検索を実行した5名のデータ（最優先5名選出ノード）を取得。
 *  2. 各行の `row_number` と、現在日時（YYYY-MM-DD HH:mm:ss）をセット。
 *  3. 後続の「Google Sheets: Update Row(s)」ノードに渡してスプレッドシートを更新！
 * 
 * 効果:
 *  - 検索が終わった推しの最終検索日が「今日」になるため、
 *    明日以降は自動的に「まだ検索されていない推し」や「より過去に検索された推し」が優先されます。
 *  - 50名全員を回りきると、10日前に検索した1人目の日付が一番古くなり、何の手動操作もなしに自然と2巡目が始まります！
 */

// 現在日時（日本時間: JST YYYY-MM-DD HH:mm:ss）を生成
const now = new Date();
const jstOffset = 9 * 60 * 60 * 1000;
const jstDate = new Date(now.getTime() + jstOffset);
const formattedDate = jstDate.toISOString().replace('T', ' ').substring(0, 19);

// 最優先5名選出ノード（または前段ノード）から今回処理したアイテムを取得
let targetItems = [];

try {
  const selectNode = $('最優先5名選出 & RSS URL生成') || $('01_スプレッドシート設計と5名抽出コード') || $('Code');
  targetItems = selectNode.all();
} catch (e) {
  // 取得できない場合は、現在の入力ノードから取得
  targetItems = $input.all();
}

const updatePayloads = [];

for (const item of targetItems) {
  const data = item.json;
  const rowNum = data.row_number;

  if (rowNum) {
    updatePayloads.push({
      json: {
        row_number: rowNum,
        name_ja: data.person_name || '',
        name_ko: data.person_korean_name || '',
        last_searched_at: formattedDate
      }
    });
  }
}

return updatePayloads;
