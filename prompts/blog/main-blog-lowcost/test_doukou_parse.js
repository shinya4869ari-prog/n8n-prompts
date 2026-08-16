const testPerplexity = {
  "id": "d1541418-9e63-40bd-a847-3febac07ebe3",
  "created": 1786852024,
  "citations": [
    "https://en.wikipedia.org/wiki/Timeline_of_Korean_history"
  ],
  "message": "{\"country\":\"韓国\",\"歴史的背景\":[],\"直近の動向\":{\"政治経済社会\":\"2026年3月18日のEU・韓国共同委員会では...\",\"驚く統計や習慣\":\"EU資料では...\",\"日本との関連\":\"今回確認できた...\",\"出典\":\"[1] Joint Statement...\"}}"
};

function parseDoukou(input, trig = {}) {
  let parsed = {};
  if (typeof input.message === 'string') {
    try { parsed = JSON.parse(input.message); } catch(e) {}
  } else if (typeof input.text === 'string' && input.text.trim().startsWith('{')) {
    try { parsed = JSON.parse(input.text); } catch(e) {}
  } else if (typeof input.output === 'string' && input.output.trim().startsWith('{')) {
    try { parsed = JSON.parse(input.output); } catch(e) {}
  }

  const merged = { ...input, ...parsed };
  const doukouObj = merged.直近の動向 || merged.doukou || merged.data?.対象国データ_記事?.直近の動向 || merged;

  let politics = doukouObj.政治経済社会 || doukouObj.political_social || trig.政治経済社会 || trig.politics || '';
  let stats = doukouObj['驚きの統計・習慣'] || doukouObj.驚く統計や習慣 || doukouObj.驚きの統計 || doukouObj.stats || trig['驚きの統計・習慣'] || trig.stats || '';
  let japan = doukouObj.日本との関連 || doukouObj.japan_relation || doukouObj.japan || trig.日本との関連 || trig.japan || '';
  let cite = doukouObj.出典 || doukouObj.source || doukouObj.cite || trig.出典 || trig.source || '日本経済新聞 / 首相官邸 / 総務省 / 外務省';

  return { politics, stats, japan, cite };
}

console.log("Parsed result:", parseDoukou(testPerplexity));
