/**
 * HTMLテンプレート生成モジュール
 */

import fs from 'fs';
import path from 'path';
import { imageSize } from 'image-size';

/**
 * アノテーション付きHTMLを生成
 * @param {string} imagePath - 元画像のパス
 * @param {string} imageFilename - 画像ファイル名
 * @param {object} annotationConfig - アノテーション設定
 * @param {number} imageWidth - 画像幅
 * @param {number} imageHeight - 画像高さ
 * @returns {string} - HTML文字列
 */
function generateAnnotatedHTML(imagePath, imageFilename, annotationConfig, imageWidth, imageHeight) {
  const { items } = annotationConfig;

  const wrapLine = (line, maxChars = 14) => {
    const chars = Array.from(line);
    if (chars.length === 0) {
      return [''];
    }
    const wrapped = [];
    for (let i = 0; i < chars.length; i += maxChars) {
      wrapped.push(chars.slice(i, i + maxChars).join(''));
    }
    return wrapped;
  };

  // スタイルプリセットの定義
  const stylePresets = {
    default: {
      lineColor: '#FB923C',
      pointColor: '#F97316',
      boxColor: 'rgba(249, 115, 22, 0.95)',
      boxBorder: 'white',
      textColor: 'white',
      shadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    highlight: {
      lineColor: '#34D399',
      pointColor: '#10B981',
      boxColor: 'rgba(16, 185, 129, 0.95)',
      boxBorder: 'rgba(255, 255, 255, 0.9)',
      textColor: 'white',
      shadow: '0 10px 20px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3)'
    },
    success: {
      lineColor: '#86EFAC',
      pointColor: '#22C55E',
      boxColor: 'rgba(34, 197, 94, 0.95)',
      boxBorder: 'white',
      textColor: 'white',
      shadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    danger: {
      lineColor: '#FCA5A5',
      pointColor: '#EF4444',
      boxColor: 'rgba(239, 68, 68, 0.95)',
      boxBorder: 'white',
      textColor: 'white',
      shadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    info: {
      lineColor: '#93C5FD',
      pointColor: '#3B82F6',
      boxColor: 'rgba(59, 130, 246, 0.95)',
      boxBorder: 'white',
      textColor: 'white',
      shadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    warning: {
      lineColor: '#FCD34D',
      pointColor: '#F59E0B',
      boxColor: 'rgba(245, 158, 11, 0.95)',
      boxBorder: 'white',
      textColor: 'white',
      shadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }
  };

  /**
   * カスタムカラーからスタイルを生成
   */
  const createCustomStyle = (color) => {
    // HEX色からRGB値を抽出
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // 明るいラインカラー（20%明るく）
    const lightenColor = (r, g, b, amount = 40) => {
      const nr = Math.min(255, r + amount);
      const ng = Math.min(255, g + amount);
      const nb = Math.min(255, b + amount);
      return `rgb(${nr}, ${ng}, ${nb})`;
    };

    return {
      lineColor: lightenColor(r, g, b, 40),
      pointColor: color,
      boxColor: `rgba(${r}, ${g}, ${b}, 0.95)`,
      boxBorder: 'rgba(255, 255, 255, 0.9)',
      textColor: 'white',
      shadow: '0 10px 20px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3)'
    };
  };

  const svgAnnotations = items.map((item, index) => {
    const { x, y, text, description, direction, style: styleName, color: customColor } = item;

    // スタイルの決定（優先順位: customColor > styleName > default）
    let style;
    if (customColor) {
      style = createCustomStyle(customColor);
    } else if (styleName && stylePresets[styleName]) {
      style = stylePresets[styleName];
    } else {
      style = stylePresets.default;
    }

    const rawLines = (description || '').split('\n');
    const descriptionLines = rawLines.flatMap(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        return [''];
      }
      return wrapLine(trimmed);
    });

    const paddingY = 16;
    const paddingX = 20;
    const boxWidth = 260;
    const titleFontSize = 16;
    const titleLineHeight = 24;
    const descriptionFontSize = 14;
    const descriptionLineHeight = 22;
    const hasDescription = descriptionLines.length > 0 && !(descriptionLines.length === 1 && descriptionLines[0] === '');
    const descriptionGap = hasDescription ? 8 : 0;
    const descriptionBlockHeight = hasDescription ? descriptionLineHeight * descriptionLines.length : 0;
    const boxHeight = paddingY * 2 + titleLineHeight + descriptionGap + descriptionBlockHeight;

    // 吹き出しの位置計算（境界チェック付き）
    let calloutX, calloutY;
    const offset = 150;
    const margin = 100;

    switch (direction) {
      case 'top':
        calloutX = x;
        calloutY = Math.max(y - offset, boxHeight / 2 + margin);
        break;
      case 'bottom':
        calloutX = x;
        calloutY = Math.min(y + offset, imageHeight - boxHeight / 2 - margin);
        break;
      case 'left':
        calloutX = Math.max(x - offset, boxWidth / 2 + margin);
        calloutY = y;
        break;
      case 'right':
        calloutX = Math.min(x + offset, imageWidth - boxWidth / 2 - margin);
        calloutY = y;
        break;
    }

    const boxTop = calloutY - boxHeight / 2;
    const titleX = calloutX - boxWidth / 2 + paddingX;
    const titleY = boxTop + paddingY + titleFontSize;
    const descriptionStartX = calloutX - boxWidth / 2 + paddingX;
    const descriptionStartY = boxTop + paddingY + titleLineHeight + descriptionGap + descriptionFontSize;

    return `
      <!-- Annotation ${index + 1}: ${text} (style: ${styleName}) -->
      <g class="annotation" data-index="${index}" data-style="${styleName}">
        <!-- Line from point to callout -->
        <line x1="${x}" y1="${y}" x2="${calloutX}" y2="${calloutY}"
              stroke="${style.lineColor}" stroke-width="2" stroke-dasharray="5,5" />

        <!-- Point marker -->
        <circle cx="${x}" cy="${y}" r="8" fill="${style.pointColor}" stroke="white" stroke-width="2" />

        <!-- Callout box -->
        <rect x="${calloutX - boxWidth/2}" y="${boxTop}"
              width="${boxWidth}" height="${boxHeight}"
              fill="${style.boxColor}" rx="8" stroke="${style.boxBorder}" stroke-width="2"
              style="filter: drop-shadow(${style.shadow});" />

        <!-- Title -->
        <text x="${titleX}" y="${titleY}"
              fill="${style.textColor}" font-size="16" font-weight="bold"
              text-anchor="start" font-family="Noto Sans JP, sans-serif">
          ${text}
        </text>

        <!-- Description lines -->
        ${descriptionLines.map((line, i) => `
          <text x="${descriptionStartX}" y="${descriptionStartY + i * descriptionLineHeight}"
                fill="${style.textColor}" font-size="14"
                text-anchor="start" font-family="Noto Sans JP, sans-serif">
            ${line || ' '}
          </text>
        `).join('')}
      </g>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html style="width: ${imageWidth}px; height: ${imageHeight}px; margin: 0; padding: 0;">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${imageWidth}, height=${imageHeight}">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: ${imageWidth}px;
      height: ${imageHeight}px;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: white;
    }
    body {
      display: flex;
      justify-content: flex-start;
      align-items: flex-start;
    }
    .container {
      position: relative;
      width: ${imageWidth}px;
      height: ${imageHeight}px;
      margin: 0;
      padding: 0;
    }
    img {
      display: block;
      width: ${imageWidth}px;
      height: ${imageHeight}px;
      margin: 0;
      padding: 0;
    }
    svg {
      position: absolute;
      top: 0;
      left: 0;
      width: ${imageWidth}px;
      height: ${imageHeight}px;
      pointer-events: none;
      margin: 0;
      padding: 0;
    }
    .annotation {
      animation: fadeIn 0.3s ease-in-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.8); }
      to { opacity: 1; transform: scale(1); }
    }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="container">
    <img src="${imagePath}" alt="${imageFilename}" />
    <svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
      ${svgAnnotations}
    </svg>
  </div>
</body>
</html>
  `;
}

/**
 * PDF用HTMLを生成
 * @param {object} config - 設定オブジェクト
 * @param {string} annotatedDir - アノテーション付き画像ディレクトリ
 * @returns {string} - HTML文字列
 */
function generatePDFHTML(config, annotatedDir) {
  const { projectName, subtitle, client, vendor, screens } = config;

  const imageBlocks = screens.map((screen, index) => {
    const imagePath = path.join(annotatedDir, `${screen.filename}.png`);
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${imageBase64}`;

    // 画像サイズとアスペクト比を取得
    const dimensions = imageSize(imageBuffer);
    const aspectRatio = dimensions.height / dimensions.width;

    console.log(`[${index + 1}] ${screen.filename}: ${dimensions.width}x${dimensions.height} (比率: ${aspectRatio.toFixed(2)})`);

    let imageWidth = 800;
    let pageClass = 'page';
    let imageHTML = '';

    // アスペクト比に応じて処理を分ける
    if (aspectRatio <= 1.3) {
      console.log(`    → 通常表示（横幅: 800px）`);
      imageWidth = 800;
      imageHTML = `<img src="${dataUrl}" alt="${screen.title}" style="width: ${imageWidth}px; height: auto;" />`;
    } else if (aspectRatio <= 2.0) {
      imageWidth = Math.max(600, 900 - aspectRatio * 150);
      console.log(`    → 縮小表示（横幅: ${imageWidth.toFixed(0)}px）`);
      imageHTML = `<img src="${dataUrl}" alt="${screen.title}" style="width: ${imageWidth}px; height: auto;" />`;
    } else {
      console.log(`    → 省略表示（上部+下部、横幅: 700px）`);
      pageClass = 'page page-omitted';
      imageWidth = 700;
      const imageHeight = Math.round(dimensions.height * (imageWidth / dimensions.width));
      imageHTML = `
        <div class="image-omitted-container">
          <div class="image-part-top">
            <img src="${dataUrl}" alt="${screen.title}" style="width: ${imageWidth}px; height: auto; display: block;" />
          </div>
          <div class="omission-mark">
            <svg width="100" height="40" viewBox="0 0 100 40">
              <path d="M 10 20 Q 20 10, 30 20 T 50 20 T 70 20 T 90 20"
                    stroke="#94A3B8" stroke-width="2" fill="none" stroke-dasharray="5,5"/>
              <path d="M 10 25 Q 20 15, 30 25 T 50 25 T 70 25 T 90 25"
                    stroke="#94A3B8" stroke-width="2" fill="none" stroke-dasharray="5,5"/>
            </svg>
            <div class="omission-text">中略</div>
          </div>
          <div class="image-part-bottom">
            <img src="${dataUrl}" alt="${screen.title}" style="width: ${imageWidth}px; height: auto; display: block; margin-top: -${imageHeight - 280}px;" />
          </div>
        </div>
      `;
    }

    // カテゴリに応じたクラスを付与
    let categoryClass = 'page-category';
    if (screen.category === '共通') {
      categoryClass += ' category-common';
    } else if (screen.category === 'PoC') {
      categoryClass += ' category-poc';
    } else if (screen.category === 'MVP') {
      categoryClass += ' category-mvp';
    } else {
      categoryClass += ' category-other';
    }

    return `
      <div class="${pageClass}">
        <div class="page-header">
          <div class="page-number">${index + 1} / ${screens.length}</div>
          <div class="${categoryClass}">${screen.category}</div>
          <h2 class="page-title">${screen.title}</h2>
          <p class="page-description">${screen.description}</p>
        </div>
        <div class="image-container">
          ${imageHTML}
        </div>
      </div>
    `;
  }).join('');

  // 概要ページの生成
  let overviewHTML = '';
  if (config.overview && config.overview.enabled) {
    const overviewStyle = config.overview.style || 'default';
    const isModern = overviewStyle === 'modern';
    const sections = config.overview.sections || [];

    const sectionsHTML = sections.map((section, index) => {
      let contentHTML = '';
      if (section.items && Array.isArray(section.items)) {
        contentHTML = `
          <ul class="overview-list ${isModern ? 'overview-list-modern' : ''}">
            ${section.items.map(item => `<li>${item}</li>`).join('')}
          </ul>
        `;
      } else if (section.content) {
        contentHTML = `<p class="overview-text ${isModern ? 'overview-text-modern' : ''}">${section.content}</p>`;
      }

      return `
        <section class="overview-section ${isModern ? 'overview-section-modern' : ''}" data-index="${index}">
          ${isModern ? '<div class="section-card">' : ''}
          <h2 class="overview-heading ${isModern ? 'overview-heading-modern' : ''}">${section.heading}</h2>
          ${contentHTML}
          ${isModern ? '</div>' : ''}
        </section>
      `;
    }).join('');

    overviewHTML = `
      <div class="overview-page ${isModern ? 'overview-page-modern' : ''}">
        <h1 class="overview-title ${isModern ? 'overview-title-modern' : ''}">${config.overview.title || 'システム概要'}</h1>
        ${sectionsHTML}
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${projectName} - 画面・主要機能説明</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    ${getPDFStyles(config.pdfOptions?.layout, config.overview?.style)}
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover">
    <h1 class="cover-title">${projectName}${subtitle ? `<br>${subtitle}` : ''}</h1>
    <p class="cover-subtitle">Mockup Screen Documentation</p>

    <div class="cover-info">
      ${client ? `<div class="cover-info-item">提案先：${client}</div>` : ''}
      ${vendor ? `<div class="cover-info-item">提案元：${vendor}</div>` : ''}
      <p class="cover-date">${new Date().toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}</p>
    </div>
  </div>

  <!-- Overview Page -->
  ${overviewHTML}

  <!-- Content Pages -->
  ${imageBlocks}
</body>
</html>
  `;
}

/**
 * PDF用CSSスタイルを取得
 * @param {object} layoutOptions - レイアウトオプション
 * @param {string} overviewStyle - 概要ページのスタイル（'default' | 'modern'）
 * @returns {string} - CSS文字列
 */
function getPDFStyles(layoutOptions = {}, overviewStyle = 'default') {
  const {
    headerMaxHeight = 200,
    descriptionMaxLines = 6,
    descriptionFontSize = 10,
    descriptionLineHeight = 1.35,
    descriptionFontWeight = 500
  } = layoutOptions;

  const imageMaxHeight = headerMaxHeight + 60; // ヘッダー高さ + マージン
  const isModern = overviewStyle === 'modern';

  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Noto Sans JP', sans-serif;
      background: white;
      color: #0F172A;
    }

    /* Cover Page */
    .cover {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
      color: white;
      page-break-after: always;
      padding: 40px;
    }

    .cover-title {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 24px;
      text-align: center;
      line-height: 1.3;
    }

    .cover-subtitle {
      font-size: 28px;
      font-weight: 500;
      margin-bottom: 48px;
      color: #94A3B8;
    }

    .cover-info {
      margin-top: 80px;
      text-align: center;
    }

    .cover-info-item {
      font-size: 18px;
      margin-bottom: 12px;
      color: #CBD5E1;
    }

    .cover-date {
      margin-top: 40px;
      font-size: 16px;
      color: #94A3B8;
    }

    /* Overview Page */
    .overview-page {
      page-break-after: always;
      page-break-inside: avoid;
      padding: 30px 45px;
      height: 100vh;
      overflow: hidden;
      box-sizing: border-box;
    }

    .overview-title {
      font-size: 32px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #2563EB;
    }

    .overview-section {
      margin-bottom: 18px;
    }

    .overview-heading {
      font-size: 17px;
      font-weight: 700;
      color: #1E293B;
      margin-bottom: 8px;
    }

    .overview-text {
      font-size: 11px;
      line-height: 1.5;
      color: #475569;
      margin-bottom: 8px;
    }

    .overview-list {
      font-size: 10px;
      line-height: 1.5;
      color: #475569;
      margin-left: 18px;
      margin-bottom: 8px;
    }

    .overview-list li {
      margin-bottom: 4px;
    }

    /* Overview Page - Modern Style */
    .overview-page-modern {
      background: linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%);
      padding: 40px 60px;
    }

    .overview-title-modern {
      font-size: 36px;
      font-weight: 700;
      background: linear-gradient(135deg, #1E293B 0%, #2563EB 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: none;
      position: relative;
    }

    .overview-title-modern::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 120px;
      height: 4px;
      background: linear-gradient(90deg, #2563EB 0%, #60A5FA 100%);
      border-radius: 2px;
    }

    .overview-section-modern {
      margin-bottom: 24px;
    }

    .section-card {
      background: white;
      border-radius: 12px;
      padding: 20px 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(226, 232, 240, 0.6);
      position: relative;
      overflow: hidden;
    }

    .section-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: linear-gradient(180deg, #2563EB 0%, #60A5FA 100%);
    }

    .overview-heading-modern {
      font-size: 18px;
      font-weight: 700;
      color: #1E293B;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .overview-heading-modern::before {
      content: '▸';
      color: #2563EB;
      font-size: 16px;
    }

    .overview-text-modern {
      font-size: 12px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 10px;
      padding: 12px;
      background: #F8FAFC;
      border-radius: 6px;
      border-left: 3px solid #60A5FA;
    }

    .overview-list-modern {
      font-size: 11px;
      line-height: 1.6;
      color: #475569;
      margin-left: 0;
      padding-left: 0;
      list-style: none;
      margin-bottom: 0;
    }

    .overview-list-modern li {
      margin-bottom: 8px;
      padding-left: 24px;
      position: relative;
    }

    .overview-list-modern li::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #10B981;
      font-weight: 700;
      font-size: 13px;
    }

    /* Content Pages */
    .page {
      page-break-before: always;
      page-break-after: always;
      page-break-inside: avoid;
      padding: 20px 30px;
      height: 100vh;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      overflow: hidden;
    }

    .page:first-of-type {
      page-break-before: auto;
    }

    .page-omitted {
      height: 100vh;
      overflow: hidden;
    }

    .page-header {
      margin-bottom: 20px;
      border-bottom: 2px solid #E2E8F0;
      padding-bottom: 10px;
      flex-shrink: 0;
      max-height: ${headerMaxHeight}px;
      overflow: hidden;
    }

    .page-number {
      font-size: 12px;
      color: #64748B;
      margin-bottom: 6px;
    }

    .page-category {
      display: inline-block;
      color: white;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .page-category.category-common {
      background: #64748B;
    }

    .page-category.category-poc {
      background: #2563EB;
    }

    .page-category.category-mvp {
      background: #10B981;
    }

    .page-category.category-other {
      background: #8B5CF6;
    }

    .page-title {
      font-size: 20px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 6px;
    }

    .page-description {
      font-size: ${descriptionFontSize}px;
      line-height: ${descriptionLineHeight};
      color: #475569;
      font-weight: ${descriptionFontWeight};
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: ${descriptionMaxLines};
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .image-container {
      flex: 1;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      min-height: 0;
      max-height: calc(100vh - ${imageMaxHeight}px);
      padding-bottom: 20px;
      overflow: hidden;
    }

    .page-omitted .image-container {
      max-height: calc(100vh - ${imageMaxHeight}px);
      overflow: hidden;
    }

    .image-container img {
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), 0 6px 12px rgba(0, 0, 0, 0.1);
    }

    /* 省略表示用のスタイル */
    .image-omitted-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
      max-height: 100%;
      width: 700px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), 0 6px 12px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
    }

    .image-part-top {
      height: 280px;
      overflow: hidden;
      border: 1px solid #E2E8F0;
      border-bottom: none;
      border-radius: 8px 8px 0 0;
      flex-shrink: 0;
    }

    .image-part-top img {
      display: block;
      border: none;
      border-radius: 0;
      box-shadow: none;
    }

    .omission-mark {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 15px;
      background: linear-gradient(to bottom,
                  rgba(255,255,255,0.9) 0%,
                  rgba(245,247,250,0.95) 50%,
                  rgba(255,255,255,0.9) 100%);
      border-left: 1px solid #E2E8F0;
      border-right: 1px solid #E2E8F0;
      width: 100%;
      box-sizing: border-box;
      flex-shrink: 0;
    }

    .omission-text {
      font-size: 14px;
      color: #64748B;
      font-weight: 500;
      margin-top: 8px;
    }

    .image-part-bottom {
      height: 280px;
      overflow: hidden;
      border-left: 1px solid #E2E8F0;
      border-right: 1px solid #E2E8F0;
      border-bottom: 1px solid #E2E8F0;
      border-top: none;
      border-radius: 0 0 8px 8px;
      flex-shrink: 0;
      background: white;
    }

    .image-part-bottom img {
      display: block;
      border: none;
      border-radius: 0;
      box-shadow: none;
    }

    @media print {
      .page {
        page-break-after: always;
      }
    }
  `;
}

export {
  generateAnnotatedHTML,
  generatePDFHTML,
};
