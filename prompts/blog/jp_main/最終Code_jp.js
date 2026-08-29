// 安全なノードデータ取得ヘルパー
const getNodeData = (...names) => {
  for (const name of names) {
    try {
      const node = $(name);
      if (node && typeof node.first === 'function') {
        const item = node.first();
        if (item && item.json) return item.json;
      }
    } catch (e) {}
  }
  return {};
};

const sheetData = getNodeData('整形ノード1_jp', '整形ノード1', '整形ノード１');
const moviesData = getNodeData('リンク挿入_jp', 'リンク挿入', 'リンク挿入ノード_jp', 'リンク挿入ノード').movies || [];

return $input.all().map(item => {
  const inputData = item.json;
  let raw = inputData?.article ?? "";
  const rawLines = raw.split('\n');

  raw = raw.replace(/^[①-⑨] .*$/gm, '');
  raw = raw.replace(/^出典：.*$/gm, '');

  const countryName = "日本";
  const capital = "東京";
  const themeColor = "#d32f2f";

  function parseLines(text, prefix) {
    const lines = text.split('\n');
    const records = [];
    let currentObj = null;
    let currentKey = null;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.replace(/<\/?[^>]+(>|$)/g, "").trim();
      if (!trimmed) continue;

      // 新しいレコードの開始を検知（例: 歴史｜... または 映像｜...）
      if (trimmed.startsWith(prefix + '｜') || trimmed.includes(prefix + '｜')) {
        if (currentObj) records.push(currentObj);
        currentObj = {};
        currentKey = null;

        const startIdx = trimmed.indexOf(prefix + '｜') + (prefix + '｜').length;
        const content = trimmed.substring(startIdx);
        const parts = content.split('｜');

        parts.forEach(p => {
          const cIdx = p.indexOf('：');
          if (cIdx !== -1) {
            const k = p.substring(0, cIdx).trim();
            const v = p.substring(cIdx + 1).trim();
            currentObj[k] = v;
            currentKey = k;
          }
        });
        continue;
      }

      // 改行後に "｜出典：..." などパイプで始まる追加フィールドがある場合
      if (currentObj && trimmed.startsWith('｜')) {
        const parts = trimmed.substring(1).split('｜');
        parts.forEach(p => {
          const cIdx = p.indexOf('：');
          if (cIdx !== -1) {
            const k = p.substring(0, cIdx).trim();
            const v = p.substring(cIdx + 1).trim();
            currentObj[k] = v;
            currentKey = k;
          }
        });
        continue;
      }

      // 別のセクション見出しやエラーネコに遭遇した場合はレコード終了
      if (/^(?:[①-⑨]|🐱|#)/.test(trimmed)) {
        if (currentObj) {
          records.push(currentObj);
          currentObj = null;
          currentKey = null;
        }
        continue;
      }

      // それ以外の行は長文フィールド（概要など）のみ複数行結合を許可
      const multilineAllowedKeys = ['概要', 'description', 'overview'];
      if (currentObj && currentKey && multilineAllowedKeys.includes(currentKey)) {
        if (currentObj[currentKey]) {
          currentObj[currentKey] += '\n' + trimmed;
        } else {
          currentObj[currentKey] = trimmed;
        }
      }
    }

    if (currentObj) records.push(currentObj);
    return records;
  }

  const h2Style = `margin-top:60px;padding:14px 20px;background:#fffafa;border-left:4px solid ${themeColor};border-radius:8px;font-size:16px;font-weight:800;color:#111;`;
  const h3Style = `font-size:14px;font-weight:800;color:#333;margin-top:30px;margin-bottom:10px;`;
  const citationStyle = `font-size:12px;color:#aaa;text-align:right;margin-top:4px;margin-bottom:24px;`;
  const backToTopBtn = `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(211,47,47,0.12);color:#d32f2f;text-decoration:none;border-radius:20px;font-weight:600;font-size:11px;transition:0.2s;">▲ 先頭に戻る</a></div>`;

  function makeTable(headers, rows, widths) {
    const thStyle = (w) => `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#fffafa,#ffebee);text-align:left;font-size:14px;${w ? 'width:' + w + ';' : ''}`;
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

  function extractTextBetween(text, start, end) {
    const lines = text.split('\n');
    const startIdx = lines.findIndex(l => l.includes(start));
    if (startIdx === -1) return '';
    const slice = lines.slice(startIdx + 1);
    const endIdx = slice.findIndex(l => l.includes(end));
    return (endIdx === -1 ? slice : slice.slice(0, endIdx)).join('\n').trim();
  }

  function cleanMarkdown(text) {
    if (!text) return '';
    return text
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        if (trimmed === '') return true;
        if (/^#+\s*$/.test(trimmed)) return false;
        if (/^[-—―=*_\s]+$/.test(trimmed)) return false;
        if (/^#*\s*(🐱\s*)?エラーネコ/.test(trimmed)) return false;
        if (/^#*\s*出典\s*$/.test(trimmed)) return false;
        return true;
      })
      .join('\n')
      .trim();
  }

  function makeNekoBubble(text) {
    if (!text || !text.includes('🐱')) return '';
    const content = text.replace(/🐱\s*エラーネコ：/, '').trim();
    return `
<div style="margin: 20px 0; display: flex; align-items: flex-start; gap: 12px;">
  <div style="font-size: 24px;">🐱</div>
  <div style="position: relative; background: #fffafa; border: 1px solid #ffebee; border-radius: 12px; padding: 12px 16px; font-size: 13px; line-height: 1.6; color: #444; flex: 1;">
    <div style="position: absolute; top: 12px; left: -8px; width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-right: 8px solid #fffafa;"></div>
    <strong>エラーネコの一言：</strong><br>${content}
  </div>
</div>`;
  }

  function getNekoBubbleForSection(sectionNum) {
    const startIdx = rawLines.findIndex(l => l.trim().startsWith(sectionNum) || l.includes(sectionNum));
    if (startIdx === -1) {
      const circleNums = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];
      const orderIdx = circleNums.indexOf(sectionNum);
      const nekoLines = rawLines.filter(l => l.includes('🐱 エラーネコ：'));
      return nekoLines[orderIdx] || '';
    }
    const slice = rawLines.slice(startIdx);
    return slice.find(l => l.includes('🐱 エラーネコ：')) || '';
  }

  function getPosterUrl(posterPath) {
    if (!posterPath || posterPath === 'null' || posterPath === 'EMPTY' || posterPath === '-') return null;
    if (String(posterPath).startsWith('http')) return posterPath;
    const prefix = String(posterPath).startsWith('/') ? '' : '/';
    return `https://image.tmdb.org/t/p/w200${prefix}${posterPath}`;
  }

  function enc(t) {
    try { return btoa(unescape(encodeURIComponent(t || ''))); }
    catch (e) { return ''; }
  }

  let article = '';

  article += `
<div id="top"></div>
<style>
  .entry-title, .post-title, .page-title { display: none !important; }
</style>
<div style="background:linear-gradient(135deg, #fffafa 0%, #ffebee 100%); border:1px solid #eee; border-left:8px solid #d32f2f; border-radius:12px; padding:24px; margin-bottom:35px; box-shadow:0 4px 15px rgba(0,0,0,0.06); position:relative; overflow:hidden;">
  <div style="position:absolute; top:-20px; right:-20px; font-size:100px; color:#d32f2f; opacity:0.05; transform:rotate(-15deg); font-weight:bold; z-index:0;">FACT</div>
  <div style="display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1;">
    <div>
      <div style="font-size:12px; color:#d32f2f; font-weight:bold; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">National Profile</div>
      <h1 style="margin:0; font-size:28px; font-weight:900; color:#111; letter-spacing:-0.5px;">日本</h1>
      <div style="margin:8px 0 0; font-size:14px; color:#555; display:flex; gap:12px; align-items:center;">
        <span style="white-space: nowrap;">📍 東京（首都）</span>
        <span style="color:#ccc;">|</span>
        <span>🌍 東アジア、太平洋</span>
      </div>
    </div>
    <div style="background:#d32f2f; color:#fff; padding:8px 18px; border-radius:30px; font-weight:900; font-size:13px; box-shadow:0 2px 8px rgba(0,0,0,0.15); display:flex; align-items:center; gap:6px;">
      🇯🇵 本国（安全）
    </div>
  </div>
</div>
`;

  // 目次（TOC）カード
  article += `
<div style="background:#f9fafa;border:1px solid #e0eeee;border-radius:12px;padding:20px 24px;margin:30px 0;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
  <div style="font-size:13px;font-weight:700;color:#d32f2f;margin-bottom:12px;">📋 目次</div>
  <ol style="margin:0;padding-left:20px;line-height:2.2;font-size:14px;">
    <li><a href="#section-1" style="color:#333;text-decoration:none;">貿易の衡量</a></li>
    <li><a href="#section-2" style="color:#333;text-decoration:none;">歴史的背景（近代100年・重大犯罪事件）</a></li>
    <li><a href="#section-3" style="color:#333;text-decoration:none;">直近の動向</a></li>
    <li><a href="#section-4" style="color:#333;text-decoration:none;">映像で知る日本</a></li>
    <li><a href="#section-5" style="color:#333;text-decoration:none;">日本の最新おすすめ映画</a></li>
    <li><a href="#section-6" style="color:#333;text-decoration:none;">おすすめ音楽・ナショナルサウンドトラック</a></li>
    <li><a href="#deep-dive" style="color:#333;text-decoration:none;">✦ Deep Dive</a></li>
  </ol>
</div>
`;

  let introText = "";
  const firstSectionIdx = rawLines.findIndex(l => /(?:①|1\.?)\s*貿易/.test(l) || /^輸出[｜|]/.test(l));
  if (firstSectionIdx !== -1) {
    introText = rawLines.slice(0, firstSectionIdx).join('\n').trim();
  } else {
    const fallbackIdx = rawLines.findIndex(l => /^輸出[｜|]/.test(l) || /^貿易相手[｜|]/.test(l));
    if (fallbackIdx !== -1) {
      introText = rawLines.slice(0, fallbackIdx).join('\n').trim();
    }
  }

  introText = introText.replace(/^#+.*$/gm, '').trim();

  if (introText) {
    const introHtml = introText
      .split(/\n{2,}/)
      .map(p => {
        const cleanP = p.trim().replace(/^[\s\n]+|[\s\n]+$/g, '');
        if (!cleanP || cleanP.includes('FACT') || cleanP.startsWith('①')) return '';
        return `<p style="font-size:15px; line-height:2.0; color:#333; margin:18px 0; text-align:justify; text-justify:inter-ideograph;">${cleanP.split('\n').join('<br>')}</p>`;
      })
      .filter(Boolean)
      .join('\n');
    article += introHtml + '\n';
  }

  // ========================================================
  // --- ① 貿易の衡量 ---
  // ========================================================
  article += `<!-- SECTION:boeki:START -->\n`;
  article += `<h2 id="section-1" style="${h2Style}"><span style="background:${themeColor};color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">①</span> 貿易の衡量</h2>\n`;
  const yushutsuData = parseLines(raw, '輸出');
  const yunyuData = parseLines(raw, '輸入');
  if (yushutsuData.length > 0 || yunyuData.length > 0) {
    const tradeRows = [];
    for (let i = 0; i < 10; i++) {
      tradeRows.push([i + 1, yushutsuData[i]?.品目 || '-', yunyuData[i]?.品目 || '-']);
    }
    article += makeTable(['順位', '輸出主要品目', '輸入主要品目'], tradeRows, ['10%', '45%', '45%']);
  }
  const boekiAiteData = parseLines(raw, '貿易相手');
  if (boekiAiteData.length > 0) {
    article += `<h3 style="${h3Style}">主要な貿易相手国</h3>\n`;
    const partnerRows = boekiAiteData.map(d => [d['順位'], d['国名'], d['シェア']]);
    article += makeTable(['順位', '相手国', 'シェア'], partnerRows, ['10%', '60%', '30%']);
    const boekiCite = sheetData.data?.固定データ?.貿易出典_日本 || '財務省貿易統計';
    article += `<p style="${citationStyle}">出典：${boekiCite}</p>\n`;
  }
  const boekiExplanation = cleanMarkdown(extractTextBetween(raw, '貿易相手｜順位：10位｜', '🐱 エラーネコ：'));
  if (boekiExplanation) article += `\n${boekiExplanation}\n`;
  const boekiNeko = getNekoBubbleForSection('①');
  article += makeNekoBubble(boekiNeko);
  article += backToTopBtn;
  article += `<!-- SECTION:boeki:END -->\n\n`;

  // ========================================================
  // --- ② 歴史的背景（近代100年） ---
  // ========================================================
  article += `<!-- SECTION:rekishi:START -->\n`;
  article += `<h2 id="section-2" style="${h2Style}"><span style="background:${themeColor};color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">②</span> 歴史的背景（近代100年）</h2>\n`;
  const rekishiData = parseLines(raw, '歴史');
  if (rekishiData.length > 0) {
    const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;font-size:14px;margin:20px 0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);`;
    const thStyle = `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#fffafa,#ffebee);text-align:left;font-weight:bold;`;
    let rekishiHtml = `<table style="${tableStyle}"><thead><tr>`;
    rekishiHtml += `<th style="${thStyle}width:10%;">年</th><th style="${thStyle}width:20%;">事象名</th><th style="${thStyle}width:15%;">種別</th><th style="${thStyle}width:55%;">概要</th>`;
    rekishiHtml += `</tr></thead><tbody>`;
    rekishiData.forEach(d => {
      const type = d['種別'] || '';
      let bg = '';
      if (type.includes('戦争') || type.includes('虐殺')) bg = 'background:#fff3f3;';
      else if (type.includes('事件') || type.includes('事故')) bg = 'background:#f0f7ff;';
      else if (type.includes('政治') || type.includes('体制')) bg = 'background:#f0fff4;';
      let ganyouText = d['概要'] || '';
      if (d['出典'] && d['出典'] !== '欠測' && d['出典'] !== '未確認') {
        ganyouText += `<span style="color:#888;font-size:12px;display:block;margin-top:4px;">（出典：${d['出典']}）</span>`;
      }
      rekishiHtml += `<tr style="${bg}">`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;font-weight:bold;">${d['年'] || ''}</td>`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${d['事象名'] || ''}</td>`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;font-size:11px;">${type}</td>`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${ganyouText}</td>`;
      rekishiHtml += `</tr>`;
    });
    rekishiHtml += `</tbody></table>`;
    article += rekishiHtml;
  }

  // 国内の重大犯罪事件テーブル
  const majorCrimeData = parseLines(raw, '重大犯罪');
  const r2Crimes = sheetData.data?.対象国データ_記事?.重大犯罪事件 || [];
  if (majorCrimeData.length > 0) {
    article += `<h3 style="${h3Style}">国内の重大犯罪事件</h3>\n`;
    const majorCrimeRows = majorCrimeData.map(d => {
      // 映像化作品の特定（Writer出力、またはリサーチャー生データからフォールバック）
      let movieText = (d['映像化'] && !/なし|不明/.test(d['映像化'])) ? d['映像化'] : '';
      if (!movieText && r2Crimes.length > 0) {
        const found = r2Crimes.find(c => c.事件名 && d['事件名'] && (c.事件名.includes(d['事件名']) || d['事件名'].includes(c.事件名)));
        if (found && Array.isArray(found.映像化作品) && found.映像化作品.length > 0) {
          const m = found.映像化作品[0];
          const mTitle = m.タイトル_日本語 || m.title || m.原題 || '';
          const mYear = m.公開年 || m.year || '';
          if (mTitle) movieText = `『${mTitle}』${mYear ? `（${mYear}）` : ''}`;
        }
      }
      const movieHtml = movieText ? `<div style="margin-top:6px;font-size:12px;color:#d32f2f;font-weight:600;">🎬 関連映画：${movieText}</div>` : '';

      return [
        d['発生年'] || '不明',
        `<strong>${d['事件名'] || '不明'}</strong>${d['犯人名'] ? '<br><span style="font-size:12px;color:#666;">犯人：' + d['犯人名'] + '</span>' : ''}`,
        d['被害者属性'] || '不明',
        (d['概要'] || '') + movieHtml + (d['出典'] ? `<br><span style="font-size:11px;color:#aaa;">出典：${d['出典']}</span>` : '')
      ];
    });
    article += makeTable(['発生年', '事件名', '被害者属性', '概要'], majorCrimeRows, ['12%', '26%', '18%', '44%']);
  }

  const rekishiNeko = getNekoBubbleForSection('②');
  article += makeNekoBubble(rekishiNeko);
  article += backToTopBtn;
  article += `<!-- SECTION:rekishi:END -->\n\n`;

  // ========================================================
  // --- ③ 直近の動向 ---
  // ========================================================
  article += `<!-- SECTION:doukou:START -->\n`;
  article += `<h2 id="section-3" style="${h2Style}"><span style="background:${themeColor};color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">③</span> 直近の動向</h2>\n`;
  const dohContent = cleanMarkdown(extractTextBetween(raw, '<p>【政治経済社会】</p>', '🐱 エラーネコ：'));
  if (dohContent) {
    article += `<p>【政治経済社会】</p>\n${dohContent}\n`;
    let dohCite = sheetData.data?.対象国データ_記事?.直近の動向?.出典 || '';
    if (!dohCite || dohCite === '欠測' || dohCite === 'データなし') {
      dohCite = '日本経済新聞 / 首相官邸 / 総務省 / 外務省';
    }
    article += `<p style="${citationStyle}">出典：${dohCite}</p>\n`;
  }
  const dohNeko = getNekoBubbleForSection('③');
  article += makeNekoBubble(dohNeko);
  article += backToTopBtn;
  article += `<!-- SECTION:doukou:END -->\n\n`;

  // ========================================================
  // --- ④ 映像で知る日本 ---
  // ========================================================
  article += `<!-- SECTION:eizou:START -->\n`;
  article += `<h2 id="section-4" style="${h2Style}"><span style="background:${themeColor};color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">④</span> 映像で知る日本</h2>\n`;
  const eizouList = sheetData.data?.対象国データ_記事?.映像作品 || [];
  const eizouData = parseLines(raw, '映像');
  eizouData.forEach((d, i) => {
    const isSerious = d['深刻'] === 'true';
    const bg = isSerious ? '#fff3f3' : '#ffffff';
    const cleanTitle = (d['タイトル'] || '').replace(/<[^>]+>/g, '').trim();
    const apiData = eizouList.find(api => 
      (api['タイトル_日本語'] && (String(api['タイトル_日本語']) === cleanTitle || String(api['タイトル_日本語']).includes(cleanTitle) || cleanTitle.includes(String(api['タイトル_日本語'])))) || 
      (api['原題'] && (String(api['原題']) === cleanTitle || String(api['原題']).includes(cleanTitle) || cleanTitle.includes(String(api['原題'])))) ||
      (api['title'] && (String(api['title']) === cleanTitle || String(api['title']).includes(cleanTitle) || cleanTitle.includes(String(api['title']))))
    ) || eizouList[i] || {};

    const titleJa = d['タイトル'] || apiData['タイトル_日本語'] || apiData['title'] || '';
    const titleOrig = (d['原題'] || apiData['原題'] || apiData['origin_title'] || '');
    const origTitleSpan = (titleOrig && titleOrig !== titleJa) ? `<span style="font-size:13px;color:#666;font-weight:normal;margin-left:6px;">(${titleOrig})</span>` : '';

    const director = d['director'] && d['director'] !== '空白' && d['director'] !== '-' ? d['director'] : (apiData['director'] || d['監督_主演'] || '');
    const rawCast = d['cast'] && d['cast'] !== '空白' && d['cast'] !== '-' ? d['cast'] : (apiData['cast'] || '');
    let cast = '';
    if (rawCast) {
      const castArr = String(rawCast).split(/[,、/，\n]\s*/).map(c => c.trim()).filter(Boolean);
      cast = castArr.slice(0, 8).join(', ');
    }

    const type = d['種別'] || apiData['genres'] || apiData['種別'] || '';
    const year = d['公開年'] || apiData['year'] || apiData['公開年'] || '';

    const directorStr = director ? ` &nbsp;•&nbsp; 監督：<span class="no-link">${director}</span>` : '';
    const castHtml = cast ? `<div style="font-size:12px;color:#666;margin-bottom:10px;line-height:1.5;">👥 キャスト：<span class="no-link">${cast}</span></div>` : '';

    const posterPath = d['poster_path'] || apiData['poster_path'] || apiData['poster_url'];
    const posterUrl = getPosterUrl(posterPath);

    const movieInfo = (
      d['概要'] || 
      apiData?.概要 || 
      apiData?.overview || 
      moviesData.find(m => m.name && (m.name === cleanTitle || m.name.includes(cleanTitle) || cleanTitle.includes(m.name)))?.info || 
      ''
    ).replace(/\"/g, '&quot;').replace(/'/g, '&#39;');

    const imdbId = apiData?.imdb_id || (d['imdb_url'] ? d['imdb_url'].replace(/.*\/title\//, '').replace(/\/.*/, '') : null);
    let imdbUrl = '';
    if (imdbId && /^tt\d+/.test(String(imdbId).trim())) {
      imdbUrl = `https://www.imdb.com/title/${String(imdbId).trim()}/`;
    } else {
      imdbUrl = `https://www.imdb.com/find/?q=${encodeURIComponent(titleJa || titleOrig)}`;
    }
    const imdbBtn = imdbUrl ? `<a href="${imdbUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#f5c518;color:#000;border-radius:20px;text-decoration:none;font-size:11px;font-weight:bold;">▶ IMDb</a>` : '';

    const mapUrl = `https://map.seronworks.dev/?mode=movie&q=${encodeURIComponent(titleOrig || titleJa)}`;
    const linkHTML = `<br><br><a href="${mapUrl}" target="history_gallery" style="display:inline-block;padding:10px 20px;background:#20B2AA;color:#fff;text-decoration:none;border-radius:25px;font-weight:bold;font-size:13px;">🏛️ 国家の天秤 歴史館で詳しく見る</a>`;
    const encTitle = enc(titleOrig ? `${titleJa} (${titleOrig})` : titleJa);
    const encLink = enc(linkHTML);
    const onclick = `var d=function(s){return decodeURIComponent(escape(atob(s)));};document.getElementById("tenbin-popup-title").textContent=d("${encTitle}");document.getElementById("tenbin-popup-info").innerHTML=d("${encLink}");document.getElementById("tenbin-popup").style.display="block";document.getElementById("tenbin-overlay").style.display="block";`;

    const linkHtml = `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
      <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(titleJa + ' 予告編')}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube予告編</a>
      ${imdbBtn}
    </div>`;

    const posterHtml = posterUrl
      ? `<div style="flex-shrink:0;margin-left:12px;"><img src="${posterUrl}" alt="${titleJa}" style="width:90px;max-height:135px;object-fit:cover;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);" onerror="this.style.display='none';"></div>`
      : '';

    article += `
<div style="background:${bg};border:1px solid #eef2f5;border-radius:12px;padding:18px 20px;margin:20px 0;box-shadow:0 4px 15px rgba(0,0,0,0.06);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#20B2AA;"></div>
  <div style="display:flex;gap:16px;align-items:flex-start;padding-left:6px;">
    <div style="flex:1;">
      <div style="font-weight:800;font-size:17px;color:#111;margin-bottom:8px;">${isSerious ? '⚠️ ' : ''}<span onclick='${onclick}' style="color:#20B2AA;border-bottom:1px dashed #20B2AA;cursor:pointer;">${titleJa}</span> ${origTitleSpan}</div>
      <div style="font-size:12px;color:#008080;font-weight:bold;margin-bottom:10px;">${type}${(type && year) ? ' &nbsp;•&nbsp; ' : ''}${year}${directorStr}</div>
      ${castHtml}
      ${movieInfo ? `<div style="font-size:14px;color:#2c3e50;line-height:1.75;margin-bottom:14px;letter-spacing:0.02em;">${movieInfo}</div>` : ''}
      ${linkHtml}
    </div>
    ${posterHtml}
  </div>
</div>`;
  });
  const eizouCites = [...new Set(eizouList.map(d => d.出典).filter(Boolean))];
  if (eizouCites.length > 0) article += `<p style="${citationStyle}">出典：${eizouCites.join(' / ')}</p>\n`;
  const eizouNeko = getNekoBubbleForSection('④');
  article += makeNekoBubble(eizouNeko);
  article += backToTopBtn;
  article += `<!-- SECTION:eizou:END -->\n\n`;

  // ========================================================
  // --- ⑤ 日本の最新おすすめ映画 ---
  // ========================================================
  article += `<!-- SECTION:osusume:START -->\n`;
  article += `<h2 id="section-5" style="${h2Style}"><span style="background:${themeColor};color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑤</span> 日本の最新おすすめ映画</h2>\n`;
  const rankingList = sheetData.data?.対象国データ_記事?.おすすめ映画 || sheetData.data?.対象国データ_記事?.おすすめ映画ランキング || [];
  const kougyouData = parseLines(raw, 'おすすめ');
  kougyouData.forEach((d, i) => {
    const isSerious = d['深刻'] === 'true';
    const bg = isSerious ? '#fff3f3' : '#ffffff';
    const cleanTitle = (d['タイトル'] || '').replace(/<[^>]+>/g, '').trim();
    const apiData = rankingList.find(api => 
      (api['タイトル_日本語'] && (String(api['タイトル_日本語']) === cleanTitle || String(api['タイトル_日本語']).includes(cleanTitle) || cleanTitle.includes(String(api['タイトル_日本語'])))) || 
      (api['原題'] && (String(api['原題']) === cleanTitle || String(api['原題']).includes(cleanTitle) || cleanTitle.includes(String(api['原題'])))) ||
      (api['title'] && (String(api['title']) === cleanTitle || String(api['title']).includes(cleanTitle) || cleanTitle.includes(String(api['title']))))
    ) || rankingList[i] || {};

    const titleJa = d['タイトル'] || apiData['タイトル_日本語'] || apiData['title'] || '';
    const titleOrig = (d['原題'] || apiData['原題'] || apiData['origin_title'] || '');
    const origTitleSpan = (titleOrig && titleOrig !== titleJa) ? `<span style="font-size:13px;color:#666;font-weight:normal;margin-left:6px;">(${titleOrig})</span>` : '';

    const director = d['director'] && d['director'] !== '空白' && d['director'] !== '-' ? d['director'] : (apiData['director'] || d['監督_主演'] || '');
    const rawCast = d['cast'] && d['cast'] !== '空白' && d['cast'] !== '-' ? d['cast'] : (apiData['cast'] || '');
    let cast = '';
    if (rawCast) {
      const castArr = String(rawCast).split(/[,、/，\n]\s*/).map(c => c.trim()).filter(Boolean);
      cast = castArr.slice(0, 8).join(', ');
    }

    const type = d['種別'] || apiData['genres'] || apiData['種別'] || '映画';
    const year = d['公開年'] || apiData['year'] || apiData['公開年'] || '';

    const directorStr = director ? ` &nbsp;•&nbsp; 監督：<span class="no-link">${director}</span>` : '';
    const castHtml = cast ? `<div style="font-size:12px;color:#666;margin-bottom:10px;line-height:1.5;">👥 キャスト：<span class="no-link">${cast}</span></div>` : '';

    const posterPath = d['poster_path'] || apiData['poster_path'] || apiData['poster_url'];
    const posterUrl = getPosterUrl(posterPath);

    const rankingInfo = (
      d['概要'] || 
      apiData?.概要 || 
      apiData?.overview || 
      moviesData.find(m => m.name && (m.name === cleanTitle || m.name.includes(cleanTitle) || cleanTitle.includes(m.name)))?.info || 
      ''
    ).replace(/\"/g, '&quot;').replace(/'/g, '&#39;');

    const imdbId = apiData?.imdb_id || (d['imdb_url'] ? d['imdb_url'].replace(/.*\/title\//, '').replace(/\/.*/, '') : null);
    let imdbUrl = '';
    if (imdbId && /^tt\d+/.test(String(imdbId).trim())) {
      imdbUrl = `https://www.imdb.com/title/${String(imdbId).trim()}/`;
    } else {
      imdbUrl = `https://www.imdb.com/find/?q=${encodeURIComponent(titleJa || titleOrig)}`;
    }
    const imdbBtn = imdbUrl ? `<a href="${imdbUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#f5c518;color:#000;border-radius:20px;text-decoration:none;font-size:11px;font-weight:bold;">▶ IMDb</a>` : '';

    const mapUrl = `https://map.seronworks.dev/?mode=movie&q=${encodeURIComponent(titleOrig || titleJa)}`;
    const linkHTML = `<br><br><a href="${mapUrl}" target="history_gallery" style="display:inline-block;padding:10px 20px;background:#20B2AA;color:#fff;text-decoration:none;border-radius:25px;font-weight:bold;font-size:13px;">🏛️ 国家の天秤 歴史館で詳しく見る</a>`;
    const encTitle = enc(titleOrig ? `${titleJa} (${titleOrig})` : titleJa);
    const encLink = enc(linkHTML);
    const onclick = `var d=function(s){return decodeURIComponent(escape(atob(s)));};document.getElementById("tenbin-popup-title").textContent=d("${encTitle}");document.getElementById("tenbin-popup-info").innerHTML=d("${encLink}");document.getElementById("tenbin-popup").style.display="block";document.getElementById("tenbin-overlay").style.display="block";`;

    const linkHtml = `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
      <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(titleJa + ' 予告編')}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube予告編</a>
      ${imdbBtn}
    </div>`;

    const posterHtml = posterUrl
      ? `<div style="flex-shrink:0;margin-left:12px;"><img src="${posterUrl}" alt="${titleJa}" style="width:90px;max-height:135px;object-fit:cover;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);" onerror="this.style.display='none';"></div>`
      : '';

    article += `
<div style="background:${bg};border:1px solid #eef2f5;border-radius:12px;padding:18px 20px;margin:20px 0;box-shadow:0 4px 15px rgba(0,0,0,0.06);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#20B2AA;"></div>
  <div style="display:flex;gap:16px;align-items:flex-start;padding-left:6px;">
    <div style="flex:1;">
      <div style="font-weight:800;font-size:17px;color:#111;margin-bottom:8px;">${isSerious ? '⚠️ ' : ''}<span onclick='${onclick}' style="color:#20B2AA;border-bottom:1px dashed #20B2AA;cursor:pointer;">${titleJa}</span> ${origTitleSpan}</div>
      <div style="font-size:12px;color:#008080;font-weight:bold;margin-bottom:10px;">${type}${(type && year) ? ' &nbsp;•&nbsp; ' : ''}${year}${directorStr}</div>
      ${castHtml}
      ${rankingInfo ? `<div style="font-size:14px;color:#2c3e50;line-height:1.75;margin-bottom:14px;letter-spacing:0.02em;">${rankingInfo}</div>` : ''}
      ${linkHtml}
    </div>
    ${posterHtml}
  </div>
</div>`;
  });
  const rankingCites = [...new Set(rankingList.map(d => d.出典).filter(Boolean))];
  if (rankingCites.length > 0) article += `<p style="${citationStyle}">出典：${rankingCites.join(' / ')}</p>\n`;
  const kougyouNeko = getNekoBubbleForSection('⑤');
  article += makeNekoBubble(kougyouNeko);
  article += backToTopBtn;
  article += `<!-- SECTION:osusume:END -->\n\n`;

  // ========================================================
  // --- ⑥ 日本のおすすめ音楽（初期空枠プレースホルダー） ---
  // ========================================================
  article += `<!-- SECTION:music:START -->\n<!-- SECTION:music:END -->\n\n`;

  // ========================================================
  // --- ✦ Deep Dive ---
  // ========================================================
  let deepDiveArticle = '';
  try {
    deepDiveArticle = $('リンク挿入_jp').first().json?.deepDiveArticle || '';
  } catch (e) {
    try { deepDiveArticle = $('リンク挿入').first().json?.deepDiveArticle || ''; }
    catch (e2) {
      try { deepDiveArticle = $('整形3_jp').first().json?.article || ''; }
      catch (e3) {
        try { deepDiveArticle = $('整形3').first().json?.article || ''; } catch (e4) { }
      }
    }
  }

  if (deepDiveArticle) {
    article += `<!-- SECTION:deep_dive:START -->\n`;
    const ddColor = "#d32f2f";
    article += `
<div id="deep-dive" style="border-top:4px solid ${ddColor}; margin:80px 0 40px; padding-top:40px;">
  <div style="display:inline-block; background:${ddColor}; color:#fff; padding:5px 18px; border-radius:4px; font-size:10px; font-weight:800; letter-spacing:2px; text-transform:uppercase; margin-bottom:14px;">✦ Deep Dive</div>
</div>\n`;
    
    let cleanedDD = deepDiveArticle.replace(/[（\(]\s*\[[^\]]+\]\(https?:\/\/[^)]+\)(?:\s*[\/／,、\s]*\[[^\]]+\]\(https?:\/\/[^)]+\))*\s*[）\)]/g, '');

    let styledDD = cleanedDD;
    styledDD = styledDD.replace(/(■\s*主な出典[\s\S]*?)(?=(?:<h[1-4]|<\/div>\s*$|$))/gi, (match) => {
      let cleanedMatch = match.replace(/font-size:\s*14px/g, 'font-size:11px');
      cleanedMatch = cleanedMatch.replace(/color:\s*#333/g, 'color:#aaa');
      return `<div style="font-size:11px; color:#aaa; line-height:1.6; margin-top:30px; border-top:1px dashed #eee; padding-top:15px; margin-bottom:20px;">\n\n` + cleanedMatch + `\n\n</div>`;
    });
    article += styledDD;
    article += backToTopBtn;
    article += `<!-- SECTION:deep_dive:END -->\n\n`;
  }

  const popupHTML = `
<div id="tenbin-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;" onclick="document.getElementById('tenbin-popup').style.display='none';this.style.display='none'"></div>
<div id="tenbin-popup" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:320px;background:#fff;border:1px solid #ddd;border-radius:12px;padding:25px;z-index:9999;box-shadow:0 20px 60px rgba(0,0,0,0.3);color:#333;font-family:sans-serif;">
  <div onclick="document.getElementById('tenbin-popup').style.display='none';document.getElementById('tenbin-overlay').style.display='none'" style="position:absolute;top:10px;right:15px;cursor:pointer;font-size:20px;color:#999;">✕</div>
  <div id="tenbin-popup-title" style="font-weight:bold;color:#20B2AA;margin-bottom:10px;font-size:18px;border-bottom:1px solid #eee;padding-bottom:10px;"></div>
  <div id="tenbin-popup-info" style="font-size:14px;line-height:1.7;color:#555;margin-top:10px;"></div>
</div>`;

  return {
    json: {
      article: article + '\n\n' + popupHTML,
      title: "日本",
      country: countryName,
      countryEn: "Japan",
      capital: capital,
      post_type: "page",
      is_page: true,
      category_name: "アジア",
      category_id: 2,
      categories: [2]
    }
  };
});
