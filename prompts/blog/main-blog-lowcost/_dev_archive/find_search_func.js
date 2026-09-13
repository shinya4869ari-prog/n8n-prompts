const fs = require('fs');

const content = fs.readFileSync('c:/Users/shiny/git/PlaceInfo/index.html', 'utf8');

// Find all functions related to search
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('function doSearch') || line.includes('searchType') || line.includes('tmdb') || line.includes('TMDb') || line.includes('searchMovies') || line.includes('searchPersons')) {
    console.log(`Line ${idx + 1}: ${line.slice(0, 100)}`);
  }
});
