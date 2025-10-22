# mio_sc_capture

React/Next.js製モックアプリケーションの全画面を自動キャプチャし、アノテーション付きPDFを生成する汎用ツールです。

## 特徴

- **自動スクリーンショット**: Playwrightを使用して複数の画面を自動キャプチャ
- **🆕 動画録画**: ブラウザ操作を録画してWebM形式で保存
- **🆕 MCPブラウザ操作**: クリック、入力、スクロールなど、ユーザー操作を自動化
- **アノテーション追加**: SVGベースの吹き出しアノテーションを画像に追加
- **PDF生成**: カバーページ、システム概要、各画面の説明を含む完全なドキュメントを生成
- **設定ファイル駆動**: JSON形式の設定ファイルで簡単にカスタマイズ可能
- **汎用性**: 任意のReact/Next.jsモックアプリケーションに対応
- **🆕 MCP対応**: Model Context Protocol対応でClaude経由でも使用可能（CLI/MCP両対応）

## インストール

```bash
cd /Users/masayahirano/script/AI-Tools/mio_sc_capture
npm install
npm run setup  # Playwright Chromiumのインストール
```

### エイリアスの設定（推奨）

簡単に実行できるようにエイリアスを設定します：

```bash
# 自動設定
./setup-aliases.sh

# または手動で ~/.zshrc に追加
echo '
# mio_sc_capture
alias msc-capture="node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/capture.js"
alias msc-record="node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/record-video.js"
alias msc-annotate="node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/annotate.js"
alias msc-pdf="node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/pdf.js"
' >> ~/.zshrc

# 設定を反映
source ~/.zshrc
```

エイリアス設定後は以下のように実行できます：

```bash
msc-capture    # スクリーンショット撮影
msc-record     # 動画録画（🆕）
msc-annotate   # アノテーション追加
msc-pdf        # PDF生成（シングルページ構成）
msc-pdf-detail # PDF生成（詳細版・2ページ構成）🆕
```

## 使い方

このツールは **CLI（コマンドライン）** と **MCP（Claude経由）** の両方で使用できます。

### CLI（コマンドライン）での使い方

#### 1. 設定ファイルの作成

プロジェクトルートに `mockup-config.json` を作成します（または既存のものをコピー）：

```bash
cp config/config.example.json /path/to/your/project/mockup-config.json
```

#### 2. 設定ファイルの編集

`mockup-config.json` を編集して、プロジェクトに合わせて設定します：

- `projectName`: プロジェクト名
- `baseUrl`: Next.jsアプリのURL（通常は `http://localhost:3000`）
- `pages`: キャプチャする画面のリスト
- `annotations`: 各画面のアノテーション定義
- `screens`: PDF生成時の画面説明

#### 3. Next.jsアプリを起動

```bash
cd /path/to/your/nextjs-app
npm run dev
```

#### 4. ツールの実行

##### 全工程を一括実行

```bash
cd /path/to/your/project
node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/capture.js
node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/annotate.js
node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/pdf.js
```

##### 個別に実行

```bash
# 動画録画のみ（アクション定義が必要）
node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/record-video.js

# スクリーンショット撮影のみ
node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/capture.js

# アノテーション追加のみ
node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/annotate.js

# PDF生成のみ（シングルページ構成）
node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/pdf.js

# PDF生成のみ（詳細版・2ページ構成）
node /Users/masayahirano/script/AI-Tools/mio_sc_capture/bin/pdf-detailed.js
```

### MCP（Model Context Protocol）での使い方

Claude DesktopやClaude Code経由で自然言語で操作できます。

#### セットアップ

**Claude Codeの場合:**

`~/.config/claude/claude_code_config.json` に以下を追加：

```json
{
  "mcpServers": {
    "mio_sc_capture": {
      "command": "node",
      "args": [
        "/Users/masayahirano/script/AI-Tools/mio_sc_capture/mcp-server.js"
      ]
    }
  }
}
```

詳細は [CLAUDE_CODE_SETUP.md](./CLAUDE_CODE_SETUP.md) を参照してください。

**Claude Desktopの場合:**

