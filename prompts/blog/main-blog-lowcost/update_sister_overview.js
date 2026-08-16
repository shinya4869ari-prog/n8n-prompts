const SUPABASE_URL = 'https://uvjpiuinsgklddzhzpio.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX';

async function updateSisterOverview() {
  const polishedOverview = `閉鎖された空間で繰り広げられる高密度サスペンス『シスター』。妹の手術費を確保するため、絶望的な状況に追い込まれたヘランは、親友テスと異母姉ソジンを誘拐することにする。不意に目覚めると、ソジンは見知らぬ場所に閉じ込められていた。ヘランとテスは、裕福なソジンの父親から10億ウォンの身代金を要求する。しかし、囚われたソジンが自分の誘拐犯の中に異母妹がいることを突き止めたとき、物語はさらに複雑に展開する。被害者と加害者の境界線が曖昧になる中、ソジンはテスに対する反撃を計画し始める。家族の秘密、裏切り、そして狂気の誘拐劇がもたらす緊張感みなぎるストーリーが、観客を引き込んで離さない。`;

  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/Movies?title=eq.Sister`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      overview: polishedOverview
    })
  });

  console.log("Status:", patchRes.status);
  const data = await patchRes.json();
  console.log("Updated data:", data);
}

updateSisterOverview();
