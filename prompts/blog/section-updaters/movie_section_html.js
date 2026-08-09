/**
 * 【Supabase (Moviesテーブル) 連携・映画セクション (⑧映像作品 / ⑨おすすめ映画) HTML生成コード】
 * 
 * Supabase `Movies` テーブルから取得したデータを元に、
 * ⑧映像作品 (is_recommended = false) または ⑨おすすめ映画 (is_recommended = true) の
 * HTMLセクション (<!-- SECTION:<id>:START --> ... <!-- SECTION:<id>:END -->) を組み立てます。
 */

const items = $input.all().map(item => item.json);
if (!items || items.length === 0) {
  return [{ json: { html: '', section_html: '' } }];
}

// フォーム/トリガーからの入力情報（section_type は必ずここだけを信頼する。
// items（Supabaseの映画データ行）側に同名フィールドが紛れていても
// 絶対に上書きさせない。これが⑧⑨混同バグの原因だったため。）
let countryName = '対象国';
let sectionType = null;

try {
  const trig = $('On form submission').first()?.json || $('トリガー').first()?.json || {};
  countryName = trig.country_name || trig.country_ja || trig.country || countryName;
  sectionType = trig.section_type || trig.section || null;
} catch (e) {}

// countryNameのみ、items からのフォールバックを許可（section_typeは絶対に許可しない）
if (countryName === '対象国' && items[0]) {
  countryName = items[0].country_name || items[0].country_ja || items[0].country || countryName;
}

if (!sectionType) {
  throw new Error('[映画セクション生成エラー] トリガーから section_type（eizou/osusume）を取得できませんでした。items側のデータでの代用は行いません。呼び出し元ノードのパラメータを確認してください。');
}

let sectionStr = String(sectionType).toLowerCase();
if (sectionStr.includes(':')) {
  const parts = sectionStr.split(':').map(s => s.trim());
  sectionStr = parts.find(p => p === 'osusume' || p === 'eizou' || p === '9' || p === '8') || parts[0];
}

const isOsusume = sectionStr.includes('osusume') || sectionStr.includes('recommend') || sectionStr === '9' || sectionStr.includes('おすすめ');
const isEizou = sectionStr.includes('eizou') || sectionStr === '8' || sectionStr.includes('映像');

if (!isOsusume && !isEizou) {
  throw new Error(`[映画セクション生成エラー] section_type「${sectionType}」が eizou/osusume のどちらとも判定できませんでした。処理を中止しました。`);
}

const sectionId = isOsusume ? 'osusume' : 'eizou';

const h2Style = `margin-top:60px;padding:14px 20px;background:#f5f5f5;border-left:3px solid #00bcd4;border-radius:8px;font-size:16px;font-weight:500;color:#111;`;

function getPosterUrl(posterUrl) {
  if (!posterUrl || posterUrl === 'null' || posterUrl === 'EMPTY' || posterUrl === '-') return null;
  if (String(posterUrl).startsWith('http')) return posterUrl;
  const prefix = String(posterUrl).startsWith('/') ? '' : '/';
  return `https://image.tmdb.org/t/p/w200${prefix}${posterUrl}`;
}

let html = `<!-- SECTION:${sectionId}:START -->\n`;

if (isOsusume) {
  html += `<h2 id="section-9" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑨</span> 特別枠：${countryName} おすすめ映画・映像作品</h2>\n`;
} else {
  html += `<h2 id="section-8" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑧</span> 映像で知る${countryName}</h2>\n`;
}

function enc(t) {
  try { return btoa(unescape(encodeURIComponent(t || ''))); }
  catch (e) { return ''; }
}

