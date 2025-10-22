#!/usr/bin/env node

/**
 * DOM要素の正確な位置を取得するスクリプト
 */

import { chromium } from 'playwright';

async function getElementPositions(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 要素の位置を取得
  const positions = await page.evaluate(() => {
    const results = [];

    // テキストで要素を探して位置を取得（最小の要素を返す）
    const findElementByText = (text) => {
      const elements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, span, div'));
      const matches = elements.filter(el => {
        const textContent = el.textContent?.trim();
        return textContent === text;
      });
      // テキストコンテンツが最小のものを返す（最も内側の要素）
      return matches.sort((a, b) => {
        return a.textContent.length - b.textContent.length;
      })[0];
    };

    // KPIカードを探す
    const kpiTexts = ['総解析数', '今月の解析', '処理中'];
    kpiTexts.forEach(text => {
      const el = findElementByText(text);
      if (el) {
        const rect = el.getBoundingClientRect();
        const parent = el.closest('div.bg-white');
        const parentRect = parent?.getBoundingClientRect();

        results.push({
          text,
          element: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            centerX: Math.round(rect.x + rect.width / 2),
            centerY: Math.round(rect.y + rect.height / 2)
          },
          parent: parentRect ? {
            x: Math.round(parentRect.x),
            y: Math.round(parentRect.y),
            width: Math.round(parentRect.width),
            height: Math.round(parentRect.height),
            centerX: Math.round(parentRect.x + parentRect.width / 2),
            centerY: Math.round(parentRect.y + parentRect.height / 2)
          } : null
        });
      }
    });

    // 最近の解析セクション
    const recentAnalysisHeader = findElementByText('最近の解析');
    if (recentAnalysisHeader) {
      const rect = recentAnalysisHeader.getBoundingClientRect();
      results.push({
        text: '最近の解析',
        element: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          centerX: Math.round(rect.x + rect.width / 2),
          centerY: Math.round(rect.y + rect.height / 2)
        }
      });
    }

    return results;
  });

  await browser.close();
  return positions;
}

// 実行
const url = process.argv[2] || 'http://localhost:3001/dashboard';
console.log(`[*] URL: ${url}`);
console.log('[*] 要素の位置を取得中...\n');

getElementPositions(url).then(positions => {
  positions.forEach(pos => {
    console.log(`[${pos.text}]`);
    console.log(`  要素: (${pos.element.x}, ${pos.element.y}) ${pos.element.width}x${pos.element.height}`);
    console.log(`  中心: (${pos.element.centerX}, ${pos.element.centerY})`);
    if (pos.parent) {
      console.log(`  親カード中心: (${pos.parent.centerX}, ${pos.parent.centerY})`);
    }
    console.log('');
  });
}).catch(err => {
  console.error('[✗] エラー:', err.message);
  process.exit(1);
});
