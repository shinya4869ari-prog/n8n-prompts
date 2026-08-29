/**
 * ==============================================================================
 * 日本版 ⑥ 日本のおすすめ音楽・ナショナルサウンドトラック HTML生成コード
 * ==============================================================================
 * 入力: Supabase tracksテーブル、またはiTunes/AIから取得した日本音楽データ
 * 出力: <!-- SECTION:music:START --> ... <!-- SECTION:music:END -->
 * ==============================================================================
 */

const items = $input.all().map(item => item.json);
if (!items || items.length === 0) {
  return [{ json: { html: '', section_html: '' } }];
}

let trig = {};
try {
  trig = $('On form submission').first()?.json || $('トリガー').first()?.json || {};
} catch (e) {}

// 音楽リストの抽出 (recommend_music または tracks または items)
let musicList = [];
if (items[0]?.recommend_music && Array.isArray(items[0].recommend_music)) {
  musicList = items[0].recommend_music;
} else if (items[0]?.tracks && Array.isArray(items[0].tracks)) {
  musicList = items[0].tracks;
} else if (Array.isArray(items)) {
  musicList = items;
}

if (musicList.length === 0) {
  return [{ json: { html: '', section_html: '' } }];
}

const sectionId = 'music';
const themeColor = '#d32f2f';
const h2Style = `margin-top:60px;padding:14px 20px;background:#fffafa;border-left:4px solid ${themeColor};border-radius:8px;font-size:16px;font-weight:800;color:#111;`;
const backToTopBtn = `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(211,47,47,0.12);color:#d32f2f;text-decoration:none;border-radius:20px;font-weight:600;font-size:11px;transition:0.2s;">▲ 先頭に戻る</a></div>`;

function enc(t) {
  try { return btoa(unescape(encodeURIComponent(t || ''))); }
  catch (e) { return ''; }
}

let html = `<!-- SECTION:${sectionId}:START -->\n`;
html += `<h2 id="section-6" style="${h2Style}"><span style="background:${themeColor};color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑥</span> 日本のおすすめ音楽・ナショナルサウンドトラック</h2>\n`;

