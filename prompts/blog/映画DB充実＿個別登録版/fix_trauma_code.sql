-- 『トラウマコード: 傷だらけの英雄たち』のデータを正式な Netflix / 2025年 / Q124128670 に修正
UPDATE "Movies"
SET 
  "platform" = 'Netflix',
  "year" = '2025',
  "wikidata_id" = 'Q124128670',
  "origin_title" = '중증외상센터',
  "overview_en" = 'A genius trauma surgeon with battlefield experience takes charge of a struggling university hospital trauma center, transforming its misfit team into an extraordinary life-saving unit.',
  "poster_url" = 'https://image.tmdb.org/t/p/w500/ycjhV8ss6L6WTezkhq5FSTiiyV4.jpg',
  "imdb_id" = null,
  "imdb_url" = null
WHERE "tmdb_id" = 217553 
   OR "title" LIKE '%トラウマコード%'
   OR "origin_title" = '중증외상센터';
