# 【モジュール 04: 映画セクション（Supabaseデータ連携）】

このモジュールは、Supabaseの `Movies` テーブルから指定国の映画データを取得し、ブログ記事に埋め込める単体HTMLパーツ（`movie_section_html`）を組み立てます。

## n8n 処理構造

```
[1. Supabase ノード (Get Many Rows)]
  - Table: Movies
  - Filter: country = {{ $json.country }}
  - Order By: is_recommended.desc, tmdb_id.desc
  - Limit: 10
      │
[2. Code ノード (映画HTMLパーツ組み立て)]
```

## Code ノード (JavaScript)

```javascript
const items = $input.all().map(item => item.json);
if (!items || items.length === 0) {
  return [{ json: { movie_section_html: '' } }];
}

let movieItemsHtml = '';

items.forEach((movie, index) => {
  const rank = index + 1;
  const title = movie.title || 'タイトル未定';
  const originTitle = movie.origin_title ? `<span style="font-size:13px;color:#666;margin-left:8px;">(${movie.origin_title})</span>` : '';
  const poster = movie.poster_url ? `<div style="text-align:center;margin-bottom:15px;"><img src="${movie.poster_url}" alt="${title}" style="max-width:200px;width:100%;border-radius:6px;box-shadow:0 3px 10px rgba(0,0,0,0.12);"></div>` : '';
  const genres = movie.genres ? `<span style="background:#e8eaf6;color:#1a237e;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:bold;margin-left:8px;">${movie.genres}</span>` : '';
  const overview = movie.overview ? `<p style="font-size:13.5px;line-height:1.8;color:#333;background:#f9f9f9;padding:12px 15px;border-left:4px solid #1a237e;margin:12px 0;">${movie.overview}</p>` : '';
  const director = movie.director ? `<li><strong>🎬 監督:</strong> ${movie.director} ${movie.director_en ? `(${movie.director_en})` : ''}</li>` : '';
  const cast = movie.cast ? `<li><strong>👥 出演:</strong> ${movie.cast} ${movie.cast_en ? `(${movie.cast_en})` : ''}</li>` : '';

  let trailerHtml = '';
  if (movie.trailer_url && movie.trailer_url.includes('youtube.com')) {
    const embedUrl = movie.trailer_url.replace('watch?v=', 'embed/');
    trailerHtml = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin-top:12px;border-radius:6px;"><iframe src="${embedUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div>`;
  }

  movieItemsHtml += `
<div class="movie-card-item" style="margin-bottom:35px;padding-bottom:25px;border-bottom:1px dashed #ddd;">
  <h4 style="font-size:17px;font-weight:bold;color:#1a237e;margin-bottom:12px;">${rank}. ${title} ${originTitle} ${genres}</h4>
  ${poster}
  ${overview}
  <ul style="list-style:none;padding:0;margin:10px 0;line-height:1.7;font-size:13.5px;color:#444;">
    ${director}
    ${cast}
  </ul>
  ${trailerHtml}
</div>
`;
});

const movieSectionHtml = `
<!-- START_MOVIE_SECTION -->
<div id="recommended-movies-section" style="margin:40px 0;padding:25px;background:#ffffff;border:1px solid #e0e0e0;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
  <h3 style="font-size:19px;font-weight:bold;color:#1a237e;border-left:5px solid #1a237e;padding-left:12px;margin-bottom:25px;">🎬 この国の文化を知る！おすすめ映画セレクション</h3>
  ${movieItemsHtml}
</div>
<!-- END_MOVIE_SECTION -->
`.trim();

return [{
  json: {
    movie_section_html: movieSectionHtml
  }
}];
```
