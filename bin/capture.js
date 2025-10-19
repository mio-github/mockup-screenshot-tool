#!/usr/bin/env node

/**
 * スクリーンショットキャプチャスクリプト
 * React/Next.jsモックアプリの画面をキャプチャする
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { loadConfig } = require('../lib/config-loader');

/**
 * 待機戦略に基づいた待機処理
 * @param {object} page - Playwrightページオブジェクト
 * @param {string} strategy - 待機戦略（basic, graph, video, table, live）
 */
async function waitByStrategy(page, strategy) {
  switch (strategy) {
    case 'graph':
      console.log('     グラフの読み込みを待機中...');
      await page.waitForTimeout(4000);
      try {
        await page.waitForSelector('svg, canvas', { timeout: 5000 });
        console.log('     グラフ要素を検出');
      } catch (e) {
        console.log('     グラフ要素の検出タイムアウト（続行）');
      }
      await page.waitForTimeout(2000);
      break;

    case 'video':
      console.log('     動画サムネイルの読み込みを待機中...');
      await page.waitForTimeout(3000);
      break;

    case 'table':
      console.log('     データテーブルの読み込みを待機中...');
      await page.waitForTimeout(3000);
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
  const context = await browser.newContext({
    viewport: viewport || { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log('[*] スクリーンショット撮影開始...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const pageInfo of pages) {
    try {
      const url = `${baseUrl}${pageInfo.path}`;
      console.log(`[>>] ${pageInfo.name}`);
      console.log(`     URL: ${url}`);

      // ページごとのviewport設定があれば適用
      if (pageInfo.viewport) {
        await page.setViewportSize(pageInfo.viewport);
        console.log(`     ビューポート: ${pageInfo.viewport.width}x${pageInfo.viewport.height}`);
      }

      // ページにアクセス
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // 基本的な待機時間（DOMの安定化を待つ）
      await page.waitForTimeout(2000);

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

      // beforeScreenshot処理の実行
      if (pageInfo.beforeScreenshot) {
        console.log('     beforeScreenshot処理を実行中...');
        await eval(`(async () => { ${pageInfo.beforeScreenshot} })()`);
      }

      // 最終的な安定化待機
      await page.waitForTimeout(1000);

      // スクリーンショット設定の準備
      const screenshotPath = path.join(screenshotsDir, `${pageInfo.name}.png`);
      const screenshotOptions = {
        path: screenshotPath,
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
