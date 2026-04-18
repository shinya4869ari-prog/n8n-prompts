const promptBody = $input.first()?.json?.externalPrompt ?? "";

return $input.all().map(item => {
  // --- 1. 入力データの整理 ---
  let raw = item.json?.article ?? "";
  const inputData = item.json;

  let article = raw;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed[0]?.html) {
      article = parsed[0].html;
    } else if (parsed?.html) {
      article = parsed.html;
    }
  } catch(e) {}

  // --- 2. タイトルの決定（強化版） ---
  const countryFromText = article.match(/対象国名[：:]\s*([^\s<#]+)/)?.[1];
  const countryName = countryFromText || inputData.target_country || inputData.targetCountry || inputData.country || inputData["対象国"] || inputData.title || "対象国";
  const title = countryName;

  // --- 3. HTMLタグの調整 ---
  article = article.replace(/<h1([^>]*)>([\s\S]*?)<\/h1>/gi, '<h2$1>$2</h2>');
  article = article.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  article = article.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  article = article.replace(/^#\s+(.+)$/gm, '<h2>$1</h2>');
  
  // 見出しの重複を削除
  article = article.replace(/(<(h[23])[^>]*>)(.*?)<\/\2>\s*\*\*\3\*\*/gi, '$1$3</$2>');
  article = article.replace(/(\*\*[^*]+\*\*)\s*\n\s*\1/g, '$1');

  // MarkdownリンクをHTMLリンクへ
  article = article.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // --- 4. グラフ変換 (刑務所データ) - 判定を強化 ---
  article = article.replace(
    /(<h[23][^>]*>[^<]*刑務所.*推移[^<]*<\/h[23]>|刑務所.*推移)\s*([\s\S]*?)(<\/table>)/gi,
    (match, heading, middle, closing) => {
      const tableHtml = middle + closing;
      const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => m[1]);
      const years = [], targetData = [], japanData = [];

      rows.forEach(r => {
        const cells = [...r.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => c[1].replace(/<[^>]+>/g, '').trim());
        if (!cells[0] || cells[0].includes('年')) return;
        const toNum = v => {
          if (!v || v === 'データなし') return null;
          const n = parseInt(v.replace(/,/g, ''));
          return isNaN(n) ? null : n;
        };
        years.push(cells[0]);
        targetData.push(toNum(cells[1]));
        japanData.push(toNum(cells[3]));
      });

      if (years.length === 0) return match;

      const id = 'chart_' + Math.random().toString(36).slice(2, 8);
      return `${heading}
<div style="display:flex;gap:16px;margin:10px 0;font-size:13px;color:#666;">
  <span style="display:flex;align-items:center;gap:6px;"><span style="width:24px;height:2px;background:#E24B4A;display:inline-block;"></span>対象国</span>
  <span style="display:flex;align-items:center;gap:6px;"><span style="width:24px;height:2px;background:#1D9E75;border-top:2px dashed #1D9E75;display:inline-block;"></span>日本</span>
</div>
<div style="position:relative;width:100%;height:300px;"><canvas id="${id}"></canvas></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"><\/script>
<script>
(function(){
  var ctx = document.getElementById('${id}');
  if(!ctx) return;
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ${JSON.stringify(years)},
      datasets: [
        { label: '対象国', data: ${JSON.stringify(targetData)}, borderColor: '#E24B4A', backgroundColor: 'rgba(226,75,74,0.08)', borderWidth: 2, pointRadius: 4, tension: 0.3, spanGaps: true },
        { label: '日本', data: ${JSON.stringify(japanData)}, borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.08)', borderWidth: 2, pointRadius: 4, tension: 0.3, borderDash: [6,3], spanGaps: true }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false, ticks: { callback: function(v){ return v.toLocaleString() + '人'; } } } } }
  });
})();
<\/script>`;
    }
  );

  // --- 5. 映像・ランキングテーブルをカード型に変換 ---
  article = article.replace(
    /<table[^>]*>([\s\S]*?)<\/table>/gi,
    (tableHtml, tableContent) => {
      const isFilmTable = tableContent.includes('種別') && tableContent.includes('概要');
      const isRankingTable = tableContent.includes('観客動員数') || tableContent.includes('興行収入');

      if (!isFilmTable && !isRankingTable) return tableHtml;

      const rows = [...tableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => m[1]);
      if (rows.length < 2) return tableHtml;

      const decorateLinks = (html) => {
        if (!html) return '';
        return html
          .replace(/<a /g, `<a style="display:inline-flex; align-items:center; padding:5px 12px; margin:2px; border-radius:20px; font-size:11px; font-weight:700; text-decoration:none; box-shadow:0 2px 4px rgba(0,0,0,0.05); color:#fff;" `)
          .replace(/>Wikipedia<\/a>/g, ` style="background:#3366cc;">W Wikipedia</a>`)
          .replace(/>IMDb<\/a>/g, ` style="background:#f5c518; color:#000;">IMDb</a>`)
          .replace(/>(YouTube予告編|予告編)<\/a>/g, ` style="background:#ff0000;">▶ Trailer</a>`);
      };

      try {
        const cards = rows.slice(1).map(row => {
          const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m => m[1].trim());
          if (cells.length < 3) return '';
          const isSeriousRow = row.includes('fff3f3') || row.includes('⚠️');
          const bgColor = isSeriousRow ? '#fffcfc' : '#ffffff';
          const accentColor = isRankingTable ? '#ff4500' : '#008080';

          if (isRankingTable) {
            const [rank, t, y, r, l] = cells;
            return `<div style="background:${bgColor}; border:1px solid #eee; border-radius:12px; padding:16px; margin:15px 0; box-shadow:0 4px 12px rgba(0,0,0,0.05); position:relative; overflow:hidden;"><div style="position:absolute; top:0; left:0; width:4px; height:100%; background:${accentColor};"></div><div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;"><span style="background:${accentColor}; color:#fff; border-radius:6px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:16px;">${rank.replace(/[^0-9]/g,'')}</span><span style="font-weight:800; font-size:16px;">${t}</span></div><div style="font-size:13px; color:#666; margin-bottom:12px;">📅 ${y} &nbsp;|&nbsp; 👥 ${r}</div><div>${decorateLinks(l)}</div></div>`;
          } else {
            const [, t, ty, y, s, l] = cells;
            return `<div style="background:${bgColor}; border:1px solid #eee; border-radius:12px; padding:16px; margin:15px 0; box-shadow:0 4px 12px rgba(0,0,0,0.08);"><div style="font-weight:800; font-size:16px; color:#222; margin-bottom:6px;">${isSeriousRow?'⚠️ ':''}${t}</div><div style="font-size:12px; color:${accentColor}; font-weight:bold; margin-bottom:10px;">${ty} &nbsp;•&nbsp; ${y}</div><div style="font-size:14px; color:#444; line-height:1.6; margin-bottom:12px;">${s}</div><div>${decorateLinks(l)}</div></div>`;
          }
        }).join('');
        return cards || tableHtml;
      } catch (e) {
        return tableHtml;
      }
    }
  );

  // --- 6. 最終データの出力 ---
  return {
    json: {
      article: promptBody ? `${promptBody}\n\n${article}` : article,
      title: title,
      target_country: countryName,
      processedAt: new Date().toISOString()
    }
  };
});
