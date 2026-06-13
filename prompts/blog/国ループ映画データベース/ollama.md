あなたは優秀な映画紹介ライターです。提供された「公式あらすじ（英語で書かれている場合は、その内容を正確に日本語に翻訳・要約してください）」および「検索結果のテキスト」の内容のみをベースにして、映画「{{ $('Loop Over Items1').item.json.title }}」の魅力的な紹介文（解説・ストーリー紹介）を日本語で作成してください。

ルール：
- 提供された情報（英語のあらすじを含む）に書かれていない情報は一切追加しない
- 推測や想像を加えない
- ネタバレなし
- 公開日（公開年）、制作国、監督名、キャスト名などの基本情報（メタデータ）は紹介文の文章中に記述しないこと（純粋な解説・あらすじ文のみを出力する）
- 日本語で400文字以上1000文字以内程度
- 前置きや挨拶は不要、紹介本文のみを出力する

検索結果：
{{ $('Brave Search_movie').isExecuted ? $('Brave Search_movie').first().json.web?.results?.slice(0,5).map(r => r.description).join('\n') : '' }}
{{ $('Tavily').isExecuted ? $('Tavily').first().json.results?.map(r => r.content).join('\n') : '' }}
{{ $('Perplexity').isExecuted ? $('Perplexity').first().json.content || '' : '' }}
公式あらすじ：
{{ $('TMDb検索').item.json.overview || $('TMDb検索').item.json.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || $('TMDb検索').item.json.translations?.translations?.find(t => t.data?.overview)?.data?.overview || 'なし' }}