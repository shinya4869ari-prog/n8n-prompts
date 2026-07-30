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

// フォーム/トリガーからの入力情報
let countryName = '対象国';
let sectionType = 'eizou'; // 'eizou' または 'osusume'

try {
  countryName = $('On form submission').first().json.country || $('トリガー').first().json.country || countryName;
} catch(e) {}
try {
  sectionType = $('On form submission').first().json.section || $('トリガー').first().json.section || sectionType;
} catch(e) {}

const isOsusume = sectionType === 'osusume' || sectionType === 'recommend';
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
  
  // 予告編リンク
  let youtubeBtn = '';
  if (d.trailer_url && d.trailer_url.includes('http') && d.trailer_url !== 'EMPTY') {
    youtubeBtn = `<a href="${d.trailer_url}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube予告編</a>`;
  } else {
    youtubeBtn = `<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(titleJa + ' trailer')}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube検索</a>`;
  }

  // IMDb リンク
  const imdbId = d.imdb_id || (d.imdb_url ? String(d.imdb_url).replace(/.*\/title\//, '').replace(/\/.*/, '') : null);
  const isValidImdb = imdbId && /^tt\d+/.test(String(imdbId).trim());
  const imdbBtn = isValidImdb ? `<a href="https://www.imdb.com/title/${String(imdbId).trim()}/" target="_blank" style="display:inline-block;padding:4px 14px;background:#f5c518;color:#000;border-radius:20px;text-decoration:none;font-size:11px;font-weight:bold;">▶ IMDb</a>` : '';

  const directorStr = director ? ` &nbsp;•&nbsp; 監督：<span class="no-link">${director}</span>` : '';
  const castHtml = cast ? `<div style="font-size:12px;color:#666;margin-bottom:8px;">👥 キャスト：<span class="no-link">${cast}</span></div>` : '';
  const posterHtml = posterUrl ? `<div style="flex-shrink:0;"><img src="${posterUrl}" alt="${titleJa}" style="width:80px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);" onerror="this.style.display='none';"></div>` : '';

  const origTitleSpan = titleOrig ? `<span style="font-size:13px;color:#666;font-weight:normal;margin-left:6px;">(${titleOrig})</span>` : '';

  if (isOsusume) {
    html += `
<div style="background:${bg};border:1px solid #eee;border-radius:12px;padding:16px;margin:15px 0;box-shadow:0 4px 12px rgba(0,0,0,0.05);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#00bcd4;"></div>
  <div style="display:flex;gap:16px;align-items:flex-start;padding-left:8px;">
    <div style="flex:1;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <span style="background:#00bcd4;color:#fff;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;">🎬</span>
        <span style="font-weight:800;font-size:16px;color:#333;">${titleJa} ${origTitleSpan}</span>
      </div>
      <div style="font-size:13px;color:#666;margin-bottom:10px;">
        📅 ${year}${type ? ' &nbsp;•&nbsp; ' + type : ''}
        ${director ? '<br><span style="color:#555;font-size:12px;">🎬 監督：<span class="no-link">' + director + '</span></span>' : ''}
        ${cast ? '<br><span style="color:#555;font-size:12px;">👥 キャスト：<span class="no-link">' + cast + '</span></span>' : ''}
      </div>
      ${summary ? `<div style="font-size:13.5px;color:#444;line-height:1.6;margin-bottom:10px;">${summary}</div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${youtubeBtn}
        ${imdbBtn}
      </div>
    </div>
    ${posterHtml}
  </div>
</div>`;
  } else {
    html += `
<div style="background:${bg};border:1px solid #eee;border-radius:12px;padding:16px;margin:15px 0;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
  <div style="display:flex;gap:16px;align-items:flex-start;">
    <div style="flex:1;">
      <div style="font-weight:800;font-size:16px;color:#333;margin-bottom:6px;">${isSerious ? '⚠️ ' : ''}${titleJa} ${origTitleSpan}</div>
      <div style="font-size:12px;color:#008080;font-weight:bold;margin-bottom:10px;">${type} &nbsp;•&nbsp; ${year}${directorStr}</div>
      ${castHtml}
      ${summary ? `<div style="font-size:13.5px;color:#444;line-height:1.6;margin-bottom:10px;">${summary}</div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
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