`~/Library/Application Support/Claude/claude_desktop_config.json` に以下を追加：

```json
{
  "mcpServers": {
    "mio_sc_capture": {
      "command": "node",
      "args": [
        "/Users/masayahirano/script/AI-Tools/mio_sc_capture/mcp-server.js"
      ]
    }
  }
}
```

詳細は [MCP_SETUP.md](./MCP_SETUP.md) を参照してください。

#### 使用例

Claudeに以下のように指示するだけで自動実行されます：

```
モックアプリの全画面をキャプチャして、アノテーション付きのPDFを作成して
```

```
詳細版のPDFドキュメントを生成して（2ページ構成で）
```

```
モックアプリの操作を録画して
```

#### 利用可能なMCPツール

- `capture_screenshots`: 画面キャプチャ
- `add_annotations`: アノテーション追加
- `generate_pdf`: PDF生成（シングル/詳細版）
- `generate_all`: 全工程一括実行
- `record_video`: 動画録画

## 設定ファイルの構造

```json
{
  "projectName": "プロジェクト名",
  "subtitle": "サブタイトル",
  "client": "クライアント名",
  "vendor": "ベンダー名",
  "baseUrl": "http://localhost:3000",
  "outputDir": "./mockup-output",
  "screenshotsDir": "./mockup-output/screenshots",
  "annotatedDir": "./mockup-output/screenshots-annotated",
  "pdfFileName": "画面一覧.pdf",
  "viewport": {
    "width": 1920,
    "height": 1080
  },
  "pages": [
    {
      "path": "/",
      "name": "01_ホーム",
      "waitStrategy": "basic"
    }
  ],
  "annotations": {
    "01_ホーム": {
      "items": [
        {
          "x": 960,
          "y": 400,
          "text": "機能名",
          "description": "機能の説明\n複数行可能",
          "direction": "top"
        }
      ]
    }
  },
  "screens": [
    {
      "filename": "01_ホーム",
      "title": "ホーム画面",
      "category": "共通",
      "description": "画面の詳細説明"
    }
  ],
  "pdfOptions": {
    "format": "A4",
    "landscape": true,
    "printBackground": true,
    "height": "420mm",
    "layout": "single"
  },
  "overview": {
    "enabled": true,
    "sections": [
      {
        "title": "システム概要",
        "content": "このシステムの説明..."
      }
    ]
  }
}
```

### 主要な設定項目

#### pages配列
- `path`: アクセスするURL（baseUrlからの相対パス、ハッシュ付きURLにも対応 例: `/#analytics`）
- `name`: ファイル名（拡張子なし）
- `waitStrategy`: 待機戦略
  - `basic`: 基本的な待機（2秒）
  - `graph`: グラフ表示画面（最大8秒）
  - `video`: 動画サムネイル表示（3秒）
  - `table`: データテーブル表示（3秒）
  - `live`: ライブカメラフィード（4秒）
- `viewport` (オプション): ページごとの表示領域サイズ
  ```json
  "viewport": {
    "width": 1920,
    "height": 800
  }
  ```
- `clip` (オプション): 画面の一部だけをキャプチャ（画面分割に最適）
  ```json
  "clip": {
    "x": 0,
    "y": 300,
    "width": 1920,
    "height": 600
  }
  ```
- `actions` (オプション): **🆕 MCP対応ブラウザ操作** - スクリーンショット撮影前に実行するアクションリスト
  ```json
  "actions": [
    {
      "type": "click",
      "selector": "button.menu",
      "description": "メニューボタンをクリック"
    },
    {
      "type": "type",
      "selector": "input[name='search']",
      "value": "検索ワード",
      "description": "検索ボックスに入力"
    }
  ]
  ```
- `beforeScreenshot` (オプション): スクリーンショット撮影前に実行するJavaScriptコード
  ```json
  "beforeScreenshot": "await page.evaluate(() => window.scrollTo(0, 500)); await page.waitForTimeout(300)"
  ```

#### actionsアクション定義（MCPブラウザ操作）

**対応アクションタイプ:**

