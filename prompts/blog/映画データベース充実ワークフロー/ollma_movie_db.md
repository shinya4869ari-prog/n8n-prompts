{{
  (() => {
    // 1. 各ノードからデータを取得する共通処理
    let tmdb = {};
    let sourceData = {};
    try {
      tmdb = $('TMDb検索').first().json;
    } catch (e) {}
    try {
      sourceData = $('Loop Over Items').item.json;
    } catch (e) {
      try {
        sourceData = $('Loop Over Items1').item.json;
      } catch (e2) {
        try {
          sourceData = $('映画ごとにループ実行').item.json;
        } catch (e3) {
          sourceData = $input.item?.json || {};
        }
      }
    }
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

    // 映画タイトル決定ロジック
    const officialTitle = result?.title;
    const inputTitle = sourceData.title;
    const movieTitle = (/^\d+$/.test(inputTitle || '') ? null : inputTitle) || officialTitle || '';

    // あらすじ取得
    const overview = result?.overview || 
                     result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || 
                     result?.translations?.translations?.find(t => t.data?.overview)?.data?.overview || 
                     '';

    const hasOverview = overview.trim().length > 0;

    // Brave Search結果取得
    let braveSearch = '';
    try {
      const brave = $('Brave Search_movie');
      if (brave && brave.isExecuted) {
        braveSearch = (brave.item?.json?.web?.results || []).slice(0, 5).map(r => r.movie?.description || r.description).join('\n');
      }
    } catch (e) {}

    // オリジナルタイトル情報
    const originalTitle = result?.original_title || '';
    const englishTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.title || '';

    if (hasOverview) {
      // ----------------------------------------------------
      // パターン1: 公式あらすじ（外国語）の翻訳ルート
      // ----------------------------------------------------
      return `あなたはプロの翻訳家および映画紹介ライターです。提供された外国語の「公式あらすじ」を、映画の世界観に合わせた自然でドラマチックな日本語の紹介文（解説・ストーリー紹介文）に翻訳・要約してください。

ルール：
- 提供された「公式あらすじ」に書かれていない情報は絶対に含めないでください。推測、想像、推論による情報は一切排除してください。
- 翻訳にあたって、文字数稼ぎのための嘘や憶測による引き延ばしは絶対にしないでください。元の情報に基づいた正確な翻訳・要約のみを行ってください。
- 登場人物などの人名や地名といった外国語の名前（例: Bum-seok、Sung-ae など）が英語アルファベット表記のまま紹介文に残らないようにしてください。必ず自然な日本語のカタカナ表記（例: 「ボムソク」「ソンエ」など）に翻訳して出力してください。
- 前置きや挨拶（「〜をご紹介します」など）や、見出し（「# 映画名」や「## 紹介文」など）は一切出力しないでください。紹介文の本文（段落）のみを出力してください。

公式あらすじ：
${overview}`;

    } else {
      // ----------------------------------------------------
      // パターン2: 公式あらすじがない場合の検索作成ルート
      // ----------------------------------------------------
      return `あなたは映画紹介ライターです。提供された「検索結果」に記載されている事実のみを使い、映画「${movieTitle}」の紹介文（解説・ストーリー紹介文）を日本語で作成してください。

ルール：
- 提供された検索結果の情報に書かれていない情報は絶対に含めないでください。推測、想像、推論による情報は一切排除してください。
- 公開日（公開年）、制作国、監督名、キャスト名などの基本情報（メタデータ）は紹介文の文章中に記述しないこと（純粋な解説・ストーリー紹介文のみを出力する）。
- ネタバレは含めないでください。
- 文字数は日本語で400文字以上1000文字以内程度としますが、提供された情報が極端に少なく事実のみでは400文字に達しない場合は、文字数を稼ぐための嘘や憶測による引き伸ばしを行わず、400文字未満になっても構いませんので正確な事実のみを記述してください。
- 出力の最初の1行目に \`[TITLE: この映画の日本語タイトル]\` を必ず出力し、1行空けてから紹介文の本文（段落）を開始してください。
  - 日本の公式配給元などから発表されている正式な邦題がある場合は、それを最優先して出力してください。
  - 日本での正式な邦題がない（未公開など）場合は、提示されたオリジナルタイトルまたは英題のスペルのまま使用し、**一切日本語に翻訳・直訳しないでください。** AIによる独自の創作タイトルや過度な意訳は絶対に付けないでください。
- 登場人物などの人名や地名といった外国語の名前は必ず自然な日本語のカタカナ表記（例: 「ボムソク」「ソンエ」など）に翻訳して出力してください。
- 前置きや挨拶（「〜をご紹介します」など）や、見出し（「# 映画名」や「## 紹介文」など）は一切出力しないでください。紹介文の本文のみを出力してください。

対象映画：${movieTitle}
オリジナルタイトル（原題）：${originalTitle}
英題：${englishTitle}

検索結果：
${braveSearch}`;
    }
  })()
}}
