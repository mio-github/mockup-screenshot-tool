#!/usr/bin/env node

/**
 * Mockup Screenshot Tool - MCP Server
 * Model Context Protocol対応サーバー
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * CLIツールを実行するヘルパー関数
 */
async function runCliTool(scriptPath, configPath = null, additionalArgs = []) {
  return new Promise((resolve, reject) => {
    const args = configPath ? [scriptPath, configPath, ...additionalArgs] : [scriptPath, ...additionalArgs];
    const child = spawn('node', args, {
      cwd: __dirname,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout, exitCode: code });
      } else {
        reject(new Error(`Process exited with code ${code}\n${stderr}\n${stdout}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 設定ファイルのパスを解決
 */
function resolveConfigPath(configPath) {
  if (!configPath) {
    // デフォルト: カレントディレクトリのmockup-config.json
    return path.join(process.cwd(), 'mockup-config.json');
  }

  // 絶対パスの場合はそのまま、相対パスの場合はカレントディレクトリからの相対パス
  return path.isAbsolute(configPath) ? configPath : path.join(process.cwd(), configPath);
}

/**
 * 設定ファイルの存在確認
 */
function validateConfigPath(configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`設定ファイルが見つかりません: ${configPath}`);
  }
  return true;
}

// MCPサーバーインスタンス作成
const server = new Server(
  {
    name: 'mockup-screenshot-tool',
    version: '1.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * ツール一覧を返す
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'capture_screenshots',
        description: 'React/Next.jsモックアプリの画面を自動キャプチャします。設定ファイルで定義された全ページのスクリーンショットを撮影します。',
        inputSchema: {
          type: 'object',
          properties: {
            configPath: {
              type: 'string',
              description: '設定ファイルのパス（省略時: カレントディレクトリのmockup-config.json）',
            },
          },
        },
      },
      {
        name: 'add_annotations',
        description: 'スクリーンショットにSVGベースのアノテーション（吹き出し）を追加します。設定ファイルで定義されたアノテーション情報を画像に重ねます。',
        inputSchema: {
          type: 'object',
          properties: {
            configPath: {
              type: 'string',
              description: '設定ファイルのパス（省略時: カレントディレクトリのmockup-config.json）',
            },
          },
        },
      },
      {
        name: 'generate_pdf',
        description: 'アノテーション付きスクリーンショットからPDFドキュメントを生成します。カバーページ、システム概要、各画面説明を含む完全なドキュメントを作成します。',
        inputSchema: {
          type: 'object',
          properties: {
            configPath: {
              type: 'string',
              description: '設定ファイルのパス（省略時: カレントディレクトリのmockup-config.json）',
            },
            detailed: {
              type: 'boolean',
              description: '詳細版PDF（2ページ構成）を生成する場合はtrue（デフォルト: false）',
            },
          },
        },
      },
      {
        name: 'generate_all',
        description: '全工程を一括実行します（キャプチャ → アノテーション → PDF生成）。モックアプリのドキュメント作成を完全自動化します。',
        inputSchema: {
          type: 'object',
          properties: {
            configPath: {
              type: 'string',
              description: '設定ファイルのパス（省略時: カレントディレクトリのmockup-config.json）',
            },
            detailed: {
              type: 'boolean',
              description: '詳細版PDF（2ページ構成）を生成する場合はtrue（デフォルト: false）',
            },
          },
        },
      },
      {
        name: 'record_video',
        description: 'ブラウザ操作を録画してWebM形式の動画を生成します。設定ファイルで定義されたアクションシーケンスを実行しながら録画します。',
        inputSchema: {
          type: 'object',
          properties: {
            configPath: {
              type: 'string',
              description: '設定ファイルのパス（省略時: カレントディレクトリのmockup-config.json）',
            },
          },
        },
      },
    ],
  };
});

/**
 * ツール実行ハンドラ
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const configPath = resolveConfigPath(args?.configPath);

    switch (name) {
      case 'capture_screenshots': {
        validateConfigPath(configPath);
        const result = await runCliTool(path.join(__dirname, 'bin', 'capture.js'), configPath);
        return {
          content: [
            {
              type: 'text',
              text: `✓ スクリーンショットキャプチャ完了\n\n${result.output}`,
            },
          ],
        };
      }

      case 'add_annotations': {
        validateConfigPath(configPath);
        const result = await runCliTool(path.join(__dirname, 'bin', 'annotate.js'), configPath);
        return {
          content: [
            {
              type: 'text',
              text: `✓ アノテーション追加完了\n\n${result.output}`,
            },
          ],
        };
      }

      case 'generate_pdf': {
        validateConfigPath(configPath);
        const scriptName = args?.detailed ? 'pdf-detailed.js' : 'pdf.js';
        const result = await runCliTool(path.join(__dirname, 'bin', scriptName), configPath);
        return {
          content: [
            {
              type: 'text',
              text: `✓ PDF生成完了 (${args?.detailed ? '詳細版・2ページ構成' : 'シングルページ構成'})\n\n${result.output}`,
            },
          ],
        };
      }

      case 'generate_all': {
        validateConfigPath(configPath);

        // 1. キャプチャ
        const captureResult = await runCliTool(path.join(__dirname, 'bin', 'capture.js'), configPath);

        // 2. アノテーション
        const annotateResult = await runCliTool(path.join(__dirname, 'bin', 'annotate.js'), configPath);

        // 3. PDF生成
        const scriptName = args?.detailed ? 'pdf-detailed.js' : 'pdf.js';
        const pdfResult = await runCliTool(path.join(__dirname, 'bin', scriptName), configPath);

        return {
          content: [
            {
              type: 'text',
              text: `✓ 全工程完了\n\n【1. スクリーンショットキャプチャ】\n${captureResult.output}\n\n【2. アノテーション追加】\n${annotateResult.output}\n\n【3. PDF生成】\n${pdfResult.output}`,
            },
          ],
        };
      }

      case 'record_video': {
        validateConfigPath(configPath);
        const result = await runCliTool(path.join(__dirname, 'bin', 'record-video.js'), configPath);
        return {
          content: [
            {
              type: 'text',
              text: `✓ 動画録画完了\n\n${result.output}`,
            },
          ],
        };
      }

      default:
        throw new Error(`未知のツール: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `✗ エラーが発生しました:\n${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * サーバー起動
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Mockup Screenshot Tool MCP Server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
