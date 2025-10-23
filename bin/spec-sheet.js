#!/usr/bin/env node

/**
 * 画面仕様書（Excel）生成スクリプト
 */

import path from 'path';
import { loadConfig } from '../lib/config-loader.js';
import { generateSpecSheet } from '../lib/spec-sheet-generator.js';

async function main() {
  try {
    const configPathArg = process.argv[2];
    const config = loadConfig(configPathArg);

    console.log('[*] 画面仕様書（Excel）の生成を開始します...');
    const result = await generateSpecSheet(config);

    const relativePath = path.relative(process.cwd(), result.outputPath);
    console.log(`[✓] 画面仕様書を生成しました: ${relativePath}`);
    console.log(`[i] スクリーンショット出力先: ${path.relative(process.cwd(), result.screenshotDir)}`);
  } catch (error) {
    console.error(`[✗] 画面仕様書の生成に失敗しました: ${error.message}`);
    process.exit(1);
  }
}

main();
