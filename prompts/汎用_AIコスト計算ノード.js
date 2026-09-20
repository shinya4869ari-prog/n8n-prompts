const TARGET_NODES = ['Message a model'];
const USD_JPY_RATE = 155.0;
const WORKFLOW_NAME = $workflow?.name || 'AI Workflow';

const PRICING = {
  'gemini-3.8-flash': { in: 0.10, out: 0.40 },
  'gemini-3.1-pro':   { in: 1.25, out: 5.00 },
  'gpt-5':            { in: 2.50, out: 10.00 },
  'o3':               { in: 5.00, out: 20.00 },
  'o4-mini':          { in: 0.15, out: 0.60 },
  'claude-sonnet-4':  { in: 3.00, out: 15.00 },
  'sonar':            { in: 1.00, out: 1.00, fee: 0.005 },
  'sonar-pro':        { in: 3.00, out: 15.00, fee: 0.005 }
};

function formatJpy(val) {
  return val < 0.01 ? (val * 100).toFixed(2) + ' 銭' : val.toFixed(3) + ' 円';
}

function resolveModel(str) {
  const s = String(str || '').toLowerCase();
  if (s.includes('pro')) return { name: 'gemini-3.1-pro', r: PRICING['gemini-3.1-pro'] };
  if (s.includes('o3')) return { name: 'o3', r: PRICING['o3'] };
  if (s.includes('gpt-5') || s.includes('gpt-4o')) return { name: 'gpt-5', r: PRICING['gpt-5'] };
  if (s.includes('claude')) return { name: 'claude-sonnet-4', r: PRICING['claude-sonnet-4'] };
  if (s.includes('sonar-pro')) return { name: 'sonar-pro', r: PRICING['sonar-pro'] };
  if (s.includes('sonar')) return { name: 'sonar', r: PRICING['sonar'] };
  return { name: 'gemini-3.8-flash', r: PRICING['gemini-3.8-flash'] };
}

let totalUsd = 0, totalJpy = 0, totalPrompt = 0, totalCompl = 0, totalTok = 0, searches = 0;
const nodeDetails = [], flatList = {}, usedModels = new Set();
const scanList = TARGET_NODES.length ? TARGET_NODES : ['Message a model', 'AI Agent', 'Gemini', 'OpenAI', 'writer'];

for (const name of scanList) {
  try {
    const ref = $(name);
    if (!ref) continue;
    let items = [];
    try { items = ref.all(); } catch (_) { const s = ref.first()?.json; if (s) items = [{ json: s }]; }
    if (!items.length) continue;

    let pTok = 0, cTok = 0, modelName = '', reqSearches = 0;
    for (const item of items) {
      const d = item.json || {};
      modelName = modelName || d.model || d.response?.model || '';
      const u = d.usageMetadata || d.response?.usageMetadata || d.tokenUsageEstimate || {};
      const o = d.usage || d.response?.usage || {};
      const p = u.promptTokenCount || u.promptTokens || o.prompt_tokens || o.input_tokens || 0;
      const c = u.candidatesTokenCount || u.completionTokens || o.completion_tokens || o.output_tokens || 0;
      if (p || c) { pTok += p; cTok += c; }
      else {
        const txt = d.output || d.text || d.content?.parts?.[0]?.text || '';
        if (txt) { pTok += 1500; cTok += Math.round(txt.length * 0.95); }
      }
      if (d.citations || String(modelName).includes('sonar')) reqSearches++;
    }

    if (!pTok && !cTok && !reqSearches) continue;
    const { name: mName, r } = resolveModel(modelName || name);
    usedModels.add(mName);
    const searchFee = (r.fee || 0) * reqSearches;
    const usd = ((pTok * r.in + cTok * r.out) / 1e6) + searchFee;
    const jpy = usd * USD_JPY_RATE;

    totalUsd += usd; totalJpy += jpy; totalPrompt += pTok; totalCompl += cTok; totalTok += (pTok + cTok); searches += reqSearches;
    flatList['📍 ' + name] = formatJpy(jpy) + ' (' + mName + ' / ' + (pTok + cTok).toLocaleString() + ' tok)';
    nodeDetails.push({ node: name, model: mName, prompt: pTok, completion: cTok, total: pTok + cTok, cost_jpy: formatJpy(jpy) });
  } catch (_) {}
}

const primaryModel = usedModels.size ? Array.from(usedModels).join(', ') : 'gemini-3.8-flash';
const count = $input.all()?.length || 1;

console.log([
  '┌────────────────────────────────────────────────────────┐',
  '│ ⭐ ' + WORKFLOW_NAME + ' コストレポート',
  '├────────────────────────────────────────────────────────┤',
  '│ 件数: ' + count + ' 件 / モデル: ' + primaryModel,
  '│ トークン: ' + totalTok.toLocaleString() + ' (入: ' + totalPrompt.toLocaleString() + ' / 出: ' + totalCompl.toLocaleString() + ')',
  '├────────────────────────────────────────────────────────┤',
  '│ 💵 コスト(USD): $' + totalUsd.toFixed(6),
  '│ 💴 コスト(日本円): 約 ' + formatJpy(totalJpy) + ' (1件約 ' + formatJpy(totalJpy / count) + ')',
  '└────────────────────────────────────────────────────────┘'
].join('\n'));

let prev = {};
try { prev = $input.first()?.json || {}; } catch (_) {}

return [{
  json: {
    '💰【総AIコスト】': formatJpy(totalJpy) + ' ($' + totalUsd.toFixed(4) + ')',
    '────────── 費用明細 ──────────': '───────────────────────────────',
    ...flatList,
    'generation_cost': {
      model: primaryModel,
      prompt_tokens: totalPrompt,
      completion_tokens: totalCompl,
      total_tokens: totalTok,
      cost_usd: '$' + totalUsd.toFixed(6),
      cost_jpy: '約 ' + formatJpy(totalJpy),
      generated_at: new Date().toISOString(),
      details: nodeDetails
    },
    ...prev
  }
}];