あなたは映画紹介ライターです。提供された「検索結果のテキスト」と「公式あらすじ」に記載されている事実のみを使い、映画「{{ (() => { const tmdb = $('TMDb検索').first().json; const sourceData = $('Loop Over Items').item.json; const resultsList = tmdb.results || tmdb.movie_results || (tmdb.id ? [tmdb] : []); let result = resultsList.length > 0 ? resultsList.find(m => (m.original_language === sourceData.target_lang) || (m.origin_country && m.origin_country.includes(sourceData.target_country))) : null; if (!result && resultsList.length > 0) { result = resultsList[0]; } const officialTitle = result?.title; const inputTitle = sourceData.title; return (/^\d+$/.test(inputTitle || '') ? null : inputTitle) || officialTitle || ''; })() }}」の紹介文（解説・ストーリー紹介）を日本語で作成してください。

ルール：
- 提供された情報に書かれていない情報は絶対に含めないでください。
- 推測、想像、推論による情報は一切排除してください。
- 公開日（公開年）、制作国、監督名、キャスト名などの基本情報（メタデータ）は紹介文の文章中に記述しないこと（純粋な解説・ストーリー紹介文のみを出力する）
- ネタバレは含めないでください。
- 文字数は日本語で400文字以上1000文字以内程度としますが、提供された情報が極端に少なく事実のみでは400文字に達しない場合は、文字数を稼ぐための嘘や憶測による引き伸ばしを行わず、400文字未満になっても構いませんので正確な事実のみを記述してください。
- **重要（翻訳・文体の質）**：公式あらすじが英語で提供されている場合、単なる機械的な直訳は避けてください。映画紹介ライターとして、読者を惹きつける**自然でドラマチックな日本語表現**（プロが執筆するレビューのような文体）に翻訳・要約してください。
  - 例："corrupt city" は「汚染された都市」のような直訳を避け、「腐敗した街」や「治安の悪い都市」など、映画の世界観に合わせた適切な訳語を選んでください。
  - 単にあらすじの事実を羅列するだけでなく、登場人物の葛藤やストーリーの緊張感が伝わるような、メリハリのある美しい日本語文章に仕上げてください。紹介文の中に英語の文章をそのまま残してはいけません。
- 前置きや挨拶（「〜をご紹介します」など）や、見出し（「# 映画名」や「## 紹介文」など）は一切出力しないでください。紹介文の本文（段落）のみを出力してください。

検索結果：
{{ $('Tavily').isExecuted ? $('Tavily').first().json.results?.slice(0,5).map(r => r.content).join('\n') : '' }}

公式あらすじ：
{{
  (() => {
    const tmdb = $('TMDb検索').first().json;
    const sourceData = $('Loop Over Items').item.json;
    const resultsList = tmdb.results || tmdb.movie_results || (tmdb.id ? [tmdb] : []);
    let result = null;
    if (resultsList.length > 0) {
      result = resultsList.find(m => 
        (m.original_language === sourceData.target_lang) || 
        (m.origin_country && m.origin_country.includes(sourceData.target_country))
      );
      if (!result) {
        result = resultsList[0];
      }
    }
    return result?.overview || 
           result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || 
           result?.translations?.translations?.find(t => t.data?.overview)?.data?.overview || 
           'なし';
  })()
}}
