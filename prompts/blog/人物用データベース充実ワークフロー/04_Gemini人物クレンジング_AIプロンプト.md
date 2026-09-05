# 【04】Gemini人物クレンジング_AIプロンプト (Google Gemini Node)

## 📌 ノード概要
* **ノード名**: `Gemini人物クレンジング`
* **ノードタイプ**: `@n8n/n8n-nodes-langchain.agent` または `Google Gemini` / `Basic LLM Chain`
* **Model**: `gemini-1.5-flash` / `gemini-2.0-flash` / `gemini-3.8-flash`
* **役割**: Wikidataから取得した断片的なプロフィールデータ（生没年月日・役職・所属政党・代表作・職業・国籍等）をもとに、HistoryGalleryや情報ダッシュボード、語学学習アプリで表示する**高品質で魅力的な人物紹介文（bio / 150〜250文字程度）**を日本語で自動生成・要約クレンジングします。
* **対応分野**: 俳優・映画監督だけでなく、政治家（大統領・議員・知事等）、歴史上の人物（朝鮮王朝・偉人等）、K-POPアイドル、文化人・学者にも最適化。

---

## 📝 Gemini AI プロンプト (Prompt Text)

n8n の Prompt（メッセージ）入力欄に以下を設定してください：

```text
あなたは人物データベースの専門ライター・エディターです。
提供された以下の人物データを元に、対象人物「{{ (() => { try { let p = typeof $json.data === 'string' ? JSON.parse($json.data) : $json; return p.results?.bindings?.[0]?.personJaLabel?.value || p.results?.bindings?.[0]?.personLabel?.value || $json['人物名'] || $json.name || ''; } catch(e) { return $json['人物名'] || $json.name || ''; } })() }}」のプロフィール紹介文（日本語で150文字〜250文字程度）を作成してください。

分野別の執筆指針：
- 政治家・官僚: 主な公職（大統領、首相、議員等）、所属政党、主要な政策や政治史における役割を記述してください。
- 歴史上の人物: 活躍した時代区分（朝鮮王朝等）、主な業績や歴史的事件、後世への影響を明記してください。
- 俳優・映画監督・タレント: デビュー経緯、代表作（映画・ドラマ名）、演技の特徴や受賞歴を記載してください。
- アイドル・歌手: 所属グループ名、ポジション、代表曲やヒット作を記載してください。
- 学者・作家・文化人: 専門分野、代表的著作、学術的・文化的な功績を記載してください。

共通ルール：
- 簡潔で読みやすく、事実に基づいた自然な日本語文章にしてください。
- 挨拶や前置き（「承知いたしました」等）、見出し、注釈は絶対に含めず、本文（1段落）のみを出力してください。
- 事実に基づかない推測や不確かな噂は含めないでください。

対象人物データ：
{{ (() => {
  try {
    let parsed = typeof $json.data === 'string' ? JSON.parse($json.data) : ($json.data || $json);
    let b = parsed.results?.bindings?.[0] || {};
    let info = {
      name: b.personJaLabel?.value || b.personLabel?.value || '',
      name_en: b.personEnLabel?.value || '',
      name_ko: b.personKoLabel?.value || '',
      qid: b.person?.value ? b.person.value.split('/').pop() : '',
      gender: b.genderLabel?.value || '',
      country: b.countryLabel?.value || '',
      occupation: b.occupationLabel?.value || '',
      position: b.positionLabel?.value || '',
      party: b.partyLabel?.value || '',
      birth_date: b.birthDate?.value ? b.birthDate.value.split('T')[0] : '',
      death_date: b.deathDate?.value ? b.deathDate.value.split('T')[0] : '',
      members: b.membersList?.value || '',
      x_id: b.twitter?.value || '',
      instagram_id: b.instagram?.value || '',
      website: b.website?.value || ''
    };
    return JSON.stringify(info, null, 2);
  } catch(e) {
    return $json.data || JSON.stringify($json);
  }
})() }}
```

---

## ⚙️ 推奨パラメータ設定
* **Temperature**: `0.2` 〜 `0.3`（事実に基づいた安定した記述にするため低めに設定）
* **Max Output Tokens**: `500`（短く簡潔なbioを生成）
