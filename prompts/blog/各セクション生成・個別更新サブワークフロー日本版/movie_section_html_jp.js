/**
 * ==============================================================================
 * 日本版 映画セクション（④ 映像で知る日本 / ⑤ 日本の最新おすすめ映画）HTML生成コード
 * ==============================================================================
 * 入力: Supabase Moviesテーブル、またはリサーチ・AIから取得した日本映画リスト
 * 出力: <!-- SECTION:eizou:START --> ... <!-- SECTION:eizou:END -->
 *       または <!-- SECTION:osusume:START --> ... <!-- SECTION:osusume:END -->
 * ==============================================================================
 */

const items = $input.all().map(item => item.json);
if (!items || items.length === 0) {
  return [{ json: { html: '', section_html: '' } }];
}

let countryName = '日本';
let sectionType = null;
let customNeko = '';

try {
  const trig = $('On form submission').first()?.json || $('トリガー').first()?.json || {};
  sectionType = trig.section_type || trig.section || null;
  customNeko = trig.neko_comment || trig.error_neko || '';
} catch (e) {}

// 入力データ自身に section_type がある場合のフォールバック
if (!sectionType) {
  sectionType = items[0]?.section_type || items[0]?.section || 'eizou';
}

let sectionStr = String(sectionType).toLowerCase();
if (sectionStr.includes(':')) {
  const parts = sectionStr.split(':').map(s => s.trim());
  sectionStr = parts.find(p => p === 'osusume' || p === 'eizou' || p === '5' || p === '4') || parts[0];
}

const isOsusume = sectionStr.includes('osusume') || sectionStr.includes('recommend') || sectionStr === '5' || sectionStr.includes('おすすめ');
const isEizou = sectionStr.includes('eizou') || sectionStr === '4' || sectionStr.includes('映像');

const sectionId = isOsusume ? 'osusume' : 'eizou';
const themeColor = '#d32f2f';
const h2Style = `margin-top:60px;padding:14px 20px;background:#fffafa;border-left:4px solid ${themeColor};border-radius:8px;font-size:16px;font-weight:800;color:#111;`;
const backToTopBtn = `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(211,47,47,0.12);color:#d32f2f;text-decoration:none;border-radius:20px;font-weight:600;font-size:11px;transition:0.2s;">▲ 先頭に戻る</a></div>`;

function getPosterUrl(posterUrl) {
  if (!posterUrl || posterUrl === 'null' || posterUrl === 'EMPTY' || posterUrl === '-') return null;
  if (String(posterUrl).startsWith('http')) return posterUrl;
  const prefix = String(posterUrl).startsWith('/') ? '' : '/';
  return `https://image.tmdb.org/t/p/w200${prefix}${posterUrl}`;
}

function enc(t) {
  try { return btoa(unescape(encodeURIComponent(t || ''))); }
  catch (e) { return ''; }
}

let html = `<!-- SECTION:${sectionId}:START -->\n`;

if (isOsusume) {
  html += `<h2 id="section-5" style="${h2Style}"><span style="background:${themeColor};color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑤</span> 日本の最新おすすめ映画</h2>\n`;
} else {
  html += `<h2 id="section-4" style="${h2Style}"><span style="background:${themeColor};color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">④</span> 映像で知る日本</h2>\n`;
}

