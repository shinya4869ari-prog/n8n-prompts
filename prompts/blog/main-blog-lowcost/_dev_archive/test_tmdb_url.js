const TMDB_KEY = 'YOUR_KEY'; // We can test public endpoint format

async function testTmdb() {
  const url = `https://api.themoviedb.org/3/movie/1387140?append_to_response=credits,videos,external_ids&language=ja-JP`;
  console.log("Testing URL structure:", url);
}

testTmdb();
