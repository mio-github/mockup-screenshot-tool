# MCP Video Recording - LLMが指定する操作シーケンスの動画録画

`navigate_and_record` ツールを使用すると、LLMが指定したブラウザ操作のシーケンスを動画として記録できます。

## 概要

- **形式**: MP4 (H.264)
- **出力先**: `./mockup-output/videos/` (デフォルト)
- **解像度**: 1920x1080 (カスタマイズ可能)
- **用途**: ページ遷移、フォーム入力、インタラクション、ユーザーフローのデモ動画作成
- **変換**: Playwrightで録画したWebMをffmpegで自動的にMP4に変換

## 基本的な使い方

### 例1: シンプルなページ遷移の録画

```
http://localhost:3000/dashboard にアクセスして、
ページ全体を3秒間録画して、
"dashboard_overview" という名前で動画を保存して
```

LLMが実行するMCP呼び出し:
```json
{
  "tool": "navigate_and_record",
  "arguments": {
    "baseUrl": "http://localhost:3000",
    "path": "/dashboard",
    "name": "dashboard_overview",
    "recordingOptions": {
      "initialDelay": 3000,
      "finalDelay": 2000
    }
  }
}
```

### 例2: フォーム入力操作の録画

```
ユーザー登録フローを動画で記録して：
1. http://localhost:3000/register にアクセス
2. 名前フィールドに "田中太郎" と入力
3. メールフィールドに "tanaka@example.com" と入力
4. パスワードフィールドに "password123" と入力
5. 登録ボタンをクリック
6. 完了画面が表示されるまで待機
この操作を "user_registration_flow" という名前で動画保存して
```

LLMが実行するMCP呼び出し:
```json
{
  "tool": "navigate_and_record",
  "arguments": {
    "baseUrl": "http://localhost:3000",
    "path": "/register",
    "name": "user_registration_flow",
    "actions": [
      {
        "type": "type",
        "selector": "input[name='name']",
        "value": "田中太郎",
        "description": "名前を入力"
      },
      {
        "type": "type",
        "selector": "input[name='email']",
        "value": "tanaka@example.com",
        "description": "メールアドレスを入力"
      },
      {
        "type": "type",
        "selector": "input[name='password']",
        "value": "password123",
        "description": "パスワードを入力"
      },
      {
        "type": "click",
        "selector": "button[type='submit']",
        "description": "登録ボタンをクリック"
      },
      {
        "type": "wait",
        "duration": 3000,
        "description": "完了画面を待機"
      }
    ],
    "recordingOptions": {
      "initialDelay": 2000,
      "finalDelay": 3000
    }
  }
}
```

### 例3: 検索機能のデモ動画

```
検索機能のデモ動画を作成して：
1. http://localhost:3000/analysis にアクセス
2. 検索ボックスに "テスト動画" と入力
3. 1秒待機
4. 検索ボタンをクリック
5. 結果が表示されるまで待機（2秒）
6. 最初の結果をクリック
7. 詳細ページが表示されるまで待機
"search_and_view_demo" という名前で保存して
```

LLMが実行するMCP呼び出し:
```json
{
  "tool": "navigate_and_record",
  "arguments": {
    "baseUrl": "http://localhost:3000",
    "path": "/analysis",
    "name": "search_and_view_demo",
    "actions": [
      {
        "type": "type",
        "selector": "input[type='search']",
        "value": "テスト動画",
        "description": "検索クエリを入力"
      },
      {
        "type": "wait",
        "duration": 1000,
        "description": "入力完了を待機"
      },
      {
        "type": "click",
        "selector": "button[type='submit']",
        "description": "検索実行"
      },
      {
        "type": "wait",
        "duration": 2000,
        "description": "検索結果の表示を待機"
      },
      {
        "type": "click",
        "selector": ".result-item:first-child",
        "description": "最初の結果をクリック"
      },
      {
        "type": "wait",
        "duration": 2000,
        "description": "詳細ページの表示を待機"
      }
    ],
    "recordingOptions": {
      "initialDelay": 2000,
      "finalDelay": 3000
    }
  }
}
```

### 例4: スクロール操作を含むデモ

```
ページのスクロール動作をデモ動画にして：
1. http://localhost:3000/features にアクセス
2. 3秒間初期状態を表示
3. ゆっくり下にスクロール（Y: 500）
4. 1秒待機
5. さらに下にスクロール（Y: 1000）
6. 1秒待機
7. 一番下までスクロール（Y: 2000）
"features_scroll_demo" という名前で保存して
```

LLMが実行するMCP呼び出し:
```json
{
  "tool": "navigate_and_record",
  "arguments": {
    "baseUrl": "http://localhost:3000",
    "path": "/features",
    "name": "features_scroll_demo",
    "actions": [
      {
        "type": "scroll",
        "x": 0,
        "y": 500,
        "description": "中間までスクロール"
      },
      {
        "type": "wait",
        "duration": 1000
      },
      {
        "type": "scroll",
        "x": 0,
        "y": 1000,
        "description": "さらに下へスクロール"
      },
      {
        "type": "wait",
        "duration": 1000
      },
      {
        "type": "scroll",
        "x": 0,
        "y": 2000,
        "description": "最下部までスクロール"
      }
    ],
    "recordingOptions": {
      "initialDelay": 3000,
      "finalDelay": 2000
    }
  }
}
```

## 録画オプション

### `recordingOptions`

| パラメータ | 説明 | デフォルト値 |
|----------|------|------------|
| `initialDelay` | 操作開始前の待機時間（ミリ秒） | 2000ms (2秒) |
| `finalDelay` | 操作完了後の待機時間（ミリ秒） | 2000ms (2秒) |

