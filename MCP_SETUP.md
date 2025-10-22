# MCP Server セットアップガイド

このツールはModel Context Protocol (MCP)サーバーとしても使用できます。

## 前提条件

- Node.js 16以上
- 依存パッケージのインストール済み（`npm install`）

## MCPサーバーのセットアップ

### 1. 依存関係のインストール

```bash
cd /Users/masayahirano/script/AI-Tools/mio_sc_capture
npm install
```

### 2. Claude Desktop での設定

Claude Desktopの設定ファイル（`~/Library/Application Support/Claude/claude_desktop_config.json`）に以下を追加：

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

### 3. Claude Desktopの再起動

設定を反映するため、Claude Desktopを再起動してください。

## 利用可能なMCPツール

### 1. `capture_screenshots`
モックアプリの画面を自動キャプチャします。

**パラメータ:**
- `configPath` (オプション): 設定ファイルのパス（省略時: `./mockup-config.json`）

**例:**
```
モックアプリの全画面をキャプチャして
```

### 2. `add_annotations`
スクリーンショットにアノテーション（吹き出し）を追加します。

**パラメータ:**
- `configPath` (オプション): 設定ファイルのパス

**例:**
```
キャプチャした画面にアノテーションを追加して
```

### 3. `generate_pdf`
アノテーション付き画像からPDFを生成します。

**パラメータ:**
- `configPath` (オプション): 設定ファイルのパス
- `detailed` (オプション): 詳細版PDF（2ページ構成）を生成する場合は `true`

**例:**
```
PDFドキュメントを生成して
```

```
詳細版のPDFを生成して（2ページ構成で）
```

### 4. `generate_all`
全工程を一括実行します（キャプチャ → アノテーション → PDF生成）。

**パラメータ:**
- `configPath` (オプション): 設定ファイルのパス
- `detailed` (オプション): 詳細版PDFを生成する場合は `true`

**例:**
```
モックアプリの全画面をキャプチャして、アノテーション付きのPDFを作成して
```

### 5. `record_video`
ブラウザ操作を録画してWebM形式の動画を生成します。

**パラメータ:**
- `configPath` (オプション): 設定ファイルのパス

**例:**
```
モックアプリの操作を録画して
```

## 使用フロー

### 基本的な使い方

1. **設定ファイルの準備**
   プロジェクトディレクトリに `mockup-config.json` を配置

2. **Claudeに指示**
   ```
   モックアプリの全画面をキャプチャして、アノテーション付きのPDFを作成して
   ```

3. **自動実行**
   Claudeが自動的に以下を実行：
   - スクリーンショット撮影
   - アノテーション追加
   - PDF生成

### 個別実行の例

```
# スクリーンショットのみ
モックアプリの画面をキャプチャして

# アノテーションのみ
キャプチャした画面にアノテーションを追加して

# PDF生成のみ
アノテーション付き画像からPDFを生成して

# 詳細版PDF
詳細版のPDFドキュメントを生成して（2ページ構成で）
```

## トラブルシューティング

### MCPサーバーが認識されない

1. 設定ファイルのパスが正しいか確認
2. Claude Desktopを完全に再起動
3. ターミナルで直接実行して動作確認：
   ```bash
   node /Users/masayahirano/script/AI-Tools/mio_sc_capture/mcp-server.js
   ```

### 設定ファイルが見つからないエラー

- MCPツールはカレントディレクトリの `mockup-config.json` を探します
- 別の場所にある場合は `configPath` パラメータで指定してください

### 依存関係エラー

```bash
cd /Users/masayahirano/script/AI-Tools/mio_sc_capture
npm install
```

## CLI vs MCP

このツールは両方の使い方をサポートしています：

### CLI（従来の方法）
```bash
node bin/capture.js
node bin/annotate.js
node bin/pdf.js
```

### MCP（Claude経由）
```
モックアプリの全画面をキャプチャして、PDFを作成して
```

どちらの方法でも同じ機能が使えます。MCPを使うと、Claudeとの対話で自然言語で操作できる利点があります。
