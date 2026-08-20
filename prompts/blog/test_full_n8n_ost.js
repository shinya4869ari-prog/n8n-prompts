const fs = require('fs');
const path = require('path');

const mockNodes = {
  '映画データ整形コード': {
    title: 'Agent Kim Reactivated',
    origin_title: '김부장',
    country: 'KR',
    year: '2026',
    wikidata_id: 'Q139553270',
    tmdb_id: 296206,
    poster_url: 'https://image.tmdb.org/t/p/w500/eKJNWq4akdrviR9qEF6xPhzKQU.jpg'
  },
  'TMDb credits取得': {}
};

const inputItem = {
  json: {
    title: 'Manager Kim',
    origin_title: '김부장',
    country: 'KR',
    year: '2026',
    wikidata_id: 'Q139553270',
    tmdb_id: 296206
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

  const fn = new Function(`return (async () => {
    ${code}
  })()`);

  console.log('--- Executing OST劇中歌取得整形Code.js for Manager Kim ---');
  const results = await fn();
  console.log('Result count:', results.length);
  results.forEach((r, idx) => {
    console.log(`[${idx + 1}] ${r.json?.track_name} by ${r.json?.artist_name} (${r.json?.release_year}) -> ${r.json?.description}`);
  });
}

run().catch(console.error);
