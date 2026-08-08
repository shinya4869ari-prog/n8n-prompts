/**
 * 【音楽セクション (⑩おすすめ音楽) HTML生成コード】
 * 
 * 音楽検索サブワークフロー（iTunes API + AI Screener）から受け取った
 * `recommend_music` 配列を元に、HTMLカードおよび30秒試聴プレイヤーを生成します。
 * 出力: <!-- SECTION:music:START --> ... <!-- SECTION:music:END -->
 */

const items = $input.all().map(item => item.json);
if (!items || items.length === 0) {
  return [{ json: { html: '', section_html: '' } }];
}

let countryName = '対象国';
try {
  const trig = $('On form submission').first()?.json || $('トリガー').first()?.json || $('Execute Workflow Trigger').first()?.json || {};
  countryName = trig.country_name || trig.country_ja || trig.country || countryName;
} catch (e) {}

if ((countryName === '対象国' || countryName === 'BT') && items[0]) {
  countryName = items[0].countryJa || items[0].country_name || items[0].country_ja || items[0].country || countryName;
}

// 音楽リストの抽出 (recommend_music または tracks)
let musicList = [];
if (items[0].recommend_music && Array.isArray(items[0].recommend_music)) {
  musicList = items[0].recommend_music;
} else if (items[0].tracks && Array.isArray(items[0].tracks)) {
  musicList = items[0].tracks;
} else if (Array.isArray(items)) {
  musicList = items;
}

if (musicList.length === 0) {
  return [{ json: { html: '', section_html: '' } }];
}

const sectionId = 'music';
const h2Style = `margin-top:60px;padding:14px 20px;background:#f5f5f5;border-left:3px solid #ff4081;border-radius:8px;font-size:16px;font-weight:500;color:#111;`;

let html = `<!-- SECTION:${sectionId}:START -->\n`;
html += `<h2 id="section-10" style="${h2Style}"><span style="background:#ff4081;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑩</span> 特別枠：${countryName} おすすめ音楽・ナショナルサウンドトラック</h2>\n`;

function enc(t) {
  try { return btoa(unescape(encodeURIComponent(t || ''))); }
  catch (e) { return ''; }
}

musicList.forEach((d, idx) => {
  const trackName = d.track_name || d.曲名 || '';
  const artistName = d.artist_name || d.アーティスト || '';
  const releaseYear = d.release_year || d.リリース年 || '';
  const previewUrl = d.preview_url || '';
  const itunesUrl = d.itunes_url || d.spotify_url || '';
  const coverUrl = d.album_cover || d.ジャケット || '';
  const description = d.description || d.概要 || '';

  const searchQuery = `${artistName} ${trackName}`;
  const mapUrl = `https://map.seronworks.dev/?mode=music&q=${encodeURIComponent(searchQuery)}`;
  const linkHTML = `<br><br><a href="${mapUrl}" target="history_gallery" style="display:inline-block;padding:10px 20px;background:#ff4081;color:#fff;text-decoration:none;border-radius:25px;font-weight:bold;font-size:13px;">🏛️ 国家の天秤 歴史館で詳しく見る</a>`;
  
  const popupTitleStr = `${trackName} - ${artistName}`;
  const n = enc(popupTitleStr);
  const i = enc(linkHTML);
  const onclick = `var d=function(s){return decodeURIComponent(escape(atob(s)));};document.getElementById("tenbin-popup-title").textContent=d("${n}");document.getElementById("tenbin-popup-info").innerHTML=d("${i}");document.getElementById("tenbin-popup").style.display="block";document.getElementById("tenbin-overlay").style.display="block";`;
  
  const titleLinkHtml = `<span style="color:#ff4081;border-bottom:1px dashed #ff4081;cursor:pointer;font-weight:bold;" onclick='${onclick}'>${trackName}</span>`;

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

  const coverHtml = coverUrl ? `<div style="flex-shrink:0;margin-left:12px;"><img src="${coverUrl}" alt="${trackName}" style="width:90px;height:90px;object-fit:cover;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);" onerror="this.style.display='none';"></div>` : '';

  html += `
<div style="background:#ffffff;border:1px solid #eef2f5;border-radius:12px;padding:18px 20px;margin:20px 0;box-shadow:0 4px 15px rgba(0,0,0,0.05);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#ff4081;"></div>
  <div style="display:flex;gap:16px;align-items:flex-start;padding-left:6px;">
    <div style="flex:1;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
        <span style="background:#ff4081;color:#fff;border-radius:6px;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;">${idx + 1}</span>
        <span style="font-weight:800;font-size:17px;color:#111;">${titleLinkHtml}</span>
      </div>
      <div style="font-size:13px;color:#ff4081;font-weight:bold;margin-bottom:8px;">🎤 ${artistName}${releaseYear ? ` &nbsp;•&nbsp; ${releaseYear}年` : ''}</div>
      ${audioPlayerHtml}
      ${description ? `<div style="font-size:14px;color:#2c3e50;line-height:1.75;margin-bottom:12px;letter-spacing:0.02em;">${description}</div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        ${appleMusicBtn}
      </div>
    </div>
    ${coverHtml}
  </div>
</div>`;
});

html += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(255,64,129,0.15);color:#ff4081;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
html += `<!-- SECTION:${sectionId}:END -->\n`;

return [{
  json: {
    html: html,
    section_html: html,
    section_type: sectionId
  }
}];
