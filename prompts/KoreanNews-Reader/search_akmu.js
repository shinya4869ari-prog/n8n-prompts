async function searchAKMU() {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent('AKMU 어떻게 이별까지 사랑하겠어')}&entity=song&limit=3&country=KR`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(data.results[0]);
  } catch(e) {
    console.error(e);
  }
}
searchAKMU();
