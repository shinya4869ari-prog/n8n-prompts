const r2Raw = $('researcher2_jp').first().json;
const r25Raw = $('researcher25_jp').first().json;
const boeki = $('Japan_④貿易').first().json;

const parseOutput = (node, nodeName) => {
  try {
    const targetNode = Array.isArray(node) ? node[0] : node;
    let rawVal = targetNode?.output;
    
    // content.parts[0].text の構造からテキストを優先抽出
    if (!rawVal && targetNode?.content?.parts?.[0]?.text) {
      rawVal = targetNode.content.parts[0].text;
    }
    if (!rawVal) {
      rawVal = targetNode?.json ?? targetNode ?? '{}';
    }

    if (typeof rawVal === 'object' && rawVal !== null) {
      if (rawVal.content?.parts?.[0]?.text) {
        rawVal = rawVal.content.parts[0].text;
      } else {
        return rawVal;
      }
    }

    let raw = String(rawVal).trim();
    if (!raw || raw === '') throw new Error('outputが空です');

    // 「Calling Perplexity...」などのシステムログが前後に入っている場合を考慮し、
    // 最初の { から最後の } まで（または [ から ] まで）を切り抜く
    const startIdx = raw.indexOf('{');
    const endIdx = raw.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      raw = raw.substring(startIdx, endIdx + 1);
    } else {
      const arrStart = raw.indexOf('[');
      const arrEnd = raw.lastIndexOf(']');
      if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
        raw = raw.substring(arrStart, arrEnd + 1);
      }
    }

    let cleaned = raw
      .replace(/```json|```/g, '')
      .replace(/,(\s*[}\]])/g, '$1')
      .trim();

    // 【文字単位ステートマシン：超堅牢版】
    // AIが文字列値の中に出力してしまった「生のダブルクォーテーション」と「生の改行」を
    // 1文字ずつ走査して自動修復する。
    // 判定ロジック：文字列内で " に遭遇したとき、閉じクォーテーションとして正当か超厳格に判定する
    //   - 後続文字が ':' | '}' | ']' | 終端 → 正当な閉じクォーテーション
    //   - 後続文字が ',' の場合 → そのカンマの先の非空白文字が '"' | '}' | ']' なら正当な閉じクォーテーション、それ以外は値の途中の生クォーテーション
    //   - それ以外              → 値の途中にある生クォーテーション → \" にエスケープ
    let repaired = '';
    let i = 0;
    while (i < cleaned.length) {
      const ch = cleaned[i];
      if (ch === '\\') {
        // エスケープ済み文字（\" \n \t 等）はそのまま保持してスキップ
        repaired += ch + (cleaned[i + 1] || '');
        i += 2;
        continue;
      }
      if (ch === '"') {
        // 文字列の開始クォーテーション
        repaired += '"';
        i++;
        // 文字列の中身を読み進める
        while (i < cleaned.length) {
          const c = cleaned[i];
          if (c === '\\') {
            // 文字列内のエスケープ済み文字はそのまま保持
            repaired += c + (cleaned[i + 1] || '');
            i += 2;
            continue;
          }
          if (c === '"') {
            // 閉じクォーテーション候補 → 先読みで判定
            let j = i + 1;
            while (j < cleaned.length && /\s/.test(cleaned[j])) j++;
            const next = cleaned[j];
            
            let isValidClose = false;
            if (next === ':' || next === '}' || next === ']' || j >= cleaned.length) {
              isValidClose = true;
            } else if (next === ',') {
              // カンマの場合、そのカンマのさらに先を検証する
              let k = j + 1;
              while (k < cleaned.length && /\s/.test(cleaned[k])) k++;
              const afterComma = cleaned[k];
              // カンマの次の実質的な文字が、別のキー/値の開始（"）、オブジェクト閉じ（}）、配列閉じ（]）であれば本物の閉じ
              if (afterComma === '"' || afterComma === '}' || afterComma === ']') {
                isValidClose = true;
              }
            }

            if (isValidClose) {
              // 正当な閉じクォーテーション
              repaired += '"';
              i++;
              break;
            } else {
              // 値の途中にある生のダブルクォーテーション → エスケープ
              repaired += '\\"';
              i++;
            }
          } else if (c === '\r' || c === '\n') {
            // 文字列内の生の改行文字 → \\n にエスケープ
            repaired += '\\n';
            if (c === '\r' && cleaned[i + 1] === '\n') i++; // CRLF を1つとして処理
            i++;
          } else {
            repaired += c;
            i++;
          }
        }
        continue;
      }
      repaired += ch;
      i++;
    }
    cleaned = repaired;

    return JSON.parse(cleaned);
  } catch(e) { throw new Error(`【${nodeName}】JSONパース失敗: ${e.message}`); }
};

const r2 = parseOutput(r2Raw, 'researcher2_jp');
const r25 = parseOutput(r25Raw, 'researcher25_jp');

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