- **click**: 要素をクリック
  ```json
  {
    "type": "click",
    "selector": "button.submit",
    "description": "送信ボタンをクリック",
    "waitAfter": 1000
  }
  ```

- **type**: テキスト入力
  ```json
  {
    "type": "type",
    "selector": "input[name='username']",
    "value": "test_user",
    "description": "ユーザー名を入力"
  }
  ```

- **scroll**: スクロール位置を変更
  ```json
  {
    "type": "scroll",
    "x": 0,
    "y": 500,
    "description": "Y座標500までスクロール"
  }
  ```

- **hover**: 要素にホバー
  ```json
  {
    "type": "hover",
    "selector": ".dropdown-menu",
    "description": "ドロップダウンメニューにホバー"
  }
  ```

- **select**: ドロップダウンで値を選択
  ```json
  {
    "type": "select",
    "selector": "select[name='category']",
    "value": "option1",
    "description": "カテゴリを選択"
  }
  ```

- **wait**: 待機
  ```json
  {
    "type": "wait",
    "duration": 2000,
    "description": "2秒待機"
  }
  ```

- **waitForSelector**: 要素の表示を待つ
  ```json
  {
    "type": "waitForSelector",
    "selector": ".content-loaded",
    "timeout": 5000,
    "description": "コンテンツの読み込み完了を待つ"
  }
  ```

- **evaluate**: カスタムJavaScript実行
  ```json
  {
    "type": "evaluate",
    "code": "() => document.querySelector('.modal').remove()",
    "description": "モーダルを削除"
  }
  ```

**共通パラメータ:**
- `description` (オプション): アクションの説明（ログ出力用）
- `waitAfter` (オプション): アクション実行後の待機時間（ミリ秒、デフォルト300ms）
- `required` (オプション): `true`の場合、アクション失敗時にキャプチャを中止

#### annotations定義
- `x`, `y`: アノテーションの対象座標
- `text`: アノテーションのタイトル
- `description`: 説明文（`\n`で改行可能）
- `direction`: 吹き出しの方向（`top`, `bottom`, `left`, `right`）
- `style` (オプション): スタイルプリセット名（デフォルト: `default`）
  - `default`: オレンジ系（標準）
  - `highlight`: グリーン系（重要情報の強調表示、強調シャドウ付き）
  - `success`: 明るいグリーン系（成功/完了の表示）
  - `danger`: レッド系（警告/エラーの表示）
  - `info`: ブルー系（情報表示）
  - `warning`: イエロー系（注意喚起）
- `color` (オプション): カスタムカラー（HEX形式、例: `"#9333EA"`）
  - `style`より優先されます
  - 指定した色から自動的に最適な配色を生成

**スタイルプリセット使用例:**
```json
"annotations": {
  "sample-page": {
    "items": [
      {
        "x": 500,
        "y": 300,
        "text": "月額5〜10万円",
        "description": "エッジ主体型で\nコスト最適化",
        "direction": "right",
        "style": "highlight"
      },
      {
        "x": 800,
        "y": 400,
        "text": "処理完了",
        "description": "正常に完了しました",
        "direction": "top",
        "style": "success"
      }
    ]
  }
}
```

**カスタムカラー使用例:**
```json
"annotations": {
  "sample-page": {
    "items": [
      {
        "x": 500,
        "y": 300,
        "text": "プレミアム機能",
        "description": "紫色でブランド\nカラーを表現",
        "direction": "right",
        "color": "#9333EA"
      },
      {
        "x": 800,
        "y": 400,
        "text": "ターコイズ",
        "description": "独自の配色で\n目立たせる",
        "direction": "top",
        "color": "#14B8A6"
      }
    ]
  }
}
```

#### screens配列（PDF生成用）
- `filename`: 画像ファイル名（拡張子なし）
- `title`: PDF内での表示タイトル
- `category`: カテゴリ（色分けされる）
- `description`: 画面の詳細説明

