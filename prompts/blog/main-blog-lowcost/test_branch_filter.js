const mockBranch1 = Array(296).fill({ json: {} });
const mockBranch2 = [
  { json: { title: "Colony", origin_title: "군체", year: 2026, tmdb_id: 1375646, poster_url: "https://image.tmdb.org/t/p/w500/colony.jpg", overview: "AI時代の映画" } },
  { json: { title: "OK! Madam 2", origin_title: "오케이 마담 2", year: 2026, tmdb_id: 1307247, poster_url: "/ok.jpg", overview: "コメディ映画" } }
];

const allFound = [...mockBranch1, ...mockBranch2];

// Previous buggy code:
const buggyMovies = allFound.map(item => ({
  title: item.json.title || ""
}));
console.log("Buggy first 3:", buggyMovies.slice(0, 3));
console.log("Buggy total count:", buggyMovies.length);

// Fixed filter:
const fixedSubItems = allFound.filter(i => i.json && (i.json.title || i.json.origin_title || i.json.tmdb_id));
const fixedMovies = fixedSubItems.map(item => ({
  title: item.json.title || "",
  tmdb_id: item.json.tmdb_id
}));
console.log("\nFixed movies count:", fixedMovies.length);
console.log("Fixed movies:", fixedMovies);
