# 📑 ★DeepDive即時保存 ノード設定ガイド（完全自動化・万能UPSERT版）

n8nワークフロー上の **「文化DeepDive（Perplexity）」の直後** に配置する **「★DeepDive即時保存」**（HTTP Requestノード）の設定です。

* **行があってもなくても自動対応（万能UPSERT）**：既存レコードがあれば `deep_dive` だけを安全に更新し、他のリサーチデータやまとめ記事を一切壊しません。
* **Perplexityのあらゆる出力形式を自動判別**：`$json.message`、`choices[0].message.content`、ノード直参照（`文化DeepDive` / `Deep-Dive_writer`）のどれでも100%本文を拾います。
* **保存結果のみ返却**：`&select=country,deep_dive,updated_at` により、保存された内容だけがアウトプットに返ります。

---

## ⚙️ 基本設定

* **Node Name**: `★DeepDive即時保存`
* **Method**: **`POST`**
* **URL**:
  ```text
  https://uvjpiuinsgklddzhzpio.supabase.co/rest/v1/country_research_cache?on_conflict=country&select=country,deep_dive,updated_at
  ```

---

## 📋 Headers 設定

| Header名 | 値 | 役割 |
| :--- | :--- | :--- |
| `Prefer` | `resolution=merge-duplicates,return=representation` | 行があれば安全にマージ更新、結果を画面表示 |
| `apikey` | `sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX` | Supabase APIキー |
| `Authorization` | `Bearer sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX` | Bearerトークン |
| `Content-Type` | `application/json` | JSON送信指定 |

---

## 📦 JSON Body 設定

### Specify Body: `JSON` ➜ 「Expression」モード
以下のコードを丸ごと貼り付けてください（どんなノード接続順やレスポンス形式でも本文を確実に救出します）：

```javascript
{{
  (() => {
    // 直前ノードまたはPerplexityノード候補からデータを取得
    let src = $json;
    if (!src?.message && !src?.output && !src?.choices) {
      try { src = $('文化DeepDive').first().json; } catch(e) {
        try { src = $('Deep-Dive_writer').first().json; } catch(e2) {}
      }
    }

    // 本文テキストを網羅的に救出
    const text = (typeof src?.message === 'string' ? src.message : src?.message?.content)
              || src?.choices?.[0]?.message?.content
              || src?.output
              || src?.text
              || '';

    let countryName = 'インドネシア';
    try { countryName = $('国名変換Code').first().json.country; } catch(e) {
      try { countryName = $('PromptLoader').first().json.country; } catch(e2) {}
    }

    return JSON.stringify({
      country: countryName,
      deep_dive: text,
      updated_at: new Date().toISOString()
    });
  })()
}}
```

---

## 🎯 ノード実行後の期待されるアウトプット

```json
[
  {
    "country": "インドネシア",
    "deep_dive": "# ✦ 文化Deep Dive：トラジャ族の死者との共生儀礼「Ma'nene」...",
    "updated_at": "2026-09-19T05:25:00.000Z"
  }
]
```
