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
