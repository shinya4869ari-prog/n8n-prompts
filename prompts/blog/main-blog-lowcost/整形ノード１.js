// ==============================================================================
// 📋 整形ノード１（Supabaseキャッシュ・スキップ＆Merge4完全対応版）
// ==============================================================================

// --- 安全なノード取得ヘルパー（未実行ノード参照エラーを防止） ---
function safeGet(nodeName) {
  try {
    const node = $(nodeName);
    if (!node) return null;
    return node.first()?.json || null;
  } catch (e) {
    return null;
  }
}

function safeGetAll(nodeName) {
  try {
    const node = $(nodeName);
    if (!node) return [];
    return node.all() || [];
  } catch (e) {
    return [];
  }
}

// 1. キャッシュ確認ノードからの事前取得
const cacheJson = safeGet("キャッシュ確認");

// 2. r1 / r2 / r25 の多重フォールバック探索
// 優先順位: Supabaseキャッシュ ➜ 即時保存ノード ➜ 各リサーチノード ➜ 入力($input)
let r1Raw =
  cacheJson?.research1 ||
  safeGet("★リサーチ1即時保存")?.research1 ||
  safeGet("リサーチ1即時保存")?.research1 ||
  safeGet("researcher1");

let r2Raw =
  cacheJson?.research2 ||
  safeGet("★リサーチ2即時保存")?.research2 ||
  safeGet("リサーチ2即時保存")?.research2 ||
  safeGet("researcher2");

let r25Raw =
  cacheJson?.research25 ||
  safeGet("★リサーチ25即時保存")?.research25 ||
  safeGet("リサーチ25即時保存")?.research25 ||
  safeGet("ポスター・ID反映") ||
  safeGet("researcher25");

// もし上記で見つからない場合、現在の入力（Merge4等）から探す
if (!r1Raw || !r2Raw || !r25Raw) {
  try {
    const allInputs = $input.all();
    for (const item of allInputs) {
      const j = item.json || {};
      if (!r1Raw && (j.research1 || j.制度の9つの皿 || j.地理))
        r1Raw = j.research1 || j;
      if (!r2Raw && (j.research2 || j.歴史的背景 || j.直近の動向))
        r2Raw = j.research2 || j;
      if (!r25Raw && (j.research25 || j.映像作品 || j.おすすめ映画))
        r25Raw = j.research25 || j;
    }
  } catch (e) {}
}

let supabaseMovieRaw = safeGet("Supabase映画データ");

// --- JSON安全パース＆修復関数 ---
const parseOutput = (node, nodeName) => {
  try {
    let rawVal = node;
    if (rawVal === undefined || rawVal === null) {
      throw new Error("データが存在しません(null/undefined)");
    }

    // 既にオブジェクトで主要キーを持つ場合はそのまま返却
    if (typeof rawVal === "object" && rawVal !== null) {
      if (
        rawVal.歴史的背景 ||
        rawVal.映像作品 ||
        rawVal.おすすめ映画 ||
        rawVal.制度の9つの皿 ||
        rawVal.地理
      ) {
        return rawVal;
      }
      // 出力ラッパーのアンラップ
      if (rawVal.message !== undefined) {
        if (typeof rawVal.message === "string") rawVal = rawVal.message;
        else if (rawVal.message.content !== undefined)
          rawVal = rawVal.message.content;
        else if (
          Array.isArray(rawVal.message) &&
          rawVal.message[0]?.content !== undefined
        )
          rawVal = rawVal.message[0].content;
        else rawVal = JSON.stringify(rawVal.message);
      } else if (rawVal.output !== undefined) {
        rawVal = rawVal.output;
      } else if (rawVal.json !== undefined) {
        rawVal = rawVal.json;
      } else if (rawVal.content?.parts?.[0]?.text !== undefined) {
        rawVal = rawVal.content.parts[0].text;
      } else if (rawVal.text !== undefined) {
        rawVal = rawVal.text;
      }
    }

    if (typeof rawVal === "object" && rawVal !== null) {
      return rawVal;
    }

    let raw = String(rawVal).trim();
    if (!raw) throw new Error("出力が空です");

    // マークダウンコードブロック除去
    raw = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    // 二重エスケープ除去
    if (raw.startsWith('"') && raw.endsWith('"')) {
      try {
        raw = JSON.parse(raw);
      } catch (e) {}
    }

    // { ... } または [ ... ] の切り出し
    const startIdx = raw.indexOf("{");
    const endIdx = raw.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      raw = raw.substring(startIdx, endIdx + 1);
    } else {
      const arrStart = raw.indexOf("[");
      const arrEnd = raw.lastIndexOf("]");
      if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
        raw = raw.substring(arrStart, arrEnd + 1);
      }
    }

    let cleaned = raw.replace(/,(\s*[}\]])/g, "$1").trim();

    // 文字単位ステートマシンによる生改行・生クォーテーション自動修復
    let repaired = "";
    let i = 0;
    while (i < cleaned.length) {
      const ch = cleaned[i];
      if (ch === "\\") {
        repaired += ch + (cleaned[i + 1] || "");
        i += 2;
        continue;
      }
      if (ch === '"') {
        repaired += '"';
        i++;
        while (i < cleaned.length) {
          const c = cleaned[i];
          if (c === "\\") {
            repaired += c + (cleaned[i + 1] || "");
            i += 2;
            continue;
          }
          if (c === '"') {
            let j = i + 1;
            while (j < cleaned.length && /\s/.test(cleaned[j])) j++;
            const next = cleaned[j];
            let isValidClose = false;
            if (
              next === ":" ||
              next === "}" ||
              next === "]" ||
              j >= cleaned.length
            ) {
              isValidClose = true;
            } else if (next === ",") {
              let k = j + 1;
              while (k < cleaned.length && /\s/.test(cleaned[k])) k++;
              const afterComma = cleaned[k];
              if (
                afterComma === '"' ||
                afterComma === "}" ||
                afterComma === "]"
              ) {
                isValidClose = true;
              }
            }
            if (isValidClose) {
              repaired += '"';
              i++;
              break;
            } else {
              repaired += '\\"';
              i++;
            }
          } else if (c === "\r" || c === "\n") {
            repaired += "\\n";
            if (c === "\r" && cleaned[i + 1] === "\n") i++;
            i++;
          } else {
            repaired += c;
            i++;
          }
        }
        continue;
      }
      repaired += ch;
      i++;
    }

    return JSON.parse(repaired);
  } catch (e) {
    throw new Error(
      `【${nodeName}】JSONパース失敗: ${e.message}。データ冒頭: ${String(node).substring(0, 200)}`,
    );
  }
};

