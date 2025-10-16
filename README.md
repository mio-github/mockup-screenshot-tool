# Mockup Screenshot Tool

React/Next.js製モックアプリケーションの全画面を自動キャプチャし、アノテーション付きPDFを生成する汎用ツールです。

## 特徴

- **自動スクリーンショット**: Playwrightを使用して複数の画面を自動キャプチャ
- **アノテーション追加**: SVGベースの吹き出しアノテーションを画像に追加
- **PDF生成**: カバーページ、システム概要、各画面の説明を含む完全なドキュメントを生成
- **設定ファイル駆動**: JSON形式の設定ファイルで簡単にカスタマイズ可能
- **汎用性**: 任意のReact/Next.jsモックアプリケーションに対応

## インストール

```bash
cd /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool
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
# Mockup Screenshot Tool
alias mst-capture="node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/capture.js"
alias mst-annotate="node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/annotate.js"
alias mst-pdf="node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/pdf.js"
' >> ~/.zshrc

# 設定を反映
source ~/.zshrc
```

エイリアス設定後は以下のように実行できます：

```bash
mst-capture    # スクリーンショット撮影
mst-annotate   # アノテーション追加
mst-pdf        # PDF生成
```

## 使い方

### 1. 設定ファイルの作成

プロジェクトルートに `mockup-config.json` を作成します（または既存のものをコピー）：

```bash
cp config/config.example.json /path/to/your/project/mockup-config.json
```

### 2. 設定ファイルの編集

`mockup-config.json` を編集して、プロジェクトに合わせて設定します：

- `projectName`: プロジェクト名
- `baseUrl`: Next.jsアプリのURL（通常は `http://localhost:3000`）
- `pages`: キャプチャする画面のリスト
- `annotations`: 各画面のアノテーション定義
- `screens`: PDF生成時の画面説明

### 3. Next.jsアプリを起動

```bash
cd /path/to/your/nextjs-app
npm run dev
```

### 4. ツールの実行

#### 全工程を一括実行

```bash
cd /path/to/your/project
node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/capture.js
node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/annotate.js
node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/pdf.js
```

#### 個別に実行

```bash
# スクリーンショット撮影のみ
node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/capture.js

# アノテーション追加のみ
node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/annotate.js

# PDF生成のみ
node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/pdf.js
```

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
    "printBackground": true
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
- `path`: アクセスするURL（baseUrlからの相対パス）
- `name`: ファイル名（拡張子なし）
- `waitStrategy`: 待機戦略
  - `basic`: 基本的な待機（2秒）
  - `graph`: グラフ表示画面（最大8秒）
  - `video`: 動画サムネイル表示（3秒）
  - `table`: データテーブル表示（3秒）
  - `live`: ライブカメラフィード（4秒）

#### annotations定義
- `x`, `y`: アノテーションの対象座標
- `text`: アノテーションのタイトル
- `description`: 説明文（`\n`で改行可能）
- `direction`: 吹き出しの方向（`top`, `bottom`, `left`, `right`）

#### screens配列（PDF生成用）
- `filename`: 画像ファイル名（拡張子なし）
- `title`: PDF内での表示タイトル
- `category`: カテゴリ（色分けされる）
- `description`: 画面の詳細説明

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
