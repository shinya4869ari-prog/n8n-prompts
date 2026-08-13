https://api.themoviedb.org/3/search/multi

{{
  (() => {
    let source = {};
    const nodeNames = ['入力統一・分割コード', 'On form submission1', 'Loop Over Items', '映画ごとにループ実行'];
    for (const name of nodeNames) {
      try {
        const d = $(name).first()?.json || $(name).item?.json;
        if (d && (d.title || d.origin_title || d.query)) {
          source = d;
          break;
        }
      } catch(e) {}
    }
    if (!source.title && !source.origin_title && !source.query) {
      source = $input.first()?.json || {};
    }
    
    const currentTitle = (source.origin_title || source.title || source.query || '').trim();
    const currentLang = (source.target_lang || 'ja');
    const langParam = (currentLang !== 'ja') ? currentLang : 'ja-JP';
    
    return JSON.stringify({
      "query": currentTitle,
      "language": langParam
    });
  })()
}}