// --- 刑務所推移データの同期調整関数 ---
const adjustPrisonTrend = (trendArray, chiAnObj) => {
  if (!Array.isArray(trendArray)) trendArray = [];
  if (!chiAnObj) return trendArray;
  const latestCount = chiAnObj["刑務所総収容者数"];
  const latestYear = chiAnObj["刑務所総収容者数_年"];
  if (
    latestCount &&
    latestCount !== "欠測" &&
    latestCount !== "-" &&
    latestYear
  ) {
    const latestYearNum = parseInt(String(latestYear).replace(/[^0-9]/g, ""));
    if (!isNaN(latestYearNum)) {
      const existingIndex = trendArray.findIndex((d) => {
        const y = parseInt(String(d.年).replace(/[^0-9]/g, ""));
        return y === latestYearNum;
      });
      if (existingIndex !== -1) {
        trendArray[existingIndex].総収容者数 = latestCount;
      } else {
        const maxYear = trendArray.reduce((max, d) => {
          const y = parseInt(String(d.年).replace(/[^0-9]/g, ""));
          return !isNaN(y) && y > max ? y : max;
        }, 0);
        if (latestYearNum > maxYear && trendArray.length > 0) {
          trendArray[trendArray.length - 1] = {
            年: latestYear,
            総収容者数: latestCount,
          };
        }
      }
    }
  }
  return trendArray;
};

// ==============================================================================
// 1. 各リサーチデータのパースと加工
// ==============================================================================

const r1 = parseOutput(r1Raw, "リサーチ1 (制度/地理/犯罪)");
if (!r1 || (!r1.country && !r1.国名) || !r1.地理) {
  throw new Error(
    `【リサーチ1】必要なデータ（国名や地理データ）が取得できませんでした。Supabaseキャッシュまたはリサーチ1の出力を確認してください。`,
  );
}
if (!r1.country && r1.国名) r1.country = r1.国名;

// 日本面積比の計算
if (r1.地理) {
  const areaRaw = r1.地理.面積_km2;
  if (areaRaw && areaRaw !== "データなし") {
    const areaNum = parseFloat(String(areaRaw).replace(/,/g, ""));
    if (!isNaN(areaNum)) {
      const ratio = areaNum / 377900;
      r1.地理.日本面積比 = ratio < 0.1 ? ratio.toFixed(2) : ratio.toFixed(1);
    } else {
      r1.地理.日本面積比 = "データなし";
    }
  } else {
    r1.地理.日本面積比 = "データなし";
  }
}

// 重大犯罪事件を発生年の新しい順（降順）にソート
if (Array.isArray(r1.重大犯罪事件)) {
  r1.重大犯罪事件.sort((a, b) => {
    const yearA = parseInt(String(a.発生年).replace(/[^0-9]/g, "")) || 0;
    const yearB = parseInt(String(b.発生年).replace(/[^0-9]/g, "")) || 0;
    return yearB - yearA;
  });
}

const r2 = parseOutput(r2Raw, "リサーチ2 (歴史100年/最新動向)");
if (!r2 || !r2.歴史的背景) {
  const keys = r2 ? Object.keys(r2).join(", ") : "null";
  throw new Error(
    `【リサーチ2】必要な歴史・動向データが取得できませんでした。取得できたキー: [${keys}]`,
  );
}

const r25 = parseOutput(r25Raw, "リサーチ25 (映像作品/映画)");
if (
  !r25 ||
  (!r25.映像作品 &&
    !r25.おすすめ映画 &&
    !r25.おすすめ映画ランキング &&
    !Array.isArray(r25))
) {
  throw new Error(
    `【リサーチ25】必要な映像作品（歴史連動映画）が取得できませんでした。`,
  );
}

