https://api.themoviedb.org/3/search/movie

{{
  (() => {
    const currentTitle = ($('Loop Over Items').item.json.origin_title || $('Loop Over Items').item.json.title || '').trim();
    const currentLang = ($('Loop Over Items').item.json.target_lang || 'ja');
    
    // 日本語以外の言語の場合、その言語で検索する（日本語タイトルでも元の言語で検索した方が精度が良い場合があるため）
    const langParam = (currentLang !== 'ja') ? currentLang : 'ja-JP';
    
    return JSON.stringify({
      "query": currentTitle,
      "language": langParam
    });
  })()
}}