#### pdfOptions設定
- `format`: 用紙サイズ（`A4`, `A3`, `Letter`など）
- `landscape`: 横向き出力（`true` / `false`）
- `printBackground`: 背景色を印刷（`true` / `false`）
- `width`, `height`: 任意サイズを直接指定（例: `"height": "420mm"`）。指定時は`format`より優先され、縦長レイアウトなどが可能。
- `scale`: ページ全体の拡大率（`0.1`〜`2`）
- `preferCSSPageSize`: CSSの`@page`で指定したサイズを優先する（`true`）
- `layout`: **🆕 PDFレイアウトモード**
  - `single`: 1ページ構成（デフォルト） - 各画面を1ページにまとめたコンパクトな形式
  - `detailed`: 2ページ構成 - 各画面を「スクリーンショット+サマリ」「詳細説明」の2ページで出力

  ```json
  "pdfOptions": {
    "format": "A4",
    "landscape": true,
    "printBackground": true,
    "height": "420mm",
    "layout": "single"
  }
  ```

**レイアウトモードの使い分け:**
- `single`: クイックレビューや画面一覧を作成する場合に最適
- `detailed`: 詳細な機能説明やプレゼンテーション資料として使用する場合に最適（`bin/pdf-detailed.js`を使用）

#### overview設定（システム概要ページ）
- `enabled`: システム概要ページを生成するか（`true` / `false`）
- `title`: 概要ページのタイトル（デフォルト: `"システム概要"`）
- `style` (オプション): **🆕 概要ページのデザインスタイル**
  - `default`: シンプルなリスト形式（従来のスタイル）
  - `modern`: モダンでフラットなカード型デザイン
    - グラデーション背景
    - カード型レイアウト（角丸、影効果）
    - アクセントカラーとアイコン
    - チェックマーク付きリスト
- `sections`: 概要ページのセクション配列
  - `heading`: セクション見出し
  - `content`: テキスト内容（contentとitemsは排他）
  - `items`: 箇条書きリスト（contentとitemsは排他）

**モダンスタイル使用例:**
```json
"overview": {
  "enabled": true,
  "title": "システム概要",
  "style": "modern",
  "sections": [
    {
      "heading": "主な機能",
      "items": [
        "リアルタイム不正検知",
        "AI画像解析エンジン",
        "スタッフ通知システム"
      ]
    },
    {
      "heading": "システムの特徴",
      "content": "エッジ-クラウドハイブリッド構成により、低コストで高性能な検知を実現します。"
    }
  ]
}
```

## デザイン生成をブラッシュアップするヒント

- **解像度を統一**: `viewport`を基本1920x1080に揃え、必要に応じて`clip`で要点のみを切り出すと、PDF上のレイアウトが安定します。
- **コピーを事前設計**: `screens`の`title`/`category`/`description`を先に固め、`overview.sections`で物語の流れを決めておくと、生成ドキュメントの語調と情報密度が揃います。
- **アノテーションで視線誘導**: `annotations`に方向（`direction`）と短い説明を設定し、`msc-annotate`→`msc-pdf`の順で実行すると、注目ポイントが明確なビジュアルになります。
- **ブランドカラーに合わせる**: `screens.category`に`共通`/`PoC`/`MVP`などの分類を使えばカラーリングが自動適用されます。独自パレットが必要な場合は `lib/html-generator.js` の `getCategoryColor` を調整してください。
- **成果物を比較検証**: 詳細説明が必要な場合は `msc-pdf-detail` で詳細版も出力し、関係者レビューでシングル/詳細の両方を見比べると訴求力を高められます。

## 高度な使用例

### MCPブラウザ操作を使った動的画面のキャプチャ

ボタンクリックやフォーム入力など、ユーザー操作が必要な画面を自動化してキャプチャできます：

