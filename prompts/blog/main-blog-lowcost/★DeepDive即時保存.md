# 📑 ★DeepDive即時保存 ノード設定ガイド（完全自動化・万能UPSERT版）

n8nワークフロー上の **「文化DeepDive（Perplexity）」の直後** に配置する **「★DeepDive即時保存」**（HTTP Requestノード）の設定です。

* **行があってもなくても自動対応（万能UPSERT）**：既存レコードがあれば `deep_dive` だけを安全に更新し、他のリサーチデータやまとめ記事を一切壊しません。
* **Perplexityの出力形式に完全対応**：`$json.message` から本文テキストを確実に抽出して保存します。
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
```javascript
{{
  JSON.stringify({
    country: $('国名変換Code').first().json.country,
    deep_dive: $json.message || $json.output || $json.text || '',
    updated_at: new Date().toISOString()
  })
}}
```

---

## 🎯 ノード実行後のアウトプット（こう表示されます）

```json
[
  {
    "country": "インドネシア",
    "deep_dive": "# ✦ 文化Deep Dive：トラジャ族の死者との共生儀礼「Ma'nene」...",
    "updated_at": "2026-09-19T05:25:00.000Z"
  }
]
```
