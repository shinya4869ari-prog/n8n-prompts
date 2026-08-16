const fs = require('fs');

function checkFile(path) {
  try {
    const code = fs.readFileSync(path, 'utf8');
    new Function(code);
    console.log(`✅ ${path} is syntactically valid.`);
  } catch (err) {
    console.error(`❌ Syntax Error in ${path}:`, err.message);
  }
}

checkFile('c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/映画DB充実＿個別登録版/補完ブリッジ整形コード.js');
checkFile('c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/映画DB充実＿個別登録版/補完結果整形コード.js');
checkFile('c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/映画DB充実＿個別登録版/映画データ整形コード.js');
