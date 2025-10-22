# Claude Code での MCP 登録方法

このツールをClaude CodeでMCPサーバーとして使用する方法を説明します。

## 設定ファイルの場所

Claude Codeの設定ファイルは以下のいずれかにあります：

- **macOS/Linux**: `~/.config/claude/claude_code_config.json`
- **Windows**: `%APPDATA%\Claude\claude_code_config.json`

## 設定手順

### 1. 設定ファイルを開く

```bash
# macOS/Linuxの場合
mkdir -p ~/.config/claude
open -e ~/.config/claude/claude_code_config.json
```

設定ファイルが存在しない場合は新規作成します。

### 2. MCP設定を追加

設定ファイルに以下のJSON設定を追加します：

```json
{
  "mcpServers": {
    "mio_sc_capture": {
      "command": "node",
      "args": [
        "/Users/masayahirano/script/AI-Tools/mio_sc_capture/mcp-server.js"
      ],
      "env": {}
    }
  }
}
```

**重要**: パスは絶対パスで指定してください。`~` は使用できません。

### 3. 既存の設定がある場合

既に他のMCPサーバーが設定されている場合は、`mcpServers` セクション内に追加します：

```json
{
  "mcpServers": {
    "existing-server": {
      "command": "...",
      "args": [...]
    },
    "mio_sc_capture": {
      "command": "node",
      "args": [
        "/Users/masayahirano/script/AI-Tools/mio_sc_capture/mcp-server.js"
      ]
    }
  }
}
```

### 4. Claude Codeを再起動 ⚠️ 重要

**設定を反映させるため、Claude Codeのプロセスを完全に終了してから再起動してください。**

#### macOS/Linuxの場合:

```bash
# 全てのClaude Codeプロセスを終了
pkill -f claude

# または、アクティビティモニタから終了
```

その後、Claude Codeを新規に起動します。

#### 注意事項:
- 単にターミナルウィンドウを閉じるだけでは不十分です
- バックグラウンドで動作している全てのClaude Codeプロセスを終了する必要があります
- 設定ファイルはClaude Code起動時に一度だけ読み込まれます

## 動作確認

Claude Codeで以下のように指示して、MCPツールが認識されているか確認します：

```
利用可能なMCPツールを教えて
```

以下のツールが表示されれば成功です：
- `capture_screenshots`
- `add_annotations`
- `generate_pdf`
- `generate_all`
- `record_video`

## 使用例

### プロジェクトディレクトリで実行

1. **プロジェクトに移動**
   ```bash
   cd /path/to/your/nextjs-project
   ```

2. **設定ファイルを配置**
   ```bash
   # mockup-config.json をプロジェクトルートに配置
   ```

3. **Claude Codeで指示**
   ```
   モックアプリの全画面をキャプチャして、アノテーション付きのPDFを作成して
   ```

### カスタム設定ファイルを使用

```
./config/my-mockup-config.json を使って画面をキャプチャして
```

Claude Codeは自動的に `configPath` パラメータを設定してツールを実行します。

## トラブルシューティング

### MCPサーバーが起動しない

1. **Node.jsのバージョン確認**
   ```bash
   node --version  # v16以上が必要
   ```

2. **依存関係のインストール**
   ```bash
   cd /Users/masayahirano/script/AI-Tools/mio_sc_capture
   npm install
   ```

3. **手動でMCPサーバーを起動して確認**
   ```bash
   node /Users/masayahirano/script/AI-Tools/mio_sc_capture/mcp-server.js
   ```

   エラーが表示されなければ正常です（Ctrl+Cで終了）。

### 設定ファイルが見つからない

Claude Codeのカレントディレクトリに `mockup-config.json` があることを確認してください：

```bash
ls mockup-config.json
```

なければ、config.example.json からコピー：

```bash
cp /Users/masayahirano/script/AI-Tools/mio_sc_capture/config/config.example.json ./mockup-config.json
```

### パーミッションエラー

MCPサーバースクリプトに実行権限があることを確認：

```bash
chmod +x /Users/masayahirano/script/AI-Tools/mio_sc_capture/mcp-server.js
```

## Claude Desktop との違い

| 項目 | Claude Desktop | Claude Code |
|------|----------------|-------------|
| 設定ファイル | `~/Library/Application Support/Claude/claude_desktop_config.json` | `~/.config/claude/claude_code_config.json` |
| カレントディレクトリ | ユーザーのホーム | プロジェクトディレクトリ |
| 設定ファイル自動検出 | × | ○（`./mockup-config.json`） |

Claude Codeでは、プロジェクトディレクトリの `mockup-config.json` が自動的に使用されます。

## その他のMCP設定オプション

### 環境変数を追加

```json
{
  "mcpServers": {
    "mio_sc_capture": {
      "command": "node",
      "args": [
        "/Users/masayahirano/script/AI-Tools/mio_sc_capture/mcp-server.js"
      ],
      "env": {
        "NODE_ENV": "production",
        "DEBUG": "false"
      }
    }
  }
}
```

### タイムアウトを設定

```json
{
  "mcpServers": {
    "mio_sc_capture": {
      "command": "node",
      "args": [
        "/Users/masayahirano/script/AI-Tools/mio_sc_capture/mcp-server.js"
      ],
      "timeout": 300000
    }
  }
}
```

## まとめ

1. `~/.config/claude/claude_code_config.json` に設定を追加
2. Claude Codeを再起動
3. プロジェクトディレクトリに `mockup-config.json` を配置
4. Claude Codeで自然言語で指示

これで、Claude Code経由で簡単にモックアプリのドキュメント生成ができます！