items.forEach(d => {
  const titleJa = d.title || d.タイトル_日本語 || d.title_ja || d.タイトル || '';
  if (!titleJa || titleJa === 'EMPTY') return;

  const titleOrig = (d.origin_title && d.origin_title !== d.title) ? d.origin_title : (d.原題 || '');
  const type = d.genres || d.種別 || d.type || '映画';
  const year = d.year || d.公開年 || d.release_year || '';

  const director = (d.director && d.director !== 'EMPTY' && d.director !== '-') ? d.director : (d.director_en && d.director_en !== 'EMPTY' ? d.director_en : (d['監督_主演'] || ''));
  let rawCast = (d.cast && d.cast !== 'EMPTY' && d.cast !== '-') ? d.cast : (d.cast_en && d.cast_en !== 'EMPTY' ? d.cast_en : '');
  let cast = '';
  if (rawCast) {
    const castList = String(rawCast).split(/[,、/，\n]\s*/).map(c => c.trim()).filter(Boolean);
    cast = castList.slice(0, 8).join(', ');
  }
  const summary = (d.overview && d.overview !== 'EMPTY') ? d.overview : (d.overview_en && d.overview_en !== 'EMPTY' ? d.overview_en : (d.概要 || ''));

  const isSerious = d.is_serious === true || d.is_serious === 'true' || d.深刻 === 'true';
  const bg = isSerious ? '#fff3f3' : '#ffffff';
  const posterUrl = getPosterUrl(d.poster_url || d.poster_path);

  const searchQuery = titleOrig || titleJa;
  const popupTitleStr = titleOrig ? `${titleJa} (${titleOrig})` : titleJa;

  const idParam = (d.wikidata_id || d.qid) ? `&qid=${encodeURIComponent(d.wikidata_id || d.qid)}` : (d.tmdb_id ? `&tmdb_id=${encodeURIComponent(d.tmdb_id)}` : '');
  const mapUrl = `https://map.seronworks.dev/?mode=movie${idParam}&q=${encodeURIComponent(searchQuery)}`;
  const linkHTML = `<br><br><a href="${mapUrl}" target="history_gallery" style="display:inline-block;padding:10px 20px;background:#20B2AA;color:#fff;text-decoration:none;border-radius:25px;font-weight:bold;font-size:13px;">🏛️ 国家の天秤 歴史館で詳しく見る</a>`;
  
  const encTitle = enc(popupTitleStr);
  const encLink = enc(linkHTML);
  const onclick = `var d=function(s){return decodeURIComponent(escape(atob(s)));};document.getElementById("tenbin-popup-title").textContent=d("${encTitle}");document.getElementById("tenbin-popup-info").innerHTML=d("${encLink}");document.getElementById("tenbin-popup").style.display="block";document.getElementById("tenbin-overlay").style.display="block";`;

  const imdbId = d.imdb_id || (d.imdb_url ? d.imdb_url.replace(/.*\/title\//, '').replace(/\/.*/, '') : null);
  let imdbUrl = '';
  if (imdbId && /^tt\d+/.test(String(imdbId).trim())) {
    imdbUrl = `https://www.imdb.com/title/${String(imdbId).trim()}/`;
  } else {
    imdbUrl = `https://www.imdb.com/find/?q=${encodeURIComponent(titleJa || titleOrig)}`;
  }
  const imdbBtn = imdbUrl ? `<a href="${imdbUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#f5c518;color:#000;border-radius:20px;text-decoration:none;font-size:11px;font-weight:bold;">▶ IMDb</a>` : '';

  const origSpan = (titleOrig && titleOrig !== titleJa) ? `<span style="font-size:13px;color:#666;font-weight:normal;margin-left:6px;">(${titleOrig})</span>` : '';
  const directorStr = director ? ` &nbsp;•&nbsp; 監督：<span class="no-link">${director}</span>` : '';
  const castHtml = cast ? `<div style="font-size:12px;color:#666;margin-bottom:10px;line-height:1.5;">👥 キャスト：<span class="no-link">${cast}</span></div>` : '';

  const posterHtml = posterUrl
    ? `<div style="flex-shrink:0;margin-left:12px;"><img src="${posterUrl}" alt="${titleJa}" style="width:90px;max-height:135px;object-fit:cover;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);" onerror="this.style.display='none';"></div>`
    : '';

  html += `
<div style="background:${bg};border:1px solid #eef2f5;border-radius:12px;padding:18px 20px;margin:20px 0;box-shadow:0 4px 15px rgba(0,0,0,0.06);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#20B2AA;"></div>
  <div style="display:flex;gap:16px;align-items:flex-start;padding-left:6px;">
    <div style="flex:1;">
      <div style="font-weight:800;font-size:17px;color:#111;margin-bottom:8px;">${isSerious ? '⚠️ ' : ''}<span onclick='${onclick}' style="color:#20B2AA;border-bottom:1px dashed #20B2AA;cursor:pointer;">${titleJa}</span> ${origSpan}</div>
      <div style="font-size:12px;color:#008080;font-weight:bold;margin-bottom:10px;">${type}${(type && year) ? ' &nbsp;•&nbsp; ' : ''}${year}${directorStr}</div>
      ${castHtml}
      ${summary ? `<div style="font-size:14px;color:#2c3e50;line-height:1.75;margin-bottom:14px;letter-spacing:0.02em;">${summary}</div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(titleJa + ' 予告編')}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube予告編</a>
        ${imdbBtn}
      </div>
    </div>
    ${posterHtml}
  </div>
</div>`;
});

// 出典
const cites = [...new Set(items.map(d => d.出典 || d.source).filter(Boolean))];
if (cites.length > 0) {
  html += `<p style="font-size:12px;color:#aaa;text-align:right;margin-top:4px;margin-bottom:24px;">出典：${cites.join(' / ')}</p>\n`;
}

// エラーネコの一言
const nekoCommentText = customNeko || (isOsusume
  ? '日本映画は、緻密なアニメーション表現からリアリズム溢れる人間ドラマまで、世界を驚かせる独自の進化を遂げています。名作の中に描かれる家族観や社会通念の変化にも注目です。'
  : '戦争、震災、公害など、過酷な激動の歴史と真正面から向き合った作品群です。映画やドキュメンタリーを通じて当時の記録と記憶を風化させず受け継ぐ意志が感じられます。'
);

html += `
<div style="margin: 20px 0; display: flex; align-items: flex-start; gap: 12px;">
  <div style="font-size: 24px;">🐱</div>
  <div style="position: relative; background: #fffafa; border: 1px solid #ffebee; border-radius: 12px; padding: 12px 16px; font-size: 13px; line-height: 1.6; color: #444; flex: 1;">
    <div style="position: absolute; top: 12px; left: -8px; width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-right: 8px solid #fffafa;"></div>
    <strong>エラーネコの一言：</strong><br>${nekoCommentText}
  </div>
</div>\n`;

html += backToTopBtn;
html += `<!-- SECTION:${sectionId}:END -->\n`;

return [{
  json: {
    section_type: sectionId,
    section_html: html,
    html: html,
    country: countryName,
    count: items.length
  }
}];