**使用例:**
```json
{
  "recordingOptions": {
    "initialDelay": 3000,  // ページを3秒間表示してから操作開始
    "finalDelay": 5000     // 操作完了後、5秒間最終状態を表示
  }
}
```

## ビューポートのカスタマイズ

異なる画面サイズで録画できます。

### デスクトップ（デフォルト）
```json
{
  "viewport": {
    "width": 1920,
    "height": 1080
  }
}
```

### タブレット
```json
{
  "viewport": {
    "width": 768,
    "height": 1024
  }
}
```

### モバイル
```json
{
  "viewport": {
    "width": 375,
    "height": 667
  }
}
```

## 利用可能なアクション

すべて `navigate_and_capture` と同じアクションが利用可能です：

- **click** - 要素をクリック
- **type** - テキスト入力
- **scroll** - ページスクロール
- **hover** - 要素にホバー
- **select** - セレクトボックス選択
- **wait** - 時間待機
- **waitForSelector** - 要素出現待機
- **evaluate** - カスタムJavaScript実行

詳細は [MCP_INTERACTIVE_USAGE.md](./MCP_INTERACTIVE_USAGE.md) を参照してください。

## 待機戦略

ページの種類に応じて待機戦略を指定できます：

```json
{
  "waitStrategy": "graph"  // グラフページの場合
}
```

| 戦略 | 用途 |
|-----|------|
| `basic` | 通常のページ（デフォルト） |
| `graph` | グラフ・チャート |
| `video` | 動画サムネイル |
| `table` | データテーブル |
| `live` | カメラフィード |

## 出力先のカスタマイズ

```json
{
  "outputDir": "./demo-videos"
}
```

デフォルトでは `./mockup-output/videos/` に保存されます。

## 実用例

### モックアプリの完全なユーザーフロー

```
動画アップロードから解析結果表示までの完全なフローを録画して：
1. http://localhost:3000 のホームページにアクセス
2. "アップロード" ボタンをクリック
3. ファイル選択ボタンをクリック（モックなので見た目だけ）
4. "解析開始" ボタンをクリック
5. ダッシュボードに遷移するまで待機
6. 解析結果が表示されるまで待機
7. 結果の詳細を確認するためスクロール
"complete_user_flow" という名前で動画を保存して
```

### エラー状態のデモ

```
エラー状態のデモ動画を作成して：
1. http://localhost:3000/upload にアクセス
2. ファイルを選択せずに "アップロード" をクリック
3. エラーメッセージが表示されるまで待機
4. エラーメッセージを3秒間表示
"upload_error_demo" という名前で保存して
```

### ダークモード切り替えのデモ

```
ダークモード切り替えを動画で記録して：
1. http://localhost:3000 にアクセス
2. 2秒間ライトモードを表示
3. ダークモード切り替えボタンをクリック
4. 2秒間ダークモードを表示
5. 再度切り替えボタンをクリック
6. 2秒間ライトモードに戻った状態を表示
"theme_toggle_demo" という名前で保存して
```

## 技術仕様

- **動画形式**: MP4 (H.264/AAC)
- **エンコード設定**:
  - ビデオコーデック: libx264
  - プリセット: fast
  - CRF: 23 (高品質)
  - オーディオコーデック: AAC
- **フレームレート**: ブラウザ依存（通常 25-30 fps）
- **音声**: なし（ブラウザ録画のため）
- **最大録画時間**: 制限なし（ただし長時間録画はファイルサイズに注意）
- **必要要件**: ffmpeg（システムにインストール済み）

## ファイルサイズの目安

| 録画時間 | ファイルサイズ（目安） |
|---------|-------------------|
| 10秒 | 約 200-500 KB |
| 30秒 | 約 1-2 MB |
| 1分 | 約 2-4 MB |
| 3分 | 約 6-12 MB |

※ページの複雑さや動きの多さによって変動します

## 注意事項

1. **ファイル形式**: WebM形式で保存されます（ブラウザ標準）
2. **パフォーマンス**: 長時間録画や高解像度では処理に時間がかかる場合があります
3. **アクションの速度**: 各アクション間に自動的に300msの待機が挿入されます
4. **エラーハンドリング**: アクションが失敗しても録画は続行されます

## navigate_and_capture との違い

| 特徴 | navigate_and_capture | navigate_and_record |
|-----|---------------------|-------------------|
| 出力形式 | PNG画像 | WebM動画 |
| 用途 | 静的な画面キャプチャ | 操作シーケンスの動画化 |
| ファイルサイズ | 小さい（数十KB〜数百KB） | 大きい（数MB） |
| 動き | 記録されない | 記録される |
| 最適な用途 | ドキュメント、画面仕様書 | デモ、チュートリアル、プレゼン |

## ffmpegについて

このツールはffmpegを使用してWebMをMP4に変換します。

### ffmpegがインストールされていない場合

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get install ffmpeg
```

**Windows:**
```bash
choco install ffmpeg
```

### 変換に失敗した場合

ffmpegがインストールされていない場合や変換に失敗した場合は、WebM形式で保存されます。

## まとめ

`navigate_and_record` ツールを使うことで：

- ✅ モックアプリの操作フローをMP4動画で記録
- ✅ ユーザージャーニーのデモ作成
- ✅ バグ再現手順の動画化
- ✅ チュートリアル動画の自動生成
- ✅ プレゼンテーション用デモ素材の作成（汎用的なMP4形式）

が可能になります！
