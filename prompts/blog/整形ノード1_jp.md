const r2Raw = $('researcher2_jp').first().json;
const boeki = $('Japan_④貿易').first().json;

const parseOutput = (node) => {
  try {
    const raw = node.output ?? node.json ?? '{}';
    if (!raw || raw.trim() === '') throw new Error('outputが空です');
    const cleaned = raw
      .replace(/```json|```/g, '')
      .replace(/,(\s*[}\]])/g, '$1')
      .trim();
    return JSON.parse(cleaned);
  } catch(e) { throw new Error(`JSONパース失敗: ${e.message}`); }
};

const r2 = parseOutput(r2Raw);

const japanBoeki = {
  輸出: Array.from({length: 10}, (_, i) => ({
    順位: `${i+1}位`,
    品目: boeki[`輸出${i+1}位_品目`],
    出典: boeki[`輸出${i+1}位_出典`]
  })),
  輸入: Array.from({length: 10}, (_, i) => ({
    順位: `${i+1}位`,
    品目: boeki[`輸入${i+1}位_品目`],
    出典: boeki[`輸入${i+1}位_出典`]
  })),
  貿易相手国: Array.from({length: 10}, (_, i) => ({
    順位: `${i+1}位`,
    国名: boeki[`貿易相手${i+1}位_国名`],
    シェア: boeki[`貿易相手${i+1}位_シェア%`],
    出典: boeki[`貿易相手${i+1}位_出典`]
  }))
};

return [{
  json: {
    対象国: "日本",
    data: {
      対象国データ_記事: {
        歴史的背景: r2.歴史的背景,
        直近の動向: r2.直近の動向,
        映像作品: r2.映像作品,
        興行収入ランキング: r2.興行収入ランキング
      },
      固定データ: {
        貿易: japanBoeki
      }
    }
  }
}];
