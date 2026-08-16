const sampleRawText = `【政治経済社会】
2026年3月18日のEU・韓国共同委員会では、安全保障防衛パートナーシップの下での協力継続とデジタル貿易協定の実施、Horizon Europe参加に関する成果が確認された。4月17日には韓国とEUが「戦略的経済パートナーシップ」を形成し、貿易・経済安全保障・供給網・技術協力を深める方向で一致。6月10日にはEUと韓国がデジタル貿易協定に正式署名した。

🔍 驚きの統計・習慣：
EU・韓国の自由貿易協定は2011年以降、2025年まで年平均5.3%で物品貿易が増加した。また、韓国はEUにとって第3位の貿易相手であり、EUは韓国にとって第8位の主要貿易相手と位置づけられている。

• 日本との関連：
韓国の対EU経済・安全保障連携の深化は、先端産業のサプライチェーン、デジタル規制、経済安全保障の面で日本企業や日本の対外戦略にも大きな影響を与える。

出典：EU-Republic of Korea Summit Joint Statement / 韓国産業通商資源部（MOTIR）/ EEAS

🐱 エラーネコの一言：
米中対立の狭間で揺れる中、韓国がEUとデジタル貿易協定を結んで先端産業のサプライチェーンをガッチリ固めにかかっているニャ！同じハイテク立国の日本もうかうかしてられないニャ…。`;

function parseAllInOneText(text) {
  let politics = '';
  let stats = '';
  let japan = '';
  let cite = '';
  let neko = '';

  // Extract politics
  const polMatch = text.match(/【政治経済社会】([\s\S]*?)(?=(?:🔍|•|・|\*|-)?\s*(?:驚き|驚く|日本|出典|🐱|エラーネコ|$))/i);
  if (polMatch) politics = polMatch[1].trim();

  // Extract stats
  const statsMatch = text.match(/(?:🔍|•|・|\*|-)?\s*(?:驚き|驚く|統計).*?[：:\n]([\s\S]*?)(?=(?:🇯🇵|•|・|\*|-)?\s*日本|出典|🐱|エラーネコ|$)/i);
  if (statsMatch) stats = statsMatch[1].trim();

  // Extract japan
  const japMatch = text.match(/(?:🇯🇵|•|・|\*|-)?\s*日本との関連[：:]([\s\S]*?)(?=(?:出典|🐱|エラーネコ|$))/i);
  if (japMatch) japan = japMatch[1].trim();

  // Extract cite
  const citeMatch = text.match(/出典\s*[：:]([\s\S]*?)(?=(?:🐱|エラーネコ|$))/i);
  if (citeMatch) cite = citeMatch[1].trim();

  // Extract neko
  const nekoMatch = text.match(/(?:🐱\s*)?エラーネコ(?:の一言)?[：:]([\s\S]*)$/i);
  if (nekoMatch) neko = nekoMatch[1].trim();

  return { politics, stats, japan, cite, neko };
}

console.log("Parsed all-in-one:", parseAllInOneText(sampleRawText));
