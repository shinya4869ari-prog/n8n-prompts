## n8nのデータトリム問題 解決手順メモ

### 症状
ノードの出力が `{ "__isTrimmedManualExecutionDataItem": true }` に置き換わり、下流ノードでデータが取れなくなる

### 原因
手動実行時にn8nのUIがサイズ上限を超えたデータをトリムする

### 解決手順

**1. `docker-compose.yml` を開く**

**2. 以下の環境変数を追加**

```yaml
environment:
  - N8N_PAYLOAD_SIZE_MAX=256
  - N8N_MANUAL_EXECUTION_DATA_SAVE=all
```

**3. 再起動**

```bash
docker-compose down && docker-compose up -d
```

**4. n8nで再テスト実行**

---

### それでも直らない場合
下流ノードに以下を一時的に貼って原因を切り分ける

```javascript
const raw = $('問題のノード名').first().json;
return [{ json: { 
  keys: Object.keys(raw),
  isTrimmed: raw.__isTrimmedManualExecutionDataItem ?? false
}}];
```

- `isTrimmed: true` → 環境変数が効いていない（設定を見直す）
- `keys: []` → ノード名の不一致か接続ミス


解決策2：データ分離（最も根本的な設計改善）
現状の問題は writerPrompt（50KB）と data（30KB）が同じノードの出力に重複して乗っていることです。以下の構造に分離します：
現状（問題のある構造）：
整形ノード1 → [writerPrompt(50KB) + data(30KB)] → Writer
                                                  ↘ 最終Code（dataを再参照）
改善後：
整形ノード1A（dataのみ出力・30KB）─────────────────┐
       ↓                                          ↓
整形ノード1B（writerPromptのみ・dataは含めない） → Writer → 最終Code
                                                            ↑ $('整形ノード1A')で参照
整形ノード1A（統計データ専用）：
javascript// このノードはdataオブジェクトのみを返す。writerPromptは含めない。
const keizai  = $('①経済').first().json;
const chiAn   = $('②治安指標').first().json;
const bukka   = $('③物価').first().json;
const boeki   = $('④貿易').first().json;
// ... 日本分も同様

return [{ json: { country: r1.country, data: finalData } }];
整形ノード1B（プロンプト生成専用）：
javascript// dataは持たず、writerPromptだけを返す
const dataJson = JSON.stringify($('整形ノード1A').first().json.data);
const template = $('PromptLoader').first().json.writerPrompt;
const prompt = template.replace('{{ JSON.stringify($json.data) }}', dataJson);

return [{ json: { country: $('整形ノード1A').first().json.country, writerPrompt: prompt } }];
最終Codeノードの参照先変更：
javascript// 変更前
const sheetData = $('整形ノード1').first().json;

// 変更後
const sheetData = $('整形ノード1A').first().json;
これにより各ノードの出力サイズが半減し、トリムの閾値を超えなくなります。

解決策3：writerPromptをノード間で渡さない
そもそも AIノードのプロンプトをノードから受け取る設計がサイズ問題の根本原因です。
PromptLoaderノードのテンプレートとdataオブジェクトをAIノードのSystem Promptフィールドで直接結合する方法が最もクリーンです：
AIノードのプロンプト設定（Expression）：
{{ $('PromptLoader').first().json.writerPrompt.replace('{{ JSON.stringify($json.data) }}', JSON.stringify($('整形ノード1').first().json.data)) }}
こうするとWriterに渡るのはプロンプト文字列のみで、ノードの出力JSONにはdataだけが残ります。