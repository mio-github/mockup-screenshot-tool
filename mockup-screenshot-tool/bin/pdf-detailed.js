#!/usr/bin/env node

/**
 * 詳細版PDF生成スクリプト
 * 各画面を2ページ構成で出力：
 * - 1ページ目: スクリーンショット + サマリ
 * - 2ページ目: 詳細な機能説明
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { loadConfig } = require('../lib/config-loader');

/**
 * HTMLテンプレート生成
 */
function generateDetailedHTML(config, imagesDir) {
  const { projectName, subtitle, client, vendor, screens, overview } = config;

  let html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${projectName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Noto Sans JP', 'Yu Gothic', 'Meiryo', sans-serif;
      line-height: 1.6;
      color: #0F172A;
    }

    /* カバーページ */
    .cover-page {
      width: 297mm;
      height: 210mm;
      background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      page-break-after: always;
      position: relative;
      overflow: hidden;
    }

    .cover-page::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 800px;
      height: 800px;
      background: radial-gradient(circle, rgba(37, 99, 235, 0.2) 0%, transparent 70%);
      border-radius: 50%;
    }

    .cover-title {
      font-size: 56px;
      font-weight: 700;
      margin-bottom: 24px;
      text-align: center;
      z-index: 1;
      text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .cover-subtitle {
      font-size: 28px;
      color: #93C5FD;
      margin-bottom: 48px;
      z-index: 1;
    }

    .cover-meta {
      font-size: 20px;
      color: #CBD5E1;
      text-align: center;
      z-index: 1;
    }

    .cover-meta div {
      margin: 8px 0;
    }

    /* 概要ページ */
    .overview-page {
      width: 297mm;
      height: 210mm;
      padding: 40px 60px;
      page-break-after: always;
      background: white;
    }

    .overview-title {
      font-size: 32px;
      font-weight: 700;
      color: #1E293B;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 4px solid #2563EB;
    }

    .overview-section {
      margin-bottom: 32px;
    }

    .overview-heading {
      font-size: 24px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 12px;
    }

    .overview-content {
      font-size: 18px;
      color: #475569;
      line-height: 1.8;
    }

    .overview-items {
      list-style: none;
      padding: 0;
    }

    .overview-items li {
      font-size: 18px;
      color: #475569;
      padding: 8px 0 8px 24px;
      position: relative;
    }

    .overview-items li::before {
      content: '▸';
      position: absolute;
      left: 0;
      color: #2563EB;
      font-weight: bold;
    }

    /* スクリーンショット+サマリページ */
    .screenshot-page {
      width: 297mm;
      height: 210mm;
      padding: 40px 60px;
      page-break-after: always;
      background: white;
      display: flex;
      flex-direction: column;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 3px solid #E2E8F0;
    }

    .page-number {
      font-size: 20px;
      font-weight: 600;
      color: #64748B;
    }

    .category-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 16px;
      font-weight: 600;
    }

    .category-機能紹介 { background: #DBEAFE; color: #1E40AF; }
    .category-付加サービス { background: #D1FAE5; color: #065F46; }
    .category-アーキテクチャ { background: #FCE7F3; color: #9F1239; }
    .category-MVP実装 { background: #FEF3C7; color: #92400E; }
    .category-共通 { background: #F3F4F6; color: #374151; }
    .category-PoC { background: #E0E7FF; color: #3730A3; }
    .category-MVP { background: #FEE2E2; color: #991B1B; }

    .screen-title {
      font-size: 28px;
      font-weight: 700;
      color: #1E293B;
      margin-bottom: 20px;
    }

    .screenshot-container {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 20px;
      background: #F8FAFC;
      border-radius: 12px;
      padding: 20px;
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .screenshot-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .summary-box {
      background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
      border-left: 4px solid #2563EB;
      padding: 16px 20px;
      border-radius: 8px;
      margin-top: 20px;
    }

    .summary-label {
      font-size: 14px;
      font-weight: 700;
      color: #1E40AF;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .summary-text {
      font-size: 18px;
      color: #1E293B;
      line-height: 1.6;
    }

    /* 詳細説明ページ */
    .detail-page {
      width: 297mm;
      height: 210mm;
      padding: 40px 60px;
      page-break-after: always;
      background: white;
    }

    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      padding-bottom: 16px;
      border-bottom: 3px solid #E2E8F0;
    }

    .detail-title {
      font-size: 28px;
      font-weight: 700;
      color: #1E293B;
    }

    .detail-subtitle {
      font-size: 18px;
      color: #2563EB;
      font-weight: 600;
      margin-bottom: 24px;
    }

    .detail-content {
      font-size: 16px;
      color: #334155;
      line-height: 1.8;
      white-space: pre-wrap;
    }

    .detail-content strong {
      color: #1E293B;
      font-weight: 700;
    }

    .detail-content h1,
    .detail-content h2,
    .detail-content h3 {
      margin-top: 20px;
      margin-bottom: 12px;
      color: #1E293B;
    }

    .detail-content ul,
    .detail-content ol {
      margin: 12px 0;
      padding-left: 24px;
    }

    .detail-content li {
      margin: 6px 0;
    }

    /* フッター */
    .page-footer {
      position: absolute;
      bottom: 20px;
      right: 60px;
      font-size: 14px;
      color: #94A3B8;
    }
  </style>
</head>
<body>
`;

  // カバーページ
  html += `
  <div class="cover-page">
    <h1 class="cover-title">${projectName}</h1>
    <p class="cover-subtitle">${subtitle || ''}</p>
    <div class="cover-meta">
      <div>発注元: ${client}</div>
      <div>受託者: ${vendor}</div>
      <div>作成日: ${new Date().toLocaleDateString('ja-JP')}</div>
    </div>
  </div>
`;

  // 概要ページ
  if (overview && overview.enabled) {
    html += `
  <div class="overview-page">
    <h2 class="overview-title">${overview.title || 'システム概要'}</h2>
`;

    if (overview.sections) {
      overview.sections.forEach(section => {
        html += `
    <div class="overview-section">
      <h3 class="overview-heading">${section.heading}</h3>
`;

        if (section.content) {
          html += `
      <p class="overview-content">${section.content}</p>
`;
        }

        if (section.items) {
          html += `
      <ul class="overview-items">
`;
          section.items.forEach(item => {
            html += `        <li>${item}</li>\n`;
          });
          html += `
      </ul>
`;
        }

        html += `
    </div>
`;
      });
    }

    html += `
  </div>
`;
  }

  // 各画面の2ページ構成
  screens.forEach((screen, index) => {
    const imagePath = path.join(imagesDir, `${screen.filename}.png`);

    if (!fs.existsSync(imagePath)) {
      console.log(`[⚠] 画像が見つかりません: ${imagePath}`);
      return;
    }

    // ページ1: スクリーンショット + サマリ
    html += `
  <div class="screenshot-page">
    <div class="page-header">
      <div class="page-number">画面 ${index + 1} / ${screens.length}</div>
      <div class="category-badge category-${screen.category}">${screen.category}</div>
    </div>

    <h2 class="screen-title">${screen.title}</h2>

    <div class="screenshot-container">
      <img src="file://${imagePath}" alt="${screen.title}" />
    </div>

    <div class="summary-box">
      <div class="summary-label">概要 Summary</div>
      <div class="summary-text">${screen.summary || ''}</div>
    </div>
  </div>
`;

    // ページ2: 詳細説明
    if (screen.description) {
      html += `
  <div class="detail-page">
    <div class="detail-header">
      <h2 class="detail-title">${screen.title}</h2>
      <div class="category-badge category-${screen.category}">${screen.category}</div>
    </div>

    <div class="detail-subtitle">詳細機能説明 Detailed Description</div>

    <div class="detail-content">${screen.description.replace(/\n/g, '<br>')}</div>

    <div class="page-footer">画面 ${index + 1} - 詳細</div>
  </div>
`;
    }
  });

  html += `
</body>
</html>
`;

  return html;
}

/**
 * メイン処理
 */
async function main() {
  console.log('[*] 詳細版PDF生成開始...\n');

  // 設定ファイル読み込み
  const config = loadConfig(process.argv[2]);

  const { screenshotsDir, annotatedDir, pdfFileName, screens } = config;

  // 注釈付き画像を優先、なければ元画像を使用
  let imagesDir = annotatedDir;
  if (!fs.existsSync(annotatedDir) || fs.readdirSync(annotatedDir).filter(f => f.endsWith('.png')).length === 0) {
    console.log('[!] 注釈付きスクリーンショットが見つかりません。元のスクリーンショットを使用します。\n');
    imagesDir = screenshotsDir;
  }

  // annotatedDirが存在しない場合は作成
  if (!fs.existsSync(annotatedDir)) {
    fs.mkdirSync(annotatedDir, { recursive: true });
  }

  // HTMLテンプレート生成
  console.log('[*] HTMLテンプレート生成中...');
  const html = generateDetailedHTML(config, imagesDir);

  // 一時HTMLファイル保存
  const tempHtmlPath = path.join(annotatedDir, '_temp_detailed_pdf.html');
  fs.writeFileSync(tempHtmlPath, html, 'utf-8');
  console.log('[✓] HTMLテンプレート生成完了\n');

  // PDF変換
  console.log('[*] PDF変換中...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`file://${tempHtmlPath}`, {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  const pdfPath = path.join(annotatedDir, pdfFileName);
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true
  });

  await browser.close();

  // 一時HTMLファイル削除
  fs.unlinkSync(tempHtmlPath);

  console.log('[✓] PDF生成完了！\n');
  console.log(`[*] 保存先: ${pdfPath}`);

  const stats = fs.statSync(pdfPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`[*] ファイルサイズ: ${fileSizeMB} MB`);

  return 0;
}

// スクリプト実行
main()
  .then(exitCode => process.exit(exitCode))
  .catch((error) => {
    console.error('[✗] エラーが発生しました:', error);
    process.exit(1);
  });
