# 使い方ガイド

## クイックスタート

### 1. プロジェクトで設定ファイルを用意

プロジェクトのルートディレクトリに `mockup-config.json` を作成します。

```bash
cd /path/to/your/nextjs-project
cp /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/config/config.example.json ./mockup-config.json
```

設定ファイルを編集して、プロジェクトに合わせて調整します。

### 2. Next.jsアプリを起動

```bash
npm run dev
```

### 3. ツールを実行

プロジェクトのルートディレクトリから以下のコマンドを実行します：

```bash
# ステップ1: スクリーンショット撮影
node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/capture.js

# ステップ2: アノテーション追加
node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/annotate.js

# ステップ3: PDF生成
node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/pdf.js
```

## エイリアスの設定（推奨）

シェル設定ファイル（`~/.zshrc` または `~/.bashrc`）に以下を追加すると便利です：

```bash
# Mockup Screenshot Tool
alias mst-capture="node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/capture.js"
alias mst-annotate="node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/annotate.js"
alias mst-pdf="node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/pdf.js"
```

設定後は以下のように簡単に実行できます：

```bash
mst-capture
mst-annotate
mst-pdf
```

## 設定ファイルの例

### 基本構造

```json
{
  "projectName": "プロジェクト名",
  "subtitle": "サブタイトル",
  "client": "クライアント企業",
  "vendor": "ベンダー企業",
  "baseUrl": "http://localhost:3000",
  "outputDir": "./mockup-output",
  "screenshotsDir": "./mockup-output/screenshots",
  "annotatedDir": "./mockup-output/screenshots-annotated",
  "pdfFileName": "画面一覧.pdf",
  "viewport": {
    "width": 1920,
    "height": 1080
  },
  "pages": [...],
  "annotations": {...},
  "screens": [...],
  "pdfOptions": {...},
  "overview": {...}
}
```

### pages配列（キャプチャする画面）

```json
{
  "pages": [
    {
      "path": "/",
      "name": "01_ホーム",
      "waitStrategy": "basic"
    },
    {
      "path": "/dashboard",
      "name": "02_ダッシュボード",
      "waitStrategy": "graph"
    }
  ]
}
```

**waitStrategy（待機戦略）**:
- `basic`: 基本的な待機（2秒）
- `graph`: グラフやチャートの読み込み待機（最大8秒）
- `video`: 動画サムネイルの読み込み待機（3秒）
- `table`: データテーブルの読み込み待機（3秒）
- `live`: ライブカメラフィードの待機（4秒）

### annotations定義（アノテーション）

```json
{
  "annotations": {
    "01_ホーム": {
      "items": [
        {
          "x": 960,
          "y": 400,
          "text": "メイン機能",
          "description": "機能の説明\n複数行で記述可能",
          "direction": "top"
        }
      ]
    }
  }
}
```

**direction（吹き出しの方向）**:
- `top`: 上方向
- `bottom`: 下方向
- `left`: 左方向
- `right`: 右方向

座標は画像の左上を(0, 0)として、ピクセル単位で指定します。

### screens配列（PDF用の画面説明）

```json
{
  "screens": [
    {
      "filename": "01_ホーム",
      "title": "ホーム画面",
      "category": "共通",
      "description": "システムのホーム画面です。主要な機能にアクセスできます。"
    }
  ]
}
```

**category（カテゴリ）**:
カテゴリは自由に設定できます。以下のカテゴリには自動的に色が割り当てられます：
- `共通`: グレー
- `PoC`: ブルー
- `MVP`: グリーン
- その他: パープル

### overview（システム概要ページ）

```json
{
  "overview": {
    "enabled": true,
    "title": "システム概要",
    "sections": [
      {
        "heading": "見出し",
        "content": "本文テキスト"
      },
      {
        "heading": "箇条書きセクション",
        "content": "説明文",
        "items": [
          "項目1",
          "項目2",
          "項目3"
        ]
      }
    ]
  }
}
```

## トラブルシューティング

### エラー: 設定ファイルが見つかりません

設定ファイルが正しい場所に配置されているか確認してください。
デフォルトでは、実行ディレクトリに以下のファイル名で検索されます：
- `mockup-config.json`
- `config.json`
- `mockup-screenshot.config.json`

特定の設定ファイルを指定する場合：

```bash
node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/capture.js /path/to/config.json
```

### エラー: スクリーンショットが真っ白

- Next.jsアプリが起動しているか確認
- `baseUrl`が正しいか確認
- `waitStrategy`を調整（待機時間を増やす）

### エラー: 注釈付きスクリーンショットが見つかりません

アノテーションを追加する前に、スクリーンショットを撮影してください：

```bash
node /Users/masayahirano/script/AI-Tools/mockup-screenshot-tool/bin/capture.js
```

### アノテーションが画像からはみ出る

- 座標（`x`, `y`）を調整
- `direction`を変更（例: `top` → `bottom`）

## 実用例

### セルフレジ不正検知AIシステムの場合

プロジェクトルート: `/Volumes/KIOXIA/Developments/withAI/Vercel/Tara/NTTデータスミス/セルフレジ不正検知AIシステム`

```bash
cd "/Volumes/KIOXIA/Developments/withAI/Vercel/Tara/NTTデータスミス/セルフレジ不正検知AIシステム"

# Next.jsアプリを起動
cd mockup-app
npm run dev

# 別のターミナルでツールを実行
cd "/Volumes/KIOXIA/Developments/withAI/Vercel/Tara/NTTデータスミス/セルフレジ不正検知AIシステム"
mst-capture
mst-annotate
mst-pdf
```

出力先: `mockup-app/mockup-output/screenshots-annotated/セルフレジ不正検知AIシステム_画面一覧.pdf`

## ディレクトリ構造

```
your-project/
├── mockup-config.json          # 設定ファイル
├── mockup-output/              # 出力ディレクトリ（自動作成）
│   ├── screenshots/            # スクリーンショット
│   │   ├── 01_ホーム.png
│   │   ├── 02_ダッシュボード.png
│   │   └── ...
│   └── screenshots-annotated/  # アノテーション付き画像
│       ├── 01_ホーム.png
│       ├── 02_ダッシュボード.png
│       └── 画面一覧.pdf         # 生成されたPDF
└── ...
```

## ベストプラクティス

1. **画面数が多い場合は分割する**: 20画面以上ある場合は、フェーズやカテゴリごとに複数の設定ファイルを作成することを推奨します。

2. **アノテーションは控えめに**: 1画面につき3〜5個程度のアノテーションが適切です。多すぎると視認性が低下します。

3. **座標の確認**: アノテーション座標は、ブラウザの開発者ツール（要素の検証）で確認できます。

4. **waitStrategyの調整**: 動的コンテンツが多い画面では、`waitStrategy`を適切に設定することで、確実にレンダリング完了後のスクリーンショットを取得できます。

5. **バージョン管理**: `mockup-config.json`はGitで管理することで、設定の履歴を追跡できます。

## さらに詳しい情報

詳細なドキュメントは `README.md` を参照してください。
