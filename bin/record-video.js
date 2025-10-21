#!/usr/bin/env node

/**
 * 画面操作の動画録画スクリプト
 * Playwrightを使用してブラウザ操作を録画し、MP4動画として保存
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { loadConfig } from '../lib/config-loader.js';

/**
 * ブラウザ操作アクションを実行
 * @param {object} page - Playwrightページオブジェクト
 * @param {array} actions - 実行するアクションのリスト
 */
async function executeActions(page, actions) {
  if (!actions || actions.length === 0) return;

  console.log(`     ${actions.length}個のアクションを実行中...`);

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    console.log(`       [${i + 1}/${actions.length}] ${action.type}: ${action.description || ''}`);

    try {
      switch (action.type) {
        case 'click':
          if (action.selector) {
            await page.click(action.selector);
            console.log(`         ✓ クリック: ${action.selector}`);
          }
          break;

        case 'type':
          if (action.selector && action.value) {
            await page.fill(action.selector, action.value);
            console.log(`         ✓ 入力: ${action.selector} = "${action.value}"`);
          }
          break;

        case 'scroll':
          if (action.x !== undefined && action.y !== undefined) {
            await page.evaluate(({ x, y }) => window.scrollTo(x, y), { x: action.x, y: action.y });
            console.log(`         ✓ スクロール: (${action.x}, ${action.y})`);
          }
          break;

        case 'hover':
          if (action.selector) {
            await page.hover(action.selector);
            console.log(`         ✓ ホバー: ${action.selector}`);
          }
          break;

        case 'select':
          if (action.selector && action.value) {
            await page.selectOption(action.selector, action.value);
            console.log(`         ✓ 選択: ${action.selector} = "${action.value}"`);
          }
          break;

        case 'wait':
          const duration = action.duration || 1000;
          await page.waitForTimeout(duration);
          console.log(`         ✓ 待機: ${duration}ms`);
          break;

        case 'waitForSelector':
          if (action.selector) {
            await page.waitForSelector(action.selector, { timeout: action.timeout || 5000 });
            console.log(`         ✓ 要素待機: ${action.selector}`);
          }
          break;

        case 'evaluate':
          if (action.code) {
            await page.evaluate(action.code);
            console.log(`         ✓ カスタムJS実行`);
          }
          break;

        default:
          console.log(`         ⚠ 未知のアクション: ${action.type}`);
      }

      // アクション間の待機
      if (action.waitAfter) {
        await page.waitForTimeout(action.waitAfter);
      } else {
        await page.waitForTimeout(500); // 動画用にやや長めのデフォルト待機
      }
    } catch (error) {
      console.log(`         ✗ アクションエラー: ${error.message}`);
      if (action.required) {
        throw error;
      }
    }
  }

  console.log('     アクション実行完了');
}

/**
 * 動画録画メイン処理
 */
async function recordVideo() {
  // 設定ファイル読み込み
  const config = loadConfig(process.argv[2]);

  const { baseUrl, pages, viewport, outputDir } = config;
  const videosDir = path.join(outputDir || './mockup-output', 'videos');

  // 動画保存ディレクトリを作成
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }

  console.log('[*] 動画録画開始...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const pageInfo of pages) {
    // アクションがないページはスキップ
    if (!pageInfo.actions || pageInfo.actions.length === 0) {
      console.log(`[SKIP] ${pageInfo.name} - アクションなし\n`);
      continue;
    }

    console.log('[*] ブラウザを起動中...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: pageInfo.viewport || viewport || { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      recordVideo: {
        dir: videosDir,
        size: pageInfo.viewport || viewport || { width: 1440, height: 900 }
      }
    });
    const page = await context.newPage();

    try {
      const url = `${baseUrl}${pageInfo.path}`;
      console.log(`[>>] ${pageInfo.name}`);
      console.log(`     URL: ${url}`);

      // ページにアクセス
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      console.log('     初期ロード完了');

      // Reactのハイドレーション完了を待つ
      await page.waitForTimeout(1500);

      // ネットワークアイドル状態を待つ
      try {
        await page.waitForLoadState('networkidle', { timeout: 10000 });
      } catch (e) {
        console.log('     networkidle タイムアウト（続行）');
      }

      // 基本待機
      await page.waitForTimeout(1000);

      // アクション実行
      await executeActions(page, pageInfo.actions);

      // 録画終了前の待機
      await page.waitForTimeout(2000);

      console.log('     動画録画完了');

      // ページを閉じる（録画を保存）
      await page.close();

      // コンテキストを閉じて動画を保存
      await context.close();

      // 動画ファイルをリネーム
      const videoFiles = fs.readdirSync(videosDir).filter(f => f.endsWith('.webm'));
      if (videoFiles.length > 0) {
        const latestVideo = videoFiles[videoFiles.length - 1];
        const newName = `${pageInfo.name}.webm`;
        fs.renameSync(
          path.join(videosDir, latestVideo),
          path.join(videosDir, newName)
        );
        console.log(`[✓] 保存完了: ${path.join(videosDir, newName)}\n`);
        successCount++;
      }

      await browser.close();
    } catch (error) {
      console.error(`[✗] エラー: ${pageInfo.name}`);
      console.error(`     ${error.message}\n`);
      errorCount++;
      await context.close();
      await browser.close();
    }
  }

  console.log('[✓] 全動画録画完了！');
  console.log(`[*] 成功: ${successCount}件 / エラー: ${errorCount}件`);
  console.log(`[*] 保存先: ${videosDir}`);

  return errorCount === 0 ? 0 : 1;
}

// スクリプト実行
recordVideo()
  .then(exitCode => process.exit(exitCode))
  .catch((error) => {
    console.error('[✗] 致命的エラー:', error);
    process.exit(1);
  });
