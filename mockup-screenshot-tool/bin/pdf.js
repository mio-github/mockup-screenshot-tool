#!/usr/bin/env node

/**
 * 注釈付きスクリーンショットをPDFにまとめるスクリプト
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { loadConfig } from '../lib/config-loader.js';
import { generatePDFHTML } from '../lib/html-generator.js';

/**
 * PDF生成メイン処理
 */
async function main() {
  console.log('[*] PDF生成開始...\n');

  // 設定ファイル読み込み
  const config = loadConfig(process.argv[2]);
  const { screens, annotatedDir, screenshotsDir, pdfFileName, pdfOptions } = config;

  // レイアウト設定の確認
  const layout = pdfOptions?.layout || 'single';
  if (layout === 'detailed') {
    console.log('[*] レイアウトモード: 詳細版（2ページ構成）');
    console.log('[!] 詳細版PDFを生成する場合は、pdf-detailed.js を使用してください。');
    console.log('    例: node bin/pdf-detailed.js\n');
    process.exit(1);
  } else {
    console.log('[*] レイアウトモード: シングル（1ページ構成）\n');
  }

  const outputPdfPath = path.join(annotatedDir, pdfFileName || '画面一覧.pdf');

  // 注釈付きスクリーンショットが存在するか確認し、なければ元画像を使用
  let useOriginalImages = false;
  const missingFilesInAnnotated = screens.filter(screen => {
    const imagePath = path.join(annotatedDir, `${screen.filename}.png`);
    return !fs.existsSync(imagePath);
  });

  if (missingFilesInAnnotated.length === screens.length) {
    // 全て注釈付きがない場合、元のスクリーンショットを使用
    console.log('[!] 注釈付きスクリーンショットが見つかりません。元のスクリーンショットを使用します。\n');
    useOriginalImages = true;

    // 元のスクリーンショットも存在するか確認
    const missingOriginalFiles = screens.filter(screen => {
      const imagePath = path.join(screenshotsDir, `${screen.filename}.png`);
      return !fs.existsSync(imagePath);
    });

    if (missingOriginalFiles.length > 0) {
      console.log('[!] 元のスクリーンショットも見つかりません:');
      missingOriginalFiles.forEach(file => console.log(`    - ${file.filename}.png`));
      console.log('\n[*] 先にスクリーンショット撮影を実行してください。');
      process.exit(1);
    }
  } else if (missingFilesInAnnotated.length > 0) {
    // 一部だけ注釈付きがない場合
    console.log('[!] 一部の注釈付きスクリーンショットが見つかりません:');
    missingFilesInAnnotated.forEach(file => console.log(`    - ${file.filename}.png`));
    console.log('\n[*] 先にアノテーションスクリプトを実行してください。');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  try {
    // HTML生成
    console.log('[*] HTMLテンプレート生成中...');
    const imageDir = useOriginalImages ? screenshotsDir : annotatedDir;
    const html = generatePDFHTML(config, imageDir);

    // 一時HTMLファイル保存
    const tempHtmlPath = path.join(annotatedDir, '_temp_pdf.html');
    fs.writeFileSync(tempHtmlPath, html);
    console.log('[✓] HTMLテンプレート生成完了\n');

    // PlaywrightでHTMLを開いてPDF生成
    console.log('[*] PDF変換中...');
    await page.goto(`file://${tempHtmlPath}`);
    await page.waitForTimeout(2000); // フォント・画像読み込み待機

    const pdfOpts = pdfOptions || {};
    await page.pdf({
      path: outputPdfPath,
      format: pdfOpts.format || 'A4',
      landscape: pdfOpts.landscape !== false, // デフォルト true
      printBackground: pdfOpts.printBackground !== false, // デフォルト true
      margin: pdfOpts.margin || {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0'
      }
    });

    // 一時HTMLファイル削除
    fs.unlinkSync(tempHtmlPath);

    console.log('[✓] PDF生成完了！\n');
    console.log(`[*] 保存先: ${outputPdfPath}`);
    console.log(`[*] ファイルサイズ: ${(fs.statSync(outputPdfPath).size / (1024 * 1024)).toFixed(2)} MB`);

  } catch (error) {
    console.error('[✗] エラーが発生しました:', error);
    throw error;
  } finally {
    await browser.close();
  }

  return 0;
}

main()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  });
