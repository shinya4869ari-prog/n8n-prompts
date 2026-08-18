const fs = require('fs');
const path = require('path');

const mockNodes = {
  '映画データ整形コード': {
    title: 'One Step',
    origin_title: '원스텝',
    country: 'KR',
    year: '2017',
    wikidata_id: 'Q25340649',
    tmdb_id: 451759,
    poster_url: 'https://image.tmdb.org/t/p/w500/kSYFHYgBps5INSBM4odUnVqhaBL.jpg',
    cast_en: '산다라 박, 한재석, 조동인',
    cast: 'サンタラ パク, ハン・チェソク, チョ・トンイン'
  },
  'TMDb credits取得': {
    cast: [
      { name: 'Sandara Park', original_name: '산다라 박' },
      { name: 'Han Jae-suk', original_name: '한재석' },
      { name: 'Cho Dong-in', original_name: '조동인' }
    ]
  }
};

const inputItem = {
  json: {
    title: 'ワンステップ 君と僕のメロディ',
    origin_title: '원스텝',
    country: 'KR',
    year: '2017',
    wikidata_id: 'Q25340649',
    tmdb_id: 451759,
    cast: 'サンダラ・パク, ハン・チェソク'
  }
};

globalThis.$ = (name) => ({
  first: () => ({ json: mockNodes[name] }),
  item: { json: mockNodes[name] },
  last: () => ({ json: mockNodes[name] })
});

globalThis.$input = {
  first: () => inputItem,
  all: () => [inputItem],
  item: inputItem
};

async function run() {
  const codePath = path.join(__dirname, '映画DB充実＿個別登録版', 'OST劇中歌取得整形Code.js');
  const code = fs.readFileSync(codePath, 'utf8');

  // Wrap in async function
  const fn = new Function(`return (async () => {
    ${code}
  })()`);

  console.log('--- Executing OST劇中歌取得整形Code.js ---');
  const results = await fn();
  console.log('Result count:', results.length);
  
  const walk = results.find(r => (r.json?.track_name || '').toLowerCase().includes('walk'));
  console.log('\n🎯 Walk to Remember check:');
  console.log(walk ? JSON.stringify(walk.json, null, 2) : 'NOT FOUND');

  console.log('\n🎵 Extracted Tracks Sample (First 5):');
  results.slice(0, 5).forEach((r, idx) => {
    console.log(`[${idx + 1}] ${r.json?.track_name} by ${r.json?.artist_name} (${r.json?.release_year})`);
    console.log(`    Preview: ${r.json?.preview_url ? 'OK (m4a)' : 'None'}`);
    console.log(`    ost_for: ${r.json?.ost_for}`);
  });
}

run().catch(console.error);
