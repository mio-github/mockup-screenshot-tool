#!/usr/bin/env node

/**
 * mio_sc_capture - MCP Server
 * Model Context Protocol対応サーバー
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { promisify } from 'util';
import { loadConfig } from './lib/config-loader.js';
import { generateSpecSheet } from './lib/spec-sheet-generator.js';

const execPromise = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ブラウザ操作アクションを実行
 */
async function executeActions(page, actions) {
  if (!actions || actions.length === 0) return;

  const results = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const actionDesc = action.description || `${action.type}`;

    try {
      switch (action.type) {
        case 'click':
          if (action.selector) {
            await page.click(action.selector);
            results.push(`✓ クリック: ${action.selector}`);
          }
          break;

        case 'type':
          if (action.selector && action.value) {
            await page.fill(action.selector, action.value);
            results.push(`✓ 入力: ${action.selector} = "${action.value}"`);
          }
          break;

        case 'scroll':
          if (action.x !== undefined && action.y !== undefined) {
            await page.evaluate(({ x, y }) => window.scrollTo(x, y), { x: action.x, y: action.y });
            results.push(`✓ スクロール: (${action.x}, ${action.y})`);
          }
          break;

        case 'hover':
          if (action.selector) {
            await page.hover(action.selector);
            results.push(`✓ ホバー: ${action.selector}`);
          }
          break;

        case 'select':
          if (action.selector && action.value) {
            await page.selectOption(action.selector, action.value);
            results.push(`✓ 選択: ${action.selector} = "${action.value}"`);
          }
          break;

        case 'wait':
          const duration = action.duration || 1000;
          await page.waitForTimeout(duration);
          results.push(`✓ 待機: ${duration}ms`);
          break;

        case 'waitForSelector':
          if (action.selector) {
            await page.waitForSelector(action.selector, { timeout: action.timeout || 5000 });
            results.push(`✓ 要素待機: ${action.selector}`);
          }
          break;

        case 'evaluate':
          if (action.code) {
            await page.evaluate(action.code);
            results.push(`✓ カスタムJS実行`);
          }
          break;

        default:
          results.push(`⚠ 未知のアクション: ${action.type}`);
      }

      // アクション間の待機
      await page.waitForTimeout(300);
    } catch (error) {
      results.push(`✗ アクションエラー (${actionDesc}): ${error.message}`);
    }
  }

  return results;
}

/**
 * 待機戦略に基づいた待機処理
 */
async function waitByStrategy(page, strategy) {
  switch (strategy) {
    case 'graph':
      try {
        await page.waitForSelector('svg, canvas', { timeout: 10000 });
        await page.waitForTimeout(3000);
      } catch (e) {
        await page.waitForTimeout(5000);
      }
      break;

    case 'video':
      await page.waitForTimeout(3000);
      break;

    case 'table':
      try {
        await page.waitForSelector('table, [role="table"]', { timeout: 5000 });
        await page.waitForTimeout(2000);
      } catch (e) {
        await page.waitForTimeout(3000);
      }
      break;

    case 'live':
      await page.waitForTimeout(4000);
      break;

    case 'basic':
    default:
      await page.waitForTimeout(2000);
      break;
  }
}

/**
 * navigate_and_captureツールの実装
 */
async function navigateAndCapture(args) {
  const {
    baseUrl,
    path: urlPath,
    name,
    outputDir = './mockup-output/screenshots',
    viewport = { width: 1920, height: 1080 },
    actions = [],
    waitStrategy = 'basic',
  } = args;

  // 出力ディレクトリを作成
  const absoluteOutputDir = path.isAbsolute(outputDir)
    ? outputDir
    : path.join(process.cwd(), outputDir);

  if (!fs.existsSync(absoluteOutputDir)) {
    fs.mkdirSync(absoluteOutputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  const results = [];

  try {
    const url = `${baseUrl}${urlPath}`;
    results.push(`[*] アクセス: ${url}`);

    // ページにアクセス
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    results.push(`[*] 初期ロード完了`);

    // Reactのハイドレーション完了を待つ
    await page.waitForTimeout(1500);

    // ネットワークアイドル状態を待つ
    try {
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    } catch (e) {
      results.push(`[*] networkidle タイムアウト（続行）`);
    }

    // 画像の読み込みを待つ
    try {
      await page.evaluate(() => {
        const images = Array.from(document.images);
        return Promise.all(
          images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.addEventListener('load', resolve);
              img.addEventListener('error', resolve);
              setTimeout(resolve, 5000);
            });
          })
        );
      });
      results.push(`[*] 画像の読み込み完了`);
    } catch (e) {
      results.push(`[*] 画像の読み込みチェックをスキップ`);
    }

    // 待機戦略に基づいた追加の待機
    await waitByStrategy(page, waitStrategy);

    // ブラウザ操作アクションを実行
    if (actions.length > 0) {
      results.push(`[*] ${actions.length}個のアクションを実行中...`);
      const actionResults = await executeActions(page, actions);
      results.push(...actionResults.map(r => `    ${r}`));
    }

    // 最終的な安定化待機
    await page.waitForTimeout(2000);

    // スクリーンショット撮影
    const screenshotPath = path.join(absoluteOutputDir, `${name}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      animations: 'disabled',
    });

    results.push(`[✓] 保存完了: ${screenshotPath}`);

    await browser.close();

    return {
      success: true,
      output: results.join('\n'),
      screenshotPath,
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * WebMをMP4に変換
 */
async function convertWebMToMP4(webmPath, mp4Path) {
  const ffmpegCommand = `ffmpeg -i "${webmPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -movflags +faststart "${mp4Path}" -y`;

  try {
    await execPromise(ffmpegCommand);
    return true;
  } catch (error) {
    throw new Error(`MP4変換エラー: ${error.message}`);
  }
}

