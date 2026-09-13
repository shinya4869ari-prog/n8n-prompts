const inputJson = {
  "content": {
    "parts": [
      {
        "text": "{\n  \"title\": \"ノー・アザー・チョイス\",\n  \"director\": \"パク・チャヌク\",\n  \"director_en\": \"박찬욱\",\n  \"cast\": \"イ・ビョンホン, ソン・イェジン, パク・ヒスン, イ・ソンミン, ヨム・ヘラン, チャ・スンウォン, オ・ダルス, キム・ウスン, チェ・ソユル, キム・ヘスク, ユ・ヨンソク, ファン・ギュチャン, ペ・ギボム, キム・ジンマン, ジェイソン・レーン・カトラー, ハイラム, ヘニー・サヴェニエ, デレク・シュナード, クリスチャン・オルセン, チョ・ハンギョル\",\n  \"cast_en\": \"이병헌, 손예진, 박희순, 이성민, 염혜란, 차승원, 오달수, 김우승, 최소율, 김해숙, 유연석, 황규찬, 배기범, 김진만, Jason Lane Cutler, 하이람, Henny Savenije, Derek Chouinard, Christian Olsen, 조한결\"\n}"
      }
    ]
  }
};

function extractTextFromAiNode(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.text) return node.text;
  if (node.output) return node.output;
  if (node.content?.parts && Array.isArray(node.content.parts)) {
    return node.content.parts.map(p => p.text || '').join('\n');
  }
  if (node.candidates?.[0]?.content?.parts) {
    return node.candidates[0].content.parts.map(p => p.text || '').join('\n');
  }
  if (node.message?.content) {
    return typeof node.message.content === 'string' ? node.message.content : JSON.stringify(node.message.content);
  }
  return '';
}

const raw = extractTextFromAiNode(inputJson);
const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
const parsed = JSON.parse(clean);
console.log("Parsed Cast successfully:", parsed.cast.includes("ジェイソン・レーン・カトラー"));
console.log("Cast:", parsed.cast);
