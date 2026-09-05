# 【04】Gemini人物クレンジング_AIプロンプト (Google Gemini Node)

## 📌 ノード概要
* **ノード名**: `Gemini人物クレンジング`
* **ノードタイプ**: `@n8n/n8n-nodes-langchain.agent` または `Google Gemini` / `Basic LLM Chain`
* **Model**: `gemini-1.5-flash` / `gemini-2.0-flash` / `gemini-3.8-flash`
* **役割**: Wikidataから取得した断片的なプロフィールデータ（生年月日・代表作・職業・国籍等）をもとに、HistoryGalleryや語学学習アプリで表示する**高品質で魅力的な人物紹介文（bio / 150〜250文字程度）**を日本語で自動生成・要約クレンジングします。

---

## 📝 Gemini AI プロンプト (Prompt Text)

n8n の Prompt（メッセージ）入力欄に以下を設定してください：

```text
あなたは人物データベースの専門ライターです。
提供された以下の人物データを元に、対象人物「{{ (() => { try { let p = typeof $json.data === 'string' ? JSON.parse($json.data) : $json; return p.results?.bindings?.[0]?.personJaLabel?.value || p.results?.bindings?.[0]?.personLabel?.value || $json['人物名'] || $json.name || ''; } catch(e) { return $json['人物名'] || $json.name || ''; } })() }}」のプロフィール紹介文（日本語で150文字〜250文字程度）を作成してください。

ルール：
- 人物の代表作、経歴、主な業績、受賞歴などをまとめた自然で魅力的な日本語文章にしてください。
- 挨拶や前置き（「承知いたしました」等）、見出し、注釈は絶対に含めないでください。本文（段落）のみを出力してください。
- 事実に基づかない推測や想像は含めないでください。

対象人物データ：
{{ (() => {
  try {
    let parsed = typeof $json.data === 'string' ? JSON.parse($json.data) : ($json.data || $json);
    let b = parsed.results?.bindings?.[0] || {};
    let info = {
      name: b.personJaLabel?.value || b.personLabel?.value || '',
      name_en: b.personEnLabel?.value || '',
      qid: b.person?.value ? b.person.value.split('/').pop() : '',
      gender: b.genderLabel?.value || '',
      country: b.countryLabel?.value || '',
      occupation: b.occupationLabel?.value || '',
      birth_date: b.birthDate?.value ? b.birthDate.value.split('T')[0] : '',
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
