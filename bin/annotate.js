#!/usr/bin/env node

/**
 * スクリーンショットにSVG注釈を追加するスクリプト
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { imageSize } = require('image-size');
const { loadConfig } = require('../lib/config-loader');
const { generateAnnotatedHTML } = require('../lib/html-generator');

/**
 * アノテーション追加メイン処理
 */
async function main() {
  console.log('[*] 注釈付きスクリーンショット生成開始...\n');

  // 設定ファイル読み込み
  const config = loadConfig(process.argv[2]);
  const { annotations, screenshotsDir, annotatedDir } = config;

  // 出力ディレクトリを作成
  if (!fs.existsSync(annotatedDir)) {
    fs.mkdirSync(annotatedDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  let successCount = 0;
  let errorCount = 0;

  for (const [filename, annotationConfig] of Object.entries(annotations)) {
    const screenshotPath = path.join(screenshotsDir, `${filename}.png`);
    const outputPath = path.join(annotatedDir, `${filename}.png`);

    console.log(`[>>] ${filename}`);

    // スクリーンショットが存在するか確認
    if (!fs.existsSync(screenshotPath)) {
      console.log(`[!] スクリーンショットが見つかりません: ${screenshotPath}\n`);
      errorCount++;
      continue;
    }

    try {
      // 元の画像サイズを取得
      const imageBuffer = fs.readFileSync(screenshotPath);
      const dimensions = imageSize(imageBuffer);
      const imageWidth = dimensions.width;
      const imageHeight = dimensions.height;

      console.log(`    サイズ: ${imageWidth}x${imageHeight}`);

      // HTML生成
      const html = generateAnnotatedHTML(
        screenshotPath,
        filename,
        annotationConfig,
        imageWidth,
        imageHeight
      );

      // HTMLをファイルに一時保存
      const tempHtmlPath = path.join(annotatedDir, `_temp_${filename}.html`);
      fs.writeFileSync(tempHtmlPath, html);

      // PlaywrightでHTMLを開いてスクリーンショット
      const page = await browser.newPage({
        viewport: { width: imageWidth, height: imageHeight },
        deviceScaleFactor: 1
      });

      await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle' });

      // フォントと画像の読み込みを待機
      await page.waitForTimeout(1000);

      // コンテナのサイズを確認
      const containerSize = await page.evaluate(() => {
        const container = document.querySelector('.container');
        return {
          width: container.offsetWidth,
          height: container.offsetHeight
        };
      });

      console.log(`    コンテナサイズ: ${containerSize.width}x${containerSize.height}`);

      // viewportサイズで正確にキャプチャ
      await page.screenshot({
        path: outputPath,
        fullPage: false,
        omitBackground: false
      });

      await page.close();

      // 一時HTMLファイルを削除
      fs.unlinkSync(tempHtmlPath);

      console.log(`[✓] 保存完了: ${outputPath}\n`);
      successCount++;
    } catch (error) {
      console.log(`[✗] エラー: ${error.message}\n`);
      errorCount++;
    }
  }

  await browser.close();

  console.log('\n[✓] 注釈付きスクリーンショット生成完了！');
  console.log(`[*] 成功: ${successCount}件 / エラー: ${errorCount}件`);
  console.log(`[*] 保存先: ${annotatedDir}`);

  return errorCount === 0 ? 0 : 1;
}

main()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  });
