const r2Raw = $('researcher2_jp').first().json;
const r25Raw = $('researcher25_jp').first().json;
const boeki = $('Japan_④貿易').first().json;

const parseOutput = (node) => {
  try {
    const raw = node.output ?? node.json ?? '{}';
    if (!raw || raw.trim() === '') throw new Error('outputが空です');
    let cleaned = raw
      .replace(/```json|```/g, '')
      .replace(/,(\s*[}\]])/g, '$1')
      .trim();

    // AIがJSON文字列の中に「エスケープされていない本物の改行」を出力してしまった場合、
    // JSON.parseが「Unterminated string」エラーで落ちるのを防ぐため、文字列内の改行を \\n に置換して救済する
    cleaned = cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/gs, (match) => {
      return match.replace(/\r?\n/g, '\\n');
    });

    return JSON.parse(cleaned);
  } catch(e) { throw new Error(`JSONパース失敗: ${e.message}`); }
};

const r2 = parseOutput(r2Raw);
const r25 = parseOutput(r25Raw);

// 10カ国のシェアデータ全体をスキャンし、すべての値が1未満（小数表記フォーマット）かどうかを判定
const sharesRaw = Array.from({length: 10}, (_, i) => boeki[`貿易相手${i+1}位_シェア%`]);
const numericShares = sharesRaw
  .map(v => (v !== undefined && v !== null && v !== '') ? parseFloat(v) : NaN)
  .filter(v => !isNaN(v) && v > 0);
const isDecimalFormat = numericShares.length > 0 && numericShares.every(v => v < 1);

const formatShare = (val) => {
  if (val === undefined || val === null || val === '') return '';
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  
  if (isDecimalFormat) {
    return (num * 100).toFixed(1) + "%";
  } else {
    if (String(val).indexOf('%') === -1) {
      return num.toFixed(1) + "%";
    }
  }
  return val;
};

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
    シェア: formatShare(boeki[`貿易相手${i+1}位_シェア%`]),
    出典: boeki[`貿易相手${i+1}位_出典`]
  }))
};

// --- データの集約 ---
const finalData = {
  対象国データ_記事: {
    歴史的背景: r2.歴史的背景,
    直近の動向: r2.直近の動向,
    映像作品: r25.映像作品,
    興行収入ランキング: r25.興行収入ランキング
  },
  固定データ: {
    貿易: japanBoeki,
    貿易出典_日本: boeki['貿易統計_出典']
  }
};

// --- PromptLoaderからwriter_jpプロンプトを取得してデータを埋め込む ---
const writerPromptTemplate = $('PromptLoader_jp').first().json.writerPrompt || "";

const now = new Date();
const dateStr = `${now.getFullYear()}年${String(now.getMonth()+1).padStart(2,'0')}月${String(now.getDate()).padStart(2,'0')}日 ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

const writerPrompt = writerPromptTemplate
  .replace('{{ JSON.stringify($json.data) }}', JSON.stringify(finalData))
  .replace(/\{\{\s*\$now\.toFormat\(.*?\)\s*\}\}/g, dateStr);

return [{
  json: {
    対象国: "日本",
    writerPrompt: writerPrompt,
    data: finalData
  }
}];
