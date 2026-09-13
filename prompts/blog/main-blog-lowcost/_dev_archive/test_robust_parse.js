const testInputs = [
  // 1. Exact JSON string from user prompt
  {
    "id": "d1541418-9e63-40bd-a847-3febac07ebe3",
    "created": 1786852024,
    "citations": ["https://en.wikipedia.org/wiki/Timeline_of_Korean_history"],
    "message": "{\"country\":\"韓国\",\"歴史的背景\":[],\"直近の動向\":{\"政治経済社会\":\"2026年3月18日のEU・韓国共同委員会では...\",\"驚く統計や習慣\":\"EU資料では...\",\"日本との関連\":\"今回確認できた...\",\"出典\":\"[1] Joint Statement...\"}}"
  },
  // 2. Direct object
  {
    "country": "韓国",
    "直近の動向": {
      "政治経済社会": "2026年3月18日のEU...",
      "驚きの統計・習慣": "EU資料では...",
      "日本との関連": "日本との関係...",
      "出典": "日経"
    }
  },
  // 3. Form input (flat keys)
  {
    "country": "韓国",
    "政治経済社会": "政治経済テキスト",
    "驚きの統計・習慣": "統計テキスト",
    "日本との関連": "日本テキスト",
    "出典": "出典テキスト",
    "neko": "ネコテキスト"
  },
  // 4. Form input with message containing markdown
  {
    "message": "```json\n{\n  \"直近の動向\": {\n    \"政治経済社会\": \"マークダウン内テキスト\"\n  }\n}\n```"
  },
  // 5. Raw text from form
  {
    "raw_text": "<p>【政治経済社会】</p>\n<p>直接テキスト</p>"
  }
];

function robustParse(input, trig = {}) {
  let parsedData = {};
  
  // Search in all string fields
  const candidates = [input.message, input.text, input.output, input.article, input.content, input.response, input.body];
  for (const cand of candidates) {
    if (typeof cand === 'string') {
      const match = cand.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsedData = JSON.parse(match[0]);
          if (parsedData.直近の動向 || parsedData.doukou || parsedData.政治経済社会) break;
        } catch(e) {}
      }
    }
  }

  const merged = { ...trig, ...input, ...parsedData };
  const doukouObj = merged.直近の動向 || merged.doukou || merged.data?.対象国データ_記事?.直近の動向 || merged.data?.直近の動向 || merged;

  const getField = (keys) => {
    for (const k of keys) {
      if (doukouObj && doukouObj[k]) return doukouObj[k];
      if (merged && merged[k]) return merged[k];
      if (trig && trig[k]) return trig[k];
    }
    return '';
  };

  const politics = getField(['政治経済社会', '政治・経済・社会', '政治経済', 'political_social', 'politics', 'text1']);
  const stats = getField(['驚きの統計・習慣', '驚く統計や習慣', '驚きの統計', '統計・習慣', 'stats', 'culture', 'text2']);
  const japan = getField(['日本との関連', '日本関係', '対日関係', 'japan_relation', 'japan', 'text3']);
  const cite = getField(['出典', 'source', 'cite']) || '日本経済新聞 / 首相官邸 / 総務省 / 外務省';
  const neko = getField(['neko', 'error_neko', 'エラーネコ', 'ネコの一言', 'comment']);

  return { politics, stats, japan, cite, neko };
}

testInputs.forEach((inp, idx) => {
  console.log(`Test ${idx + 1}:`, robustParse(inp));
});
