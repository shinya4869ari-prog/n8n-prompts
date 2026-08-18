// シミュレーションテスト: 映画・人物・サントラ総合検証ディスパッチ
const sampleAiOutput = {
  is_valid: true,
  confidence_score: 96,
  audit_summary: "映画『ワンステップ 君と僕のメロディ』、キャスト11名、公式OST全25曲を照合・承認",
  movie: {
    title: "ワンステップ 君と僕のメロディ",
    origin_title: "원스텝",
    country: "KR",
    year: "2017",
    director: "チョン・ジェホン",
    cast: "サンダラ・パク、ハン・ジェソク、チョ・ドンイン",
    tmdb_id: 451759,
    wikidata_id: "Q25340649"
  },
  persons: [
    { name: "サンダラ・パク", name_en: "Sandara Park", occupation: "女優", qid: "Q497041" },
    { name: "ハン・ジェソク", name_en: "Han Jae-suk", occupation: "俳優", qid: "Q483891" }
  ],
  tracks: [
    { track_id: "1649295926", track_name: "Walk To Remember", artist_name: "Kim Bo Kyung", release_year: "2017", status: "APPROVED" },
    { track_id: "9999999999", track_name: "Unrelated Rock Song", artist_name: "Random Artist", release_year: "1995", status: "REJECTED" }
  ]
};

// ディスパッチロジックの検証
const rawTracks = sampleAiOutput.tracks || [];
const approvedTracks = rawTracks.filter(t => t && t.track_id && (!t.status || t.status.toUpperCase() !== 'REJECTED'));

console.log("=== テスト結果 ===");
console.log("検証合否:", sampleAiOutput.is_valid);
console.log("映画タイトル:", sampleAiOutput.movie.title);
console.log("人物件数:", sampleAiOutput.persons.length);
console.log("サントラ総数:", rawTracks.length, "➔ 承認サントラ数:", approvedTracks.length);
console.log("承認されたトラック:", approvedTracks.map(t => t.track_name));

if (approvedTracks.length === 1 && approvedTracks[0].track_name === "Walk To Remember") {
  console.log("✅ テスト成功: 無関係な曲(REJECTED)が確実に除外され、公式OSTのみが残りました！");
} else {
  console.error("❌ テスト失敗");
}
