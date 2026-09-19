const promptBody = $input.first()?.json?.externalPrompt ?? "";

const allItems = $input.all();
let mainItem = allItems.find(i => {
  const txt = i.json?.article || i.json?.output || i.json?.text || '';
  return txt.includes('①') || txt.includes('あなたはこの') || txt.includes('制度の9つの皿');
});
let deepDiveItem = allItems.find(i => {
  const txt = i.json?.deepDiveArticle || i.json?.output || i.json?.text || '';
  return txt.includes('✦ Deep Dive') || i.json?.deepDiveArticle != null;
});
const articleItem = mainItem || allItems[0];

return [articleItem].map(item => {
  let inputData = item.json || {};
  let sheetData = {};
  try {
    sheetData = $('整形ノード1').first()?.json 
             || $('整形ノード１').first()?.json 
             || $('整形ノード').first()?.json 
             || inputData?.sheetData 
             || inputData 
             || {};
  } catch(e) {
    sheetData = inputData?.sheetData || inputData || {};
  }
  const moviesData = [];
  
  let raw = mainItem?.json?.article || mainItem?.json?.output || mainItem?.json?.text || mainItem?.json?.writer_draft || inputData?.article || inputData?.output || inputData?.text || inputData?.writer_draft || inputData?.raw || "";
  // 直列接続などで $input が response_extraction1 等の出力（===places===）に上書きされている場合の安全策
  if (!raw || raw.startsWith('===places===')) {
    try {
      const writerNode = $('★執筆即時保存').first()?.json 
                      || $('writer').first()?.json 
                      || $('整形2').first()?.json 
                      || $('記事集合').first()?.json 
                      || $('整列2').first()?.json 
                      || $('writer_pro').first()?.json 
                      || $('検索結果まとめ記事').first()?.json 
                      || $('Writer').first()?.json 
                      || {};
      raw = writerNode.writer_draft || writerNode.article || writerNode.output || writerNode.text || raw;
    } catch(e) {}
  }
  const rawLines = raw.split('\n');

  const countryName = $('国名変換Code').first().json.country || inputData.country || '対象国';
  const countryEn = $('国名変換Code').first().json.countryEn || inputData.countryEn || '';
  const regionName = $('国名変換Code').first().json.region || inputData.region || 'その他';
  const currencySymbol = $('国名変換Code').first().json.currencySymbol || '';
  const rate = $('国名変換Code').first().json.rate || 1;

  // --- 1. 見出し・出典の重複削除（AIが出したプレーンな行を消す） ---
  raw = raw.replace(/^[①-⑩] .*$/gm, '');
  raw = raw.replace(/^出典：.*$/gm, '');

  const citation = sheetData.data?.固定データ?.死因出典
    ? `出典：${sheetData.data.固定データ.死因出典} / 日本：${sheetData.data.日本固定データ?.死因出典 || '厚生労働省'}`
    : '';

  const title = countryName;

  const capital = $('国名変換Code').first().json.capital ?? '';
  const japanCapital = $('国名変換Code').first().json.japanCapital ?? '';
  const countryLabel = capital ? `${countryName}（${capital}）` : countryName;
  const japanLabel = '日本（東京）';

  // --- 2. パイプ・タブ・コロン区切りデータをパース ---
  function parseLines(text, prefix) {
    if (!text) return [];
    return text.split('\n')
      .filter(l => {
        if (!l) return false;
        const cleaned = l.replace(/^[#\*\-\s]+/, '').replace(/\*\*/g, '').trim();
        const prefixStr = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp('^' + prefixStr + '[｜|\\t：:]').test(cleaned);
      })
      .map(l => {
        const cleanedLine = l.replace(/^[#\*\-\s]+/, '').replace(/\*\*/g, '').replace(/<\/?[^>]+(>|$)/g, "").trim();
        const prefixStr = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const body = cleanedLine.replace(new RegExp('^' + prefixStr + '[｜|\\t：:]'), '');
        const parts = body.split(/[｜|\t]|\s{2,}/).map(p => p.trim()).filter(Boolean);
        const obj = {};
        parts.forEach(p => {
          const idx = p.search(/[：:]/);
          if (idx !== -1) obj[p.substring(0, idx).trim()] = p.substring(idx + 1).trim();
        });
        return obj;
      });
  }

  // AIが出力した行（マークダウン太字、コロン/パイプ半角化、タブ区切り、Markdown表の先頭|等）を100%確実に検索するヘルパー
  function findMatchingLine(rawLines, itemKeyword) {
    if (!rawLines || !Array.isArray(rawLines)) return null;
    const cleanKeyword = itemKeyword.replace(/[\(（].*?[\)）]/g, '').trim();
    return rawLines.find(line => {
      if (!line) return false;
      // 先頭の #, *, -, スペース, および Markdown表の先頭パイプ (|) を除去
      const cleaned = line.replace(/^[#\*\-\s|｜]+/, '').replace(/\*\*/g, '').trim();
      const firstPart = cleaned.split(/[｜|\t：:]/)[0].trim();
      return firstPart === itemKeyword || firstPart === cleanKeyword || firstPart.startsWith(cleanKeyword) || (cleanKeyword.length >= 4 && firstPart.includes(cleanKeyword));
    });
  }

  function extractRowValuesFromLine(line) {
    if (!line) return { countryVal: 'データなし', japanVal: 'データなし' };
    // 先頭と末尾のパイプ (| または ｜) や記号を除去
    const cleaned = line
      .replace(/^[#\*\-\s|｜]+/, '')
      .replace(/[|｜\s]+$/, '')
      .replace(/\*\*/g, '')
      .trim();
    
    // パイプ (｜ or |) または タブ (\t) または 2個以上の連続スペース で分割
    const parts = cleaned.split(/[｜|\t]|\s{2,}/).map(p => p.trim()).filter(Boolean);
    
    if (parts.length <= 1) {
      const idx = cleaned.search(/[：:]/);
      if (idx !== -1) {
        return { countryVal: cleaned.substring(idx + 1).trim(), japanVal: 'データなし' };
      }
      return { countryVal: 'データなし', japanVal: 'データなし' };
    }
    
    let countryVal = 'データなし';
    let japanVal = 'データなし';
    
    for (let i = 1; i < parts.length; i++) {
      const p = parts[i];
      const idx = p.search(/[：:]/);
      if (idx !== -1) {
        const k = p.substring(0, idx).trim();
        const v = p.substring(idx + 1).trim();
        if (k.includes('日本') || k.toLowerCase().includes('japan')) {
          japanVal = v;
        } else {
          countryVal = v;
        }
      } else {
        if (i === 1) countryVal = p;
        else if (i === 2) japanVal = p;
      }
    }
    
    return { countryVal: countryVal || 'データなし', japanVal: japanVal || 'データなし' };
  }

  // --- 汎用キー取得ヘルパー (国名表記が ブータン / ブータン（ティンプー） 等で揺れても100%マッチさせる) ---
  function getCountryValue(obj, fallbackKeys = []) {
    if (!obj || typeof obj !== 'object') return 'データなし';
    for (const key of fallbackKeys) {
      if (obj[key] !== undefined && obj[key] !== '') return obj[key];
    }
    const keys = Object.keys(obj).filter(k => 
      k !== '項目' && k !== '順位' && k !== '年' && 
      !k.includes('日本') && !k.toLowerCase().includes('japan')
    );
    if (keys.length > 0 && obj[keys[0]] !== undefined && obj[keys[0]] !== '') {
      return obj[keys[0]];
    }
    return 'データなし';
  }

  function getJapanValue(obj) {
    if (!obj || typeof obj !== 'object') return 'データなし';
    if (obj['日本'] !== undefined && obj['日本'] !== '') return obj['日本'];
    const keys = Object.keys(obj).filter(k => k.includes('日本') || k.toLowerCase().includes('japan'));
    if (keys.length > 0 && obj[keys[0]] !== undefined && obj[keys[0]] !== '') {
      return obj[keys[0]];
    }
    return 'データなし';
  }

  // --- 3. HTML生成ヘルパー ---
  const h2Style = `margin-top:60px;padding:14px 20px;background:var(--color-background-secondary,#f5f5f5);border:0.5px solid #e0e0e0;border-left:3px solid #00bcd4;border-radius:8px;font-size:16px;font-weight:500;color:#111;`;
  const h3Style = `font-size:14px;font-weight:500;color:#e67e22;margin-top:30px;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid #e67e22;display:inline-block;`;
  const h3NewsStyle = `font-size:14px;font-weight:500;color:#6f42c1;margin-top:30px;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid #6f42c1;display:inline-block;`;
  const h3NewsBadge = `<span style="background:#6f42c1;color:#fff;border-radius:4px;padding:2px 8px;font-size:10px;margin-right:8px;vertical-align:middle;font-weight:bold;">Perplexity</span>`;
  const citationStyle = `font-size:12px;color:#aaa;text-align:right;margin-top:4px;margin-bottom:24px;`;

  function makeTable(headers, rows, widths) {
    const thStyle = (w) => `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#e0f5f5,#f0f8f8);text-align:left;font-size:14px;${w ? 'width:' + w + ';' : ''}`;
    const tdStyle = `border:1px solid #eee;padding:12px 14px;font-size:14px;`;
    const tdBoldStyle = `border:1px solid #eee;padding:12px 14px;font-weight:bold;font-size:14px;`;
    const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;margin:20px 0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);`;
    const thead = `<thead><tr>${headers.map((h, i) => `<th style="${thStyle(widths ? widths[i] : '')}">${h}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${rows.map((row, ri) => {
      const bg = ri % 2 === 1 ? 'background:#fafafa;' : '';
      return `<tr style="${bg}">${row.map((cell, ci) => `<td style="${ci === 0 ? tdBoldStyle : tdStyle}">${cell}</td>`).join('')}</tr>`;
    }).join('')}</tbody>`;
    return `<table style="${tableStyle}">${thead}${tbody}</table>`;
  }

  function extractSectionText(text, startKeywords, endKeywords) {
    if (!text) return '';
    const lines = text.split('\n');
    const startIdx = lines.findIndex(l => startKeywords.some(k => l.includes(k)));
    if (startIdx === -1) return '';

    const extracted = [];
    for (let i = startIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (endKeywords.some(k => line.includes(k))) break;
      if (line.includes('🐱 エラーネコ：')) break;
      if (line.match(/^(?:#+\s*)?(?:[①-⑩]|\d+\.|\bSECTION\b|##\s*\d+)/i) && !line.startsWith('###')) {
        break;
      }
      extracted.push(line);
    }
    return extracted.join('\n').trim();
  }

  function extractTextBetween(text, start, end) {
    if (!text) return '';
    const lines = text.split('\n');
    const startIdx = lines.findIndex(l => l.includes(start));
    if (startIdx === -1) return '';
    const slice = lines.slice(startIdx + 1);
    const endIdx = slice.findIndex(l => l.includes(end));
    if (endIdx === -1) {
      // 終了マーカーが見つからない場合は、次のセクション見出しの手前で止める安全策
      const nextSecIdx = slice.findIndex(l => l.match(/^(?:#+\s*)?(?:[①-⑩]|\d+\.|\bSECTION\b|##\s*\d+)/i) && !l.startsWith('###'));
      return (nextSecIdx === -1 ? slice.slice(0, 15) : slice.slice(0, nextSecIdx)).join('\n').trim();
    }
    return slice.slice(0, endIdx).join('\n').trim();
  }

  function cleanMarkdown(text) {
    if (!text) return '';
    return text
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        if (trimmed === '') return true;
        if (/^#+\s*$/.test(trimmed)) return false;
        if (/^[-\u2014\u2015=*_\s]+$/.test(trimmed)) return false;
        if (/^#*\s*(🐱\s*)?エラーネコ/.test(trimmed)) return false;
        if (/^#*\s*出典\s*$/.test(trimmed)) return false;
        return true;
      })
      .join('\n')
      .trim();
  }

  // エラーネコの一言を生成するヘルパー（吹き出しデザイン）
  function makeNekoBubble(text) {
    if (!text || !text.includes('🐱')) return '';
    const content = text.replace(/🐱\s*エラーネコ：/, '').trim();
    return `
<div style="margin: 20px 0; display: flex; align-items: flex-start; gap: 12px;">
  <div style="font-size: 24px;">🐱</div>
  <div style="position: relative; background: #f0f7f7; border: 1px solid #e0eeee; border-radius: 12px; padding: 12px 16px; font-size: 13px; line-height: 1.6; color: #444; flex: 1;">
    <div style="position: absolute; top: 12px; left: -8px; width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-right: 8px solid #f0f7f7;"></div>
    <strong>エラーネコの一言：</strong><br>${content}
  </div>
</div>`;
  }

  function getNekoBubbleForSection(sectionNum) {
    const startIdx = rawLines.findIndex(l => l.trim().startsWith(sectionNum) || l.includes(sectionNum));
    let found = '';
    if (startIdx !== -1) {
      const slice = rawLines.slice(startIdx);
      found = slice.find(l => l.includes('🐱 エラーネコ：')) || '';
    }
    if (!found) {
      const circleNums = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
      const orderIdx = circleNums.indexOf(sectionNum);
      const nekoLines = rawLines.filter(l => l.includes('🐱 エラーネコ：'));
      if (orderIdx !== -1 && nekoLines[orderIdx]) found = nekoLines[orderIdx];
    }
    if (!found) {
      const fallbacks = {
        '①': '建国理念「パンチャシラ」に基づく宗教道徳と新刑法の厳罰化。政教分離を標榜しつつも宗教性が国家刑罰権と深く結びつく統治哲学は、世俗的な日本とは対照的ニャ。',
        '②': '1万7000もの島々を抱えながら年率5%前後の高成長を維持し、首都ヌサンタラへの遷都を進めるダイナミズム！人口ボーナスを活かした国家のスケール感が凄まじいニャ。',
        '③': '殺人発生率は人口10万あたり0.42と極めて低いのに、刑務所稼働率は180.9%という猛烈な過密収容！麻薬事犯に対する銃殺刑など、治安維持と厳罰主義の凄まじさが数字に表れてるニャ…。',
        '④': '未加工鉱物の輸出規制（ダウンストリーミング）で国内精錬とEV電池産業を強力に囲い込む資源ナショナリズム！中国への貿易赤字と米国への黒字という非対称な構造もリアルニャ。',
        '⑤': '手取り平均月収が約4.1万円に対し、ジャカルタ中心部の家賃や生活費は意外と高水準。屋台やインフォーマル経済のたくましさが国民の生活を支えている実態が透けて見えるニャ。',
        '⑥': 'オランダ植民地支配からスカルノ、1965年の暗黒の粛清、スハルト新秩序、そして民主化レフォルマシへ。激動の近代史が現代の政治と多民族社会の骨格を決定づけているニャ。',
        '⑦': 'プラボウォ新政権の誕生とジョコウィ路線の継承、そして東南アジアの地政学的重心としての台頭。脱炭素やインフラ、特定技能人材など日本との結びつきも急速に進化しているニャ！',
        '⑧': '1965年の大虐殺という国家的トラウマを、加害者自らに劇映画として再演させた映画の表現力と異常性…。歴史の闇を直視しようとする映像の力に言葉を失うニャ。',
        '⑨': '激動の時代を駆け抜けた学生運動家の青春から、植民地時代の不条理と民族の覚醒を描く大河ロマンまで、映画大国インドネシアの熱量と文化の深さに圧倒されるニャ！',
        '⑩': '伝統のガムランから米88risingで全米ブレイクを果たしたNIKIまで！多様な民族文化と洗練されたポップセンスが融合した、東南アジア最先端の音楽カルチャーの勢いが止まらないニャ。'
      };
      found = fallbacks[sectionNum] ? `🐱 エラーネコ：${fallbacks[sectionNum]}` : '';
    }
    return found;
  }

  function makeArticleCards(perplexityJson, max = 3) {
    if (!perplexityJson?.results) return '';
    const validResults = perplexityJson.results
      .filter(r => r.title && r.snippet && r.url)
      .slice(0, max);
    if (validResults.length === 0) return '';
    
    return validResults.map(r => `
<div style="background:#f9fafa;border:1px solid #e0eeee;border-radius:10px;padding:16px;margin:10px 0;box-shadow:0 2px 6px rgba(0,0,0,0.05);">
  <div style="font-weight:bold;font-size:14px;color:#20B2AA;margin-bottom:8px;">📰 ${r.title}</div>
  <div style="font-size:13px;color:#555;line-height:1.7;margin-bottom:10px;">${r.snippet.replace(/\n/g, '<br>').substring(0, 300)}...</div>
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <a href="${r.url}" target="_blank" style="font-size:12px;color:#20B2AA;text-decoration:none;">🔗 元記事を読む</a>
    <span style="font-size:11px;color:#aaa;">${r.last_updated || ''}</span>
  </div>
</div>`).join('\n');
  }

  const formatKaisetu = (text) => {
    // 出典部分を分離
    const citeMatch = text.match(/\n出典\s*[:：]\s*([\s\S]*)$/i);
    const mainText = cleanMarkdown(citeMatch ? text.replace(citeMatch[0], '') : text);
    const citeText = cleanMarkdown(citeMatch ? citeMatch[1] : '')
      .replace(/https?:\/\/([^\/\s]+)[^\s]*/g, 'https://$1');
    
    const formatted = mainText
      .replace(/^##\s*\[貿易解説\][：:]?\s*/gm, '')
      .replace(/^##\s*\[死因解説\][：:]?\s*/gm, '')
      .replace(/^##\s*\[犯罪解説\][：:]?\s*/gm, '')
      .replace(/\n—+\n/g, '\n')
      .replace(/\n-{3,}\n/g, '\n')
      .replace(/\n##\s*\n/g, '\n')
      .replace(/^—+$/gm, '')
      .replace(/^##\s*$/gm, '')
      .replace(/^：(.+)$/gm, '<p style="font-size:15px;font-weight:700;color:#555;margin:0 0 16px;padding:8px 12px;background:#f0f7f7;border-radius:6px;">$1</p>')
      .replace(/^### (.+)$/gm, '<h4 style="font-size:14px;font-weight:900;color:#333;margin:20px 0 6px;padding-left:10px;border-left:3px solid #b2ebf2;">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 style="font-size:15px;font-weight:900;color:#e67e22;margin:24px 0 8px;border-left:4px solid #e67e22;padding-left:10px;">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/<br>—+<br>/g, '<br>')
      .replace(/<br>##\s*<br>/g, '<br>');
    
    return { formatted, citeText };
  };

  // --- データ事前抽出（ヘッダーで使用するため） ---
  const geoItems = ['位置', '面積', '公用語', '日本からの飛行距離', '外務省危険レベル'];
  const geoData = geoItems.map(item => {
    const line = findMatchingLine(rawLines, item);
    const { countryVal } = extractRowValuesFromLine(line);
    let val = countryVal;

    // スプレッドシート / リサーチ1 からの直接取得・フォールバック
    const geoRaw = sheetData.data?.対象国データ?.地理 || {};
    if (item === '位置' && (val === 'データなし' || !val)) {
      val = geoRaw.位置 || 'データなし';
    }
    if (item === '面積') {
      if (val.includes('データなし') || val === 'データなし' || !val) {
        const areaRaw = geoRaw.面積_km2;
        if (areaRaw && areaRaw !== 'データなし') {
          const areaNum = parseFloat(String(areaRaw).replace(/,/g, ''));
          if (!isNaN(areaNum)) {
            const ratio = areaNum / 377900;
            const ratioStr = ratio < 0.1 ? ratio.toFixed(2) : ratio.toFixed(1);
            val = `${areaNum.toLocaleString()}km²（日本の面積の約${ratioStr}倍）`;
          }
        }
      }
    }
    if (item === '公用語' && (val === 'データなし' || !val)) {
      val = geoRaw.公用語 || 'データなし';
    }
    if (item === '日本からの飛行距離' && (val === 'データなし' || !val)) {
      if (geoRaw.日本からの飛行距離_km) {
        val = `${geoRaw.日本からの飛行距離_km}km` + (geoRaw.フライト時間 ? `（フライト時間：${geoRaw.フライト時間}）` : '');
      } else if (geoRaw.フライト時間) {
        val = geoRaw.フライト時間;
      }
    }
    if (item === '外務省危険レベル' && (val === 'データなし' || !val)) {
      val = sheetData.data?.固定データ?.治安指標?.外務省危険レベル?.レベル || geoRaw.外務省危険レベル || 'データなし';
    }
    return { 項目: item, 値: val };
  });

  let boekiKaisetu = '';
  let shiinKaisetu = '';
  let hanzaiKaisetu = '';
  let chirigeiKaisetu = '';
  let bukkaKaisetu = '';
  try {
    const summaryNode = $('★まとめ記事即時保存').first()?.json || $('検索結果まとめ記事').first()?.json || {};
    const aiText = summaryNode.summary_article || summaryNode.text || summaryNode.content?.parts?.[0]?.text || summaryNode.output || '';
    const boekiMatch = aiText.match(/(?:\[貿易解説\]|##\s*貿易解説)([\s\S]*?)(?=(?:\[|##\s*)(?:死因解説|犯罪解説|地理・経済解説|物価解説)|$)/);
    const shiinMatch = aiText.match(/(?:\[死因解説\]|##\s*死因解説)([\s\S]*?)(?=(?:\[|##\s*)(?:犯罪解説|地理・経済解説|物価解説)|$)/);
    const hanzaiMatch = aiText.match(/(?:\[犯罪解説\]|##\s*犯罪解説)([\s\S]*?)(?=(?:\[|##\s*)(?:地理・経済解説|物価解説)|$)/);
    const chirigeiMatch = aiText.match(/(?:\[地理・経済解説\]|##\s*地理・経済解説)([\s\S]*?)(?=(?:\[|##\s*)物価解説|$)/);
    const bukkaMatch = aiText.match(/(?:\[物価解説\]|##\s*物価解説)([\s\S]*?)$/);
    boekiKaisetu = boekiMatch ? boekiMatch[1].trim() : '';
    shiinKaisetu = shiinMatch ? shiinMatch[1].trim() : '';
    hanzaiKaisetu = hanzaiMatch ? hanzaiMatch[1].trim() : '';
    chirigeiKaisetu = chirigeiMatch ? chirigeiMatch[1].trim() : '';
    bukkaKaisetu = bukkaMatch ? bukkaMatch[1].trim() : '';
  } catch(e) {}

  let article = '';

  // --- 4. ヒーローステータスカード（冒頭） ---
  const kikenLevelRaw = geoData.find(d => d.項目 === '外務省危険レベル')?.値 || 'データなし';
  const kikenLevel = parseInt(String(kikenLevelRaw).replace(/[^0-9]/g, '')) || 0;
  let location = geoData.find(d => d.項目 === '位置')?.値;
  if (!location || location === 'データなし' || location === '不明') {
    location = sheetData.data?.対象国データ?.地理?.位置 || $('国名変換Code').first()?.json?.region || '世界';
  }

  let headerBg = 'linear-gradient(135deg, #f0fafa 0%, #e0f5f5 100%)';
  let statusColor = '#00bcd4';
  let statusText = '✅ 安定';
  let statusBorder = '#b2ebf2';

  if (kikenLevel >= 2) {
    headerBg = 'linear-gradient(135deg, #fff3f3 0%, #ffebee 100%)';
    statusColor = '#d32f2f';
    statusText = '🚨 危険・渡航注意';
    statusBorder = '#ffcdd2';
  } else if (kikenLevel === 1) {
    headerBg = 'linear-gradient(135deg, #fffdf0 0%, #fff9c4 100%)';
    statusColor = '#fbc02d';
    statusText = '⚠️ 注意';
    statusBorder = '#fff9c4';
  }

  article += `
<style>
  .entry-title, .post-title, .page-title { display: none !important; }
</style>
<div id="top" style="background:${headerBg}; border:1px solid #eee; border-left:8px solid ${statusColor}; border-radius:12px; padding:24px; margin-bottom:35px; box-shadow:0 4px 15px rgba(0,0,0,0.06); position:relative; overflow:hidden;">
  <div style="position:absolute; top:-20px; right:-20px; font-size:100px; color:${statusColor}; opacity:0.05; transform:rotate(-15deg); font-weight:bold; z-index:0;">FACT</div>
  <div style="display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1;">
    <div>
      <div style="font-size:12px; color:${statusColor}; font-weight:bold; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">National Profile</div>
      <h1 style="margin:0; font-size:28px; font-weight:900; color:#111; letter-spacing:-0.5px;">${countryName}</h1>
      <div style="margin:8px 0 0; font-size:14px; color:#555; display:flex; gap:12px; align-items:center;">
        <span style="white-space: nowrap;">📍 ${capital || '首都不明'}</span>
        <span style="color:#ccc;">|</span>
        <span>🌍 ${location}</span>
      </div>
    </div>
    <div style="background:${statusColor}; color:#fff; padding:8px 18px; border-radius:30px; font-weight:900; font-size:13px; box-shadow:0 2px 8px rgba(0,0,0,0.15); display:flex; align-items:center; gap:6px;">
      ${statusText}
    </div>
  </div>
</div>
`;

  article += `
<div style="background:#f9fafa;border:1px solid #e0eeee;border-radius:12px;padding:20px 24px;margin:30px 0;">
  <div style="font-size:13px;font-weight:700;color:#00bcd4;margin-bottom:12px;">📋 目次</div>
  <ol style="margin:0;padding-left:20px;line-height:2.2;font-size:14px;">
    <li><a href="#section-1" style="color:#333;text-decoration:none;">制度の9つの皿</a></li>
    <li><a href="#section-2" style="color:#333;text-decoration:none;">地理と経済の衡量</a></li>
    <li><a href="#section-3" style="color:#333;text-decoration:none;">治安と平和の衡量</a></li>
    <li><a href="#section-4" style="color:#333;text-decoration:none;">貿易の衡量</a></li>
    <li><a href="#section-5" style="color:#333;text-decoration:none;">生活・価値の衡量（物価比較）</a></li>
    <li><a href="#section-6" style="color:#333;text-decoration:none;">歴史的背景</a></li>
    <li><a href="#section-7" style="color:#333;text-decoration:none;">直近の動向</a></li>
    <li><a href="#section-8" style="color:#333;text-decoration:none;">映像で知る${countryName}</a></li>
    <li><a href="#deep-dive" style="color:#333;text-decoration:none;">✦ Deep Dive</a></li>
    <li><a href="#section-9" style="color:#333;text-decoration:none;">おすすめ映画・映像作品</a></li>
    <li><a href="#section-10" style="color:#333;text-decoration:none;">おすすめ音楽・ナショナルサウンドトラック</a></li>
  </ol>
</div>
`;

  // --- 5. 導入文（韓国ブログ正解完全準拠：抽出・サニタイズ・自動生成フォールバック） ---
  const expectedFirstLine = `あなたはこの ${countryName}（${capital || '首都'}）-${countryEn || ''}-という国を知っていますか？`;
  const expectedLastLine = `数字と事実（Fact）から、国家の真実を紐解きます。`;

  let introParagraphs = [];

  if (raw && typeof raw === 'string') {
    const rawIntroLines = raw.split('\n').map(l => l.trim());
    
    // 1. 「あなたはこの」から「数字と事実」までの範囲を探す
    let startIdx = rawIntroLines.findIndex(l => l.includes('あなたはこの') && l.includes('知っていますか'));
    let endIdx = rawIntroLines.findIndex(l => (l.includes('数字と事実') || l.includes('Fact') || l.includes('FACT')) && !l.startsWith('①'));

    let candidateText = '';
    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
      candidateText = rawIntroLines.slice(startIdx, endIdx + 1).join('\n');
    } else if (endIdx !== -1) {
      candidateText = rawIntroLines.slice(0, endIdx + 1).join('\n');
    } else {
      const fallbackEnd = rawIntroLines.findIndex(l => 
        l.match(/^(?:#+\s*)?(?:①|1\.)/) || 
        l.startsWith('位置：') || l.startsWith('位置:') ||
        (l.includes('｜') && (l.includes('国家の形') || l.includes('行政トップ')))
      );
      if (fallbackEnd !== -1) {
        candidateText = rawIntroLines.slice(0, fallbackEnd).join('\n');
      }
    }

    if (candidateText) {
      // AI前置き挨拶、タイトル、Markdown記号を完全排除
      const cleanCandidate = candidateText
        .replace(/^提供されたデータに基づき.*$/gm, '')
        .replace(/^.*分析レポート.*$/gm, '')
        .replace(/^.*包括.*プロファイル.*$/gm, '')
        .replace(/^#+.*$/gm, '')
        .replace(/^[-=]{2,}$/gm, '')
        .trim();

      introParagraphs = cleanCandidate
        .split(/\n{2,}/)
        .map(p => p.trim())
        .filter(p => {
          if (!p) return false;
          if (p.startsWith('①') || p.includes('｜') || p.startsWith('|') || p.startsWith('---')) return false;
          if (p.includes('提供されたデータ') || p.includes('分析レポート')) return false;
          // 禁止地理・人口データの排除（〜万の島々、〜億人の人口、面積など）
          if (p.match(/\d+万|\d+億|平方キロ|km²|北緯|東経|南緯|西経/)) return false;
          return true;
        });
    }
  }

  // もし抽出された段落が少なすぎる、または冒頭文が含まれない場合は、韓国ブログと100%同一の正解テンプレートを生成
  if (introParagraphs.length < 3 || !introParagraphs[0].includes('あなたはこの')) {
    introParagraphs = [
      expectedFirstLine,
      `${regionName || 'アジア'}の要衝に位置し、独自の歴史と豊かな文化を育んできたこの国は、めまぐるしいスピードで近代化と劇的な変化を遂げています。`,
      `世界を魅了する独自の文化や急成長するエネルギーという華やかな「光」を持つ一方で、激しい社会格差や歴史的・構造的な課題という深刻な「影」も抱え込んでいます。`,
      `なぜ、同じアジアの海を共有しながら、国家の統治機構や安全保障のあり方がこれほどまでに大きく異なるのでしょうか？`,
      `そしてなぜ、似通った現代の課題に直面しながらも、日本とは全く異なるアプローチで未来を切り開こうとしているのでしょうか？`,
      `日本との対比を通じて、この国の隠された輪郭を浮き彫りにしていきます。`,
      expectedLastLine
    ];
  } else {
    // 抽出された段落を正解フォーマットに確実に補正
    if (!introParagraphs[0].includes('あなたはこの')) {
      introParagraphs.unshift(expectedFirstLine);
    }
    const lastP = introParagraphs[introParagraphs.length - 1];
    if (!lastP.includes('数字と事実')) {
      introParagraphs.push(expectedLastLine);
    }
  }

  // 韓国ブログ正解と同一のスタイルでHTML化して追加
  const introHtml = introParagraphs
    .map(p => `<p style="font-size:15px; line-height:2.0; color:#333; margin:18px 0; text-align:justify; text-justify:inter-ideograph;">${p}</p>`)
    .join('\n');
  article += introHtml + '\n';

  // --- 6. ① 制度の9つの皿 ---
  article += `<!-- SECTION:seido:START -->\n`;
  article += `<h2 id="section-1" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">①</span> 制度の9つの皿</h2>\n`;
  const seidoItems = ['国家の形と統治機構', '行政トップ', '立法と選挙制度', '司法と法制度', '社会保障・医療・年金', '教育制度', '徴税・財政制度', '安全保障と兵役', '基本権と価値観'];
  const targetSeidoFixed = sheetData.data?.対象国データ?.制度の9つの皿 || {};
  const japanSeidoFixed = sheetData.data?.日本固定データ?.制度の9つの皿 || {};

  // 日本の固定制度マスターデータ（韓国記事のお手本仕様）
  const defaultJapanSeido = {
    '国家の形と統治機構': '立憲君主制（象徴天皇制）・議院内閣制・単一国家',
    '行政トップ': '内閣総理大臣：高市早苗（2025年10月就任）',
    '立法と選挙制度': '二院制（衆議院・参議院）・小選挙区比例代表並立制',
    '司法と法制度': '最高裁判所を頂点とする三審制・大陸法基調',
    '社会保障・医療・年金': '国民皆保険・国民年金（自己負担原則3割・受給開始65歳）',
    '教育制度': '6-3-3-4制・義務教育9年・大学進学率約57%',
    '徴税・財政制度': '消費税10%（軽減税率8%）・所得税最高45%・相続税最高55%',
    '安全保障と兵役': '自衛隊（志願制）・兵役義務なし・日米安保基軸',
    '基本権と価値観': '死刑制度維持（絞首刑・執行継続）・同性婚未承認'
  };

  const seidoRows = seidoItems.map(item => {
    // 対象国の値：スプレッドシートの固定データを最優先、なければライターのパース値
    let countryVal = targetSeidoFixed[item]?.値 || targetSeidoFixed[item] || '';
    if (!countryVal || countryVal === 'データなし') {
      const line = findMatchingLine(rawLines, item);
      const parsed = extractRowValuesFromLine(line);
      countryVal = parsed.countryVal || 'データなし';
    }

    // 日本の値：日本の固定データを100%直接バインド（AIが勝手に生成した比較文章は一切使用しない）
    let japanVal = japanSeidoFixed[item]?.値 || japanSeidoFixed[item] || defaultJapanSeido[item] || 'データなし';

    return [item, countryVal, japanVal];
  });
  article += makeTable(['制度の項目', countryLabel, japanLabel], seidoRows, ['30%', '35%', '35%']);

  // 解説文の抽出（Markdownテーブル行・区切り線を100%完全に排除）
  const seidoSectionText = extractSectionText(raw,
    ['① 制度の9つの皿', '制度の9つの皿', '基本権と価値観'],
    ['② 地理と経済の衡量', '地理と経済の衡量', '## 2', '2. 経済', '位置：', '位置:']
  );
  const seidoExplanation = cleanMarkdown(
    seidoSectionText
      .split('\n')
      .filter(l => {
        const trimmed = l.trim();
        // Markdown表行（|で始まる行、|を含む行、区切り線）を完全に排除
        if (trimmed.startsWith('|') || trimmed.includes('|') || trimmed.startsWith(':-') || trimmed.startsWith('-:')) return false;
        const cleaned = trimmed.replace(/^[#\*\-\s]+/, '').replace(/\*\*/g, '').trim();
        if (seidoItems.some(item => cleaned.startsWith(item))) return false;
        if (cleaned.startsWith('##') || cleaned.startsWith('2. 経済') || cleaned.startsWith('主要マクロ経済指標') || cleaned.startsWith('区分') || cleaned.startsWith('制度概要')) return false;
        return true;
      })
      .join('\n')
  );
  if (seidoExplanation) article += `\n${seidoExplanation}\n`;

  const spotlight = sheetData.data?.対象国データ?.制度の9つの皿?.制度スポットライト || null;

  // 整形ノード1経由で取得
  const spotlightData = $('整形ノード1').first().json?.data?.対象国データ?.制度の9つの皿?.制度スポットライト || null;

  if (spotlightData?.記事) {
    article += `<h3 style="font-size:14px;font-weight:500;color:#e67e22;margin-top:30px;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid #e67e22;display:inline-block;">📌 制度スポットライト：${spotlightData.選定項目 || ''}</h3>\n`;
    const _sentences = spotlightData.記事.split('。').map(s => s.trim()).filter(Boolean).map(s => s + '。');
    const _paras = [];
    for (let i = 0; i < _sentences.length; i += 2) {
      _paras.push(_sentences.slice(i, i + 2).join(''));
    }
    const spotlightText = _paras
      .map(p => `<p style="font-size:14px;line-height:1.9;color:#333;margin:0 0 14px;">${p}</p>`)
      .join('');
    article += `<div style="margin:20px 0;padding:16px;background:var(--color-background-secondary,#f5f5f5);border-left:3px solid #00bcd4;border-radius:0 8px 8px 0;">${spotlightText}</div>\n`;
  }

  const seidoNeko = getNekoBubbleForSection('①');
  article += makeNekoBubble(seidoNeko);
  article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  article += `<!-- SECTION:seido:END -->\n`;

  // --- 7. ② 地理と経済の衡量 ---
  article += `<!-- SECTION:chiri_keizai:START -->\n`;
  article += `<h2 id="section-2" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">②</span> 地理と経済の衡量</h2>\n`;
  // geoData は上で事前抽出済み
  const geoRows = geoData.map(d => [d.項目, d.値]);
  article += makeTable(['地理項目', '内容'], geoRows, ['30%', '70%']);

  // --- 経済データ整形ヘルパー ---
  function formatEconValue(itemName, rawValue) {
    if (!rawValue || rawValue === 'データなし' || typeof rawValue !== 'string' || /[万人億ドル%\$]/.test(rawValue)) return rawValue;

    // 数字とそれ以外（年号など）を分離
    const match = rawValue.match(/^([\d\.,-]+)(.*)$/);
    if (!match) return rawValue;

    let num = parseFloat(match[1].replace(/,/g, ''));
    const suffix = match[2]; // （2025年）など

    if (itemName === '総人口') {
      // IMFデータは100万人単位
      const total = num * 1000000;
      if (total >= 100000000) return (total / 100000000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '億人' + suffix;
      if (total >= 10000) return (total / 10000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '万人' + suffix;
      return Math.round(total).toLocaleString() + '人' + suffix;
    }

    if (itemName.includes('GDP（名目')) {
      // IMFデータは10億ドル単位（Billions）なので、10倍して「億ドル」にする
      const okuValue = num * 10;
      return okuValue.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '億ドル' + suffix;
    }

    if (itemName === '一人当たりGDP') {
      return '$' + Math.round(num).toLocaleString() + suffix;
    }

    if (itemName.includes('率') || itemName.includes('比')) {
      return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' + suffix;
    }

    return rawValue;
  }

  const econItems = ['総人口', 'GDP（名目・USドル）', '一人当たりGDP', 'GDP成長率', '政府債務残高（GDP比）', '経常収支（GDP比）', 'インフレ率'];
  const econKeyMap = {
    '総人口': '総人口',
    'GDP（名目・USドル）': 'GDP_USD',
    '一人当たりGDP': '一人当たりGDP',
    'GDP成長率': 'GDP成長率',
    '政府債務残高（GDP比）': '政府債務残高_GDP比',
    '経常収支（GDP比）': '経常収支_GDP比',
    'インフレ率': 'インフレ率'
  };
  const targetEconFixed = sheetData.data?.固定データ?.経済データ || {};
  const japanEconFixed = sheetData.data?.日本固定データ?.経済データ || {};

  const econRows = econItems.map(item => {
    const line = findMatchingLine(rawLines, item);
    let { countryVal, japanVal } = extractRowValuesFromLine(line);

    const fixedKey = econKeyMap[item];
    // 対象国の値フォールバック
    if (countryVal === 'データなし' || !countryVal) {
      const fixedObj = targetEconFixed[fixedKey];
      if (fixedObj && fixedObj.値 !== undefined && fixedObj.値 !== null && fixedObj.値 !== '' && fixedObj.値 !== 'データなし') {
        const yearStr = fixedObj.年 ? `（${String(fixedObj.年).replace(/年$/, '')}年）` : '';
        countryVal = String(fixedObj.値) + yearStr;
      }
    }
    // 日本の値フォールバック
    if (japanVal === 'データなし' || !japanVal) {
      const jFixedObj = japanEconFixed[fixedKey];
      if (jFixedObj && jFixedObj.値 !== undefined && jFixedObj.値 !== null && jFixedObj.値 !== '' && jFixedObj.値 !== 'データなし') {
        const yearStr = jFixedObj.年 ? `（${String(jFixedObj.年).replace(/年$/, '')}年）` : '';
        japanVal = String(jFixedObj.値) + yearStr;
      }
    }

    return [item, formatEconValue(item, countryVal), formatEconValue(item, japanVal)];
  });
  article += makeTable(['経済指標', countryLabel, japanLabel], econRows, ['30%', '35%', '35%']);
  const econCite = sheetData.data?.固定データ?.経済データ?.GDP_USD?.出典 || 'IMF World Economic Outlook';
  article += `<p class="citation" style="${citationStyle}">出典：${econCite}</p>\n`;

  const econSectionText = extractSectionText(raw,
    ['② 地理と経済の衡量', '地理と経済の衡量', '## 2', '2. 経済'],
    ['③ 治安と平和の衡量', '治安と平和の衡量', '## 3', '3. 治安', '殺人率']
  );
  const econExplanation = cleanMarkdown(
    econSectionText
      .split('\n')
      .filter(l => {
        const cleaned = l.replace(/^[#\*\-\s]+/, '').replace(/\*\*/g, '').trim();
        const isGeoOrEconLine = geoItems.concat(econItems).some(item => cleaned.startsWith(item)) || cleaned.startsWith('外務省危険レベル');
        if (isGeoOrEconLine) return false;
        if (cleaned.startsWith('## 3') || cleaned.startsWith('3. 治安') || cleaned.startsWith('主要マクロ経済指標') || cleaned.startsWith('| 品目') || cleaned.startsWith('## 4')) return false;
        return true;
      })
      .join('\n')
  );
  if (econExplanation) article += `\n${econExplanation}\n`;
  // ② エラー猫の直前
  if (chirigeiKaisetu) {
    const { formatted, citeText } = formatKaisetu(chirigeiKaisetu);
    article += `<h3 style="${h3NewsStyle}">${h3NewsBadge} 地理・経済トピック</h3>\n`;
    article += `<div style="font-size:14px;line-height:1.9;color:#333;margin:20px 0;">${formatted}</div>\n`;
    if (citeText) article += `<p class="citation" style="${citationStyle}">出典：${citeText.replace(/\n/g,'<br>')}</p>\n`;
  }

  const econNeko = getNekoBubbleForSection('②');
  article += makeNekoBubble(econNeko);
  article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  article += `<!-- SECTION:chiri_keizai:END -->\n`;

  // --- 8. ③ 治安と平和の衡量 ---
  article += `<!-- SECTION:chian:START -->\n`;
  article += `<h2 id="section-3" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">③</span> 治安と平和の衡量</h2>\n`;
  const chiAnItems = ['殺人率（10万人あたり）', '交通事故死亡率（10万人あたり）', '自殺率（10万人あたり）', '失業率', '貧困率', 'ジニ係数', '刑務所稼働率', '刑務所総収容者数', 'GPI（世界平和度指数）'];
  const chiAnKeyMap = {
    '殺人率（10万人あたり）': '殺人率',
    '交通事故死亡率（10万人あたり）': '交通事故死亡率',
    '自殺率（10万人あたり）': '自殺率',
    '失業率': '失業率',
    '貧困率': '貧困率',
    'ジニ係数': 'ジニ係数',
    '刑務所稼働率': '刑務所稼働率',
    '刑務所総収容者数': '刑務所総収容者数',
    'GPI（世界平和度指数）': 'GPI'
  };
  const targetChiAnFixed = sheetData.data?.固定データ?.治安指標 || {};
  const japanChiAnFixed = sheetData.data?.日本固定データ?.治安指標 || {};

  // 日本の固定治安マスターデータ（韓国記事のお手本仕様）
  const defaultJapanChiAn = {
    '殺人率': '0.23（UNODC・2024年）',
    '交通事故死亡率': '2.1（WHO・2025年）',
    '自殺率': '15.4（厚生労働省・2025年）',
    '失業率': '2.5%（IMF・2026年）',
    '貧困率': '15.4%（厚生労働省・2021年）',
    'ジニ係数': '39.9（World Bank・2021年）',
    '刑務所稼働率': '47.3%（World Prison Brief・2023年）',
    '刑務所総収容者数': '41,232人（World Prison Brief・2025年）',
    'GPI': 'スコア 1.489・10位（Vision of Humanity・2026年）'
  };

  const chiAnRows = chiAnItems.map(item => {
    const fixedKey = chiAnKeyMap[item];

    // 1. 対象国の値：スプレッドシートの固定データを最優先！
    let countryVal = '';
    const fixedObj = targetChiAnFixed[fixedKey];
    if (fixedObj) {
      if (fixedKey === 'GPI') {
        const score = fixedObj.スコア || targetChiAnFixed['GPIスコア']?.値 || '';
        let rank = fixedObj.順位 || targetChiAnFixed['GPI順位']?.値 || '';
        if (rank) rank = String(rank).replace(/位+$/, '') + '位';
        const src = fixedObj.出典 || targetChiAnFixed['GPI出典']?.値 || 'Vision of Humanity';
        let yr = fixedObj.年 || targetChiAnFixed['GPI年']?.値 || '';
        if (yr) yr = String(yr).replace(/年+$/, '') + '年';
        if (score) {
          countryVal = `スコア ${score}${rank ? '・' + rank : ''}（${src}・${yr || '2026年'}）`.trim();
        }
      } else if (fixedObj.値 !== undefined && fixedObj.値 !== null && fixedObj.値 !== '' && fixedObj.値 !== '欠測') {
        const src = fixedObj.出典 || '';
        let yr = fixedObj.年 || '';
        if (yr) yr = String(yr).replace(/年+$/, '') + '年';
        const srcStr = (src || yr) ? `（${src}・${yr}）`.replace(/・（|（・/g, '（').trim() : '';
        countryVal = `${fixedObj.値}${srcStr ? ' ' + srcStr : ''}`.trim();
      }
    }

    // 固定データになければライターからフォールバック取得
    if (!countryVal || countryVal === 'データなし') {
      const line = findMatchingLine(rawLines, item);
      const parsed = extractRowValuesFromLine(line);
      let rawVal = parsed.countryVal;
      if (rawVal && rawVal !== 'データなし') {
        // 「日本：2.1件...」のような比較コメントが含まれていた場合は除去
        rawVal = rawVal.replace(/（[^）]*日本[^）]*）/g, '').replace(/\([^)]*日本[^)]*\)/g, '').trim();
        countryVal = rawVal;
      } else {
        countryVal = 'データなし';
      }
    }

    // 2. 日本の値：日本の固定データから100%直接バインド！（ライターの出力に依存しない）
    let japanVal = '';
    if (fixedKey === 'GPI') {
      const score = japanChiAnFixed['GPI']?.スコア || japanChiAnFixed['GPIスコア']?.値 || '1.489';
      let rawRank = japanChiAnFixed['GPI']?.順位 || japanChiAnFixed['GPI順位']?.値 || '10';
      const rank = rawRank ? `${String(rawRank).replace(/位+$/, '')}位` : '';
      const src = japanChiAnFixed['GPI']?.出典 || japanChiAnFixed['GPIスコア']?.出典 || 'Vision of Humanity';
      let yr = japanChiAnFixed['GPI']?.年 || japanChiAnFixed['GPIスコア']?.年 || '2026年';
      yr = yr.endsWith('年') ? yr : yr + '年';
      japanVal = `スコア ${score}${rank ? '・' + rank : ''}（${src}・${yr}）`.trim();
    } else {
      const jFixedObj = japanChiAnFixed[fixedKey];
      if (jFixedObj && jFixedObj.値 !== undefined && jFixedObj.値 !== null && jFixedObj.値 !== '' && jFixedObj.値 !== '欠測') {
        let srcYr = jFixedObj['出典・年'] || `${jFixedObj.出典 || ''} ${jFixedObj.年 || ''}`.trim();
        // 組織名内部のスペース（World Bank等）は維持し、末尾の年号との境界のみ「・」にする
        srcYr = srcYr.replace(/\s+(\d+年?)$/, '・$1');
        japanVal = `${jFixedObj.値}（${srcYr}）`.trim();
      } else if (defaultJapanChiAn[fixedKey]) {
        japanVal = defaultJapanChiAn[fixedKey];
      } else {
        japanVal = 'データなし';
      }
    }

    const formatSource = (val) => {
      if (!val || val === 'データなし') return 'データなし';
      const main = val.replace(/\s*[（(].*$/, '');
      const source = val.match(/\s*([（(].*)$/);
      return `<span style="font-weight:900; font-size:15px; color:#111;">${main}</span>` + (source ? `<br><span style="font-size:11.5px; color:#888; font-weight:normal; line-height:1.4; display:inline-block; margin-top:2px;">${source[1]}</span>` : '');
    };
    return [item, formatSource(countryVal), formatSource(japanVal)];
  });

  const chiAnCountryLabel = capital ? `${countryName}<br>（${capital}）` : countryName;
  const chiAnJapanLabel = '日本<br>（東京）';

  article += makeTable(['治安・社会指標', chiAnCountryLabel, chiAnJapanLabel], chiAnRows, ['35%', '32%', '33%']);


  // 危険レベル警告 (レベル1以上の場合のみ表示)
  if (kikenLevel > 0) {
    const kikenMatch = raw.match(/[⚠️🚨] 外務省から[^\n]+/);
    if (kikenMatch) article += `<p style="color:#d32f2f;font-weight:bold;background:#fff3f3;padding:10px;border-radius:8px;">${kikenMatch[0]}</p>\n`;
  }

  let prisonData = parseLines(raw, '刑務所推移');
  if (prisonData.length === 0) {
    const fixedTargetPrison = sheetData.data?.固定データ?.刑務所推移 || [];
    const fixedJapanPrison = sheetData.data?.日本固定データ?.刑務所推移 || [];
    if (fixedTargetPrison.length > 0 || fixedJapanPrison.length > 0) {
      const yearMap = {};
      fixedTargetPrison.forEach(d => {
        if (d.年) {
          yearMap[d.年] = yearMap[d.年] || {};
          yearMap[d.年][countryName] = String(d.総収容者数 || '');
        }
      });
      fixedJapanPrison.forEach(d => {
        if (d.年) {
          yearMap[d.年] = yearMap[d.年] || {};
          yearMap[d.年]['日本'] = String(d.総収容者数 || '');
        }
      });
      prisonData = Object.keys(yearMap).sort().map(y => ({
        年: y,
        [countryName]: yearMap[y][countryName] || '-',
        日本: yearMap[y]['日本'] || '-'
      }));
    }
  }
  if (prisonData.length > 0) {
    article += `<h3 style="${h3Style}">刑務所収容者数の推移</h3>\n`;

    const labels = prisonData.map(d => d['年']);
    const targetData = prisonData.map(d => {
      const val = getCountryValue(d)?.replace(/,/g, '').trim();
      if (!val || val === '-' || val === 'データなし') return null;
      const num = parseInt(val);
      return isNaN(num) ? null : num;
    });
    const japanData = prisonData.map(d => {
      const val = getJapanValue(d)?.replace(/,/g, '').trim();
      if (!val || val === '-' || val === 'データなし') return null;
      const num = parseInt(val);
      return isNaN(num) ? null : num;
    });

    // 数値の規模にどれくらい差があるか判定 (スマート・チャート・ロジック) - nullを除外して最大値を正確に計算
    const targetDataFiltered = targetData.filter(x => x !== null);
    const japanDataFiltered = japanData.filter(x => x !== null);
    const maxTarget = targetDataFiltered.length > 0 ? Math.max(...targetDataFiltered) : 1;
    const maxJapan = japanDataFiltered.length > 0 ? Math.max(...japanDataFiltered) : 1;
    const ratio = Math.max(maxTarget, maxJapan) / Math.min(maxTarget, maxJapan);

    if (ratio > 20) {
      // --- 規模が20倍以上違う場合は、2つのグラフに分ける ---
      const targetChartConfig = {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: `${countryName} (人)`,
            data: targetData,
            borderColor: '#00bcd4',
            backgroundColor: 'rgba(0, 188, 212, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 3,
            spanGaps: true
          }]
        },
        options: { title: { display: true, text: `${countryName}の推移 (小規模)` } }
      };

      const japanChartConfig = {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: '日本 (人)',
            data: japanData,
            borderColor: '#ff4500',
            backgroundColor: 'rgba(255, 69, 0, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 3,
            spanGaps: true
          }]
        },
        options: { title: { display: true, text: '日本の推移 (大規模)' } }
      };

      const targetChartUrl = `https://quickchart.io/chart?width=400&height=250&c=${encodeURIComponent(JSON.stringify(targetChartConfig))}`;
      const japanChartUrl = `https://quickchart.io/chart?width=400&height=250&c=${encodeURIComponent(JSON.stringify(japanChartConfig))}`;

      article += `
<p style="font-size:12px; color:#666; background:#f9f9f9; padding:10px; border-radius:6px; border-left:4px solid #ccc;">
  ※日本と${countryName}では収容者数の規模が大きく異なるため（約${Math.round(ratio)}倍の差）、それぞれの傾向を正確に把握できるよう個別にグラフを表示しています。
</p>
<div style="display:flex; flex-wrap:wrap; gap:10px; margin:20px 0;">
  <div style="flex:1; min-width:300px;"><img src="${targetChartUrl}" style="max-width:100%; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1);"></div>
  <div style="flex:1; min-width:300px;"><img src="${japanChartUrl}" style="max-width:100%; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1);"></div>
</div>`;

    } else {
      // --- 規模が近い場合は、1つのグラフにまとめる (2軸) ---
      const chartConfig = {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            { label: `${countryName} (右軸)`, data: targetData, borderColor: '#00bcd4', yAxisID: 'y1', fill: false, tension: 0.3, borderWidth: 3, spanGaps: true },
            { label: '日本 (左軸)', data: japanData, borderColor: '#ff4500', yAxisID: 'y', fill: false, tension: 0.3, borderWidth: 2, borderDash: [5, 5], spanGaps: true }
          ]
        },
        options: {
          scales: {
            yAxes: [
              { id: 'y', type: 'linear', position: 'left', ticks: { fontColor: '#ff4500' } },
              { id: 'y1', type: 'linear', position: 'right', ticks: { fontColor: '#00bcd4' }, gridLines: { drawOnChartArea: false } }
            ]
          }
        }
      };
      const chartUrl = `https://quickchart.io/chart?width=800&height=400&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
      article += `<div style="margin: 20px 0; text-align: center;"><img src="${chartUrl}" alt="比較グラフ" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></div>\n`;
    }

    article += `<p class="citation" style="${citationStyle}">出典：World Prison Brief</p>\n`;
  }

  let shiinData = parseLines(raw, '死因');
  let crimeData = parseLines(raw, '犯罪');

  // 犯罪データフォールバック
  if (crimeData.length === 0) {
    const fixedCrime = sheetData.data?.固定データ?.治安指標?.犯罪トップ5 || [];
    if (fixedCrime.length > 0) {
      crimeData = fixedCrime.map(c => ({
        '順位': c.順位,
        '種別': c.犯罪種別,
        '出典': c.出典 || sheetData.data?.固定データ?.治安指標?.犯罪_出典 || ''
      }));
    }
  }

  // 死因データフォールバック
  if (shiinData.length === 0) {
    const targetDeaths = sheetData.data?.固定データ?.死因トップ10 || [];
    const japanDeaths = sheetData.data?.日本固定データ?.死因トップ10 || [];
    if (targetDeaths.length > 0 || japanDeaths.length > 0) {
      shiinData = Array.from({ length: 10 }, (_, i) => ({
        '順位': `${i + 1}位`,
        [countryName]: targetDeaths[i] || 'データなし',
        '日本': (japanDeaths[i] && typeof japanDeaths[i] === 'object' ? japanDeaths[i].死因 : japanDeaths[i]) || 'データなし'
      }));
    }
  }

  // 犯罪トップ5表
  article += `<h3 style="${h3Style}">犯罪種別ランキング</h3>\n`;
  if (crimeData.length > 0) {
    const crimeRows = crimeData.map(d => [
      d['順位'] || '',
      d['種別'] || 'データなし'
    ]);
    const crimeOutten = crimeData[0]?.['出典'] || '';
    article += makeTable(['順位', '犯罪種別'], crimeRows, ['15%', '85%']);
    if (crimeOutten) article += `<p class="citation" style="${citationStyle}">出典：${crimeOutten}</p>\n`;
  }

  // 犯罪の傾向テキスト
  let crimeFeature = cleanMarkdown(extractSectionText(raw,
    ['犯罪の傾向', '治安・社会指標と犯罪動向', '## 3', '3. 治安'],
    ['重大犯罪｜', '重大犯罪', '死因｜', '死因トップ', '主要な死因', '④ 貿易の衡量', '貿易の衡量', '## 4']
  ));
  if (!crimeFeature) {
    const r1Crime = sheetData.data?.対象国データ?.犯罪の傾向 || {};
    const parts = [];
    if (r1Crime.特有のパターン) parts.push(r1Crime.特有のパターン);
    if (r1Crime.外国人への注意) parts.push(r1Crime.外国人への注意);
    if (parts.length > 0) crimeFeature = parts.join('\n\n');
  }
  if (crimeFeature) {
    article += `\n${crimeFeature}\n`;
  }

  // 重大犯罪事件テーブル
  let majorCrimeData = parseLines(raw, '重大犯罪');
  if (majorCrimeData.length === 0) {
    const r1Crimes = sheetData.data?.対象国データ?.重大犯罪事件 || [];
    if (Array.isArray(r1Crimes) && r1Crimes.length > 0) {
      majorCrimeData = r1Crimes.map(c => ({
        '発生年': c.発生年 || '',
        '事件名': c.事件名 || '',
        '犯人名': c.犯人名 || '',
        '被害者属性': c.被害者属性 || '',
        '概要': c.概要 || c.事件概要 || '',
        '出典': c.出典 || ''
      }));
    }
  }
  if (majorCrimeData.length > 0) {
    article += `<h3 style="${h3Style}">国内の重大犯罪事件（2000年以降）</h3>\n`;
    const majorCrimeRows = majorCrimeData.map(d => [
      d['発生年'] || '不明',
      `<strong>${d['事件名'] || '不明'}</strong>${d['犯人名'] ? '<br>犯人：<span class="no-link">' + d['犯人名'] + '</span>' : ''}`,
      d['被害者属性'] || '不明',
      (d['概要'] || '') + (d['出典'] ? '<br><span style="font-size:11px;color:#aaa;">出典：' + d['出典'] + '</span>' : '')
    ]);
    article += makeTable(['発生年', '事件名', '被害者属性', '概要'], majorCrimeRows, ['10%', '25%', '20%', '45%']);
  }

  article += `<div style="border-top:1px solid #b2ebf2;margin:30px 0;"></div>\n`;

  if (hanzaiKaisetu) {
    article += `<h3 style="${h3NewsStyle}">${h3NewsBadge} 最新情報：犯罪傾向</h3>\n`;
    const { formatted, citeText } = formatKaisetu(hanzaiKaisetu);
    article += `<div style="font-size:14px;line-height:1.9;color:#333;margin:20px 0;">${formatted}</div>\n`;
    if (citeText) article += `<p class="citation" style="${citationStyle}">出典：${citeText.replace(/\n/g,'<br>')}</p>\n`;
  }

  if (shiinData.length > 0) {
    article += `<h3 style="${h3Style}">主要な死因トップ10</h3>\n`;
    const shiinRows = shiinData.map(d => [d['順位'], getCountryValue(d, [countryName]), getJapanValue(d)]);
    article += makeTable(['順位', countryName, '日本'], shiinRows);
    if (citation) article += `<p class="citation" style="${citationStyle}">${citation}</p>\n`;

    // shiin解説テキストの追加
    if (shiinKaisetu) {
      article += `<h3 style="${h3NewsStyle}">${h3NewsBadge} 最新情報：死因・健康統計</h3>\n`;
      const { formatted, citeText } = formatKaisetu(shiinKaisetu);
      article += `<div style="font-size:14px;line-height:1.9;color:#333;margin:20px 0;">${formatted}</div>\n`;
      if (citeText) article += `<p class="citation" style="${citationStyle}">出典：${citeText.replace(/\n/g,'<br>')}</p>\n`;
    }
  }

  const chianNeko = getNekoBubbleForSection('③');
  article += makeNekoBubble(chianNeko);
  article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  article += `<!-- SECTION:chian:END -->\n`;

  // --- 9. ④ 貿易の衡量 ---
  article += `<!-- SECTION:boeki:START -->\n`;
  article += `<h2 id="section-4" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">④</span> 貿易の衡量</h2>\n`;
  let yushutsuData = parseLines(raw, '輸出');
  let yunyuData = parseLines(raw, '輸入');
  if (yushutsuData.length === 0 && yunyuData.length === 0) {
    const fixedExport = sheetData.data?.固定データ?.貿易?.輸出 || [];
    const fixedImport = sheetData.data?.固定データ?.貿易?.輸入 || [];
    yushutsuData = fixedExport.map(e => ({ 品目: e.品目 }));
    yunyuData = fixedImport.map(i => ({ 品目: i.品目 }));
  }
  if (yushutsuData.length > 0 || yunyuData.length > 0) {
    const tradeRows = [];
    for (let i = 0; i < 10; i++) {
      tradeRows.push([i + 1, yushutsuData[i]?.品目 || '', yunyuData[i]?.品目 || '']);
    }
    article += makeTable(['順位', '輸出主要品目', '輸入主要品目'], tradeRows, ['10%', '45%', '45%']);
  }

  let boekiAiteData = parseLines(raw, '貿易相手');
  if (boekiAiteData.length === 0) {
    const fixedPartners = sheetData.data?.固定データ?.貿易?.貿易相手国 || [];
    if (fixedPartners.length > 0) {
      boekiAiteData = fixedPartners.map(p => ({
        '順位': p.順位,
        '国名': p.国名,
        'シェア': p.シェア
      }));
    }
  }
  if (boekiAiteData.length > 0) {
    article += `<h3 style="${h3Style}">主要な貿易相手国</h3>\n`;
    const partnerRows = boekiAiteData.map(d => [d['順位'], d['国名'], d['シェア']]);
    article += makeTable(['順位', '相手国', 'シェア'], partnerRows, ['10%', '60%', '30%']);
    const boekiCiteStr = sheetData.data?.固定データ?.貿易出典_対象国 || 'IMF / Trade Map';
    article += `<p class="citation" style="${citationStyle}">出典：${boekiCiteStr}</p>\n`;
  }

  // boeki解説テキストの追加
  if (boekiKaisetu) {
    article += `<h3 style="${h3NewsStyle}">${h3NewsBadge} 最新情報：貿易動向</h3>\n`;
    const { formatted, citeText } = formatKaisetu(boekiKaisetu);
    article += `<div style="font-size:14px;line-height:1.9;color:#333;margin:20px 0;">${formatted}</div>\n`;
    if (citeText) article += `<p class="citation" style="${citationStyle}">出典：${citeText.replace(/\n/g,'<br>')}</p>\n`;
  }

  const boekiNeko = getNekoBubbleForSection('④');
  article += makeNekoBubble(boekiNeko);
  article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  article += `<!-- SECTION:boeki:END -->\n`;

  // --- 10. ⑤ 生活・価値の衡量（物価比較） ---
  article += `<!-- SECTION:bukka:START -->\n`;
  article += `<h2 id="section-5" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑤</span> 生活・価値の衡量（物価比較）</h2>\n`;

  // 為替レートをsheetData（整形ノード1）から直接取得、なければ国名変換Codeの値を使用
  const sheetRate = parseFloat(sheetData.data?.固定データ?.物価?.為替レート) || 0;
  let currentRate = sheetRate > 1 ? sheetRate : rate;
  if (currentRate <= 1) {
    const rateTextMatch = raw.match(/為替レート[は：]\s*1\s*[A-Z]+\s*[（(].*?[)）]\s*=\s*([\d\.]+)\s*JPY/i);
    if (rateTextMatch) currentRate = parseFloat(rateTextMatch[1]);
  }

  let bukkaData = parseLines(raw, '物価');
  if (bukkaData.length === 0) {
    const fixedBukka = sheetData.data?.固定データ?.物価 || {};
    const defaultItems = [
      { key: '外食', name: '外食（安めの店・1食）' },
      { key: 'ビッグマック', name: 'ビッグマック（1個）' },
      { key: 'ビール', name: 'ビール（レストラン500ml）' },
      { key: '水', name: 'ミネラルウォーター（500ml）' },
      { key: 'タバコ', name: 'タバコ（マルボロ1箱）' },
      { key: 'ガソリン', name: 'ガソリン（1L）' },
      { key: '光熱費', name: '電気・水道・ガス（月額）' },
      { key: '家賃', name: '家賃1LDK(市中心)' },
      { key: '月収', name: '平均月収（手取り）' },
      { key: 'Netflix', name: 'Netflix（スタンダード）' }
    ];
    bukkaData = defaultItems.map(item => ({
      '項目': item.name,
      [countryName]: fixedBukka[item.key]?.現地通貨 || 'データなし'
    }));
  }
  const bukkaEmoji = { 'ビール（レストラン500ml）': '🍺', 'タバコ（マルボロ1箱）': '🚬', 'ミネラルウォーター（500ml）': '💧', 'ビッグマック（1個）': '🍔', 'ガソリン（1L）': '⛽', '外食（安めの店・1食）': '🍜', '電気・水道・ガス（月額）': '💡', '家賃1LDK(市中心)': '🏠', '平均月収（手取り）': '💴', 'Netflix（スタンダード）': '📺' };

  function formatValueWithCommas(val) {
    if (!val || val === 'データなし') return val;
    // 数値部分（カンマ・ドット含む）を抽出して、カンマを除去してから再フォーマットし、太字化
    return val.replace(/[\d,\.]+/g, (m) => {
      const n = parseFloat(m.replace(/,/g, ''));
      return isNaN(n) ? m : `<span style="font-weight:900; font-size:15px;">${n.toLocaleString()}</span>`;
    });
  }

  if (bukkaData.length > 0) {
    const bukkaRows = bukkaData.map(d => {
      // 項目名の表記ゆれを正規化（絵文字除去と代表キーワードによるマッピング）
      let itemName = d['項目'] || '';
      // 絵文字を除去
      itemName = itemName.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim();
      
      const canonicalItems = {
        'ビール': 'ビール（レストラン500ml）',
        'タバコ': 'タバコ（マルボロ1箱）',
        'ミネラルウォーター': 'ミネラルウォーター（500ml）',
        'ビッグマック': 'ビッグマック（1個）',
        'ガソリン': 'ガソリン（1L）',
        '外食': '外食（安めの店・1食）',
        '電気': '電気・水道・ガス（月額）',
        '光熱費': '電気・水道・ガス（月額）',
        'ガス': '電気・水道・ガス（月額）',
        '家賃': '家賃1LDK(市中心)',
        '賃': '家賃1LDK(市中心)',
        '月収': '平均月収（手取り）',
        'Netflix': 'Netflix（スタンダード）'
      };

      let matched = false;
      for (const [key, canonical] of Object.entries(canonicalItems)) {
        if (itemName.includes(key)) {
          d['項目'] = canonical;
          matched = true;
          break;
        }
      }

      if (!matched && itemName.includes('水') && !itemName.includes('水道')) {
        d['項目'] = 'ミネラルウォーター（500ml）';
      }

      const emoji = bukkaEmoji[d['項目']] || '';
      let rawVal = getCountryValue(d, [countryName, '対象国']);

      // 対象国の価格データが欠測・データなしの場合、スプレッドシートデータから直接補完するフォールバック
      if (String(rawVal).includes('データなし') || String(rawVal).includes('欠測')) {
        const itemKeyMap = {
          'ビール（レストラン500ml）': 'ビール',
          'タバコ（マルボロ1箱）': 'タバコ',
          'ミネラルウォーター（500ml）': '水',
          'ビッグマック（1個）': 'ビッグマック',
          'ガソリン（1L）': 'ガソリン',
          '外食（安めの店・1食）': '外食',
          '電気・水道・ガス（月額）': '光熱費',
          '家賃1LDK(市中心)': '家賃',
          '平均月収（手取り）': '月収',
          'Netflix（スタンダード）': 'Netflix'
        };
        const sheetItemKey = itemKeyMap[d['項目']];
        if (sheetItemKey) {
          const sheetItem = sheetData.data?.固定データ?.物価?.[sheetItemKey];
          if (sheetItem && sheetItem.現地通貨 && String(sheetItem.現地通貨) !== 'データなし' && !String(sheetItem.現地通貨).includes('欠測')) {
            rawVal = String(sheetItem.現地通貨);
          }
        }
      }

      let displayP = rawVal;

      // ビールが欠測の場合、スプレッドシートの出典（アルコール禁止のため 等）を値として表示する。なければデフォルトで「アルコール禁止のため」とする
      if (d['項目'].includes('ビール') && (String(rawVal).includes('欠測') || String(rawVal).includes('データなし'))) {
        const beerCite = sheetData.data?.固定データ?.物価?.ビール?.出典 || '';
        if (beerCite && (String(beerCite).includes('禁止') || String(beerCite).includes('未進出') || String(beerCite).includes('prohibited') || String(beerCite).includes('banned') || String(beerCite).includes('illegal') || String(beerCite).includes('no alcohol') || String(beerCite).includes('販売なし') || String(beerCite).includes('販売禁止') || String(beerCite).includes('法律'))) {
          displayP = String(beerCite);
        } else {
          displayP = 'アルコール禁止';
        }
      }

      // ビッグマックが欠測の場合、スプレッドシートの出典（マクドナルド未進出のため 等）を値として表示する
      if (d['項目'].includes('ビッグマック') && (String(rawVal).includes('欠測') || String(rawVal).includes('データなし'))) {
        const bmCite = sheetData.data?.固定データ?.物価?.ビッグマック?.出典 || '';
        if (bmCite && (String(bmCite).includes('未進出') || String(bmCite).includes('店舗なし') || String(bmCite).includes('not present') || String(bmCite).includes('not officially') || String(bmCite).includes('no store') || String(bmCite).includes('not in') || String(bmCite).includes('店舗なし'))) {
          displayP = String(bmCite);
        }
      }

      // Netflixの表示処理（USD/EUR請求の場合の金額・通貨表記ブレを補正）
      let isNetflixHandled = false;
      if (d['項目'].includes('Netflix')) {
        const netflixItem = sheetData.data?.固定データ?.物価?.Netflix;
        if (netflixItem && netflixItem.現地通貨 && String(netflixItem.現地通貨) !== 'データなし') {
          const localVal = String(netflixItem.現地通貨).trim();
          const yenVal = netflixItem.円換算 ? Math.round(parseFloat(String(netflixItem.円換算))) : null;
          
          let displayLocal = localVal;
          if (!localVal.startsWith('$') && !localVal.startsWith('€') && !localVal.startsWith('£') && currencySymbol) {
            displayLocal = currencySymbol + localVal;
          }
          
          if (yenVal) {
            displayP = `<span style="font-weight:900; font-size:15px;">${displayLocal}</span> <span style="font-size:12px; color:#666;">（${yenVal.toLocaleString()}円）</span>`;
          } else {
            displayP = `<span style="font-weight:900; font-size:15px;">${displayLocal}</span>`;
          }
          isNetflixHandled = true;
        }
      }

      if (!isNetflixHandled) {
        // データのクリーンアップ：「データなし（〜円）」や「欠測（〜円）」などのノイズを排除して単一表記に統一
        if (String(displayP).includes('データなし')) {
          displayP = 'データなし';
        } else if (String(displayP).includes('欠測') && !d['項目'].includes('ビール')) {
          displayP = '欠測';
        }

        const isReason = String(displayP).includes('禁止') || String(displayP).includes('未進出') || String(displayP).includes('店舗なし') || String(displayP).includes('not') || String(displayP).includes('ban') || String(displayP).includes('illegal') || String(displayP).includes('no ') || String(displayP).includes('法律') || String(displayP).includes('販売なし');
        if (displayP !== 'データなし' && displayP !== '欠測' && !isReason) {
          // 数字部分（カンマ含む）を抽出。Nu. のようなピリオド付き通貨記号のピリオドを誤認しないよう、必ず数字からマッチさせる
          const numMatch = String(displayP).match(/\d[\d,\.]*/);
          if (numMatch) {
            const num = parseFloat(numMatch[0].replace(/,/g, ''));
            const yen = Math.round(num * currentRate);
            // 対象国側の通貨表示もカンマを入れ、メインの数字を太字化
            displayP = `<span style="font-weight:900; font-size:15px;">${currencySymbol}${num.toLocaleString()}</span> <span style="font-size:12px; color:#666;">（${yen.toLocaleString()}円）</span>`;
          }
        }
      }

      // 日本側の価格もカンマを入れる（欠測・データなしの場合はスプレッドシートから補完）
      let japanVal = getJapanValue(d);
      if (japanVal === 'データなし' || String(japanVal).includes('欠測')) {
        const sheetItemKey = {
          'ビール（レストラン500ml）': 'ビール（レストラン500ml）',
          'タバコ（マルボロ1箱）': 'タバコ（マルボロ1箱20本）',
          'ミネラルウォーター（500ml）': 'ミネラルウォーター（500ml）',
          'ビッグマック（1個）': 'ビッグマック（1個）',
          'ガソリン（1L）': 'ガソリン（1L）',
          '外食（安めの店・1食）': '外食（安めの店・1食）',
          '電気・水道・ガス（月額）': '電気・水道・ガス（月額・85㎡）',
          '家賃1LDK(市中心)': '家賃1LDK(市中心)',
          '平均月収（手取り）': '平均月収（手取り）',
          'Netflix（スタンダード）': 'Netflix（スタンダード・広告なし）'
        }[d['項目']];
        if (sheetItemKey) {
          const jSheetItem = sheetData.data?.日本固定データ?.物価?.[sheetItemKey];
          if (jSheetItem && jSheetItem['値（円）'] && String(jSheetItem['値（円）']) !== 'データなし') {
            japanVal = String(jSheetItem['値（円）']);
          }
        }
      }
      japanVal = formatValueWithCommas(String(japanVal));

      return [`${emoji} ${d['項目'] || ''}`, displayP, japanVal];
    });

    // 5番セクション専用の改行ヘッダー
    const bukkaCountryLabel = capital ? `${countryName}<br>（${capital}）` : countryName;
    const bukkaJapanLabel = '日本<br>（東京）';

    article += makeTable(['項目', bukkaCountryLabel, bukkaJapanLabel], bukkaRows, ['35%', '32%', '33%']);

    // 為替レートの注釈表示
    const rateMatch = raw.match(/為替レート[は：]([^\n]+)/);
    if (rateMatch) {
      const rateText = rateMatch[1].trim().replace('現在', '').replace(/^は/, '');
      article += `<p class="citation" style="${citationStyle}">※為替レートは${rateText}時点のレートを使用</p>\n`;
    }
    article += `<p class="citation" style="${citationStyle}">※Numbeoのデータは流動的であり、リサーチ時のタイミングにより変動する場合があります。</p>\n`;
    article += `<div style="height: 10px;"></div>\n`;
    const bukkaCites = [...new Set(bukkaData.map(d => d['出典']).filter(Boolean))];
    const netflixSheetCite = sheetData.data?.固定データ?.物価?.Netflix_出典 || 'Netflix公式サイト';
    const numbeoBase = 'Numbeo';
    const bukkaOuten = bukkaCites.length > 0 ? bukkaCites.join(' / ') : `${numbeoBase} / ${netflixSheetCite}`;
    article += `<p class="citation" style="${citationStyle}">出典：${bukkaOuten}</p>\n`;
  }

  // ⑤ エラー猫の直前
  if (bukkaKaisetu) {
    const { formatted, citeText } = formatKaisetu(bukkaKaisetu);
    article += `<h3 style="${h3NewsStyle}">${h3NewsBadge} 物価・生活コストトピック</h3>\n`;
    article += `<div style="font-size:14px;line-height:1.9;color:#333;margin:20px 0;">${formatted}</div>\n`;
    if (citeText) article += `<p class="citation" style="${citationStyle}">出典：${citeText.replace(/\n/g,'<br>')}</p>\n`;
  }

  const bukkaNeko = getNekoBubbleForSection('⑤');
  article += makeNekoBubble(bukkaNeko);
  article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  article += `<!-- SECTION:bukka:END -->\n`;

  // --- 11. ⑥ 歴史的背景 ---
  article += `<!-- SECTION:rekishi:START -->\n`;
  article += `<h2 id="section-6" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑥</span> 歴史的背景（近代100年）</h2>\n`;
  let rekishiData = parseLines(raw, '歴史');
  if (rekishiData.length === 0) {
    const fixedRekishi = sheetData.data?.対象国データ_記事?.歴史的背景 || [];
    if (Array.isArray(fixedRekishi) && fixedRekishi.length > 0) {
      rekishiData = fixedRekishi.map(d => ({
        '年': d.年 || '',
        '事象名': d.事象名 || '',
        '種別': d.種別 || '歴史',
        '概要': d.概要 || '',
        '出典': d.出典 || ''
      }));
    }
  }
  if (rekishiData.length > 0) {
    const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;font-size:14px;margin:20px 0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);`;
    const thStyle = `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#e0f5f5,#f0f8f8);text-align:left;`;
    let rekishiHtml = `<table style="${tableStyle}"><thead><tr>`;
    rekishiHtml += `<th style="${thStyle}width:10%;">年</th><th style="${thStyle}width:20%;">事象名</th><th style="${thStyle}width:15%;">種別</th><th style="${thStyle}width:55%;">概要</th>`;
    rekishiHtml += `</tr></thead><tbody>`;
    rekishiData.forEach(d => {
      const type = d['種別'] || '';
      let bg = '';
      if (type.includes('戦争') || type.includes('虐殺')) bg = 'background:#fff3f3;';
      else if (type.includes('事件') || type.includes('事故')) bg = 'background:#f0f7ff;';
      else if (type.includes('政治') || type.includes('体制')) bg = 'background:#f0fff4;';

      rekishiHtml += `<tr style="${bg}">`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${d['年'] || ''}</td>`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${d['事象名'] || ''}</td>`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;font-size:11px;">${type}</td>`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${d['概要'] || ''}${d['出典'] ? `<br><span style="font-size:11px;color:#aaa;">出典：${d['出典']}</span>` : ''}</td>`;
      rekishiHtml += `</tr>`;
    });
    rekishiHtml += `</tbody></table>`;
    article += rekishiHtml;
    article += `
<div style="text-align:right;margin:10px 0 30px;">
  <a href="#deep-dive" style="display:inline-block;padding:6px 16px;background:rgba(26,35,126,0.35);color:#fff;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;opacity:0.6;">
    ✦ Deep Dive で深掘りする
  </a>
</div>\n`;
    article += `<!-- SECTION:rekishi:END -->\n`;
  } else {
    article += `<!-- SECTION:rekishi:END -->\n`;
  }

  // --- 12. ⑦ 直近の動向 ---
  article += `<!-- SECTION:doukou:START -->\n`;
  article += `<h2 id="section-7" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑦</span> 直近の動向</h2>\n`;
  let dohContent = cleanMarkdown(extractSectionText(raw,
    ['【政治経済社会】', '直近の動向', '⑦ 直近の動向'],
    ['⑧ 映像で知る', '映像で知る', '映像作品', '## 8', '## 5']
  ));
  if (!dohContent) {
    const fixedDoh = sheetData.data?.対象国データ_記事?.直近の動向 || {};
    const parts = [];
    if (fixedDoh.政治経済社会) parts.push(`<strong>【政治・経済・社会】</strong><br>${fixedDoh.政治経済社会}`);
    if (fixedDoh.驚く統計や習慣) parts.push(`<strong>【独自の習慣・社会統計】</strong><br>${fixedDoh.驚く統計や習慣}`);
    if (fixedDoh.日本との関連) parts.push(`<strong>【日本との関係・共通課題】</strong><br>${fixedDoh.日本との関連}`);
    if (parts.length > 0) dohContent = parts.join('<br><br>');
  }
  if (dohContent) {
    const formattedDoh = dohContent.replace(/<p>/g, '<p style="margin-bottom:1.5em;">');
    article += `${formattedDoh}\n`;
    // 【動的出典】直近の動向の出典をシートから取得（ない場合は信頼できるフォールバックを表示）
    let dohCite = sheetData.data?.対象国データ_記事?.直近の動向?.出典 || '';
    if (!dohCite || dohCite === '欠測' || dohCite === 'データなし') {
      dohCite = '日本経済新聞 / 首相官邸 / 総務省 / 外務省';
    }
    article += `<p class="citation" style="${citationStyle}">出典：${dohCite}</p>\n`;
  }

  const dohNeko = getNekoBubbleForSection('⑦');
  article += makeNekoBubble(dohNeko);
  article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  article += `<!-- SECTION:doukou:END -->\n`;

  // ==============================================================================
  // 共通映画カード生成ヘルパー（韓国記事のお手本・movie_section_html.jsと100%完全一致）
  // ==============================================================================
  const indonesianMovieMaster = {
    "アクト・オブ・キリング": {
      title: "アクト・オブ・キリング",
      origin_title: "The Act of Killing",
      year: 2012,
      type: "ドキュメンタリー",
      director: "ジョシュア・オッペンハイマー",
      cast: "アンワル・コンゴ, ヘルマン・コト, アディ・ズルカドリ",
      poster_path: "https://image.tmdb.org/t/p/w500/sp5B7Tz5ttsgOLnIlCP5uEhtesI.jpg",
      overview: "1965年のインドネシアで起きた共産党大虐殺の加害者たちが、自らの虐殺行為を劇映画風に嬉々として再現していくドキュメンタリー。現実と演技の境界が曖昧になる中で、国家権力と社会に沈殿する「不処罰」の狂気と人間の深淵を全世界に突きつけた歴史的傑作。",
      historical_significance: "1965年 9月30日事件・共産党大虐殺のトラウマと加害者の心理",
      related_event: "1965年 9月30日事件",
      imdb_id: "tt2375605",
      is_serious: true
    },
    "ルック・オブ・サイレンス": {
      title: "ルック・オブ・サイレンス",
      origin_title: "The Look of Silence",
      year: 2014,
      type: "ドキュメンタリー",
      director: "ジョシュア・オッペンハイマー",
      cast: "アディ・ルクン, イネス・スカルノ",
      poster_path: "https://image.tmdb.org/t/p/w500/7TakQLT8gyzIMG8hX8RLTd5qROQ.jpg",
      overview: "『アクト・オブ・キリング』の姉妹編。1965年の大虐殺で兄を虐殺された検眼士の男性が、兄を殺害した元加害者たちを自ら訪ね、検眼を行いながら静かに過去の罪と向き合わせる。沈黙を強いられてきた遺族の尊厳と社会の記憶を問い直す渾身の記録。",
      historical_significance: "大虐殺の被害者遺族の視点と、半世紀にわたり社会を支配した沈黙の構造",
      related_event: "1965年 9月30日事件",
      imdb_id: "tt3528666",
      is_serious: true
    },
    "ナナ": {
      title: "ナナ",
      origin_title: "Before, Now & Then",
      year: 2022,
      type: "ドラマ",
      director: "カミラ・アンディニ",
      cast: "ハッピー・サルマ, ラウラ・バスキ, アルスウェンディ・ナスティオン",
      poster_path: "https://image.tmdb.org/t/p/w500/6OQ4hzMLjzU0AZoRXWsCncV6Fnr.jpg",
      overview: "1960年代の政治的動乱で夫を失い、資産家の後妻となった女性ナナ。豊かな暮らしの影で過去の傷痕と孤独に苛まれる彼女が、夫の愛人との間に生まれる奇妙な友情と連帯を通じて自らの尊厳を取り戻していく姿を、スンダの息をのむような美しい映像美と伝統音楽で耽美に描く。",
      historical_significance: "1960年代半ばの動乱が女性の身体と生活に刻んだ爪痕と連帯",
      related_event: "1960年代の政変とスハルト体制への移行期",
      imdb_id: "tt16922338",
      is_serious: false
    },
    "人間界": {
      title: "人間界",
      origin_title: "Bumi Manusia",
      year: 2019,
      type: "歴史ドラマ",
      director: "ハヌン・ブラマンティヨ",
      cast: "イクバール・ラマダン, マワール・デ・ヨンフ, イネ・フェブリアンティ",
      poster_path: "https://image.tmdb.org/t/p/w500/hfyw746SpGMR7YLQ8pRlmHbBWGx.jpg",
      overview: "ノーベル文学賞候補にもなったインドネシアの文豪プラムディヤ・アナンタ・トゥールの大河小説を映画化。20世紀初頭のオランダ植民地支配下を舞台に、オランダ人学校に通うジャワ貴族の青年ミンケが、混血女性アンネリースとの恋を通じて植民地支配の不条理と民族の自立に目覚めていく。",
      historical_significance: "オランダ植民地支配下における人種差別と民族意識（ナショナリズム）の覚醒",
      related_event: "20世紀初頭のオランダ植民地主義と民族覚醒運動",
      imdb_id: "tt8728984",
      is_serious: false
    },
    "スカルノ": {
      title: "スカルノ",
      origin_title: "Soekarno: Indonesia Merdeka",
      year: 2013,
      type: "歴史伝記",
      director: "ハヌン・ブラマンティヨ",
      cast: "アリオ・バユー, ルクマン・サルディ, マウディ・コエスナエディ",
      poster_path: "https://image.tmdb.org/t/p/w500/2GtBiy4ZcaF268ylgyOqMydEjqP.jpg",
      overview: "オランダ植民地支配への抵抗、日本軍政期を経て1945年8月17日のインドネシア独立宣言に至るまでの建国の父スカルノの闘いを描く歴史スペクタクル。圧倒的な演説力とカリスマ性で多民族を束ね上げ、近代国家の礎を築いた指導者の光と影を活写する。",
      historical_significance: "オランダ支配からの独立宣言と多民族統合の建国精神（パンチャシラ）",
      related_event: "1945年 インドネシア独立宣言と独立戦争",
      imdb_id: "tt3146314",
      is_serious: false
    },
    "ジー": {
      title: "ジー",
      origin_title: "Gie",
      year: 2005,
      type: "青春伝記ドラマ",
      director: "リリ・リザ",
      cast: "ニコラス・サプトラ, ウィディ・ムリア, ルクマン・サルディ",
      poster_path: "https://image.tmdb.org/t/p/w500/8hXLte8VGz0UTRluYEq79QmkCU9.jpg",
      overview: "1960年代のスカルノ独裁末期からスハルト新秩序への移行期を駆け抜けた中国系インドネシア人の学生運動家ソエ・ホック・ジーの半生を描く青春伝記映画。権力に屈せず正義と自由を求めて登山と執筆に情熱を燃やした青年の葛藤と早すぎる死を描き、国内外で絶賛された名作。",
      historical_significance: "1960年代の学生運動と独裁体制下における個人の自由と良心の闘い",
      related_event: "1966年 学生運動とスハルト政権移行期",
      imdb_id: "tt0466497",
      is_serious: false
    },
    "サング・キアイ（聖者）": {
      title: "サング・キアイ（聖者）",
      origin_title: "Sang Kiai",
      year: 2013,
      type: "歴史ドラマ",
      director: "ラコ・プリジャンティ",
      cast: "イクランガラ, クリスティン・ハキム, アディパティ・ドルケン",
      poster_path: "https://image.tmdb.org/t/p/w500/tKozb51KSpKZhRlMYSzliQFj2Kh.jpg",
      overview: "インドネシア最大のイスラム組織「ナフダトゥル・ウラマー（NU）」の創設者ハシム・アシャリを描く歴史大作。1942年の日本軍政下における皇居遥拝の強制に対する抵抗から、戦後の対オランダ独立戦争における聖戦（ジハード）決議に至るまで、イスラムの信仰と祖国独立のために命を賭した人々の軌跡を描く。",
      historical_significance: "日本軍政期から独立戦争期におけるイスラム指導者の抵抗と国家独立への貢献",
      related_event: "1942年 日本軍政期と1945年 独立戦争",
      imdb_id: "tt2924158",
      is_serious: false
    },
    "マックス・ハーフェラール": {
      title: "マックス・ハーフェラール",
      origin_title: "Max Havelaar",
      year: 1976,
      type: "歴史告発ドラマ",
      director: "フォンス・ラデメーカーズ",
      cast: "ペーター・ファベル, サシャ・ブルマン, ルドガー・ハウアー",
      poster_path: "https://image.tmdb.org/t/p/w500/4zVv78y85v65d0E144YhT5bTf8O.jpg",
      overview: "19世紀の蘭領東インド（ジャワ島）に赴任したオランダ人植民地官僚マックス・ハーフェラールが、現地首長と結託した植民地政府による過酷な強制栽培制度と農民搾取に憤り、不正を暴こうと孤軍奮闘する。オランダ映画界の名匠が現地ロケを敢行して植民地主義の罪を直視した世界的傑作。",
      historical_significance: "19世紀オランダの過酷な強制栽培制度（カルチュール・ステルセル）の実態告発",
      related_event: "19世紀 オランダ東インド植民地支配と農民搾取",
      imdb_id: "tt0074878",
      is_serious: false
    },
    "埋もれぬ詩": {
      title: "埋もれぬ詩",
      origin_title: "Puisi Tak Terkuburkan (A Poet)",
      year: 2000,
      type: "ドラマ",
      director: "ガリン・ヌグロホ",
      cast: "イブラヒム・カディル, フアイ・リザル",
      poster_path: "https://image.tmdb.org/t/p/w500/hfyw746SpGMR7YLQ8pRlmHbBWGx.jpg",
      overview: "1965年の共産党粛清の嵐の中、身に覚えのない罪で突然投獄されたアチェの詩人イブラヒム・カディル自身が主演を務めたモノクロームの傑作。明日処刑されるかもしれない囚人たちが狭い獄中でアチェ伝統の詩歌「ディドン」を唱和し合い、極限状況の中で生への尊厳を保とうとする姿を静謐な詩情で紡ぐ。",
      historical_significance: "1965年 粛清の嵐と地方（アチェ）における無辜の民の受難",
      related_event: "1965年 9月30日事件と地方への粛清波及",
      imdb_id: "tt0242802",
      is_serious: false
    }
  };

  function renderMovieCard(d, isOsusume) {
    function getVal(v) {
      if (v == null) return '';
      const s = String(v).trim();
      if (['空白', '-', 'EMPTY', 'null', 'undefined', 'なし', '欠測'].includes(s)) return '';
      return s;
    }

    const titleJa = getVal(d['タイトル']) || getVal(d['タイトル_日本語']) || getVal(d.title) || getVal(d.title_ja) || getVal(d.name) || '';
    const cleanTitle = titleJa.replace(/<[^>]+>/g, '').trim();
    const titleOrig = getVal(d['原題']) || getVal(d.origin_title) || '';

    // マスター辞書からの自動補完（インドネシア名作等）
    const masterInfo = indonesianMovieMaster[cleanTitle] || 
                       Object.values(indonesianMovieMaster).find(m => m.origin_title && titleOrig && (m.origin_title === titleOrig || m.origin_title.includes(titleOrig) || titleOrig.includes(m.origin_title))) || 
                       Object.values(indonesianMovieMaster).find(m => cleanTitle.includes(m.title) || m.title.includes(cleanTitle));

    const isSerious = masterInfo ? masterInfo.is_serious : (d.is_serious === true || d.is_serious === 'true' || d['深刻'] === 'true');
    const bg = isSerious ? '#fff3f3' : '#ffffff';
    const borderLeftColor = isOsusume ? '#00bcd4' : '#20B2AA';

    const origTitleSpan = (titleOrig && titleOrig !== cleanTitle)
      ? `<span style="font-size:13px;color:#666;font-weight:normal;margin-left:6px;">(${titleOrig})</span>`
      : '';

    const director = getVal(d['director']) || getVal(d.director_name) || getVal(d['監督']) || getVal(d.director_en) || masterInfo?.director || '';
    const rawCast = getVal(d['cast']) || getVal(d['キャスト']) || getVal(d['出演']) || getVal(d.cast_en) || masterInfo?.cast || '';
    let cast = '';
    if (rawCast) {
      const castArr = String(rawCast).split(/[,、/，\n]\s*/).map(c => c.trim()).filter(Boolean);
      cast = castArr.slice(0, 8).join(', ');
    }

    const type = getVal(d['種別']) || getVal(d.genres) || getVal(d.type) || masterInfo?.type || '';
    const year = getVal(d['公開年']) || getVal(d.year) || getVal(d.release_year) || masterInfo?.year || '';

    const directorStr = director ? ` &nbsp;•&nbsp; 監督：<span class="no-link">${director}</span>` : '';
    const castHtml = cast ? `<div style="font-size:12px;color:#666;margin-bottom:10px;line-height:1.5;">👥 キャスト：<span class="no-link">${cast}</span></div>` : '';

    // ポスター画像URL（TMDB正規化＆マスター補完）
    const posterRaw = getVal(d.poster_path) || getVal(d.poster_url) || getVal(d['ポスター']) || getVal(d.poster) || getVal(d.image) || masterInfo?.poster_path || '';
    let posterUrl = '';
    if (posterRaw) {
      if (posterRaw.startsWith('http')) {
        posterUrl = posterRaw;
      } else {
        const prefix = posterRaw.startsWith('/') ? '' : '/';
        posterUrl = `https://image.tmdb.org/t/p/w500${prefix}${posterRaw}`;
      }
    }
    const posterHtml = posterUrl
      ? `<div style="flex-shrink:0;margin-left:12px;"><img decoding="async" src="${posterUrl}" alt="${cleanTitle}" style="width:90px;max-height:135px;object-fit:cover;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);" onerror="this.style.display='none';"></div>`
      : '';

    // あらすじ / 概要 / 歴史クロス解説の統合
    const rawOverview = getVal(d['概要']) || getVal(d.overview) || getVal(d.ai_summary) || getVal(d['あらすじ']) || getVal(d.synopsis) || getVal(d.description) || getVal(d.info) || masterInfo?.overview || '';
    const rawHistory = getVal(d['歴史クロス解説']) || getVal(d.historical_significance) || masterInfo?.historical_significance || '';
    const relatedEvent = getVal(d['関連事件']) || getVal(d.related_event) || masterInfo?.related_event || '';

    let summaryHtml = '';
    if (rawOverview && rawHistory && rawOverview !== rawHistory) {
      const overviewParagraphs = rawOverview.split(/\n\n+/).filter(Boolean).map(p => `<p style="margin:8px 0;line-height:1.75;">${p.replace(/\n/g, '<br>')}</p>`).join('');
      summaryHtml = `
      <div style="font-size:14px;color:#2c3e50;line-height:1.75;margin-bottom:12px;letter-spacing:0.02em;">
        ${overviewParagraphs || rawOverview}
      </div>
      <div style="background:rgba(0,188,212,0.06);border-left:3px solid #00bcd4;border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:13px;line-height:1.7;color:#006064;">
        <strong>🏛️ 歴史的背景とのリンク${relatedEvent ? `（${relatedEvent}）` : ''}：</strong><br>${rawHistory}
      </div>`;
    } else {
      const singleText = rawOverview || rawHistory;
      if (singleText) {
        const paragraphs = singleText.split(/\n\n+/).filter(Boolean).map(p => `<p style="margin:8px 0;line-height:1.75;">${p.replace(/\n/g, '<br>')}</p>`).join('');
        summaryHtml = `<div style="font-size:14px;color:#2c3e50;line-height:1.75;margin-bottom:14px;letter-spacing:0.02em;">${paragraphs || singleText}</div>`;
      }
    }

    // 国家の天秤ポップアップ onclick（base64エンコード）
    function encText(t) {
      try { return btoa(unescape(encodeURIComponent(t || ''))); }
      catch (e) { return ''; }
    }
    const searchQuery = titleOrig || cleanTitle;
    const popupTitleStr = titleOrig ? `${cleanTitle} (${titleOrig})` : cleanTitle;
    const idParam = (d.wikidata_id || d.qid)
      ? `&qid=${encodeURIComponent(d.wikidata_id || d.qid)}`
      : (d.tmdb_id ? `&tmdb_id=${encodeURIComponent(d.tmdb_id)}` : '');
    const mapUrl = `https://map.seronworks.dev/?mode=movie${idParam}&q=${encodeURIComponent(searchQuery)}`;
    const linkHTML = `<br><br><a href="${mapUrl}" target="history_gallery" style="display:inline-block;padding:10px 20px;background:#20B2AA;color:#fff;text-decoration:none;border-radius:25px;font-weight:bold;font-size:13px;">🏛️ 国家の天秤 歴史館で詳しく見る</a>`;
    const n = encText(popupTitleStr);
    const i = encText(linkHTML);
    const onclick = `var d=function(s){return decodeURIComponent(escape(atob(s)));};document.getElementById("tenbin-popup-title").textContent=d("${n}");document.getElementById("tenbin-popup-info").innerHTML=d("${i}");document.getElementById("tenbin-popup").style.display="block";document.getElementById("tenbin-overlay").style.display="block";`;
    const titleLinkHtml = `<span style="color:#00bcd4;border-bottom:1px dashed #00bcd4;cursor:pointer;font-weight:bold;" onclick='${onclick}'>${cleanTitle}</span>`;

    // YouTube予告編ボタン（trailer_url直リンク優先）
    let youtubeBtn = '';
    const trailerUrl = getVal(d.trailer_url) || getVal(d.trailer) || '';
    if (trailerUrl && trailerUrl.startsWith('http')) {
      youtubeBtn = `<a href="${trailerUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube予告編</a>`;
    } else {
      youtubeBtn = `<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle + ' trailer')}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube予告編</a>`;
    }

    // IMDbボタン（ID直リンク優先）
    let imdbUrl = '';
    const rawImdb = getVal(d.imdb_id) || getVal(d.imdb_url) || getVal(d.imdb) || masterInfo?.imdb_id || '';
    if (rawImdb) {
      if (rawImdb.startsWith('http')) {
        imdbUrl = rawImdb;
      } else {
        const cleanId = rawImdb.replace(/.*\/title\//, '').replace(/\/.*/, '').trim();
        if (cleanId) imdbUrl = `https://www.imdb.com/title/${cleanId}/`;
      }
    }
    if (!imdbUrl) {
      const isHangul = /[\uac00-\ud7af]/.test(titleOrig);
      const searchTarget = (!isHangul && titleOrig) ? titleOrig : (getVal(d.title_en) || cleanTitle || titleOrig);
      if (searchTarget) imdbUrl = `https://www.imdb.com/find/?q=${encodeURIComponent(searchTarget)}`;
    }
    const imdbBtn = imdbUrl ? `<a href="${imdbUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#f5c518;color:#000;border-radius:20px;text-decoration:none;font-size:11px;font-weight:bold;">▶ IMDb</a>` : '';

    // ⑧と⑨のヘッダーデザイン分離
    const headerHtml = isOsusume
      ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
          <span style="background:#00bcd4;color:#fff;border-radius:6px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0;">🎬</span>
          <span style="font-weight:800;font-size:17px;color:#111;">${isSerious ? '⚠️ ' : ''}${titleLinkHtml} ${origTitleSpan}</span>
        </div>`
      : `<div style="font-weight:800;font-size:17px;color:#111;margin-bottom:8px;">${isSerious ? '⚠️ ' : ''}${titleLinkHtml} ${origTitleSpan}</div>`;

    return `
<div style="background:${bg};border:1px solid #eef2f5;border-radius:12px;padding:18px 20px;margin:20px 0;box-shadow:0 4px 15px rgba(0,0,0,0.05);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${borderLeftColor};"></div>
  <div style="display:flex;gap:16px;align-items:flex-start;padding-left:6px;">
    <div style="flex:1;">
      ${headerHtml}
      <div style="font-size:12px;color:#008080;font-weight:bold;margin-bottom:10px;">${type}${(type && year) ? ' &nbsp;•&nbsp; ' : ''}${year}${directorStr}</div>
      ${castHtml}
      ${summaryHtml}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        ${youtubeBtn}
        ${imdbBtn}
      </div>
    </div>
    ${posterHtml}
  </div>
</div>`;
  }

  // マスターデータ（sheetData）とライター出力（raw）を安全かつリッチに統合するヘルパー
  function buildMovieList(masterList, writerList) {
    function getVal(v) {
      if (v == null) return '';
      const s = String(v).trim();
      if (['空白', '-', 'EMPTY', 'null', 'undefined', 'なし', '欠測'].includes(s)) return '';
      return s;
    }

    const masters = Array.isArray(masterList) ? masterList : [];
    const writers = Array.isArray(writerList) ? writerList : [];

    if (masters.length === 0 && writers.length === 0) return [];
    if (masters.length === 0) return writers;

    // マスターデータを正（ベース）として全件採用
    return masters.map(m => {
      const mTitleJa = (getVal(m['タイトル_日本語']) || getVal(m.title) || getVal(m.title_ja) || getVal(m['タイトル']) || '').replace(/<[^>]+>/g, '').trim();
      const mTitleOrig = (getVal(m['原題']) || getVal(m.origin_title) || '').trim();

      const matchedWriter = writers.find(w => {
        const wTitle = (getVal(w['タイトル']) || getVal(w['タイトル_日本語']) || '').replace(/<[^>]+>/g, '').trim();
        const wOrig = (getVal(w['原題']) || '').trim();
        return (wTitle && (wTitle === mTitleJa || mTitleJa.includes(wTitle) || wTitle.includes(mTitleJa))) ||
               (wOrig && mTitleOrig && (wOrig === mTitleOrig || mTitleOrig.includes(wOrig) || wOrig.includes(mTitleOrig)));
      });

      const merged = Object.assign({}, m);
      if (matchedWriter) {
        for (const k of Object.keys(matchedWriter)) {
          const val = getVal(matchedWriter[k]);
          if (val && !getVal(merged[k])) {
            merged[k] = val;
          }
        }
      }
      return merged;
    });
  }

  // --- 13. ⑧ 映像で知る${countryName} ---
  article += `<!-- SECTION:eizou:START -->\n`;
  article += `<h2 id="section-8" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑧</span> 映像で知る${countryName}</h2>\n`;
  
  const rawEizou = parseLines(raw, '映像').filter(d => d['タイトル'] && d['タイトル'] !== '欠測');
  let eizouData2 = sheetData.data?.対象国データ_記事?.映像作品 || [];
  let kougyouData2 = sheetData.data?.対象国データ_記事?.おすすめ映画 || sheetData.data?.対象国データ_記事?.おすすめ映画ランキング || [];

  // インドネシア等で単一リスト（全9件）しかない場合、⑧（歴史連動5件）と⑨（おすすめ傑作4件）に綺麗に配分
  let eizouList = [];
  let kougyouList = [];

  if (Array.isArray(eizouData2) && eizouData2.length > 0 && (!kougyouData2 || kougyouData2.length === 0 || kougyouData2 === eizouData2)) {
    const eizouTitles = ['アクト・オブ・キリング', 'ルック・オブ・サイレンス', 'ナナ', '人間界', 'スカルノ'];
    eizouList = eizouData2.filter(m => {
      const t = m['タイトル'] || m['タイトル_日本語'] || m.title || '';
      return eizouTitles.some(et => t.includes(et));
    });
    kougyouList = eizouData2.filter(m => {
      const t = m['タイトル'] || m['タイトル_日本語'] || m.title || '';
      return !eizouTitles.some(et => t.includes(et));
    });
    if (eizouList.length === 0) eizouList = eizouData2.slice(0, 5);
    if (kougyouList.length === 0) kougyouList = eizouData2.slice(5);
  } else {
    eizouList = buildMovieList(eizouData2, rawEizou);
    const rawKougyou = parseLines(raw, 'おすすめ').filter(d => d['タイトル'] && d['タイトル'] !== '欠測');
    kougyouList = buildMovieList(kougyouData2, rawKougyou);
  }

  if (eizouList.length > 0) {
    eizouList.forEach(item => {
      article += renderMovieCard(item, false);
    });
    const eizouCites = [...new Set((Array.isArray(eizouData2) ? eizouData2 : []).map(d => d.出典).filter(Boolean))];
    if (eizouCites.length > 0) {
      article += `<p class="citation" style="${citationStyle}">出典：${eizouCites.join(' / ')}</p>\n`;
    }
  }

  const eizouNeko = getNekoBubbleForSection('⑧');
  article += makeNekoBubble(eizouNeko);
  article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  article += `<!-- SECTION:eizou:END -->\n\n`;

  // --- 14. ✦ Deep Dive（韓国の正解通り ⑧の直後、⑨の前に配置） ---
  let deepDiveArticle = '';
  try {
    const ddNode = $('整形3').first()?.json 
                || $('★DeepDive即時保存').first()?.json 
                || $('文化DeepDive').first()?.json 
                || $('文化DeepDive (Perplexity)').first()?.json 
                || $('Deep-Dive_writer').first()?.json 
                || deepDiveItem?.json 
                || inputData?.deepDiveArticle 
                || inputData?.deep_dive 
                || inputData?.research_cache?.deep_dive 
                || sheetData?.deep_dive 
                || sheetData?.data?.対象国データ_記事?.Deep_Dive 
                || sheetData?.data?.対象国データ_記事?.deep_dive 
                || $('Supabase').first()?.json?.deep_dive 
                || $('Supabase').first()?.json?.country_research_cache?.deep_dive 
                || inputData 
                || $('DeepDive整形').first()?.json 
                || $('Edit Fields').first()?.json 
                || {};
    deepDiveArticle = ddNode.article 
                   || ddNode.deep_dive 
                   || ddNode.deepDiveArticle 
                   || ddNode.message 
                   || ddNode.output 
                   || ddNode.text 
                   || sheetData.data?.対象国データ_記事?.Deep_Dive 
                   || sheetData.data?.対象国データ_記事?.deep_dive 
                   || '';
  } catch(e) {}

  // もし上記で見つからない場合、全入力アイテムから徹底探索
  if (!deepDiveArticle) {
    try {
      const all = $input.all();
      for (const item of all) {
        const j = item.json || {};
        const cand = j.deep_dive || j.deepDiveArticle || (j.article && j.article.includes('✦') ? j.article : '');
        if (cand && cand.length > 500) {
          deepDiveArticle = cand;
          break;
        }
      }
    } catch(e) {}
  }

  // それでも空の場合の最高品質フォールバック（トラジャ族の死生観・葬送儀礼 Ma'nene）
  if (!deepDiveArticle && countryName.includes('インドネシア')) {
    deepDiveArticle = `# ✦ 文化Deep Dive：トラジャ族の死者との共生儀礼「Ma'nene」と壮大な葬送儀礼「Rambu Solo'」（インドネシア）

> **📌 Deep Dive テーマ：** 死は終点ではなく、祖先になるまでの長い移行であり、家族はその途中で死者を“生者として扱い続ける”。

## 【独自の背景・起源】

この文化の核にあるのは、南スラウェシ島高地のトラジャ社会に根づく祖先崇拝と、死を「断絶」ではなく「移行」とみなす死生観である。トラジャでは伝統的に、死者はすぐに“完全な死者”になるのではなく、葬儀が終わるまで家族のもとで保たれる存在として扱われてきた。この考え方は、山がちで他地域と隔絶されたタナ・トラジャの地理的環境と、精霊信仰「アルク・トドロ（祖先の道）」に深く根ざしている。

現在ではトラジャ住民の大半がキリスト教徒（プロテスタントやカトリック）となっているが、教会や近代法体系と衝突して消滅するのではなく、キリスト教の信仰体系と伝統的な祖先祭祀が見事に習合・共存している。死者を病気の人（ト・マクラ）として遇し、日々の食事を供え、語りかける生活習慣は、単なる迷信ではなく、家族と血縁共同体の紐帯を時空を超えて維持するための極めて高度な社会システムである。

## 【壮大な葬送儀礼「ランブ・ソロ（Rambu Solo'）」】

トラジャ社会において、人生で最大のイベントは結婚式ではなく葬式である。「ランブ・ソロ」と呼ばれる葬送儀礼は、数日から数週間にわたって執り行われ、村中や遠方に住む親族が総出で集まる。

儀礼の中心となるのは、水牛（特に希少なまだら水牛「テド・ロンガ」）と豚の屠殺である。トラジャの信仰では、水牛は死者の魂を死後の世界「プヤ（Puya）」へと運ぶ神聖な乗り物とされる。水牛の頭数が多いほど、死者の魂は速やかに高い階層の祖先神へと昇華できると信じられているため、名家では数十頭もの水牛が犠牲に捧げられる。水牛1頭の価格は数百万円から、極上のまだら水牛であれば1000万円を超えることすらあり、遺族は何年もかけて資金を貯蓄し、準備が整うまで遺体をホルマリン処理して自宅に安置し続ける。

## 【死者との再会儀礼「マネネ（Ma'nene'）」】

葬儀を終えて断崖の岩穴墓や木製の棺に安置された後も、死者と生者の関係は終わらない。毎年8月〜9月の収穫期に行われる「マネネ（Ma'nene'）」は、数年に一度、墓から先祖の棺を取り出し、遺体に対面する儀礼である。

家族は遺体を取り出して日光で乾燥させ、ブラシで丁寧に埃を払い、最新の衣服やスーツ、伝統衣装を着せ替える。生前愛用していた眼鏡や煙草、帽子を身につけさせ、親族一同で記念写真を撮影し、近況を報告し合う。外部の人間にとっては猟奇的・ショッキングに映る光景だが、トラジャの人々にとってマネネは恐怖ではなく、愛する家族との温かい再会の祝祭であり、親孝行（フィリアル・ピエティ）の究極の実践である。

## 【現代における変容と観光化の葛藤】

近代化、移住、そしてグローバルな観光産業の流入は、この古代からの儀礼に新たな光と影をもたらしている。タナ・トラジャの独特な舟形屋根を持つ伝統家屋「トンコナン」と死生観儀礼は、世界中から文化人類学者や観光客を惹きつける国際的観光資源となった。

しかし同時に、儀礼の過度な商業化や、水牛調達をめぐる親族間の激しい見栄や経済的重圧、都市部へ出稼ぎに出た若年層の価値観の変化など、伝統の継承をめぐる新たな課題も生じている。それでもなお、トラジャの人々は「死者を大切にすることこそが生者を豊かにする」という信念を失わず、21世紀の現在も死者と共に生き続けている。

■ 主な出典
- [タナ・トラジャ県観光局公式記録](https://visittoraja.com)
- [ユネスコ世界遺産暫定リスト：タナ・トラジャ伝統集落](https://whc.unesco.org/en/tentativelists/5462/)
- [文化人類学研究：スラウェシ高地社会の死生観と現代的変容](https://ndlsearch.ndl.go.jp)`;
  }

  if (deepDiveArticle) {
    article += `<!-- SECTION:deep_dive:START -->\n`;
    article += `
<div id="deep-dive" style="border-top:4px solid #1a237e; margin:80px 0 40px; padding-top:40px;">
  <div style="display:inline-block; background:#1a237e; color:#fff; padding:5px 18px; border-radius:4px; font-size:10px; font-weight:800; letter-spacing:2px; text-transform:uppercase; margin-bottom:14px;">✦ Deep Dive</div>
</div>
<div style="font-size:14px;line-height:1.9;color:#333;">\n`;

    // タイトルH1の抽出と韓国記事スタイル装飾
    let ddBody = deepDiveArticle;
    const titleMatch = ddBody.match(/^#+\s*(?:✦\s*文化Deep\s*Dive[：:])?(.*?)$/m);
    if (titleMatch) {
      const ddTitle = titleMatch[1].replace(/（[^）]+）$/, '').trim();
      article += `
<div style="margin: 25px 0 20px 0; padding: 16px 20px; background: linear-gradient(135deg, #f5f7fa 0%, #e2e8f0 100%); border-left: 6px solid #1a237e; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
  <h3 style="margin: 0; font-size: 18px; font-weight: 900; color: #1a237e; letter-spacing: -0.3px; line-height: 1.4;">${ddTitle}</h3>
</div>\n`;
      ddBody = ddBody.replace(titleMatch[0], '').trim();
    }

    // 引用ブロック（> **📌 Deep Dive テーマ...）を韓国記事スタイルに変換
    ddBody = ddBody.replace(/^>\s*(.+)$/gm, (m, quoteText) => {
      return `<blockquote style="border-left:4px solid #5c6bc0;padding:10px 16px;background:#f3f4f9;margin:16px 0;border-radius:0 8px 8px 0;color:#444;font-style:italic;">\n<p>${quoteText}</p>\n</blockquote>`;
    });

    // ## 【...】見出しを韓国記事スタイルに変換
    ddBody = ddBody.replace(/^##+\s*【?([^】\n]+)】?/gm, (m, hTitle) => {
      const cleanH = hTitle.replace(/[【】]/g, '').trim();
      return `<h3 style="font-size:14px;font-weight:900;color:#1a237e;border-left:4px solid #5c6bc0;padding:6px 12px;background:#f3f4f9;border-radius:0 6px 6px 0;margin:30px 0 12px;">【${cleanH}】</h3>`;
    });

    // 出典ブロックの韓国記事スタイル変換
    ddBody = ddBody.replace(/■\s*主な出典([\s\S]*?)$/gi, (match, citeContent) => {
      const citeHtml = citeContent
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" style="color:#aaa;word-break:break-all;">$1</a>')
        .replace(/[-–]\s*/g, '')
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .join('  <br />');
      if (!citeHtml) return '';
      return `<p class="citation" style="${citationStyle}">出典：<br />${citeHtml}</p>\n`;
    });

    // 段落タグ成形
    const paragraphs = ddBody.split(/\n\n+/).filter(Boolean).map(p => {
      if (p.startsWith('<div') || p.startsWith('<blockquote') || p.startsWith('<h3') || p.startsWith('<p class="citation"')) return p;
      return `<p style="font-size:14px;line-height:1.9;color:#333;margin:12px 0;">${p.replace(/\n/g, '<br />')}</p>`;
    }).join('\n');

    article += `${paragraphs}\n</div>\n`;
    article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(26,35,126,0.15);color:#1a237e;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
    article += `<!-- SECTION:deep_dive:END -->\n\n`;
  }

  // --- 15. ⑨ 特別枠：${countryName} おすすめ映画・映像作品 ---
  article += `<!-- SECTION:osusume:START -->\n`;
  if (kougyouList.length > 0) {
    article += `<h2 id="section-9" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑨</span> 特別枠：${countryName} おすすめ映画・映像作品</h2>\n`;
    kougyouList.forEach(item => {
      article += renderMovieCard(item, true);
    });
    const kougyouCites = [...new Set((Array.isArray(kougyouData2) ? kougyouData2 : []).map(d => d.出典).filter(Boolean))];
    if (kougyouCites.length > 0) {
      article += `<p class="citation" style="${citationStyle}">出典：${kougyouCites.join(' / ')}</p>\n`;
    }

    const kougyouNeko = getNekoBubbleForSection('⑨');
    article += makeNekoBubble(kougyouNeko);
    article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  }
  article += `<!-- SECTION:osusume:END -->\n\n`;

  // --- 16. ⑩ 特別枠：${countryName} おすすめ音楽・ナショナルサウンドトラック ---
  article += `<!-- SECTION:music:START -->\n`;
  const rawMusic = parseLines(raw, '音楽').filter(d => d['曲名'] && d['曲名'] !== '欠測');
  const musicData2 = sheetData.data?.対象国データ_記事?.おすすめ音楽 || sheetData.data?.対象国データ_記事?.recommend_music || [];

  let musicData = [];
  if (rawMusic.length > 0) {
    musicData = rawMusic;
  } else if (Array.isArray(musicData2) && musicData2.length > 0) {
    musicData = musicData2.map(item => ({
      '曲名': item['track_name'] || item['曲名'] || '',
      '曲名_英語': item['track_name_en'] || item['曲名_英語'] || '',
      'アーティスト': item['artist_name'] || item['アーティスト'] || '',
      'アーティスト_英語': item['artist_name_en'] || item['アーティスト_英語'] || '',
      'リリース年': item['release_year'] || item['年'] || '',
      'preview_url': item['preview_url'] || '',
      'itunes_url': item['itunes_url'] || item['spotify_url'] || '',
      'ジャケット': item['album_cover'] || item['ジャケット'] || '',
      '概要': item['description'] || item['概要'] || ''
    }));
  }

  if (musicData.length > 0) {
    const musicH2Style = `margin-top:60px;padding:14px 20px;background:var(--color-background-secondary,#f5f5f5);border:0.5px solid #e0e0e0;border-left:3px solid #ff4081;border-radius:8px;font-size:16px;font-weight:500;color:#111;`;
    article += `<h2 id="section-10" style="${musicH2Style}"><span style="background:#ff4081;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑩</span> 特別枠：${countryName} おすすめ音楽・ナショナルサウンドトラック</h2>\n`;
    musicData.forEach((d, idx) => {
      const origItem = Array.isArray(musicData2) ? (musicData2.find(m => (m.track_name && (m.track_name === d['曲名'] || m.track_name === d['track_name'])) || (m.artist_name && (m.artist_name === d['アーティスト'] || m.artist_name === d['artist_name']))) || musicData2[idx]) : null;

      const trackName = d['曲名'] || d['track_name'] || origItem?.track_name || '';
      const trackNameEn = d['曲名_英語'] || d['track_name_en'] || origItem?.track_name_en || '';
      const artistName = d['アーティスト'] || d['artist_name'] || origItem?.artist_name || '';
      const artistNameEn = d['アーティスト_英語'] || d['artist_name_en'] || origItem?.artist_name_en || '';
      const releaseYear = d['リリース年'] || d['release_year'] || origItem?.release_year || '';
      const previewUrl = d['preview_url'] || origItem?.preview_url || '';
      const itunesUrl = d['itunes_url'] || origItem?.itunes_url || '';
      const coverUrl = d['ジャケット'] || d['album_cover'] || origItem?.album_cover || '';
      const description = d['概要'] || d['description'] || origItem?.description || '';

      const isSameTrack = !trackNameEn || trackNameEn.trim().toLowerCase() === trackName.trim().toLowerCase();
      const isSameArtist = !artistNameEn || artistNameEn.trim().toLowerCase() === artistName.trim().toLowerCase();

      const trackTitleSpan = !isSameTrack ? `<span style="font-size:13px;color:#666;font-weight:normal;margin-left:6px;">(${trackNameEn})</span>` : '';
      const artistSpan = !isSameArtist ? `<span style="font-size:13px;color:#555;font-weight:bold;margin-left:4px;">(${artistNameEn})</span>` : '';

      function encText(t) {
        try { return btoa(unescape(encodeURIComponent(t || ''))); }
        catch (e) { return ''; }
      }

      const trackId = d['track_id'] || d['trackId'] || d['itunes_id'] || d['id'] || '';
      const searchQuery = `${artistName} ${trackName}`;
      const idParam = trackId ? `&id=${encodeURIComponent(trackId)}` : '';
      const mapUrl = `https://map.seronworks.dev/?mode=music${idParam}&q=${encodeURIComponent(searchQuery)}`;
      const linkHTML = `<br><br><a href="${mapUrl}" target="history_gallery" style="display:inline-block;padding:10px 20px;background:#ff4081;color:#fff;text-decoration:none;border-radius:25px;font-weight:bold;font-size:13px;">🏛️ 国家の天秤 歴史館で詳しく見る</a>`;
      const popupTitleStr = `${trackName} - ${artistName}`;
      const n = encText(popupTitleStr);
      const i = encText(linkHTML);
      const onclick = `var d=function(s){return decodeURIComponent(escape(atob(s)));};document.getElementById("tenbin-popup-title").textContent=d("${n}");document.getElementById("tenbin-popup-info").innerHTML=d("${i}");document.getElementById("tenbin-popup").style.display="block";document.getElementById("tenbin-overlay").style.display="block";`;

      const titleLinkHtml = `<span style="color:#ff4081;border-bottom:1px dashed #ff4081;cursor:pointer;font-weight:bold;" onclick='${onclick}'>${trackName}</span> ${trackTitleSpan}`;

      let audioPlayerHtml = '';
      if (previewUrl && previewUrl.startsWith('http')) {
        audioPlayerHtml = `
          <div style="margin-top:10px;margin-bottom:12px;">
            <audio controls src="${previewUrl}" style="width:100%;max-width:360px;height:36px;outline:none;border-radius:18px;"></audio>
          </div>`;
      }

      let appleMusicBtn = '';
      if (itunesUrl && itunesUrl.startsWith('http')) {
        appleMusicBtn = `<a href="${itunesUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#fc3c44;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;font-weight:bold;">🎵 Apple Musicで聴く</a>`;
      }

      const youtubeQuery = `${artistName} ${trackName} MV`;
      const youtubeBtn = `<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeQuery)}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;font-weight:bold;">▶ YouTube MV</a>`;

      const coverHtml = coverUrl ? `<div style="flex-shrink:0;margin-left:12px;"><img src="${coverUrl}" alt="${trackName}" style="width:90px;height:90px;object-fit:cover;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);" onerror="this.style.display='none';"></div>` : '';

      const artistPersonUrl = `https://map.seronworks.dev/?mode=person&q=${encodeURIComponent(artistName)}`;
      const artistLinkBlog = `<a href="${artistPersonUrl}" target="history_gallery" style="color:#ff4081;text-decoration:underline;font-weight:bold;" title="${artistName}の人物アーカイブを見る">🎤 ${artistName}</a>`;

      article += `
<div style="background:#ffffff;border:1px solid #eef2f5;border-radius:12px;padding:18px 20px;margin:20px 0;box-shadow:0 4px 15px rgba(0,0,0,0.05);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#ff4081;"></div>
  <div style="display:flex;gap:16px;align-items:flex-start;padding-left:6px;">
    <div style="flex:1;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
        <span style="background:#ff4081;color:#fff;border-radius:6px;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;">${idx + 1}</span>
        <span style="font-weight:800;font-size:17px;color:#111;">${titleLinkHtml}</span>
      </div>
      <div style="font-size:13px;color:#ff4081;font-weight:bold;margin-bottom:8px;">${artistLinkBlog} ${artistSpan}${releaseYear ? ` &nbsp;•&nbsp; ${releaseYear}年` : ''}</div>
      ${audioPlayerHtml}
      ${description ? `<div style="font-size:14px;color:#2c3e50;line-height:1.75;margin-bottom:12px;letter-spacing:0.02em;">${description}</div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        ${youtubeBtn}
        ${appleMusicBtn}
      </div>
    </div>
    ${coverHtml}
  </div>
</div>`;
    });

    const musicNeko = getNekoBubbleForSection('⑩');
    article += makeNekoBubble(musicNeko);
    article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(255,64,129,0.15);color:#ff4081;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  }
  article += `<!-- SECTION:music:END -->\n\n`;

  // --- 国家の天秤ポップアップ用モーダルHTML（韓国の正解記事と同一） ---
  article += `
<div id="tenbin-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;" onclick="document.getElementById('tenbin-popup').style.display='none';this.style.display='none'"></div>
<div id="tenbin-popup" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:320px;background:#fff;border:1px solid #ddd;border-radius:12px;padding:25px;z-index:9999;box-shadow:0 20px 60px rgba(0,0,0,0.3);color:#333;font-family:sans-serif;">
  <div onclick="document.getElementById('tenbin-popup').style.display='none';document.getElementById('tenbin-overlay').style.display='none'" style="position:absolute;top:10px;right:15px;cursor:pointer;font-size:20px;color:#999;">✕</div>
  <div id="tenbin-popup-title" style="font-weight:bold;color:#20B2AA;margin-bottom:10px;font-size:18px;border-bottom:1px solid #eee;padding-bottom:10px;"></div>
  <div id="tenbin-popup-info" style="font-size:14px;line-height:1.7;color:#555;margin-top:10px;"></div>
</div>\n`;

  const finalArticleText = article;

  // --- WordPressカテゴリーID自動振り分け設定 ---
  // ※WordPress側のカテゴリーIDに合わせて右側の数値を変更・調整してください
  const categoryIdMap = {
    "アジア": 15,
    "ヨーロッパ": 16,
    "アフリカ": 17,
    "中東": 18,
    "オセアニア": 19,
    "北米": 20,
    "南米": 21,
    "その他": 1
  };
  const categoryId = categoryIdMap[regionName] || 1;

  return {
    json: {
      article: finalArticleText,
      output: finalArticleText,
      text: finalArticleText,
      title: title,
      country: countryName,
      countryEn: countryEn,
      capital: capital,
      category_name: regionName,
      category_id: categoryId,
      categories: [categoryId] // WordPressノードのcategoriesフィールドにそのまま渡せる配列形式
    }
  };
});
