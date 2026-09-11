/**
 * 【n8n用】推し巡回 Google News RSS XML解析 ＆ 最新記事抽出 ＆ Geminiリクエスト生成コード
 * 
 * 役割:
 *  1. HTTP Requestノードで取得した各推しのRSS XMLを解析。
 *  2. 推し1名につき「最新のトップ1記事」を抽出。
 *  3. 【超重要】Gemini 3.8 Flash用の高精度報道生成リクエスト（gemini_request）をJavaScript内で安全に構築！
 *     => n8nのHTTP Requestノードで「invalid syntax」構文エラーが起きる問題を100%完全根絶！
 */

const allInputs = $input.all();
const results = [];

for (let i = 0; i < allInputs.length; i++) {
  const inputItem = allInputs[i];
  const rawXml = inputItem.json.data || inputItem.json.body || inputItem.json.response || '';
  
  let meta = inputItem.json;
  try {
    const prevNode = $('最優先5名選出 & RSS URL生成') || $('01_最優先5名選出 & RSS URL生成') || $('01_スプレッドシート設計と5名抽出コード') || $('Code');
    const prevItem = prevNode.all()[i]?.json;
    if (prevItem) {
      meta = { ...prevItem, ...meta };
    }
  } catch (e) {}

  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const match = itemRegex.exec(rawXml);

  if (match) {
    const content = match[1];
    let rawTitle = (content.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '')
      .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    const link = (content.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '').trim();
    const pubDate = (content.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || '').trim();
    const sourceMatch = content.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    let sourceName = sourceMatch ? sourceMatch[1].trim() : '';

    let cleanTitle = rawTitle;
    if (rawTitle.includes(' - ')) {
      const parts = rawTitle.split(' - ');
      sourceName = sourceName || parts.pop().trim();
      cleanTitle = parts.join(' - ').trim();
    }

    const personName = meta.person_name || '';
    const personKo = meta.person_korean_name || '';

    // Gemini 3.8 Flash 用のプロンプトをJS内で安全に生成（エスケープ不要）
    const promptText = `あなたは韓国の主要エンタメ・文化紙（OSEN、スポーツ朝鮮、イルガンスポーツ、聯合ニュース等）のベテラン芸能記者であり、同時に外国人向け韓国語教育の最高専門家です。

提供された推し（セレブ・俳優・K-POPアイドル等）のニュース速報をもとに、ファンの反響や作品の背景、今後の公式スケジュールまでを網羅した【本格的なエンタメ報道記事（4段落、ハングル計800〜1,200文字）】を再構成し、指定のJSON形式で出力してください。

【記事執筆の鉄則】
1. 芸能報道体（ハオチェ・ヘラ体「〜다고 밝혔다 / 〜(으)로 알려졌다 / 〜에 대한 기대감을 높였다」等）の格式高く洗練された韓国語を使用すること。
2. 短文ダイジェストで終わらせず、以下の【4段落構成】で読み応えのある充実したボリュームを持たせること：
   - 第1段落【活動・発表・最新近況】：誰がどんな新作（ドラマ/映画/アルバム/ファンミーティング等）や近況を発表したか（約200〜250字）
   - 第2段落【作品詳細・経緯・見どころ】：今回の役柄、コンセプト、撮影エピソード、過去の代表作からの進化（約300〜350字）
   - 第3段落【ファン・国内外の反響・業界評価】：ファンコミュニティやSNSの熱狂、メディアや関係者からの高評価（約250〜300字）
   - 第4段落【今後のスケジュール・公開予定・抱負】：初放送日、劇場公開日、公演日程、本人が語った今後の意気込み（約200字）
3. 各段落に対応する、極めて自然で流麗な【日本語訳（ja）】および【日本語タイトル（title_ja）】を付けること。
   ※【厳禁】日本語訳の中にハングル（例: 배우, 팬미팅, 개봉 等）を絶対に混入させないこと。必ず完全に自然な日本語（「俳優」「ファンミーティング」「公開」等）に翻訳すること。
4. 記事の中から、学習者が覚えるべき【重要語彙（10〜15語）】を抽出し、品詞・漢字・難易度（初級/中級/高級）を明記すること。
5. カテゴリは、固定で "celeb" を付与すること。

【JSON出力フォーマット仕様】
必ず以下の有効なJSON配列（\`\`\`json ... \`\`\`）のみを出力してください。
[
  {
    "category": "celeb",
    "rank": 1,
    "title_ko": "記事の韓国語タイトル",
    "title_ja": "記事の日本語タイトル（完全日本語訳）",
    "summary_ko": "韓国語全体要約",
    "summary_ja": "日本語全体要約",
    "paragraphs": [
      {
        "para_num": 1,
        "title": "第1段落の韓国語小見出し",
        "ko": "第1段落の韓国語本文（活動・発表・最新近況 / 約200〜250字）",
        "ja": "第1段落の日本語訳"
      },
      {
        "para_num": 2,
        "title": "第2段落の韓国語小見出し",
        "ko": "第2段落の韓国語本文（作品詳細・経緯・見どころ / 約300〜350字）",
        "ja": "第2段落の日本語訳"
      },
      {
        "para_num": 3,
        "title": "第3段落の韓国語小見出し",
        "ko": "第3段落の韓国語本文（ファン・国内外の反響・業界評価 / 約250〜300字）",
        "ja": "第3段落の日本語訳"
      },
      {
        "para_num": 4,
        "title": "第4段落の韓国語小見出し",
        "ko": "第4段落の韓国語本文（今後のスケジュール・公開予定・抱負 / 約200字）",
        "ja": "第4段落の日本語訳"
      }
    ],
    "key_vocabulary": [
      {
        "word": "단어",
        "hanja": "漢字表記（固有語の場合は ―）",
        "pos": "品詞（名詞/動詞/形容詞等）",
        "meaning": "日本語の意味",
        "level": "初級/中級/高級"
      }
    ]
  }
]

============================================================
▼ 今すぐ処理すべき推しニュース速報（このニュースを記事化してください）
============================================================
【推し人物】: ${personName} (${personKo})
【ニュース速報タイトル】: ${cleanTitle}
【発信元メディア】: ${sourceName || '한국 연예 언론'}
【参照URL】: ${link}

【実行命令】:
前置きや挨拶は一切出力しないでください。直ちに指定フォーマットのJSON配列のみを出力してください。`;

    const geminiPayload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: promptText }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    };

    results.push({
      json: {
        has_news: true,
        row_number: meta.row_number,
        person_id: meta.person_id || null,
        person_name: personName,
        person_korean_name: personKo,
        category: 'celeb',
        category_name: meta.category_name || `⭐ 推し（${personName}）`,
        news_title: cleanTitle,
        raw_title: rawTitle,
        source_name: sourceName || '한국 연예 언론',
        source_url: link,
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        gemini_request: geminiPayload
      }
    });
  } else {
    results.push({
      json: {
        has_news: false,
        row_number: meta.row_number,
        person_id: meta.person_id || null,
        person_name: meta.person_name || '',
        person_korean_name: meta.person_korean_name || '',
        category: 'celeb',
        category_name: meta.category_name || `⭐ 推し（${meta.person_name}）`,
        news_title: '',
        raw_title: '',
        source_name: '',
        source_url: '',
        published_at: new Date().toISOString()
      }
    });
  }
}

return results;