/**
 * navigate_and_recordツールの実装
 * LLMが指定した操作シーケンスを動画として記録
 */
async function navigateAndRecord(args) {
  const {
    baseUrl,
    path: urlPath,
    name,
    outputDir = './mockup-output/videos',
    viewport = { width: 1920, height: 1080 },
    actions = [],
    waitStrategy = 'basic',
    recordingOptions = {},
  } = args;

  // 出力ディレクトリを作成
  const absoluteOutputDir = path.isAbsolute(outputDir)
    ? outputDir
    : path.join(process.cwd(), outputDir);

  if (!fs.existsSync(absoluteOutputDir)) {
    fs.mkdirSync(absoluteOutputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport,
    recordVideo: {
      dir: absoluteOutputDir,
      size: viewport,
    },
  });
  const page = await context.newPage();

  const results = [];

  try {
    const url = `${baseUrl}${urlPath}`;
    results.push(`[*] アクセス: ${url}`);
    results.push(`[*] 録画開始...`);

    // ページにアクセス
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    results.push(`[*] 初期ロード完了`);

    // Reactのハイドレーション完了を待つ
    await page.waitForTimeout(1500);

    // ネットワークアイドル状態を待つ
    try {
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    } catch (e) {
      results.push(`[*] networkidle タイムアウト（続行）`);
    }

    // 画像の読み込みを待つ
    try {
      await page.evaluate(() => {
        const images = Array.from(document.images);
        return Promise.all(
          images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.addEventListener('load', resolve);
              img.addEventListener('error', resolve);
              setTimeout(resolve, 5000);
            });
          })
        );
      });
      results.push(`[*] 画像の読み込み完了`);
    } catch (e) {
      results.push(`[*] 画像の読み込みチェックをスキップ`);
    }

    // 待機戦略に基づいた追加の待機
    await waitByStrategy(page, waitStrategy);

    // 初期状態を録画するための待機
    const initialDelay = recordingOptions.initialDelay || 2000;
    results.push(`[*] 初期状態を録画中... (${initialDelay}ms)`);
    await page.waitForTimeout(initialDelay);

    // ブラウザ操作アクションを実行
    if (actions.length > 0) {
      results.push(`[*] ${actions.length}個のアクションを実行中...`);
      const actionResults = await executeActions(page, actions);
      results.push(...actionResults.map(r => `    ${r}`));
    }

    // 最終状態を録画するための待機
    const finalDelay = recordingOptions.finalDelay || 2000;
    results.push(`[*] 最終状態を録画中... (${finalDelay}ms)`);
    await page.waitForTimeout(finalDelay);

    results.push(`[*] 録画終了...`);

    // 生成された動画ファイルのパスを取得（クローズ前）
    const videoPath = await page.video().path();

    // コンテキストをクローズして動画を保存
    await context.close();
    await browser.close();

    // 動画ファイルが生成されるまで少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!fs.existsSync(videoPath)) {
      results.push(`[!] 動画ファイルが見つかりません: ${videoPath}`);
      throw new Error('動画ファイルの生成に失敗しました');
    }

    // WebMファイルのサイズを取得
    const webmStats = fs.statSync(videoPath);
    const webmSizeMB = (webmStats.size / (1024 * 1024)).toFixed(2);
    results.push(`[*] WebM生成完了 (${webmSizeMB} MB)`);

    // MP4に変換
    const mp4Path = path.join(absoluteOutputDir, `${name}.mp4`);
    results.push(`[*] MP4に変換中...`);

    try {
      await convertWebMToMP4(videoPath, mp4Path);
      results.push(`[✓] MP4変換完了: ${mp4Path}`);

      // MP4ファイルサイズを取得
      const mp4Stats = fs.statSync(mp4Path);
      const mp4SizeMB = (mp4Stats.size / (1024 * 1024)).toFixed(2);
      results.push(`[*] ファイルサイズ: ${mp4SizeMB} MB`);

      // WebMファイルを削除
      fs.unlinkSync(videoPath);
      results.push(`[*] 一時ファイル削除完了`);

      return {
        success: true,
        output: results.join('\n'),
        videoPath: mp4Path,
      };
    } catch (conversionError) {
      results.push(`[!] MP4変換失敗: ${conversionError.message}`);
      results.push(`[*] WebM形式で保存: ${videoPath}`);

      // 変換失敗時はWebMをリネーム
      const webmFallbackPath = path.join(absoluteOutputDir, `${name}.webm`);
      fs.renameSync(videoPath, webmFallbackPath);

      return {
        success: true,
        output: results.join('\n'),
        videoPath: webmFallbackPath,
        warning: 'MP4変換に失敗したため、WebM形式で保存されました',
      };
    }
  } catch (error) {
    await context.close();
    await browser.close();
    throw error;
  }
}

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
    name: 'mio_sc_capture',
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
        name: 'navigate_and_capture',
        description: 'LLMが指定したURLにアクセスし、ブラウザ操作を実行してからスクリーンショットをキャプチャします。クリック、入力、スクロールなどの操作を順次実行できます。',
        inputSchema: {
          type: 'object',
          properties: {
            baseUrl: {
              type: 'string',
              description: 'ベースURL（例: http://localhost:3000）',
            },
            path: {
              type: 'string',
              description: 'アクセスするパス（例: /dashboard）',
            },
            name: {
              type: 'string',
              description: 'キャプチャ画像のファイル名（拡張子なし）',
            },
            outputDir: {
              type: 'string',
              description: '保存先ディレクトリ（デフォルト: ./mockup-output/screenshots）',
            },
            viewport: {
              type: 'object',
              description: 'ビューポートサイズ（デフォルト: 1920x1080）',
              properties: {
                width: { type: 'number' },
                height: { type: 'number' },
              },
            },
            actions: {
              type: 'array',
              description: 'スクリーンショット撮影前に実行するブラウザ操作のリスト',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['click', 'type', 'scroll', 'hover', 'select', 'wait', 'waitForSelector', 'evaluate'],
                    description: 'アクションの種類',
                  },
                  selector: {
                    type: 'string',
                    description: 'CSSセレクタ（click, type, hover, select, waitForSelector用）',
                  },
                  value: {
                    type: 'string',
                    description: '入力値（type, select用）',
                  },
                  x: {
                    type: 'number',
                    description: 'X座標（scroll用）',
                  },
                  y: {
                    type: 'number',
                    description: 'Y座標（scroll用）',
                  },
                  duration: {
                    type: 'number',
                    description: '待機時間（ミリ秒、wait用）',
                  },
                  code: {
                    type: 'string',
                    description: '実行するJavaScriptコード（evaluate用）',
                  },
                  description: {
                    type: 'string',
                    description: 'アクションの説明',
                  },
                },
                required: ['type'],
              },
            },
            waitStrategy: {
              type: 'string',
              enum: ['basic', 'graph', 'video', 'table', 'live'],
              description: 'ページロード後の待機戦略（デフォルト: basic）',
            },
          },
          required: ['baseUrl', 'path', 'name'],
        },
      },
      {
        name: 'navigate_and_record',
        description: 'LLMが指定したURLにアクセスし、ブラウザ操作を実行しながらその様子を動画で記録します。操作シーケンス全体がMP4形式の動画として保存されます（ffmpegでWebMから自動変換）。',
        inputSchema: {
          type: 'object',
          properties: {
            baseUrl: {
              type: 'string',
              description: 'ベースURL（例: http://localhost:3000）',
            },
            path: {
              type: 'string',
              description: 'アクセスするパス（例: /dashboard）',
            },
            name: {
              type: 'string',
              description: '動画ファイル名（拡張子なし、.mp4が自動付与）',
            },
            outputDir: {
              type: 'string',
              description: '保存先ディレクトリ（デフォルト: ./mockup-output/videos）',
            },
            viewport: {
              type: 'object',
              description: 'ビューポートサイズ（デフォルト: 1920x1080）',
              properties: {
                width: { type: 'number' },
                height: { type: 'number' },
              },
            },
            actions: {
              type: 'array',
              description: '録画中に実行するブラウザ操作のリスト',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['click', 'type', 'scroll', 'hover', 'select', 'wait', 'waitForSelector', 'evaluate'],
                    description: 'アクションの種類',
                  },
                  selector: {
                    type: 'string',
                    description: 'CSSセレクタ',
                  },
                  value: {
                    type: 'string',
                    description: '入力値',
                  },
                  x: {
                    type: 'number',
                    description: 'X座標（scroll用）',
                  },
                  y: {
                    type: 'number',
                    description: 'Y座標（scroll用）',
                  },
                  duration: {
                    type: 'number',
                    description: '待機時間（ミリ秒）',
                  },
                  code: {
                    type: 'string',
                    description: '実行するJavaScriptコード',
                  },
                  description: {
                    type: 'string',
                    description: 'アクションの説明',
                  },
                },
                required: ['type'],
              },
            },
            waitStrategy: {
              type: 'string',
              enum: ['basic', 'graph', 'video', 'table', 'live'],
              description: 'ページロード後の待機戦略（デフォルト: basic）',
            },
            recordingOptions: {
              type: 'object',
              description: '録画オプション',
              properties: {
                initialDelay: {
                  type: 'number',
                  description: '操作開始前の待機時間（ミリ秒、デフォルト: 2000）',
                },
                finalDelay: {
                  type: 'number',
                  description: '操作完了後の待機時間（ミリ秒、デフォルト: 2000）',
                },
              },
            },
          },
          required: ['baseUrl', 'path', 'name'],
        },
      },
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
        name: 'generate_spec_sheet',
        description: '画面を自動で解析し、ボタン・リンク・入力項目の仕様をまとめたExcel画面設計書を生成します。必要に応じてスクリーンショットも再撮影します。',
        inputSchema: {
          type: 'object',
          properties: {
            configPath: {
              type: 'string',
              description: '設定ファイルのパス（省略時: カレントディレクトリのmockup-config.json）',
            },
            outputDir: {
              type: 'string',
              description: 'Excel出力先ディレクトリを指定する場合に使用します',
            },
            fileName: {
              type: 'string',
              description: '生成されるExcelファイル名（拡張子含む）',
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
      {
        name: 'generate_flow_diagram',
        description: '実際のスクリーンショット画像を使用してSVG形式の画面遷移図を生成します。各画面をサムネイル表示し、矢印で遷移関係を表現します。',
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
    switch (name) {
      case 'navigate_and_capture': {
        const result = await navigateAndCapture(args);
        return {
          content: [
            {
              type: 'text',
              text: `✓ ページ遷移とキャプチャ完了\n\n${result.output}`,
            },
          ],
        };
      }

      case 'navigate_and_record': {
        const result = await navigateAndRecord(args);
        return {
          content: [
            {
              type: 'text',
              text: `✓ ページ遷移と動画録画完了\n\n${result.output}`,
            },
          ],
        };
      }

      case 'capture_screenshots': {
        const configPath = resolveConfigPath(args?.configPath);
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
        const configPath = resolveConfigPath(args?.configPath);
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
        const configPath = resolveConfigPath(args?.configPath);
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
        const configPath = resolveConfigPath(args?.configPath);
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

      case 'generate_spec_sheet': {
        const configPath = resolveConfigPath(args?.configPath);
        validateConfigPath(configPath);
        const config = loadConfig(configPath);

        const options = {};
        if (args?.outputDir) {
          options.outputDir = path.isAbsolute(args.outputDir)
            ? args.outputDir
            : path.resolve(process.cwd(), args.outputDir);
        }
        if (args?.fileName) {
          options.fileName = args.fileName;
        }

        const result = await generateSpecSheet(config, options);
        return {
          content: [
            {
              type: 'text',
              text: `✓ 画面設計仕様書を生成しました\n\nExcel: ${result.outputPath}\nスクリーンショット: ${result.screenshotDir}`,
            },
          ],
        };
      }

      case 'record_video': {
        const configPath = resolveConfigPath(args?.configPath);
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

      case 'generate_flow_diagram': {
        const configPath = resolveConfigPath(args?.configPath);
        validateConfigPath(configPath);
        const result = await runCliTool(path.join(__dirname, 'bin', 'flow-diagram.js'), configPath);
        return {
          content: [
            {
              type: 'text',
              text: `✓ 画面遷移図生成完了\n\n${result.output}`,
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
  console.error('mio_sc_capture MCP Server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
