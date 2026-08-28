const r1Raw = $('researcher1').first().json;
const r2Raw = $('researcher2').first().json;
const r25Raw = $('researcher25').first().json;

// Agent停止チェック
for (const [raw, name] of [[r1Raw, 'researcher1'], [r2Raw, 'researcher2'], [r25Raw, 'researcher25']]) {
  const out = typeof raw.output === 'string' ? raw.output : (typeof raw.json === 'string' ? raw.json : '');
  const hasAgentStopped = out.includes('Agent stopped') || out.includes('max iterations');
  const isToolLogOnly = out.startsWith('Calling ') || out.includes('Calling Perplexity');
  
  if (hasAgentStopped || isToolLogOnly) {
    throw new Error(`【${name}】Agentが正常に完了せず、途中で停止しました。再実行してください。`);
  }
}

const parseOutput = (node, nodeName) => {
  try {
    const rawVal = node.output ?? node.json ?? '{}';
    if (typeof rawVal === 'object' && rawVal !== null) {
      return rawVal;
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
  } catch (e) { throw new Error(`【${nodeName}】JSONパース失敗: ${e.message}`); }
};

const adjustPrisonTrend = (trendArray, chiAnObj) => {
  const latestCount = chiAnObj['刑務所総収容者数'];
  const latestYear = chiAnObj['刑務所総収容者数_年'];
  if (latestCount && latestCount !== '欠測' && latestCount !== '-' && latestYear) {
    const latestYearNum = parseInt(String(latestYear).replace(/[^0-9]/g, ''));
    if (!isNaN(latestYearNum)) {
      // すでに同じ年のデータが配列に存在するかチェック
      const existingIndex = trendArray.findIndex(d => {
        const y = parseInt(String(d.年).replace(/[^0-9]/g, ''));
        return y === latestYearNum;
      });
      if (existingIndex !== -1) {
        // すでに存在する場合は、その年のデータを最新の数値で同期・上書きする
        trendArray[existingIndex].総収容者数 = latestCount;
      } else {
        // 配列内の最大年を取得
        const maxYear = trendArray.reduce((max, d) => {
          const y = parseInt(String(d.年).replace(/[^0-9]/g, ''));
          return (!isNaN(y) && y > max) ? y : max;
        }, 0);
        // 最新データの年が、既存のどの年よりも新しい場合のみ、末尾のデータを上書きして最新データとする
        if (latestYearNum > maxYear && trendArray.length > 0) {
          trendArray[trendArray.length - 1] = {
            年: latestYear,
            総収容者数: latestCount
          };
        }
      }
    }
  }
  return trendArray;
};

const r1 = parseOutput(r1Raw, 'researcher1');
if (!r1 || !r1.country || !r1.地理) {
  throw new Error(`【researcher1】必要なデータ（国名や地理データ）が取得できませんでした。Agentが途中で停止した可能性があります。再実行してください。`);
}
if (r1 && r1.地理) {
  const areaRaw = r1.地理.面積_km2;
  if (areaRaw && areaRaw !== 'データなし') {
    const areaNum = parseFloat(String(areaRaw).replace(/,/g, ''));
    if (!isNaN(areaNum)) {
      const ratio = areaNum / 377900;
      r1.地理.日本面積比 = ratio < 0.1 ? ratio.toFixed(2) : ratio.toFixed(1);
    } else {
      r1.地理.日本面積比 = 'データなし';
    }
  } else {
    r1.地理.日本面積比 = 'データなし';
  }
}

const r2 = parseOutput(r2Raw, 'researcher2');
if (!r2 || !r2.country || !r2.歴史的背景) {
  throw new Error(`【researcher2】必要なデータ（歴史的背景など）が取得できませんでした。Agentが途中で停止した可能性があります。再実行してください。`);
}

const r25 = parseOutput(r25Raw, 'researcher25');
if (!r25 || !r25.映像作品) {
  throw new Error(`【researcher25】必要なデータ（映像作品リストなど）が取得できませんでした。Agentが途中で停止した可能性があります。再実行してください。`);
}

// 重大犯罪事件を発生年の新しい順（降順）に強制ソート
if (r1 && Array.isArray(r1.重大犯罪事件)) {
  r1.重大犯罪事件.sort((a, b) => {
    const yearA = parseInt(String(a.発生年).replace(/[^0-9]/g, '')) || 0;
    const yearB = parseInt(String(b.発生年).replace(/[^0-9]/g, '')) || 0;
    return yearB - yearA;
  });
}

let recommendedMovies = [];
try {
  let subItems = [];
  const candidateNodes = [
    "Call 別画面映画検索ワークフロー おすすめ映画版",
    "Call 別画面映画検索ワークフロー　おすすめ映画版",
    "Call '別画面映画検索ワークフロー おすすめ映画版'",
    "Call '別画面映画検索ワークフロー　おすすめ映画版'",
    "別画面映画検索ワークフロー おすすめ映画版",
    "別画面映画検索ワークフロー　おすすめ映画版",
    "Call '映画無限検索ワークフロー おすすめ映画版'",
    "Call '映画無限検索ワークフロー　おすすめ映画版'",
    "Call 映画無限検索ワークフロー おすすめ映画版",
    "映画無限検索ワークフロー おすすめ映画版",
    "映画無限検索ワークフロー　おすすめ映画版",
    "Call '映画無限検索ワークフロー'",
    "映画無限検索ワークフロー",
    "Call 'おすすめ映画'",
    "おすすめ映画",
    "Call 'おすすめ映画ワークフロー'",
    "おすすめ映画ワークフロー",
    "Execute Workflow",
    "Execute Sub-Workflow",
    "Execute Workflow1",
    "Execute Workflow2"
  ];
  for (const nodeName of candidateNodes) {
    try {
      const found = $(nodeName).all();
      if (found && found.length > 0) {
        subItems = found;
        break;
      }
    } catch (err) {}
  }

  if (subItems.length === 0) {
    try {
      const inputs = $input.all();
      const inputMovies = inputs.filter(i => i.json && (i.json.title || i.json.origin_title || i.json.tmdb_id));
      if (inputMovies.length > 0) subItems = inputMovies;
    } catch (err) {}
  }

  recommendedMovies = subItems.map(item => {
    const movie = item.json || {};
    let posterPath = "";
    const rawPoster = movie.poster_url || movie.poster_path || "";
    if (rawPoster) {
      const match = String(rawPoster).match(/\/t\/p\/w\d+(\/[^?#]+)/);
      posterPath = match ? match[1] : rawPoster;
    }
    return {
      "タイトル_日本語": movie.title || movie.タイトル_日本語 || movie.name || "",
      "原題": movie.origin_title || movie.原題 || "",
      "種別": movie.type || movie.種別 || "映画",
      "公開年": movie.year || movie.公開年 || "",
      "director": movie.director || movie.director_name || movie.監督 || "",
      "cast": movie.cast || movie.キャスト || movie.出演 || "",
      "概要": movie.overview || movie.概要 || movie.ai_summary || "",
      "tmdb_id": movie.tmdb_id || null,
      "poster_path": posterPath,
      "imdb_id": movie.wikidata_id || movie.imdb_id || movie.imdb_url || ""
    };
  });
} catch (e) {}

if (recommendedMovies.length === 0) {
  if (Array.isArray(r25?.おすすめ映画) && r25.おすすめ映画.length > 0) {
    recommendedMovies = r25.おすすめ映画;
  } else if (Array.isArray(r25?.おすすめ映画ランキング) && r25.おすすめ映画ランキング.length > 0) {
    recommendedMovies = r25.おすすめ映画ランキング;
  } else if (Array.isArray(r2?.おすすめ映画) && r2.おすすめ映画.length > 0) {
    recommendedMovies = r2.おすすめ映画;
  } else if (Array.isArray(r2?.おすすめ映画ランキング) && r2.おすすめ映画ランキング.length > 0) {
    recommendedMovies = r2.おすすめ映画ランキング;
  }
}

const r2Merged = {
  country: r2.country,
  歴史的背景: r2.歴史的背景,
  直近の動向: r2.直近の動向,
  犯罪の傾向: r1.犯罪の傾向,
  重大犯罪事件: r1.重大犯罪事件,
  映像作品: r25.映像作品,
  おすすめ映画: recommendedMovies.length > 0 ? recommendedMovies : (r25.おすすめ映画 || []),
  おすすめ映画ランキング: recommendedMovies.length > 0 ? recommendedMovies : (r25.おすすめ映画ランキング || [])
};

// 対象国Googleシート
const keizai = $('①経済').first().json;
const chiAn = $('②治安指標').first().json;
const bukka = $('③物価').first().json;
const boeki = $('④貿易').first().json;

// 日本Googleシート
const jKeizai = $('Japan_①経済').first().json;
const jChiAn = $('Japan_②治安指標').first().json;
const jBukka = $('Japan_③物価').first().json;
const jBoeki = $('Japan_④貿易').first().json;

const jPrison = adjustPrisonTrend([
  { 年: jChiAn['収容推移1_年'], 総収容者数: jChiAn['収容推移1_総収容者数'] },
  { 年: jChiAn['収容推移2_年'], 総収容者数: jChiAn['収容推移2_総収容者数'] },
  { 年: jChiAn['収容推移3_年'], 総収容者数: jChiAn['収容推移3_総収容者数'] },
  { 年: jChiAn['収容推移4_年'], 総収容者数: jChiAn['収容推移4_総収容者数'] },
  { 年: jChiAn['収容推移5_年'], 総収容者数: jChiAn['収容推移5_総収容者数'] },
  { 年: jChiAn['収容推移6_年'], 総収容者数: jChiAn['収容推移6_総収容者数'] },
  { 年: jChiAn['収容推移7_年'], 総収容者数: jChiAn['収容推移7_総収容者数'] },
  { 年: jChiAn['収容推移8_年'], 総収容者数: jChiAn['収容推移8_総収容者数'] },
  { 年: jChiAn['収容推移9_年'], 総収容者数: jChiAn['収容推移9_総収容者数'] },
  { 年: jChiAn['収容推移10_年'], 総収容者数: jChiAn['収容推移10_総収容者数'] }
].filter(d => d.年), jChiAn);

const jDeath = [
  { 順位: '1位', 死因: jChiAn['死因1位'] },
  { 順位: '2位', 死因: jChiAn['死因2位'] },
  { 順位: '3位', 死因: jChiAn['死因3位'] },
  { 順位: '4位', 死因: jChiAn['死因4位'] },
  { 順位: '5位', 死因: jChiAn['死因5位'] },
  { 順位: '6位', 死因: jChiAn['死因6位'] },
  { 順位: '7位', 死因: jChiAn['死因7位'] },
  { 順位: '8位', 死因: jChiAn['死因8位'] },
  { 順位: '9位', 死因: jChiAn['死因9位'] },
  { 順位: '10位', 死因: jChiAn['死因10位'] }
];

// --- シェア（%）の表記揺れを統一する安全なフォーマッタ ---
const createShareFormatter = (rawList) => {
  const numeric = rawList
    .map(v => (v !== undefined && v !== null && v !== '') ? parseFloat(v) : NaN)
    .filter(v => !isNaN(v) && v > 0);
  const isDecimal = numeric.length > 0 && numeric.every(v => v < 1);

  return (val) => {
    if (val === undefined || val === null || val === '') return '';
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    if (isDecimal) {
      return (num * 100).toFixed(1) + "%";
    } else {
      if (String(val).indexOf('%') === -1) {
        return num.toFixed(1) + "%";
      }
    }
    return val;
  };
};

const formatShare = createShareFormatter(Array.from({ length: 10 }, (_, i) => boeki[`貿易相手${i + 1}位_シェア%`]));
const formatJShare = createShareFormatter(Array.from({ length: 10 }, (_, i) => jBoeki[`貿易相手${i + 1}位_シェア%`]));

const targetFixed = {
  経済データ: {
    総人口: { 値: keizai['総人口'], 年: keizai['総人口_年'], 出典: keizai['総人口_出典'] },
    GDP_USD: { 値: keizai['GDP_USD'], 年: keizai['GDP_USD_年'], 出典: keizai['GDP_USD_出典'] },
    GDP成長率: { 値: keizai['GDP成長率'], 年: keizai['GDP成長率_年'], 出典: keizai['GDP成長率_出典'] },
    一人当たりGDP: { 値: keizai['一人当たりGDP_USD'], 年: keizai['一人当たりGDP_USD_年'], 出典: keizai['一人当たりGDP_USD_出典'] },
    政府債務残高_GDP比: { 値: keizai['政府債務残高_GDP比'], 年: keizai['政府債務残高_GDP比_年'], 出典: keizai['政府債務残高_GDP比_出典'] },
    経常収支_GDP比: { 値: keizai['経常収支_GDP比'], 年: keizai['経常収支_GDP比_年'], 出典: keizai['経常収支_GDP比_出典'] },
    インフレ率: { 値: keizai['インフレ率'], 年: keizai['インフレ率_年'], 出典: keizai['インフレ率_出典'] }
  },
  治安指標: {
    殺人率: { 値: chiAn['殺人率'], 年: chiAn['殺人率_年'], 出典: chiAn['殺人率_出典'] },
    交通事故死亡率: { 値: chiAn['交通事故死亡率'], 年: chiAn['交通事故死亡率_年'], 出典: chiAn['交通事故死亡率_出典'] },
    自殺率: { 値: chiAn['自殺率'], 年: chiAn['自殺率_年'], 出典: chiAn['自殺率_出典'] },
    失業率: { 値: chiAn['失業率'], 年: chiAn['失業率_年'], 出典: chiAn['失業率_出典'] },
    貧困率: { 値: chiAn['貧困率'], 年: chiAn['貧困率_年'], 出典: chiAn['貧困率_出典'] },
    ジニ係数: { 値: chiAn['ジニ係数'], 年: chiAn['ジニ係数_年'], 出典: chiAn['ジニ係数_出典'] },
    刑務所稼働率: { 値: chiAn['刑務所稼働率'], 年: chiAn['刑務所稼働率_年'], 出典: chiAn['刑務所稼働率_出典'] },
    刑務所総収容者数: { 値: chiAn['刑務所総収容者数'], 年: chiAn['刑務所総収容者数_年'], 出典: chiAn['刑務所総収容者数_出典'] },
    GPI: { スコア: chiAn['GPIスコア'], 順位: chiAn['GPI順位'], 年: chiAn['GPI年'], 出典: chiAn['GPI出典'] },
    犯罪トップ5: Array.from({ length: 5 }, (_, i) => ({
      順位: `${i + 1}位`,
      犯罪種別: chiAn[`犯罪${i + 1}位_種別`] || "欠測",
      年: chiAn[`犯罪${i + 1}位_年`] || "",
      出典: chiAn['犯罪_出典'] || ""
    })),
    犯罪_年: chiAn['犯罪_年'] || "",
    犯罪_出典: chiAn['犯罪_出典'] || "",
    外務省危険レベル: { レベル: chiAn['外務省危険レベル'], 出典: chiAn['外務省危険レベル_出典'] }
  },
  刑務所推移: adjustPrisonTrend([
    { 年: chiAn['収容推移1_年'], 総収容者数: chiAn['収容推移1_総収容者数'] },
    { 年: chiAn['収容推移2_年'], 総収容者数: chiAn['収容推移2_総収容者数'] },
    { 年: chiAn['収容推移3_年'], 総収容者数: chiAn['収容推移3_総収容者数'] },
    { 年: chiAn['収容推移4_年'], 総収容者数: chiAn['収容推移4_総収容者数'] },
    { 年: chiAn['収容推移5_年'], 総収容者数: chiAn['収容推移5_総収容者数'] },
    { 年: chiAn['収容推移6_年'], 総収容者数: chiAn['収容推移6_総収容者数'] },
    { 年: chiAn['収容推移7_年'], 総収容者数: chiAn['収容推移7_総収容者数'] },
    { 年: chiAn['収容推移8_年'], 総収容者数: chiAn['収容推移8_総収容者数'] },
    { 年: chiAn['収容推移9_年'], 総収容者数: chiAn['収容推移9_総収容者数'] },
    { 年: chiAn['収容推移10_年'], 総収容者数: chiAn['収容推移10_総収容者数'] }
  ].filter(d => d.年), chiAn),
  死因トップ10: [
    chiAn['死因1位'], chiAn['死因2位'], chiAn['死因3位'], chiAn['死因4位'], chiAn['死因5位'],
    chiAn['死因6位'], chiAn['死因7位'], chiAn['死因8位'], chiAn['死因9位'], chiAn['死因10位']
  ],
  死因出典: chiAn['死因_出典'],
  物価: {
    通貨コード: bukka['通貨コード'],
    為替レート: bukka['為替レート'],
    為替取得日: bukka['為替取得日'],
    ビール: { 現地通貨: bukka['ビール_現地通貨'], 円換算: bukka['ビール_円換算'], 出典: bukka['ビール_出典'] },
    タバコ: { 現地通貨: bukka['タバコ_現地通貨'], 円換算: bukka['タバコ_円換算'], 出典: bukka['タバコ_出典'] },
    水: { 現地通貨: bukka['水_現地通貨'], 円換算: bukka['水_円換算'], 出典: bukka['水_出典'] },
    ビッグマック: { 現地通貨: bukka['ビッグマック_現地通貨'], 円換算: bukka['ビッグマック_円換算'], 出典: bukka['ビッグマック_出典'] },
    ガソリン: { 現地通貨: bukka['ガソリン_現地通貨'], 円換算: bukka['ガソリン_円換算'], 出典: bukka['ガソリン_出典'] },
    外食: { 現地通貨: bukka['外食_現地通貨'], 円換算: bukka['外食_円換算'], 出典: bukka['外食_出典'] },
    光熱費: { 現地通貨: bukka['光熱費_現地通貨'], 円換算: bukka['光熱費_円換算'], 出典: bukka['光熱費_出典'] },
    家賃: { 現地通貨: bukka['家賃1LDK(市中心)_現地通貨'] || bukka['家賃_現地通貨'] || bukka['家賃1LDK（市中心）_現地通貨'] || '', 円換算: bukka['家賃1LDK(市中心)_円換算'] || bukka['家賃_円換算'] || bukka['家賃1LDK（市中心）_円換算'] || '', 出典: bukka['家賃_出典'] || bukka['物価_出典'] || 'Numbeo' },
    月収: { 現地通貨: bukka['月収_現地通貨'], 円換算: bukka['月収_円換算'], 出典: bukka['月収_出典'] },
    Netflix: { 現地通貨: bukka['Netflix_現地通貨'], 円換算: bukka['Netflix_円換算'], 出典: bukka['Netflix_出典'] }
  },
  貿易: {
    輸出: Array.from({ length: 10 }, (_, i) => ({
      順位: `${i + 1}位`,
      品目: boeki[`輸出${i + 1}位_品目`]
    })),
    輸入: Array.from({ length: 10 }, (_, i) => ({
      順位: `${i + 1}位`,
      品目: boeki[`輸入${i + 1}位_品目`]
    })),
    貿易相手国: Array.from({ length: 10 }, (_, i) => ({
      順位: `${i + 1}位`,
      国名: boeki[`貿易相手${i + 1}位_国名`],
      シェア: formatShare(boeki[`貿易相手${i + 1}位_シェア%`])
    }))
  },
  貿易出典_対象国: boeki['貿易統計_出典']
};

const getCleanYearString = (val) => {
  if (!val) return '';
  const trimmed = String(val).trim();
  return trimmed.endsWith('年') ? trimmed : trimmed + '年';
};

const japanFixed = {
  制度の9つの皿: {
    国家の形と統治機構: { 値: "立憲君主制（象徴天皇制）・議院内閣制・単一国家" },
    行政トップ: { 値: "内閣総理大臣：高市早苗（2025年10月就任）" },
    立法と選挙制度: { 値: "二院制（衆議院・参議院）・小選挙区比例代表並立制" },
    司法と法制度: { 値: "最高裁判所を頂点とする三審制・大陸法基調" },
    社会保障・医療・年金: { 値: "国民皆保険・国民年金（自己負担原則3割・受給開始65歳）" },
    教育制度: { 値: "6-3-3-4制・義務教育9年・大学進学率約57%" },
    徴税・財政制度: { 値: "消費税10%（軽減税率8%）・所得税最高45%・相続税最高55%" },
    安全保障と兵役: { 値: "自衛隊（志願制）・兵役義務なし・日米安保基軸" },
    基本権と価値観: { 値: "死刑制度維持（絞首刑・執行継続）・同性婚未承認" }
  },
  経済データ: {
    総人口: { 値: jKeizai['総人口'], 年: jKeizai['総人口_年'], 出典: jKeizai['総人口_出典'] },
    GDP_USD: { 値: jKeizai['GDP_USD'], 年: jKeizai['GDP_USD_年'], 出典: jKeizai['GDP_USD_出典'] },
    GDP成長率: { 値: jKeizai['GDP成長率'], 年: jKeizai['GDP成長率_年'], 出典: jKeizai['GDP成長率_出典'] },
    一人当たりGDP: { 値: jKeizai['一人当たりGDP_USD'], 年: jKeizai['一人当たりGDP_USD_年'], 出典: jKeizai['一人当たりGDP_USD_出典'] },
    政府債務残高_GDP比: { 値: jKeizai['政府債務残高_GDP比'], 年: jKeizai['政府債務残高_GDP比_年'], 出典: jKeizai['政府債務残高_GDP比_出典'] },
    経常収支_GDP比: { 値: jKeizai['経常収支_GDP比'], 年: jKeizai['経常収支_GDP比_年'], 出典: jKeizai['経常収支_GDP比_出典'] },
    インフレ率: { 値: jKeizai['インフレ率'], 年: jKeizai['インフレ率_年'], 出典: jKeizai['インフレ率_出典'] }
  },
  治安指標: {
    '殺人率': { 値: jChiAn['殺人率'], '出典・年': `${jChiAn['殺人率_出典']} ${getCleanYearString(jChiAn['殺人率_年'])}`.trim() },
    '交通事故死亡率': { 値: jChiAn['交通事故死亡率'], '出典・年': `${jChiAn['交通事故死亡率_出典']} ${getCleanYearString(jChiAn['交通事故死亡率_年'])}`.trim() },
    '自殺率': { 値: jChiAn['自殺率'], '出典・年': `${jChiAn['自殺率_出典']} ${getCleanYearString(jChiAn['自殺率_年'])}`.trim() },
    '失業率': { 値: jChiAn['失業率'], '出典・年': `${jChiAn['失業率_出典']} ${getCleanYearString(jChiAn['失業率_年'])}`.trim() },
    '貧困率': { 値: jChiAn['貧困率'], '出典・年': `${jChiAn['貧困率_出典']} ${getCleanYearString(jChiAn['貧困率_年'])}`.trim() },
    'ジニ係数': { 値: jChiAn['ジニ係数'], '出典・年': `${jChiAn['ジニ係数_出典']} ${getCleanYearString(jChiAn['ジニ係数_年'])}`.trim() },
    '刑務所稼働率': { 値: jChiAn['刑務所稼働率'], '出典・年': `${jChiAn['刑務所稼働率_出典']} ${getCleanYearString(jChiAn['刑務所稼働率_年'])}`.trim() },
    '刑務所総収容者数': { 値: jChiAn['刑務所総収容者数'], '出典・年': `${jChiAn['刑務所総収容者数_出典']} ${getCleanYearString(jChiAn['刑務所総収容者数_年'])}`.trim() },
    'GPIスコア': { 値: jChiAn['GPIスコア'], '出典・年': `${jChiAn['GPI出典']} ${getCleanYearString(jChiAn['GPI年'])}`.trim() },
    'GPI順位': { 値: jChiAn['GPI順位'], '出典・年': `${jChiAn['GPI出典']} ${getCleanYearString(jChiAn['GPI年'])}`.trim() }
  },
  刑務所推移: jPrison,
  死因トップ10: jDeath,
  死因出典: jChiAn['死因_出典'],
  物価: {
    'ビール（レストラン500ml）': { '値（円）': jBukka['ビール_円換算'] ? `${jBukka['ビール_円換算']}円` : 'データなし', 出典: jBukka['ビール_出典'] },
    'タバコ（マルボロ1箱20本）': { '値（円）': jBukka['タバコ_円換算'] ? `${jBukka['タバコ_円換算']}円` : 'データなし', 出典: jBukka['タバコ_出典'] },
    'ミネラルウォーター（500ml）': { '値（円）': jBukka['水_円換算'] ? `${jBukka['水_円換算']}円` : 'データなし', 出典: jBukka['水_出典'] },
    'ビッグマック（1個）': { '値（円）': jBukka['ビッグマック_円換算'] ? `${jBukka['ビッグマック_円換算']}円` : 'データなし', 出典: jBukka['ビッグマック_出典'] },
    'ガソリン（1L）': { '値（円）': jBukka['ガソリン_円換算'] ? `${jBukka['ガソリン_円換算']}円` : 'データなし', 出典: jBukka['ガソリン_出典'] },
    '外食（安めの店・1食）': { '値（円）': jBukka['外食_円換算'] ? `${jBukka['外食_円換算']}円` : 'データなし', 出典: jBukka['外食_出典'] },
    '電気・水道・ガス（月額・85㎡）': { '値（円）': jBukka['光熱費_円換算'] ? `${jBukka['光熱費_円換算']}円` : 'データなし', 出典: jBukka['光熱費_出典'] },
    '家賃1LDK(市中心)': { '値（円）': (jBukka['家賃1LDK(市中心)_円換算'] || jBukka['家賃_円換算'] || jBukka['家賃1LDK（市中心）_円換算']) ? `${jBukka['家賃1LDK(市中心)_円換算'] || jBukka['家賃_円換算'] || jBukka['家賃1LDK（市中心）_円換算']}円` : 'データなし', 出典: jBukka['家賃_出典'] || jBukka['物価_出典'] || 'Numbeo' },
    '平均月収（手取り）': { '値（円）': jBukka['月収_円換算'] ? `${jBukka['月収_円換算']}円` : 'データなし', 出典: jBukka['月収_出典'] },
    'Netflix（スタンダード・広告なし）': { '値（円）': jBukka['Netflix_円換算'] ? `${jBukka['Netflix_円換算']}円` : 'データなし', 出典: jBukka['Netflix_出典'] }
  },
  貿易: {
    輸出: Array.from({ length: 10 }, (_, i) => ({
      順位: `${i + 1}位`,
      品目: jBoeki[`輸出${i + 1}位_品目`],
      出典: jBoeki[`輸出${i + 1}位_出典`]
    })),
    輸入: Array.from({ length: 10 }, (_, i) => ({
      順位: `${i + 1}位`,
      品目: jBoeki[`輸入${i + 1}位_品目`],
      出典: jBoeki[`輸入${i + 1}位_出典`]
    })),
    貿易相手国: Array.from({ length: 10 }, (_, i) => ({
      順位: `${i + 1}位`,
      国名: jBoeki[`貿易相手${i + 1}位_国名`],
      シェア: formatJShare(jBoeki[`貿易相手${i + 1}位_シェア%`])
    }))
  },
  貿易出典_日本: jBoeki['貿易統計_出典']
};
// --- スプレッドシートのデータ不足バリデーション ---
const targetCountry = r1.country || "対象国";
const hasEconomy = keizai && Object.keys(keizai).length > 0 && keizai['総人口'] !== undefined;
const hasTrade = boeki && Object.keys(boeki).length > 0 && boeki['輸出1位_品目'] !== undefined;
const hasBukka = bukka && Object.keys(bukka).length > 0 && bukka['通貨コード'] !== undefined;

if (!hasEconomy || !hasTrade || !hasBukka) {
  throw new Error(`【データ不在エラー】スプレッドシートに対象国「${targetCountry}」の固定データが登録されていません。
スプレッドシート（①経済、②治安指標、③物価、④貿易シートなど）に「${targetCountry}」の行を正しく手動追加し、データを入力した後に再実行してください。
（検出状況 -> 経済: ${hasEconomy ? '○' : '×'}, 貿易: ${hasTrade ? '○' : '×'}, 物価: ${hasBukka ? '○' : '×'}）`);
}

const writerPromptTemplate = $('PromptLoader').first().json.writerPrompt || "";
// --- データの集約 ---
const finalData = {
  対象国データ: r1,
  対象国データ_記事: r2Merged,
  固定データ: targetFixed,
  日本固定データ: japanFixed
};

// --- ライター用プロンプトのデータ埋め込み ---
const writerPrompt = writerPromptTemplate
  .replace('{{ JSON.stringify($json.data) }}', JSON.stringify(finalData))
  .replace('{{ $json.rate }}', bukka['為替レート'] || '')
  .replace('{{ $json.rate_date }}', bukka['為替取得日'] || '');

return [{
  json: {
    country: r1.country,
    world_bank_code: r1.world_bank_code,
    countryEn: r1.countryEn || $('国名変換Code').first().json.countryEn || "",
    capital: $('国名変換Code').first().json.capital || "",
    writerPrompt: writerPrompt, // 置換済みのプロンプト
    data: finalData
  }
}];
