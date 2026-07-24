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

    const hasSubstantialOverview = overview.trim().length >= 300;

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

    if (hasSubstantialOverview) {
      // ----------------------------------------------------
      // パターン1: 十分な公式あらすじ（外国語）がある場合の翻訳・要約ルート
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
      // パターン2: 公式あらすじが無い、あるいは短すぎる場合の検索・翻訳補強ルート
      // ----------------------------------------------------
      return `あなたは映画紹介ライターです。提供された「公式あらすじ（ある場合）」および「検索結果」に記載されている事実のみを使い、映画「${movieTitle}」の紹介文（解説・ストーリー紹介文）を日本語で作成してください。

ルール：
- 提供された公式あらすじや検索結果の情報に書かれていない情報は絶対に含めないでください。推測、想像、推論による情報は一切排除してください。
- 公開日（公開年）、制作国、監督名、キャスト名などの基本情報（メタデータ）は紹介文の文章中に記述しないこと（純粋な解説・ストーリー紹介文のみを出力する）。
- ネタバレは含めないでください。
- **メタ発言・言い訳・謝罪の絶対禁止（情報不足時は空文字を出力）**：「情報が少なすぎます」「申し訳ありません」「追加情報をお願いします」「情報が限定的です」といった**言い訳、解説、評価、謝罪、依頼・会話文は絶対に一切出力しないでください**。情報が不足していて紹介文を作成できない場合は、文章や謝罪メッセージを一切書かず、**完全な空文字（何も出力しない）**にしてください。
- 前置きや挨拶（「〜をご紹介します」など）や、見出し（「# 映画名」や「## 紹介文」など）は一切出力しないでください。紹介文の本文のみを出力してください。
- 公式あらすじ（英語など）が提供されている場合は、その内容をストーリーの主軸（核）とし、検索結果から得られる具体的な設定や背景情報で肉付けを行ってください。

対象映画：${movieTitle}
オリジナルタイトル（原題）：${originalTitle}
英題：${englishTitle}

公式あらすじ（短い）：
${overview || 'なし'}

検索結果：
${braveSearch}`;
    }
  })()
}}
