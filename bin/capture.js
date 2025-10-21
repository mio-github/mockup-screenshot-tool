#!/usr/bin/env node

/**
 * スクリーンショットキャプチャスクリプト
 * React/Next.jsモックアプリの画面をキャプチャする
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
        await page.waitForTimeout(300); // デフォルト待機
      }
    } catch (error) {
      console.log(`         ✗ アクションエラー: ${error.message}`);
      if (action.required) {
        throw error; // 必須アクションが失敗したら中止
      }
    }
  }

  console.log('     アクション実行完了');
}

/**
 * 待機戦略に基づいた待機処理
 * @param {object} page - Playwrightページオブジェクト
 * @param {string} strategy - 待機戦略（basic, graph, video, table, live）
 */
async function waitByStrategy(page, strategy) {
  switch (strategy) {
    case 'graph':
      console.log('     グラフの読み込みを待機中...');
      try {
        await page.waitForSelector('svg, canvas', { timeout: 10000 });
        console.log('     グラフ要素を検出');

        // グラフのアニメーション完了を待つ（Rechartsなど）
        await page.waitForTimeout(3000);

        // グラフ内の要素（パス、バー、パイなど）が描画されているか確認
        const hasGraphContent = await page.evaluate(() => {
          const svgs = document.querySelectorAll('svg');
          for (const svg of svgs) {
            const paths = svg.querySelectorAll('path, rect, circle, line');
            if (paths.length > 0) return true;
          }
          return false;
        });

        if (hasGraphContent) {
          console.log('     グラフコンテンツを確認');
          // アニメーション完全停止まで待つ
          await page.waitForTimeout(2000);
        } else {
          console.log('     グラフコンテンツ未検出（待機延長）');
          await page.waitForTimeout(4000);
        }
      } catch (e) {
        console.log('     グラフ要素の検出タイムアウト（待機して続行）');
        await page.waitForTimeout(5000);
      }
      break;

    case 'video':
      console.log('     動画サムネイルの読み込みを待機中...');
      await page.waitForTimeout(3000);
      break;

    case 'table':
      console.log('     データテーブルの読み込みを待機中...');
      try {
        await page.waitForSelector('table, [role="table"]', { timeout: 5000 });
        console.log('     テーブル要素を検出');
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log('     テーブル要素の検出タイムアウト');
        await page.waitForTimeout(3000);
      }
      break;

    case 'live':
      console.log('     カメラフィードの読み込みを待機中...');
      await page.waitForTimeout(4000);
      break;

    case 'basic':
    default:
      await page.waitForTimeout(2000);
      break;
  }
}

/**
 * スクリーンショット撮影メイン処理
 */
async function captureScreenshots() {
  // 設定ファイル読み込み
  const config = loadConfig(process.argv[2]);

  const { baseUrl, pages, viewport, screenshotsDir } = config;

  // スクリーンショット保存ディレクトリを作成
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('[*] ブラウザを起動中...');
  const browser = await chromium.launch({ headless: true });

  console.log('[*] スクリーンショット撮影開始...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const pageInfo of pages) {
    // 各ページごとに新しいコンテキストとページを作成（確実な分離）
    const context = await browser.newContext({
      viewport: pageInfo.viewport || viewport || { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    try {
      const url = `${baseUrl}${pageInfo.path}`;
      console.log(`[>>] ${pageInfo.name}`);
      console.log(`     URL: ${url}`);

      // ページにアクセス（loadとnetworkidleの両方を待つ）
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      console.log('     初期ロード完了');

      // Reactのハイドレーション完了を待つ
      await page.waitForTimeout(1500);

      // ネットワークアイドル状態を待つ（タイムアウトしても続行）
      try {
        await page.waitForLoadState('networkidle', { timeout: 10000 });
      } catch (e) {
        console.log('     networkidle タイムアウト（続行）');
      }

      // 基本的な待機時間（DOMの安定化を待つ）
      await page.waitForTimeout(1000);

      // 画像の読み込みを待つ
      try {
        await page.evaluate(() => {
          const images = Array.from(document.images);
          return Promise.all(
            images.map(img => {
              if (img.complete) return Promise.resolve();
              return new Promise((resolve, reject) => {
                img.addEventListener('load', resolve);
                img.addEventListener('error', resolve); // エラーでも続行
                setTimeout(resolve, 5000); // タイムアウト
              });
            })
          );
        });
        console.log('     画像の読み込み完了');
      } catch (e) {
        console.log('     画像の読み込みチェックをスキップ');
      }

      // 待機戦略に基づいた追加の待機
      if (pageInfo.waitStrategy) {
        await waitByStrategy(page, pageInfo.waitStrategy);
      }

      // ブラウザ操作アクションを実行
      if (pageInfo.actions && pageInfo.actions.length > 0) {
        await executeActions(page, pageInfo.actions);
      }

      // beforeScreenshot処理の実行
      if (pageInfo.beforeScreenshot) {
        console.log('     beforeScreenshot処理を実行中...');
        await eval(`(async () => { ${pageInfo.beforeScreenshot} })()`);
      }

      // 最終的な安定化待機（すべてのアニメーション完了）
      await page.waitForTimeout(2000);

      console.log('     スクリーンショット撮影中...');

      // スクリーンショット設定の準備
      const screenshotPath = path.join(screenshotsDir, `${pageInfo.name}.png`);
      const screenshotOptions = {
        path: screenshotPath,
        animations: 'disabled', // アニメーションを無効化
      };

      // clip設定があればそれを使用、なければfullPage
      if (pageInfo.clip) {
        screenshotOptions.clip = pageInfo.clip;
        screenshotOptions.fullPage = true; // clipを使う場合もfullPageが必要
        console.log(`     クリッピング: x=${pageInfo.clip.x}, y=${pageInfo.clip.y}, ${pageInfo.clip.width}x${pageInfo.clip.height}`);
      } else {
        screenshotOptions.fullPage = true;
      }

      await page.screenshot(screenshotOptions);

      console.log(`[✓] 保存完了: ${screenshotPath}\n`);
      successCount++;
    } catch (error) {
      console.error(`[✗] エラー: ${pageInfo.name}`);
      console.error(`     ${error.message}\n`);
      errorCount++;
    } finally {
      // 各ページ撮影後にコンテキストをクローズ（確実なクリーンアップ）
      await context.close();
    }
  }

  await browser.close();
  console.log('[✓] 全スクリーンショット撮影完了！');
  console.log(`[*] 成功: ${successCount}件 / エラー: ${errorCount}件`);
  console.log(`[*] 保存先: ${screenshotsDir}`);

  return errorCount === 0 ? 0 : 1;
}

// スクリプト実行
captureScreenshots()
  .then(exitCode => process.exit(exitCode))
  .catch((error) => {
    console.error('[✗] 致命的エラー:', error);
    process.exit(1);
  });