musicList.forEach((d, idx) => {
  let trackName = d['track_name'] || d['曲名'] || d.title || '';
  if (!trackName) return;

  const trackNameEn = d['track_name_en'] || d['曲名_英語'] || '';
  let artistName = d['artist_name'] || d['アーティスト'] || d.artist || '';
  const artistNameEn = d['artist_name_en'] || d['アーティスト_英語'] || '';
  const releaseYear = d['release_year'] || d['リリース年'] || d['年'] || d.year || '';
  const previewUrl = d.preview_url || '';
  const itunesUrl = d.itunes_url || d.spotify_url || '';
  const coverUrl = d.album_cover || d.ジャケット || d.cover_url || '';
  const description = d.description || d.概要 || d.overview || '';

  // 日本のアーティスト名のカタカナ表記を正規の日本語（漢字・公式表記）に自動補正
  const jpArtistClean = {
    'サカモト・キュウ': '坂本九',
    'ミソラ・ヒバリ': '美空ひばり',
    'マツトウヤ・ユミ': '松任谷由実',
    'イシカワ・サユリ': '石川さゆり',
    'サカモト・リュウイチ': '坂本龍一',
    'ヨシダ・キョウダイ': '吉田兄弟',
    'コドウ': '鼓童',
    'ウタダ・ヒカル': '宇多田ヒカル',
    'ヨアソビ': 'YOASOBI',
    'シム': 'SiM'
  };
  if (jpArtistClean[artistName]) {
    artistName = jpArtistClean[artistName];
  }

  const isSameTrack = !trackNameEn || trackNameEn.trim().toLowerCase() === trackName.trim().toLowerCase();
  const isSameArtist = !artistNameEn || artistNameEn.trim().toLowerCase() === artistName.trim().toLowerCase();

  const trackTitleSpan = !isSameTrack ? `<span style="font-size:13px;color:#666;font-weight:normal;margin-left:6px;">(${trackNameEn})</span>` : '';
  const artistSpan = !isSameArtist ? `<span style="font-size:12px;color:#888;font-weight:normal;margin-left:4px;">(${artistNameEn})</span>` : '';

  const trackId = d.track_id || d.trackId || d.itunes_id || d.id || '';
  const searchQuery = `${artistName} ${trackName}`;
  const idParam = trackId ? `&id=${encodeURIComponent(trackId)}` : '';
  const mapUrl = `https://map.seronworks.dev/?mode=music${idParam}&q=${encodeURIComponent(searchQuery)}`;
  const linkHTML = `<br><br><a href="${mapUrl}" target="history_gallery" style="display:inline-block;padding:10px 20px;background:#20B2AA;color:#fff;text-decoration:none;border-radius:25px;font-weight:bold;font-size:13px;">🏛️ 国家の天秤 歴史館で詳しく見る</a>`;
  
  const popupTitleStr = `${trackName} - ${artistName}`;
  const encTitle = enc(popupTitleStr);
  const encLink = enc(linkHTML);
  const onclick = `var d=function(s){return decodeURIComponent(escape(atob(s)));};document.getElementById("tenbin-popup-title").textContent=d("${encTitle}");document.getElementById("tenbin-popup-info").innerHTML=d("${encLink}");document.getElementById("tenbin-popup").style.display="block";document.getElementById("tenbin-overlay").style.display="block";`;
  
  const titleLinkHtml = `<span style="color:#20B2AA;border-bottom:1px dashed #20B2AA;cursor:pointer;font-weight:bold;" onclick='${onclick}'>${trackName}</span> ${trackTitleSpan}`;

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
  const artistLinkBlog = `<a href="${artistPersonUrl}" target="history_gallery" style="color:#20B2AA;text-decoration:underline;font-weight:bold;" title="${artistName}の人物アーカイブを見る">🎤 ${artistName}</a>`;

  html += `
<div style="background:#ffffff;border:1px solid #eef2f5;border-radius:12px;padding:18px 20px;margin:20px 0;box-shadow:0 4px 15px rgba(0,0,0,0.06);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#20B2AA;"></div>
  <div style="display:flex;gap:16px;align-items:flex-start;padding-left:6px;">
    <div style="flex:1;">
      <div style="font-weight:800;font-size:17px;color:#111;margin-bottom:6px;">${titleLinkHtml}</div>
      <div style="font-size:13px;color:#555;margin-bottom:8px;">${artistLinkBlog} ${artistSpan} &nbsp;•&nbsp; 📅 ${releaseYear}</div>
      ${description ? `<div style="font-size:13px;color:#666;line-height:1.6;margin-bottom:10px;">${description}</div>` : ''}
      ${audioPlayerHtml}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        ${appleMusicBtn}
        ${youtubeBtn}
      </div>
    </div>
    ${coverHtml}
  </div>
</div>`;
});

// エラーネコの一言
const customNeko = trig.neko_comment || trig.error_neko || items[0]?.neko_comment || '';
const nekoText = customNeko || '伝統的な邦楽から、世界を席巻するシティポップ、アニメソング、J-POPまで。豊かなメロディと独自の音響世界を持つ日本の音楽文化は、いまや言語の壁を越えて世界中のリスナーを魅了しています。';

html += `
<div style="margin: 25px 0; display: flex; align-items: flex-start; gap: 12px;">
  <div style="font-size: 24px;">🐱</div>
  <div style="position: relative; background: #fffafa; border: 1px solid #ffebee; border-radius: 12px; padding: 14px 18px; font-size: 13px; line-height: 1.6; color: #444; flex: 1; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
    <div style="position: absolute; top: 12px; left: -8px; width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-right: 8px solid #fffafa;"></div>
    <strong>エラーネコの一言：</strong><br>${nekoText}
  </div>
</div>\n`;

html += backToTopBtn;
html += `<!-- SECTION:${sectionId}:END -->\n`;

return [{
  json: {
    section_type: 'music',
    section_html: html,
    html: html,
    country: '日本',
    count: musicList.length
  }
}];
