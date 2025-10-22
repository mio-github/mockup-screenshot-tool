#!/usr/bin/env node

/**
 * 詳細版PDF生成スクリプト
 * 各画面を2ページ構成で出力：
 * - 1ページ目: スクリーンショット + サマリ
 * - 2ページ目: 詳細な機能説明
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import sizeOf from 'image-size';
import { loadConfig } from '../lib/config-loader.js';

/**
 * HTMLテンプレート生成
 */
function generateDetailedHTML(config, imagesDir) {
  const { projectName, subtitle, client, vendor, screens, overview, designPolicy = {}, viewport = {}, pdfOptions = {} } = config;

  // デザインポリシーのデフォルト値
  const colors = {
    primary: designPolicy.primaryColor || '#2563EB',
    secondary: designPolicy.secondaryColor || '#7C3AED',
    accent: designPolicy.accentColor || '#10B981',
    dark: designPolicy.darkColor || '#0F172A',
    light: designPolicy.lightColor || '#F8FAFC',
    gradient: designPolicy.colorScheme?.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    coverGradient: designPolicy.colorScheme?.coverGradient || 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
    accentGradient: designPolicy.colorScheme?.accentGradient || 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)'
  };
  const fontFamily = designPolicy.fontFamily || "'Noto Sans JP', 'Yu Gothic', 'Meiryo', sans-serif";
  const screenshotShadow = designPolicy.screenshotShadow || 'enhanced';

  // ピクセルをmmに変換（96dpi想定: 1mm = 3.7795px）
  const pxToMm = (px) => (px / 3.7795).toFixed(2);

  // 各画面の画像サイズを読み取り、ページサイズを計算
  const screenPageSizes = screens.map((screen, index) => {
    const imagePath = path.join(imagesDir, `${screen.filename}.png`);
    if (!fs.existsSync(imagePath)) {
      console.log(`[⚠] 画像が見つかりません: ${imagePath}`);
      // デフォルトサイズを返す
      return {
        index,
        screenshot: { widthMm: pxToMm(1520), heightMm: pxToMm(1080) },
        features: { widthMm: pxToMm(1520), heightMm: pxToMm(1080) }
      };
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const dimensions = sizeOf(imageBuffer);
    const imageWidth = dimensions.width;
    const imageHeight = dimensions.height;

    // 画面キャプチャページのサイズ（余白を含める）
    const padding = 80; // 両側の余白（40px × 2）
    const headerHeight = 100; // ヘッダー部分の高さ
    const screenshotPageWidth = imageWidth + padding;
    const screenshotPageHeight = imageHeight + headerHeight + padding;

    // 機能説明ページも同じサイズ
    const featuresPageWidth = screenshotPageWidth;
    const featuresPageHeight = screenshotPageHeight;

    return {
      index,
      screenshot: {
        widthMm: pxToMm(screenshotPageWidth),
        heightMm: pxToMm(screenshotPageHeight)
      },
      features: {
        widthMm: pxToMm(featuresPageWidth),
        heightMm: pxToMm(featuresPageHeight)
      }
    };
  });

  // シャドウスタイルの定義
  const shadowStyles = {
    none: 'none',
    basic: '0 4px 12px rgba(0, 0, 0, 0.1)',
    enhanced: `0 25px 50px -12px rgba(0, 0, 0, 0.25),
        0 12px 24px -8px rgba(0, 0, 0, 0.18),
        0 4px 8px rgba(0, 0, 0, 0.12)`,
    dramatic: `0 40px 80px -20px rgba(0, 0, 0, 0.35),
        0 20px 40px -12px rgba(0, 0, 0, 0.25),
        0 8px 16px rgba(0, 0, 0, 0.15)`
  };
  const shadowStyle = shadowStyles[screenshotShadow] || shadowStyles.enhanced;

  let html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${projectName}</title>
  <style>
    @page {
      margin: 0;
    }

    @page cover {
      size: A4 landscape;
      margin: 0;
    }

    @page overview {
      size: A4 landscape;
      margin: 0;
    }

    @page toc {
      size: A4 landscape;
      margin: 0;
    }

    ${screenPageSizes.map((pageSize, idx) => `
    @page screenshot-${idx + 1} {
      size: ${pageSize.screenshot.widthMm}mm ${pageSize.screenshot.heightMm}mm;
      margin: 0;
    }

    @page features-${idx + 1} {
      size: ${pageSize.features.widthMm}mm ${pageSize.features.heightMm}mm;
      margin: 0;
    }
    `).join('')}

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${fontFamily};
      line-height: 1.6;
      color: ${colors.dark};
    }

    /* カバーページ */
    .cover-page {
      page: cover;
      width: 297mm;
      height: 210mm;
      background: ${colors.coverGradient};
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
      background: radial-gradient(circle, ${colors.primary}33 0%, transparent 70%);
      border-radius: 50%;
    }

    .cover-page::after {
      content: '';
      position: absolute;
      bottom: -30%;
      left: -20%;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, ${colors.secondary}33 0%, transparent 70%);
      border-radius: 50%;
    }

    .cover-title {
      font-size: 56px;
      font-weight: 700;
      margin-bottom: 24px;
      text-align: center;
      z-index: 1;
      text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      letter-spacing: 2px;
    }

    .cover-subtitle {
      font-size: 28px;
      color: #93C5FD;
      margin-bottom: 60px;
      z-index: 1;
      padding: 10px 30px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 30px;
      backdrop-filter: blur(10px);
    }

    .cover-meta {
      font-size: 20px;
      color: #CBD5E1;
      text-align: center;
      z-index: 1;
      background: rgba(255, 255, 255, 0.05);
      padding: 30px 50px;
      border-radius: 16px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .cover-meta div {
      margin: 10px 0;
    }

    /* 概要ページ */
    .overview-page {
      page: overview;
      width: 297mm;
      height: 210mm;
      padding: 40px 50px;
      page-break-after: always;
      background: linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%);
      position: relative;
    }

    .overview-page::before {
      content: '';
      position: absolute;
      top: -100px;
      right: -100px;
      width: 400px;
      height: 400px;
      background: ${colors.accentGradient};
      opacity: 0.08;
      border-radius: 50%;
      pointer-events: none;
    }

    .overview-title {
      font-size: 36px;
      font-weight: 700;
      color: ${colors.dark};
      margin-bottom: 36px;
      padding-bottom: 20px;
      border-bottom: none;
      position: relative;
      display: inline-block;
    }

    .overview-title::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 80px;
      height: 5px;
      background: ${colors.accentGradient};
      border-radius: 3px;
    }

    .overview-section {
      background: white;
      border-radius: 8px;
      padding: 24px 28px;
      margin-bottom: 24px;
      border-left: 4px solid ${colors.primary};
    }

    .overview-heading {
      font-size: 22px;
      font-weight: 700;
      color: ${colors.dark};
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .overview-heading::before {
      content: '●';
      color: ${colors.primary};
      font-size: 14px;
    }

    .overview-content {
      font-size: 16px;
      color: #475569;
      line-height: 1.9;
      padding-left: 26px;
    }

    .overview-items {
      list-style: none;
      padding: 0;
      padding-left: 26px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .overview-items li {
      font-size: 15px;
      color: #333;
      padding: 8px 12px;
      position: relative;
      background: #FAFAFA;
      border-radius: 4px;
      border-left: 3px solid ${colors.accent};
    }

    .overview-items li::before {
      content: '•';
      position: absolute;
      left: -16px;
      color: ${colors.accent};
      font-weight: bold;
      font-size: 18px;
    }

    /* 目次ページ */
    .toc-page {
      page: toc;
      width: 297mm;
      height: 210mm;
      padding: 40px 60px;
      page-break-after: always;
      background: white;
    }

    .toc-title {
      font-size: 32px;
      font-weight: 700;
      color: ${colors.dark};
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 3px solid ${colors.primary};
    }

    .toc-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .toc-item {
      border-bottom: 1px solid #E8E8E8;
      padding: 16px 0;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .toc-item:last-child {
      border-bottom: none;
    }

    .toc-number {
      font-size: 24px;
      font-weight: 700;
      color: ${colors.primary};
      min-width: 40px;
    }

    .toc-content {
      flex: 1;
    }

    .toc-screen-title {
      font-size: 18px;
      font-weight: 600;
      color: ${colors.dark};
      margin-bottom: 4px;
    }

    .toc-screen-desc {
      font-size: 13px;
      color: #666;
      line-height: 1.6;
    }

    /* スクリーンショット+サマリページ */
    .screenshot-page {
      width: 210mm;
      min-height: 297mm;
      padding: 25px 30px 30px 30px;
      page-break-after: always;
      background: white;
      display: flex;
      flex-direction: column;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 3px solid #E2E8F0;
      flex-shrink: 0;
    }

    .page-number {
      font-size: 18px;
      font-weight: 600;
      color: #64748B;
    }

    .category-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .category-機能紹介 { background: #E3F2FD; color: #1565C0; }
    .category-付加サービス { background: #E8F5E9; color: #2E7D32; }
    .category-アーキテクチャ { background: #FCE4EC; color: #C2185B; }
    .category-MVP実装 { background: #FFF8E1; color: #F57F17; }
    .category-共通 { background: #F5F5F5; color: #424242; }
    .category-PoC { background: #EDE7F6; color: #5E35B1; }
    .category-MVP { background: #FFEBEE; color: #C62828; }
    .category-認証 { background: #FFEBEE; color: #C62828; }
    .category-管理 { background: #E3F2FD; color: #1565C0; }
    .category-機能 { background: #E8F5E9; color: #2E7D32; }

    .screen-title {
      font-size: 24px;
      font-weight: 700;
      color: #1E293B;
      margin-bottom: 16px;
      flex-shrink: 0;
    }

    .screenshot-container {
      display: flex;
      justify-content: center;
      align-items: center;
      background: #FAFAFA;
      border-radius: 8px;
      padding: 12px;
      flex-shrink: 0;
      margin-bottom: 20px;
    }

    .screenshot-container img {
      width: 100%;
      height: auto;
      object-fit: contain;
      border-radius: 4px;
      border: 1px solid #E0E0E0;
      background: white;
    }

    .details-section {
      background: white;
      border: 1px solid #E0E0E0;
      border-radius: 8px;
      padding: 24px;
      margin-top: 20px;
      flex-shrink: 0;
    }

    .section-header {
      font-size: 16px;
      font-weight: 700;
      color: ${colors.dark};
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid ${colors.primary};
    }

    .description-text {
      font-size: 14px;
      color: #555;
      line-height: 1.8;
      margin-bottom: 20px;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }

    .feature-box {
      background: #FAFAFA;
      border-left: 3px solid ${colors.accent};
      padding: 12px 16px;
      border-radius: 4px;
    }

    .feature-title {
      font-size: 14px;
      font-weight: 600;
      color: ${colors.dark};
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .feature-title::before {
      content: '✓';
      color: ${colors.accent};
      font-size: 14px;
      font-weight: bold;
    }

    .feature-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .feature-list li {
      font-size: 13px;
      color: #666;
      padding: 4px 0 4px 16px;
      position: relative;
    }

    .feature-list li::before {
      content: '•';
      position: absolute;
      left: 0;
      color: ${colors.accent};
    }

    .spec-list {
      list-style: none;
      padding: 0;
      margin: 0;
      background: #F8F8F8;
      border-radius: 6px;
      padding: 16px;
    }

    .spec-list li {
      font-size: 13px;
      color: #555;
      padding: 6px 0;
      border-bottom: 1px solid #E8E8E8;
    }

    .spec-list li:last-child {
      border-bottom: none;
    }

    .spec-list li strong {
      color: ${colors.dark};
      font-weight: 600;
    }

    /* 画面キャプチャ専用ページ（1ページ目） */
    .screenshot-only-page {
      /* page プロパティは各divで個別指定 */
      padding: 30px 40px;
      page-break-after: always;
      background: white;
      display: flex;
      flex-direction: column;
    }

    .screen-title-large {
      font-size: 32px;
      font-weight: 700;
      color: ${colors.dark};
      margin-bottom: 20px;
      text-align: center;
    }

    .screenshot-full-container {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #FAFBFC;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .screenshot-full-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
      border: 1px solid #E2E8F0;
    }

    /* 機能説明ページ（2ページ目） */
    .features-detail-page {
      /* page プロパティは各divで個別指定 */
      padding: 35px 45px;
      page-break-after: always;
      background: #FFFFFF;
    }

    .features-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
      padding-bottom: 16px;
      border-bottom: 3px solid ${colors.primary};
    }

    .features-title {
      font-size: 28px;
      font-weight: 700;
      color: ${colors.dark};
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .title-icon {
      display: none;
    }

    .description-box {
      background: #F8F9FA;
      border-left: 4px solid ${colors.primary};
      border-radius: 4px;
      padding: 20px 24px;
      margin-bottom: 25px;
    }

    .desc-label {
      font-size: 13px;
      font-weight: 700;
      color: #64748B;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .description-text {
      font-size: 15px;
      color: #475569;
      line-height: 1.7;
      margin: 0;
      font-weight: 600;
    }

    .features-grid-modern {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 18px;
      margin-top: 20px;
    }

    .feature-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      border: 2px solid #E2E8F0;
      transition: all 0.3s ease;
      display: flex;
      gap: 16px;
      align-items: flex-start;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .feature-card:hover {
      border-color: ${colors.primary};
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.1);
    }

    .feature-card-icon {
      font-size: 14px;
      font-weight: 700;
      color: ${colors.primary};
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #EFF6FF;
      border-radius: 4px;
      border: 2px solid ${colors.primary};
    }

    .feature-card-content {
      flex: 1;
      font-size: 14px;
      color: #334155;
      line-height: 1.6;
      font-weight: 500;
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

  // 目次ページ
  html += `
  <div class="toc-page">
    <h2 class="toc-title">目次 Table of Contents</h2>
    <ul class="toc-list">
`;

  screens.forEach((screen, index) => {
    html += `
      <li class="toc-item">
        <div class="toc-number">${String(index + 1).padStart(2, '0')}</div>
        <div class="toc-content">
          <div class="toc-screen-title">${screen.title}</div>
          <div class="toc-screen-desc">${screen.description}</div>
        </div>
        <div class="category-badge category-${screen.category}">${screen.category}</div>
      </li>
`;
  });

  html += `
    </ul>
  </div>
`;

  // 各画面の2ページ構成
  screens.forEach((screen, index) => {
    const imagePath = path.join(imagesDir, `${screen.filename}.png`);

    if (!fs.existsSync(imagePath)) {
      console.log(`[⚠] 画像が見つかりません: ${imagePath}`);
      return;
    }

    const description = screen.description || '';
    const features = screen.features || [];
    const specifications = screen.specifications || [];

    // 1ページ目：画面キャプチャのみ（フルページ）
    html += `
  <div class="screenshot-only-page" style="page: screenshot-${index + 1};">
    <div class="page-header">
      <div class="page-number">画面 ${index + 1} / ${screens.length}</div>
      <div class="category-badge category-${screen.category}">${screen.category}</div>
    </div>

    <h2 class="screen-title-large">${screen.title}</h2>

    <div class="screenshot-full-container">
      <img src="file://${imagePath}" alt="${screen.title}" />
    </div>
  </div>

  <div class="features-detail-page" style="page: features-${index + 1};">
    <div class="features-header">
      <div class="features-title">
        ${screen.title} の主な機能
      </div>
      <div class="category-badge category-${screen.category}">${screen.category}</div>
    </div>

    <div class="description-box">
      <div class="desc-label">画面説明</div>
      <p class="description-text">${description}</p>
    </div>

    <div class="features-grid-modern">
`;

    // 主な機能（グラフィカルなカード表示）
    if (features.length > 0) {
      features.forEach((feature, fIndex) => {
        const number = fIndex + 1;
        html += `
      <div class="feature-card">
        <div class="feature-card-icon">${number}</div>
        <div class="feature-card-content">${feature}</div>
      </div>
`;
      });
    }

    html += `
    </div>
  </div>
`;
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

  // HTMLファイル保存
  const htmlFileName = pdfFileName.replace('.pdf', '.html');
  const htmlPath = path.join(annotatedDir, htmlFileName);
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log('[✓] HTMLテンプレート生成完了');
  console.log(`[*] HTML保存先: ${htmlPath}\n`);

  // PDF変換
  console.log('[*] PDF変換中...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`file://${htmlPath}`, {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  const pdfPath = path.join(annotatedDir, pdfFileName);
  await page.pdf({
    path: pdfPath,
    printBackground: true,
    preferCSSPageSize: true  // CSS @pageルールでサイズを指定
  });

  await browser.close();

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