```json
{
  "pages": [
    {
      "path": "/settings",
      "name": "settings_modal_open",
      "waitStrategy": "basic",
      "actions": [
        {
          "type": "click",
          "selector": "button[data-action='open-settings']",
          "description": "設定モーダルを開く",
          "waitAfter": 500
        },
        {
          "type": "waitForSelector",
          "selector": ".settings-modal.visible",
          "timeout": 3000,
          "description": "モーダルの表示を待つ"
        },
        {
          "type": "click",
          "selector": ".tab-advanced",
          "description": "詳細設定タブをクリック"
        }
      ]
    },
    {
      "path": "/search",
      "name": "search_results",
      "waitStrategy": "basic",
      "actions": [
        {
          "type": "type",
          "selector": "input[name='q']",
          "value": "テストクエリ",
          "description": "検索ワードを入力"
        },
        {
          "type": "click",
          "selector": "button[type='submit']",
          "description": "検索実行",
          "waitAfter": 2000
        },
        {
          "type": "waitForSelector",
          "selector": ".search-results",
          "description": "検索結果の表示を待つ"
        }
      ]
    },
    {
      "path": "/dropdown-menu",
      "name": "dropdown_expanded",
      "waitStrategy": "basic",
      "actions": [
        {
          "type": "hover",
          "selector": ".dropdown-trigger",
          "description": "ドロップダウンメニューにホバー",
          "waitAfter": 800
        },
        {
          "type": "waitForSelector",
          "selector": ".dropdown-menu.visible",
          "description": "ドロップダウンの表示を待つ"
        }
      ]
    }
  ]
}
```

この設定により：
- `settings_modal_open.png`: モーダルが開いた詳細設定タブの状態
- `search_results.png`: 検索実行後の結果画面
- `dropdown_expanded.png`: ドロップダウンメニューが展開された状態

と、通常では1回のアクセスではキャプチャできない動的な状態を自動で撮影できます。

### 縦長画面を複数の画像に分割してキャプチャ

Analytics画面など、縦に長い画面を機能ごとに分割してキャプチャできます:

```json
{
  "pages": [
    {
      "path": "/#analytics",
      "name": "analytics_full",
      "waitStrategy": "basic",
      "beforeScreenshot": "await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300)"
    },
    {
      "path": "/#analytics",
      "name": "analytics_kpi",
      "waitStrategy": "basic",
      "clip": {
        "x": 0,
        "y": 0,
        "width": 1920,
        "height": 300
      },
      "beforeScreenshot": "await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300)"
    },
    {
      "path": "/#analytics",
      "name": "analytics_charts",
      "waitStrategy": "basic",
      "clip": {
        "x": 0,
        "y": 300,
        "width": 1920,
        "height": 1000
      },
      "beforeScreenshot": "await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300)"
    }
  ]
}
```

この設定により:
- `analytics_full.png`: 完全版(全セクション表示)
- `analytics_kpi.png`: KPIカードのみ
- `analytics_charts.png`: チャート部分のみ

と、同じページを異なる領域で分割してキャプチャできます。

### SPAのハッシュルーティングに対応

React Router等のハッシュベースのルーティングにも対応しています:

```json
{
  "pages": [
    {
      "path": "/#/home",
      "name": "home"
    },
    {
      "path": "/#/dashboard",
      "name": "dashboard"
    },
    {
      "path": "/#/settings",
      "name": "settings"
    }
  ]
}
```

### スクロール位置を調整してキャプチャ

`beforeScreenshot`を使って、画面の特定部分を表示してからキャプチャできます:

```json
{
  "pages": [
    {
      "path": "/long-page",
      "name": "section_1",
      "beforeScreenshot": "await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500)"
    },
    {
      "path": "/long-page",
      "name": "section_2",
      "beforeScreenshot": "await page.evaluate(() => window.scrollTo(0, 1500)); await page.waitForTimeout(500)"
    },
    {
      "path": "/long-page",
      "name": "section_3",
      "beforeScreenshot": "await page.evaluate(() => window.scrollTo(0, 3000)); await page.waitForTimeout(500)"
    }
  ]
}
```

## トラブルシューティング

### スクリーンショットが真っ白 / 内容が表示されない

- Next.jsアプリが起動しているか確認
- `baseUrl` が正しいか確認
- `waitStrategy` を調整（待機時間を増やす）

### アノテーションが画像からはみ出る

- `x`, `y` 座標を調整
- `direction` を変更

### PDF生成でエラーが発生

- 注釈付きスクリーンショットが存在するか確認
- `screens` 配列の `filename` が `annotations` のキーと一致しているか確認

## ライセンス

MIT

## サポート

問題や質問がある場合は、TARA開発チームにお問い合わせください。