// ==============================================================================
// 2. おすすめ映画データの集約（映画サブワークフロー / r25 / Supabase）
// ==============================================================================
let recommendedMovies = [];
let recommendedMoviesPopular = [];
let recommendedMoviesLatest = [];
try {
  let subItems = [];
  const movieItemsById = new Map();
  const popularItemsById = new Map();
  const latestItemsById = new Map();
  const candidateNodes = [
    "Call '映画DB充実＿個別登録版'",
    "映画DB充実＿個別登録版",
    "映画ブログ生成_人気順10件",
    "映画ブログ生成_最新公開順10件",
    "映画_人気順",
    "映画_最新公開順",
    "Call '映画無限検索ワークフロー　おすすめ映画版 gemini'",
    "Call '映画無限検索ワークフロー おすすめ映画版 gemini'",
    "映画無限検索ワークフロー　おすすめ映画版 gemini",
    "映画無限検索ワークフロー おすすめ映画版 gemini",
    "Call 'おすすめ映画'",
    "おすすめ映画",
    "Execute Workflow",
    "Execute Sub-Workflow",
  ];
  for (const nodeName of candidateNodes) {
    const found = safeGetAll(nodeName);
    if (found && found.length > 0) {
      const validMovies = found.filter((i) => {
        const j = i.json || i || {};
        return (
          (j.title || j.origin_title || j.tmdb_id || j.タイトル_日本語) &&
          !j.occupation
        );
      });
      for (const item of validMovies) {
        const movie = item.json || item || {};
        const key = movie.tmdb_id || movie.title || movie.origin_title;
        if (key && !movieItemsById.has(String(key))) {
          movieItemsById.set(String(key), item);
        }
        if (
          key &&
          /人気/.test(nodeName) &&
          !popularItemsById.has(String(key))
        ) {
          popularItemsById.set(String(key), item);
        }
        if (
          key &&
          /(最新|新作)/.test(nodeName) &&
          !latestItemsById.has(String(key))
        ) {
          latestItemsById.set(String(key), item);
        }
      }
    }
  }

  subItems = Array.from(movieItemsById.values());

  if (subItems.length === 0) {
    const inputs = $input.all();
    // 映像作品（歴史連動）のデータを誤っておすすめ映画として拾わないよう除外
    const inputMovies = inputs.filter((i) => {
      const j = i.json || {};
      const isHistoricalMovie =
        j.historical_significance ||
        j.歴史クロス解説 ||
        j.related_event ||
        j.関連事件;
      return (
        (j.title || j.origin_title || j.tmdb_id) &&
        !isHistoricalMovie &&
        !j.occupation
      );
    });
    if (inputMovies.length > 0) subItems = inputMovies;
  }

  if (subItems.length > 0) {
    const formatMovie = (item) => {
      const movie = item.json || {};
      let posterPath = "";
      const rawPoster = movie.poster_url || movie.poster_path || "";
      if (rawPoster) {
        const match = String(rawPoster).match(/\/t\/p\/w\d+(\/[^?#]+)/);
        posterPath = match ? match[1] : rawPoster;
      }

      return {
        タイトル_日本語:
          movie.title || movie.タイトル_日本語 || movie.name || "",
        原題: movie.origin_title || movie.原題 || "",
        種別: movie.type || movie.種別 || "映画",
        公開年: movie.year || movie.公開年 || "",
        director: movie.監督 || movie.director || movie.director_name || "",
        cast:
          movie.メインキャスト ||
          movie.cast ||
          movie.キャスト ||
          movie.出演 ||
          "",
        概要: movie.overview || movie.概要 || movie.ai_summary || "",
        tmdb_id: movie.tmdb_id || null,
        poster_path: posterPath,
        wikidata_id: movie.wikidata_id || movie.qid || "",
        imdb_id:
          movie.imdb_id && !String(movie.imdb_id).startsWith("Q")
            ? movie.imdb_id
            : movie.imdb_url || "",
        related_event: movie.関連事件 || movie.related_event || "",
        historical_significance:
          movie.歴史クロス解説 || movie.historical_significance || "",
      };
    };

    recommendedMovies = subItems.map(formatMovie);
    recommendedMoviesPopular = Array.from(popularItemsById.values()).map(
      formatMovie,
    );
    recommendedMoviesLatest = Array.from(latestItemsById.values()).map(
      formatMovie,
    );
  }
} catch (e) {}

// サブワークフローから取れなかった場合のフォールバック（※映像作品は絶対に流用しない）
if (recommendedMovies.length === 0 && supabaseMovieRaw) {
  try {
    const supabaseMovie = parseOutput(supabaseMovieRaw, "Supabase映画データ");
    recommendedMovies =
      supabaseMovie.おすすめ映画 || supabaseMovie.おすすめ映画ランキング || [];
  } catch (err) {}
}

if (recommendedMovies.length === 0) {
  if (Array.isArray(r25.おすすめ映画) && r25.おすすめ映画.length > 0) {
    recommendedMovies = r25.おすすめ映画;
  } else if (
    Array.isArray(r25.おすすめ映画ランキング) &&
    r25.おすすめ映画ランキング.length > 0
  ) {
    recommendedMovies = r25.おすすめ映画ランキング;
  } else if (Array.isArray(r2?.おすすめ映画) && r2.おすすめ映画.length > 0) {
    recommendedMovies = r2.おすすめ映画;
  }
}

if (
  recommendedMoviesPopular.length === 0 &&
  recommendedMoviesLatest.length === 0
) {
  recommendedMoviesPopular = recommendedMovies;
}

// ==============================================================================
// 3. おすすめ音楽データの集約
// ==============================================================================
let supabaseMusicRaw =
  safeGet("Supabase音楽データ") ||
  safeGet("Supabase 音楽データ") ||
  safeGet("Supabase音楽");
let recommendMusic = [];
try {
  let musicItems = [];
  const musicCandidateNodes = [
    "Call '音楽データベース充実ワークフロー'",
    "音楽データベース充実ワークフロー",
    "Call '音楽検索ワークフロー'",
    "音楽検索ワークフロー",
    "Call 'おすすめ音楽'",
    "おすすめ音楽",
  ];
  for (const nodeName of musicCandidateNodes) {
    const found = safeGetAll(nodeName);
    if (found && found.length > 0) {
      musicItems = found;
      break;
    }
  }

  if (musicItems.length === 0) {
    const inputs = $input.all();
    const inputMusic = inputs.filter(
      (i) =>
        i.json &&
        (i.json.track_name ||
          i.json.track_id ||
          i.json.recommend_music ||
          i.json.tracks),
    );
    if (inputMusic.length > 0) musicItems = inputMusic;
  }

  if (musicItems.length > 0) {
    const firstObj = musicItems[0].json || musicItems[0] || {};
    if (
      musicItems.length > 1 &&
      (firstObj.track_name || firstObj.track_id || firstObj.曲名)
    ) {
      recommendMusic = musicItems.map((item) => {
        const d = item.json || item || {};
        return {
          track_name: d.track_name || d.曲名 || "",
          track_name_en: d.track_name_en || d.曲名_英語 || "",
          artist_name: d.artist_name || d.アーティスト || "",
          artist_name_en: d.artist_name_en || d.アーティスト_英語 || "",
          release_year: d.release_year || d.年 || d.リリース年 || "",
          preview_url: d.preview_url || "",
          itunes_url: d.itunes_url || d.spotify_url || "",
          album_cover: d.album_cover || d.ジャケット || "",
          description: d.description || d.概要 || "",
        };
      });
    } else {
      let parsed = null;
      try {
        parsed = parseOutput(firstObj, "音楽検索");
      } catch (err) {
        parsed = firstObj;
      }
      if (parsed) {
        const rawList =
          parsed.recommend_music ||
          parsed.tracks ||
          parsed.おすすめ音楽 ||
          parsed.recommend_tracks ||
          (Array.isArray(parsed) ? parsed : []);
        if (Array.isArray(rawList) && rawList.length > 0) {
          recommendMusic = rawList.map((item) => ({
            track_name: item.track_name || item.曲名 || "",
            track_name_en: item.track_name_en || item.曲名_英語 || "",
            artist_name: item.artist_name || item.アーティスト || "",
            artist_name_en: item.artist_name_en || item.アーティスト_英語 || "",
            release_year: item.release_year || item.年 || item.リリース年 || "",
            preview_url: item.preview_url || "",
            itunes_url: item.itunes_url || item.spotify_url || "",
            album_cover: item.album_cover || item.ジャケット || "",
            description: item.description || item.概要 || "",
          }));
        }
      }
    }
  }
} catch (e) {}

if (recommendMusic.length === 0 && supabaseMusicRaw) {
  try {
    const rawList =
      supabaseMusicRaw.recommend_music ||
      supabaseMusicRaw.tracks ||
      supabaseMusicRaw.おすすめ音楽 ||
      (Array.isArray(supabaseMusicRaw) ? supabaseMusicRaw : []);
    if (Array.isArray(rawList)) {
      recommendMusic = rawList.map((item) => ({
        track_name: item.track_name || item.曲名 || "",
        track_name_en: item.track_name_en || item.曲名_英語 || "",
        artist_name: item.artist_name || item.アーティスト || "",
        artist_name_en: item.artist_name_en || item.アーティスト_英語 || "",
        release_year: item.release_year || item.年 || item.リリース年 || "",
        preview_url: item.preview_url || "",
        itunes_url: item.itunes_url || item.spotify_url || "",
        album_cover: item.album_cover || item.ジャケット || "",
        description: item.description || item.概要 || "",
      }));
    }
  } catch (err) {}
}

if (recommendMusic.length === 0) {
  // ⚠️ 音楽APIが0件のときにAIが架空URLを出力するフォールバックは廃止
  // → エラーで即時停止させてワークフローを異常終了させる
  throw new Error(
    `❌ 音楽データ取得エラー: iTunes Search API が 0件を返しました（国: ${countryName || "不明"}）。\n音楽検索ワークフローの実行結果を確認してください。\nAIによる架空URL生成（ハルシネーション）を防止するため、この時点で処理を中断します。`,
  );
}

// 記事生成用のマージデータ
const r2Merged = {
  country: r2.country || r1.country,
  歴史的背景: r2.歴史的背景,
  直近の動向: r2.直近の動向,
  犯罪の傾向: r1.犯罪の傾向,
  重大犯罪事件: r1.重大犯罪事件,
  映像作品:
    Array.isArray(r25.映像作品) && r25.映像作品.length > 0
      ? r25.映像作品
      : Array.isArray(r25)
        ? r25
        : [],
  おすすめ映画: recommendedMovies,
  おすすめ映画_人気順: recommendedMoviesPopular,
  おすすめ映画_最新公開順: recommendedMoviesLatest,
  おすすめ音楽: recommendMusic,
};

// ==============================================================================
// 4. スプレッドシート固定データ（対象国 ＆ 日本）
// ==============================================================================
const keizai = safeGet("①経済") || {};
const chiAn = safeGet("②治安指標") || {};
const bukka = safeGet("③物価") || {};
const boeki = safeGet("④貿易") || {};

const jKeizai = safeGet("Japan_①経済") || {};
const jChiAn = safeGet("Japan_②治安指標") || {};
const jBukka = safeGet("Japan_③物価") || {};
const jBoeki = safeGet("Japan_④貿易") || {};

const jPrison = adjustPrisonTrend(
  [
    { 年: jChiAn["収容推移1_年"], 総収容者数: jChiAn["収容推移1_総収容者数"] },
    { 年: jChiAn["収容推移2_年"], 総収容者数: jChiAn["収容推移2_総収容者数"] },
    { 年: jChiAn["収容推移3_年"], 総収容者数: jChiAn["収容推移3_総収容者数"] },
    { 年: jChiAn["収容推移4_年"], 総収容者数: jChiAn["収容推移4_総収容者数"] },
    { 年: jChiAn["収容推移5_年"], 総収容者数: jChiAn["収容推移5_総収容者数"] },
    { 年: jChiAn["収容推移6_年"], 総収容者数: jChiAn["収容推移6_総収容者数"] },
    { 年: jChiAn["収容推移7_年"], 総収容者数: jChiAn["収容推移7_総収容者数"] },
    { 年: jChiAn["収容推移8_年"], 総収容者数: jChiAn["収容推移8_総収容者数"] },
    { 年: jChiAn["収容推移9_年"], 総収容者数: jChiAn["収容推移9_総収容者数"] },
    {
      年: jChiAn["収容推移10_年"],
      総収容者数: jChiAn["収容推移10_総収容者数"],
    },
  ].filter((d) => d.年),
  jChiAn,
);

const jDeath = [
  { 順位: "1位", 死因: jChiAn["死因1位"] },
  { 順位: "2位", 死因: jChiAn["死因2位"] },
  { 順位: "3位", 死因: jChiAn["死因3位"] },
  { 順位: "4位", 死因: jChiAn["死因4位"] },
  { 順位: "5位", 死因: jChiAn["死因5位"] },
  { 順位: "6位", 死因: jChiAn["死因6位"] },
  { 順位: "7位", 死因: jChiAn["死因7位"] },
  { 順位: "8位", 死因: jChiAn["死因8位"] },
  { 順位: "9位", 死因: jChiAn["死因9位"] },
  { 順位: "10位", 死因: jChiAn["死因10位"] },
];

const createShareFormatter = (rawList) => {
  const numeric = (rawList || [])
    .map((v) =>
      v !== undefined && v !== null && v !== "" ? parseFloat(v) : NaN,
    )
    .filter((v) => !isNaN(v) && v > 0);
  const isDecimal = numeric.length > 0 && numeric.every((v) => v < 1);

  return (val) => {
    if (val === undefined || val === null || val === "") return "";
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    if (isDecimal) {
      return (num * 100).toFixed(1) + "%";
    } else {
      if (String(val).indexOf("%") === -1) {
        return num.toFixed(1) + "%";
      }
    }
    return val;
  };
};

const formatShare = createShareFormatter(
  Array.from({ length: 10 }, (_, i) => boeki[`貿易相手${i + 1}位_シェア%`]),
);
const formatJShare = createShareFormatter(
  Array.from({ length: 10 }, (_, i) => jBoeki[`貿易相手${i + 1}位_シェア%`]),
);

const targetFixed = {
  経済データ: {
    総人口: {
      値: keizai["総人口"],
      年: keizai["総人口_年"],
      出典: keizai["総人口_出典"],
    },
    GDP_USD: {
      値: keizai["GDP_USD"],
      年: keizai["GDP_USD_年"],
      出典: keizai["GDP_USD_出典"],
    },
    GDP成長率: {
      値: keizai["GDP成長率"],
      年: keizai["GDP成長率_年"],
      出典: keizai["GDP成長率_出典"],
    },
    一人当たりGDP: {
      値: keizai["一人当たりGDP_USD"],
      年: keizai["一人当たりGDP_USD_年"],
      出典: keizai["一人当たりGDP_USD_出典"],
    },
    政府債務残高_GDP比: {
      値: keizai["政府債務残高_GDP比"],
      年: keizai["政府債務残高_GDP比_年"],
      出典: keizai["政府債務残高_GDP比_出典"],
    },
    経常収支_GDP比: {
      値: keizai["経常収支_GDP比"],
      年: keizai["経常収支_GDP比_年"],
      出典: keizai["経常収支_GDP比_出典"],
    },
    インフレ率: {
      値: keizai["インフレ率"],
      年: keizai["インフレ率_年"],
      出典: keizai["インフレ率_出典"],
    },
  },
  治安指標: {
    殺人率: {
      値: chiAn["殺人率"],
      年: chiAn["殺人率_年"],
      出典: chiAn["殺人率_出典"],
    },
    交通事故死亡率: {
      値: chiAn["交通事故死亡率"],
      年: chiAn["交通事故死亡率_年"],
      出典: chiAn["交通事故死亡率_出典"],
    },
    自殺率: {
      値: chiAn["自殺率"],
      年: chiAn["自殺率_年"],
      出典: chiAn["自殺率_出典"],
    },
    失業率: {
      値: chiAn["失業率"],
      年: chiAn["失業率_年"],
      出典: chiAn["失業率_出典"],
    },
    貧困率: {
      値: chiAn["貧困率"],
      年: chiAn["貧困率_年"],
      出典: chiAn["貧困率_出典"],
    },
    ジニ係数: {
      値: chiAn["ジニ係数"],
      年: chiAn["ジニ係数_年"],
      出典: chiAn["ジニ係数_出典"],
    },
    刑務所稼働率: {
      値: chiAn["刑務所稼働率"],
      年: chiAn["刑務所稼働率_年"],
      出典: chiAn["刑務所稼働率_出典"],
    },
    刑務所総収容者数: {
      値: chiAn["刑務所総収容者数"],
      年: chiAn["刑務所総収容者数_年"],
      出典: chiAn["刑務所総収容者数_出典"],
    },
    GPI: {
      スコア: chiAn["GPIスコア"],
      順位: chiAn["GPI順位"],
      年: chiAn["GPI年"],
      出典: chiAn["GPI出典"],
    },
    犯罪トップ5: Array.from({ length: 5 }, (_, i) => ({
      順位: `${i + 1}位`,
      犯罪種別: chiAn[`犯罪${i + 1}位_種別`] || "欠測",
      年: chiAn[`犯罪${i + 1}位_年`] || "",
      出典: chiAn["犯罪_出典"] || "",
    })),
    犯罪_年: chiAn["犯罪_年"] || "",
    犯罪_出典: chiAn["犯罪_出典"] || "",
    外務省危険レベル: {
      レベル: chiAn["外務省危険レベル"],
      出典: chiAn["外務省危険レベル_出典"],
    },
  },
  刑務所推移: adjustPrisonTrend(
    [
      { 年: chiAn["収容推移1_年"], 総収容者数: chiAn["収容推移1_総収容者数"] },
      { 年: chiAn["収容推移2_年"], 総収容者数: chiAn["収容推移2_総収容者数"] },
      { 年: chiAn["収容推移3_年"], 総収容者数: chiAn["収容推移3_総収容者数"] },
      { 年: chiAn["収容推移4_年"], 総収容者数: chiAn["収容推移4_総収容者数"] },
      { 年: chiAn["収容推移5_年"], 総収容者数: chiAn["収容推移5_総収容者数"] },
      { 年: chiAn["収容推移6_年"], 総収容者数: chiAn["収容推移6_総収容者数"] },
      { 年: chiAn["収容推移7_年"], 総収容者数: chiAn["収容推移7_総収容者数"] },
      { 年: chiAn["収容推移8_年"], 総収容者数: chiAn["収容推移8_総収容者数"] },
      { 年: chiAn["収容推移9_年"], 総収容者数: chiAn["収容推移9_総収容者数"] },
      {
        年: chiAn["収容推移10_年"],
        総収容者数: chiAn["収容推移10_総収容者数"],
      },
    ].filter((d) => d.年),
    chiAn,
  ),
  死因トップ10: [
    chiAn["死因1位"],
    chiAn["死因2位"],
    chiAn["死因3位"],
    chiAn["死因4位"],
    chiAn["死因5位"],
    chiAn["死因6位"],
    chiAn["死因7位"],
    chiAn["死因8位"],
    chiAn["死因9位"],
    chiAn["死因10位"],
  ],
  死因出典: chiAn["死因_出典"],
  物価: {
    通貨コード: bukka["通貨コード"],
    為替レート: bukka["為替レート"],
    為替取得日: bukka["為替取得日"],
    ビール: {
      現地通貨: bukka["ビール_現地通貨"],
      円換算: bukka["ビール_円換算"],
      出典: bukka["ビール_出典"],
    },
    タバコ: {
      現地通貨: bukka["タバコ_現地通貨"],
      円換算: bukka["タバコ_円換算"],
      出典: bukka["タバコ_出典"],
    },
    水: {
      現地通貨: bukka["水_現地通貨"],
      円換算: bukka["水_円換算"],
      出典: bukka["水_出典"],
    },
    ビッグマック: {
      現地通貨: bukka["ビッグマック_現地通貨"],
      円換算: bukka["ビッグマック_円換算"],
      出典: bukka["ビッグマック_出典"],
    },
    ガソリン: {
      現地通貨: bukka["ガソリン_現地通貨"],
      円換算: bukka["ガソリン_円換算"],
      出典: bukka["ガソリン_出典"],
    },
    外食: {
      現地通貨: bukka["外食_現地通貨"],
      円換算: bukka["外食_円換算"],
      出典: bukka["外食_出典"],
    },
    光熱費: {
      現地通貨: bukka["光熱費_現地通貨"],
      円換算: bukka["光熱費_円換算"],
      出典: bukka["光熱費_出典"],
    },
    家賃: {
      現地通貨:
        bukka["家賃1LDK(市中心)_現地通貨"] ||
        bukka["家賃_現地通貨"] ||
        bukka["家賃1LDK（市中心）_現地通貨"] ||
        "",
      円換算:
        bukka["家賃1LDK(市中心)_円換算"] ||
        bukka["家賃_円換算"] ||
        bukka["家賃1LDK（市中心）_円換算"] ||
        "",
      出典: bukka["家賃_出典"] || bukka["物価_出典"] || "Numbeo",
    },
    月収: {
      現地通貨: bukka["月収_現地通貨"],
      円換算: bukka["月収_円換算"],
      出典: bukka["月収_出典"],
    },
    Netflix: {
      現地通貨: bukka["Netflix_現地通貨"],
      円換算: bukka["Netflix_円換算"],
      出典: bukka["Netflix_出典"],
    },
  },
  貿易: {
    輸出: Array.from({ length: 10 }, (_, i) => ({
      順位: `${i + 1}位`,
      品目: boeki[`輸出${i + 1}位_品目`],
    })),
    輸入: Array.from({ length: 10 }, (_, i) => ({
      順位: `${i + 1}位`,
      品目: boeki[`輸入${i + 1}位_品目`],
    })),
    貿易相手国: Array.from({ length: 10 }, (_, i) => ({
      順位: `${i + 1}位`,
      国名: boeki[`貿易相手${i + 1}位_国名`],
      シェア: formatShare(boeki[`貿易相手${i + 1}位_シェア%`]),
    })),
  },
  貿易出典_対象国: boeki["貿易統計_出典"],
};

const getCleanYearString = (val) => {
  if (!val) return "";
  const trimmed = String(val).trim();
  return trimmed.endsWith("年") ? trimmed : trimmed + "年";
};

const japanFixed = {
  制度の9つの皿: {
    国家の形と統治機構: {
      値: "立憲君主制（象徴天皇制）・議院内閣制・単一国家",
    },
    行政トップ: { 値: "内閣総理大臣：高市早苗（2025年10月就任）" },
    立法と選挙制度: { 値: "二院制（衆議院・参議院）・小選挙区比例代表並立制" },
    司法と法制度: { 値: "最高裁判所を頂点とする三審制・大陸法基調" },
    社会保障・医療・年金: {
      値: "国民皆保険・国民年金（自己負担原則3割・受給開始65歳）",
    },
    教育制度: { 値: "6-3-3-4制・義務教育9年・大学進学率約57%" },
    徴税・財政制度: {
      値: "消費税10%（軽減税率8%）・所得税最高45%・相続税最高55%",
    },
    安全保障と兵役: { 値: "自衛隊（志願制）・兵役義務なし・日米安保基軸" },
    基本権と価値観: { 値: "死刑制度維持（絞首刑・執行継続）・同性婚未承認" },
  },
  経済データ: {
    総人口: {
      値: jKeizai["総人口"],
      年: jKeizai["総人口_年"],
      出典: jKeizai["総人口_出典"],
    },
    GDP_USD: {
      値: jKeizai["GDP_USD"],
      年: jKeizai["GDP_USD_年"],
      出典: jKeizai["GDP_USD_出典"],
    },
    GDP成長率: {
      値: jKeizai["GDP成長率"],
      年: jKeizai["GDP成長率_年"],
      出典: jKeizai["GDP成長率_出典"],
    },
    一人当たりGDP: {
      値: jKeizai["一人当たりGDP_USD"],
      年: jKeizai["一人当たりGDP_USD_年"],
      出典: jKeizai["一人当たりGDP_USD_出典"],
    },
    政府債務残高_GDP比: {
      値: jKeizai["政府債務残高_GDP比"],
      年: jKeizai["政府債務残高_GDP比_年"],
      出典: jKeizai["政府債務残高_GDP比_出典"],
    },
    経常収支_GDP比: {
      値: jKeizai["経常収支_GDP比"],
      年: jKeizai["経常収支_GDP比_年"],
      出典: jKeizai["経常収支_GDP比_出典"],
    },
    インフレ率: {
      値: jKeizai["インフレ率"],
      年: jKeizai["インフレ率_年"],
      出典: jKeizai["インフレ率_出典"],
    },
  },
  治安指標: {
    殺人率: {
      値: jChiAn["殺人率"],
      "出典・年":
        `${jChiAn["殺人率_出典"] || ""} ${getCleanYearString(jChiAn["殺人率_年"])}`.trim(),
    },
    交通事故死亡率: {
      値: jChiAn["交通事故死亡率"],
      "出典・年":
        `${jChiAn["交通事故死亡率_出典"] || ""} ${getCleanYearString(jChiAn["交通事故死亡率_年"])}`.trim(),
    },
    自殺率: {
      値: jChiAn["自殺率"],
      "出典・年":
        `${jChiAn["自殺率_出典"] || ""} ${getCleanYearString(jChiAn["自殺率_年"])}`.trim(),
    },
    失業率: {
      値: jChiAn["失業率"],
      "出典・年":
        `${jChiAn["失業率_出典"] || ""} ${getCleanYearString(jChiAn["失業率_年"])}`.trim(),
    },
    貧困率: {
      値: jChiAn["貧困率"],
      "出典・年":
        `${jChiAn["貧困率_出典"] || ""} ${getCleanYearString(jChiAn["貧困率_年"])}`.trim(),
    },
    ジニ係数: {
      値: jChiAn["ジニ係数"],
      "出典・年":
        `${jChiAn["ジニ係数_出典"] || ""} ${getCleanYearString(jChiAn["ジニ係数_年"])}`.trim(),
    },
    刑務所稼働率: {
      値: jChiAn["刑務所稼働率"],
      "出典・年":
        `${jChiAn["刑務所稼働率_出典"] || ""} ${getCleanYearString(jChiAn["刑務所稼働率_年"])}`.trim(),
    },
    刑務所総収容者数: {
      値: jChiAn["刑務所総収容者数"],
      "出典・年":
        `${jChiAn["刑務所総収容者数_出典"] || ""} ${getCleanYearString(jChiAn["刑務所総収容者数_年"])}`.trim(),
    },
    GPIスコア: {
      値: jChiAn["GPIスコア"],
      "出典・年":
        `${jChiAn["GPI出典"] || ""} ${getCleanYearString(jChiAn["GPI年"])}`.trim(),
    },
    GPI順位: {
      値: jChiAn["GPI順位"],
      "出典・年":
        `${jChiAn["GPI出典"] || ""} ${getCleanYearString(jChiAn["GPI年"])}`.trim(),
    },
  },
  刑務所推移: jPrison,
  死因トップ10: jDeath,
  死因出典: jChiAn["死因_出典"],
  物価: {
    "ビール（レストラン500ml）": {
      "値（円）": jBukka["ビール_円換算"]
        ? `${jBukka["ビール_円換算"]}円`
        : "データなし",
      出典: jBukka["ビール_出典"],
    },
    "タバコ（マルボロ1箱20本）": {
      "値（円）": jBukka["タバコ_円換算"]
        ? `${jBukka["タバコ_円換算"]}円`
        : "データなし",
      出典: jBukka["タバコ_出典"],
    },
    "ミネラルウォーター（500ml）": {
      "値（円）": jBukka["水_円換算"]
        ? `${jBukka["水_円換算"]}円`
        : "データなし",
      出典: jBukka["水_出典"],
    },
    "ビッグマック（1個）": {
      "値（円）": jBukka["ビッグマック_円換算"]
        ? `${jBukka["ビッグマック_円換算"]}円`
        : "データなし",
      出典: jBukka["ビッグマック_出典"],
    },
    "ガソリン（1L）": {
      "値（円）": jBukka["ガソリン_円換算"]
        ? `${jBukka["ガソリン_円換算"]}円`
        : "データなし",
      出典: jBukka["ガソリン_出典"],
    },
    "外食（安めの店・1食）": {
      "値（円）": jBukka["外食_円換算"]
        ? `${jBukka["外食_円換算"]}円`
        : "データなし",
      出典: jBukka["外食_出典"],
    },
    "電気・水道・ガス（月額・85㎡）": {
      "値（円）": jBukka["光熱費_円換算"]
        ? `${jBukka["光熱費_円換算"]}円`
        : "データなし",
      出典: jBukka["光熱費_出典"],
    },
    "家賃1LDK(市中心)": {
      "値（円）":
        jBukka["家賃1LDK(市中心)_円換算"] ||
        jBukka["家賃_円換算"] ||
        jBukka["家賃1LDK（市中心）_円換算"]
          ? `${jBukka["家賃1LDK(市中心)_円換算"] || jBukka["家賃_円換算"] || jBukka["家賃1LDK（市中心）_円換算"]}円`
          : "データなし",
      出典: jBukka["家賃_出典"] || jBukka["物価_出典"] || "Numbeo",
    },
    "平均月収（手取り）": {
      "値（円）": jBukka["月収_円換算"]
        ? `${jBukka["月収_円換算"]}円`
        : "データなし",
      出典: jBukka["月収_出典"],
    },
    "Netflix（スタンダード・広告なし）": {
      "値（円）": jBukka["Netflix_円換算"]
        ? `${jBukka["Netflix_円換算"]}円`
        : "データなし",
      出典: jBukka["Netflix_出典"],
    },
  },
  貿易: {
    輸出: Array.from({ length: 10 }, (_, i) => ({
      順位: `${i + 1}位`,
      品目: jBoeki[`輸出${i + 1}位_品目`],
      出典: jBoeki[`輸出${i + 1}位_出典`],
    })),
    輸入: Array.from({ length: 10 }, (_, i) => ({
      順位: `${i + 1}位`,
      品目: jBoeki[`輸入${i + 1}位_品目`],
      出典: jBoeki[`輸入${i + 1}位_出典`],
    })),
    貿易相手国: Array.from({ length: 10 }, (_, i) => ({
      順位: `${i + 1}位`,
      国名: jBoeki[`貿易相手${i + 1}位_国名`],
      シェア: formatJShare(jBoeki[`貿易相手${i + 1}位_シェア%`]),
    })),
  },
  貿易出典_日本: jBoeki["貿易統計_出典"],
};

// --- スプレッドシートのデータ不足バリデーション ---
const targetCountry = r1.country || "対象国";
const hasEconomy =
  keizai && Object.keys(keizai).length > 0 && keizai["総人口"] !== undefined;
const hasTrade =
  boeki && Object.keys(boeki).length > 0 && boeki["輸出1位_品目"] !== undefined;
const hasBukka =
  bukka && Object.keys(bukka).length > 0 && bukka["通貨コード"] !== undefined;

if (!hasEconomy || !hasTrade || !hasBukka) {
  throw new Error(`【データ不在エラー】スプレッドシートに対象国「${targetCountry}」の固定データが登録されていません。
スプレッドシート（①経済、②治安指標、③物価、④貿易シートなど）に「${targetCountry}」の行を正しく手動追加し、データを入力した後に再実行してください。
（検出状況 -> 経済: ${hasEconomy ? "○" : "×"}, 貿易: ${hasTrade ? "○" : "×"}, 物価: ${hasBukka ? "○" : "×"}）`);
}

// ==============================================================================
// 5. データの最終集約
// ==============================================================================
const finalData = {
  対象国データ: r1,
  対象国データ_記事: r2Merged,
  固定データ: targetFixed,
  日本固定データ: japanFixed,
};

return [
  {
    json: {
      country: r1.country || targetCountry,
      world_bank_code: r1.world_bank_code || "",
      countryEn: r1.countryEn || safeGet("国名変換Code")?.countryEn || "",
      capital: safeGet("国名変換Code")?.capital || "",
      data: finalData,
    },
  },
];
