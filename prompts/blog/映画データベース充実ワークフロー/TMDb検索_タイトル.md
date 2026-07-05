https://api.themoviedb.org/3/search/movie

{{
  (() => {
    const currentTitle = ($('Loop Over Items').item.json.origin_title || $('Loop Over Items').item.json.title || '').trim();
    
    return JSON.stringify({
      "query": currentTitle
    });
  })()
}}
