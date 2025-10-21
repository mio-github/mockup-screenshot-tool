# MCP Interactive Capture - LLMからの詳細なページ操作

`navigate_and_capture` ツールを使用すると、LLMが自由にページを遷移しながらスクリーンショットをキャプチャできます。

## 新しいMCPツール

### `navigate_and_capture`

**説明**: LLMが指定したURLにアクセスし、ブラウザ操作を実行してからスクリーンショットをキャプチャします。

**使用例**:

#### 1. 基本的なページキャプチャ

```
http://localhost:3000/dashboard にアクセスして、
"dashboard_overview" という名前でスクリーンショットを撮って
```

LLMが実行するMCP呼び出し:
```json
{
  "tool": "navigate_and_capture",
  "arguments": {
    "baseUrl": "http://localhost:3000",
    "path": "/dashboard",
    "name": "dashboard_overview"
  }
}
```

#### 2. ブラウザ操作を含むキャプチャ

```
http://localhost:3000/upload にアクセスして、
"動画ファイル" ボタンをクリックしてから、
"upload_with_file_selected" という名前でスクリーンショットを撮って
```

LLMが実行するMCP呼び出し:
```json
{
  "tool": "navigate_and_capture",
  "arguments": {
    "baseUrl": "http://localhost:3000",
    "path": "/upload",
    "name": "upload_with_file_selected",
    "actions": [
      {
        "type": "click",
        "selector": "button:has-text('動画ファイル')",
        "description": "動画ファイルボタンをクリック"
      }
    ]
  }
}
```

#### 3. 複雑な操作シーケンス

```
http://localhost:3000/analysis にアクセスして、
1. 検索ボックスに "テスト" と入力
2. 検索ボタンをクリック
3. 結果が表示されるまで待機
4. ページを下にスクロール（Y座標: 500）
してから "analysis_search_results" という名前でキャプチャして
```

LLMが実行するMCP呼び出し:
```json
{
  "tool": "navigate_and_capture",
  "arguments": {
    "baseUrl": "http://localhost:3000",
    "path": "/analysis",
    "name": "analysis_search_results",
    "actions": [
      {
        "type": "type",
        "selector": "input[type='search']",
        "value": "テスト",
        "description": "検索ボックスに入力"
      },
      {
        "type": "click",
        "selector": "button[type='submit']",
        "description": "検索ボタンをクリック"
      },
      {
        "type": "wait",
        "duration": 2000,
        "description": "結果の表示を待機"
      },
      {
        "type": "scroll",
        "x": 0,
        "y": 500,
        "description": "ページを下にスクロール"
      }
    ]
  }
}
```

#### 4. グラフページのキャプチャ

```
http://localhost:3000/dashboard にアクセスして、
グラフの読み込みを待ってから
"dashboard_with_graphs" という名前でキャプチャして
```

LLMが実行するMCP呼び出し:
```json
{
  "tool": "navigate_and_capture",
  "arguments": {
    "baseUrl": "http://localhost:3000",
    "path": "/dashboard",
    "name": "dashboard_with_graphs",
    "waitStrategy": "graph"
  }
}
```

## 利用可能なアクション

### click
要素をクリック
```json
{
  "type": "click",
  "selector": "button.submit",
  "description": "送信ボタンをクリック"
}
```

### type
テキストを入力
```json
{
  "type": "type",
  "selector": "input#email",
  "value": "test@example.com",
  "description": "メールアドレスを入力"
}
```

### scroll
ページをスクロール
```json
{
  "type": "scroll",
  "x": 0,
  "y": 1000,
  "description": "ページを下にスクロール"
}
```

### hover
要素にホバー
```json
{
  "type": "hover",
  "selector": ".dropdown-menu",
  "description": "ドロップダウンメニューにホバー"
}
```

### select
セレクトボックスで選択
```json
{
  "type": "select",
  "selector": "select#category",
  "value": "video",
  "description": "カテゴリを選択"
}
```

### wait
指定時間待機
```json
{
  "type": "wait",
  "duration": 3000,
  "description": "3秒待機"
}
```

### waitForSelector
要素の出現を待機
```json
{
  "type": "waitForSelector",
  "selector": ".loading-complete",
  "description": "ローディング完了を待機"
}
```

### evaluate
カスタムJavaScriptを実行
```json
{
  "type": "evaluate",
  "code": "document.querySelector('.modal').style.display = 'block'",
  "description": "モーダルを表示"
}
```

## 待機戦略 (waitStrategy)

ページの種類に応じて適切な待機戦略を指定できます：

| 戦略 | 用途 | 待機内容 |
|-----|------|---------|
| `basic` | 通常のページ | 基本的な待機のみ（デフォルト） |
| `graph` | グラフ・チャート | SVG/Canvasの読み込みとアニメーション完了を待機 |
| `video` | 動画サムネイル | 動画サムネイルの読み込みを待機 |
| `table` | データテーブル | テーブル要素の読み込みを待機 |
| `live` | カメラフィード | カメラフィードの読み込みを待機 |

## 出力先のカスタマイズ

デフォルトでは `./mockup-output/screenshots/` に保存されますが、変更可能です：

```json
{
  "tool": "navigate_and_capture",
  "arguments": {
    "baseUrl": "http://localhost:3000",
    "path": "/",
    "name": "home",
    "outputDir": "./custom-screenshots"
  }
}
```

## ビューポートのカスタマイズ

画面サイズを変更できます（デフォルト: 1920x1080）：

```json
{
  "tool": "navigate_and_capture",
  "arguments": {
    "baseUrl": "http://localhost:3000",
    "path": "/",
    "name": "mobile_home",
    "viewport": {
      "width": 375,
      "height": 667
    }
  }
}
```

## 実用例

### 例1: フォーム入力後のプレビュー

```
ユーザー登録フォームのプレビュー画面をキャプチャして：
1. http://localhost:3000/register にアクセス
2. 名前に "テストユーザー" と入力
3. メールに "test@example.com" と入力
4. プレビューボタンをクリック
5. "register_preview" という名前で保存
```

### 例2: モーダルダイアログのキャプチャ

```
削除確認モーダルをキャプチャして：
1. http://localhost:3000/dashboard にアクセス
2. 削除ボタンをクリック
3. モーダルが表示されるまで待機
4. "delete_confirmation_modal" という名前で保存
```

### 例3: スクロール位置を調整したキャプチャ

```
ページの中間部分をキャプチャして：
1. http://localhost:3000/features にアクセス
2. Y座標2000までスクロール
3. "features_middle_section" という名前で保存
```

## 従来のツールとの違い

| ツール | 用途 | 設定方法 |
|-------|------|---------|
| `capture_screenshots` | 設定ファイルで定義された全ページを一括キャプチャ | 事前にmockup-config.jsonを作成 |
| `navigate_and_capture` | LLMが1ページずつ自由に操作してキャプチャ | LLMがその場で指示を生成 |

## 利点

1. **柔軟性**: 設定ファイル不要で、その場で操作を指示できる
2. **インタラクティブ**: LLMがページの状態を見ながら次の操作を決定できる
3. **探索的**: モックアプリを探索しながらキャプチャできる
4. **デバッグ**: 特定の状態やエラー画面を再現してキャプチャできる

## 注意事項

- ブラウザ操作は順次実行されます
- セレクタが見つからない場合でも続行されます（エラーログが記録されます）
- fullPageスクリーンショットを撮影するため、ページ全体が保存されます