items.forEach(d => {
  const titleJa = d.title || d.タイトル_日本語 || d.title_ja || d.タイトル || '';
  const titleOrig = (d.origin_title && d.origin_title !== d.title) ? d.origin_title : (d.原題 || '');
  const type = d.genres || d.種別 || d.type || '';
  const year = d.year || d.公開年 || d.release_year || '';

  const director = (d.director && d.director !== 'EMPTY') ? d.director : (d.director_en && d.director_en !== 'EMPTY' ? d.director_en : '');
  const cast = (d.cast && d.cast !== 'EMPTY') ? d.cast : (d.cast_en && d.cast_en !== 'EMPTY' ? d.cast_en : '');
  const summary = (d.overview && d.overview !== 'EMPTY') ? d.overview : (d.overview_en && d.overview_en !== 'EMPTY' ? d.overview_en : '');

  const isSerious = d.is_serious === true || d.is_serious === 'true' || d.深刻 === 'true';

  const bg = isSerious ? '#fff3f3' : '#ffffff';
  const posterUrl = getPosterUrl(d.poster_url || d.poster_path);

  const searchQuery = titleOrig || titleJa;
  const popupTitleStr = titleOrig ? `${titleJa} (${titleOrig})` : titleJa;

  const mapUrl = `https://map.seronworks.dev/?mode=movie&q=${encodeURIComponent(searchQuery)}`;
  const linkHTML = `<br><br><a href="${mapUrl}" target="history_gallery" style="display:inline-block;padding:10px 20px;background:#20B2AA;color:#fff;text-decoration:none;border-radius:25px;font-weight:bold;font-size:13px;">🏛️ 国家の天秤 歴史館で詳しく見る</a>`;
  const n = enc(popupTitleStr);
  const i = enc(linkHTML);
  const onclick = `var d=function(s){return decodeURIComponent(escape(atob(s)));};document.getElementById("tenbin-popup-title").textContent=d("${n}");document.getElementById("tenbin-popup-info").innerHTML=d("${i}");document.getElementById("tenbin-popup").style.display="block";document.getElementById("tenbin-overlay").style.display="block";`;
  const titleLinkHtml = `<span style="color:#00bcd4;border-bottom:1px dashed #00bcd4;cursor:pointer;font-weight:bold;" onclick='${onclick}'>${titleJa}</span>`;

  let youtubeBtn = '';
  if (d.trailer_url && d.trailer_url.includes('http') && d.trailer_url !== 'EMPTY') {
    youtubeBtn = `<a href="${d.trailer_url}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube予告編</a>`;
  } else {
    youtubeBtn = `<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(titleJa + ' trailer')}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube検索</a>`;
  }

  let imdbUrl = '';
  const rawImdb = d.imdb_id || d.imdb_url || d.imdb || '';
  if (rawImdb) {
    if (String(rawImdb).startsWith('http')) {
      imdbUrl = rawImdb;
    } else {
      const cleanId = String(rawImdb).replace(/.*\/title\//, '').replace(/\/.*/, '').trim();
      if (cleanId) imdbUrl = `https://www.imdb.com/title/${cleanId}/`;
    }
  }
  if (!imdbUrl && (titleOrig || titleJa)) {
    imdbUrl = `https://www.imdb.com/find/?q=${encodeURIComponent(titleOrig || titleJa)}`;
  }

  const imdbBtn = imdbUrl ? `<a href="${imdbUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#f5c518;color:#000;border-radius:20px;text-decoration:none;font-size:11px;font-weight:bold;">▶ IMDb</a>` : '';

  const directorStr = director ? ` &nbsp;•&nbsp; 監督：<span class="no-link">${director}</span>` : '';
  const castHtml = cast ? `<div style="font-size:12px;color:#666;margin-bottom:10px;line-height:1.5;">👥 キャスト：<span class="no-link">${cast}</span></div>` : '';
  const posterHtml = posterUrl ? `<div style="flex-shrink:0;margin-left:12px;"><img src="${posterUrl}" alt="${titleJa}" style="width:90px;max-height:135px;object-fit:cover;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);" onerror="this.style.display='none';"></div>` : '';

  const origTitleSpan = titleOrig ? `<span style="font-size:13px;color:#666;font-weight:normal;margin-left:6px;">(${titleOrig})</span>` : '';

  if (isOsusume) {
    html += `
<div style="background:${bg};border:1px solid #eef2f5;border-radius:12px;padding:18px 20px;margin:20px 0;box-shadow:0 4px 15px rgba(0,0,0,0.05);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#00bcd4;"></div>
  <div style="display:flex;gap:16px;align-items:flex-start;padding-left:6px;">
    <div style="flex:1;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
        <span style="background:#00bcd4;color:#fff;border-radius:6px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0;">🎬</span>
        <span style="font-weight:800;font-size:17px;color:#111;">${isSerious ? '⚠️ ' : ''}${titleLinkHtml} ${origTitleSpan}</span>
      </div>
      <div style="font-size:12px;color:#008080;font-weight:bold;margin-bottom:10px;">${type}${(type && year) ? ' &nbsp;•&nbsp; ' : ''}${year}${directorStr}</div>
      ${castHtml}
      ${summary ? `<div style="font-size:14px;color:#2c3e50;line-height:1.75;margin-bottom:14px;letter-spacing:0.02em;">${summary}</div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        ${youtubeBtn}
        ${imdbBtn}
      </div>
    </div>
    ${posterHtml}
  </div>
</div>`;
  } else {
    html += `
<div style="background:${bg};border:1px solid #eef2f5;border-radius:12px;padding:18px 20px;margin:20px 0;box-shadow:0 4px 15px rgba(0,0,0,0.06);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#20B2AA;"></div>
  <div style="display:flex;gap:16px;align-items:flex-start;padding-left:6px;">
    <div style="flex:1;">
      <div style="font-weight:800;font-size:17px;color:#111;margin-bottom:8px;">${isSerious ? '⚠️ ' : ''}${titleLinkHtml} ${origTitleSpan}</div>
      <div style="font-size:12px;color:#008080;font-weight:bold;margin-bottom:10px;">${type}${(type && year) ? ' &nbsp;•&nbsp; ' : ''}${year}${directorStr}</div>
      ${castHtml}
      ${summary ? `<div style="font-size:14px;color:#2c3e50;line-height:1.75;margin-bottom:14px;letter-spacing:0.02em;">${summary}</div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        ${youtubeBtn}
        ${imdbBtn}
      </div>
    </div>
    ${posterHtml}
  </div>
</div>`;
  }
});

html += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
html += `<!-- SECTION:${sectionId}:END -->\n`;

return [{
  json: {
    html: html,
    section_html: html,
    section_type: sectionId
  }
}];