#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import FlowDiagramGenerator from '../lib/flow-diagram-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 画面遷移図生成コマンド
 */
async function main() {
  const configPath = process.argv[2] || 'mockup-config.json';

  // 設定ファイルの解決
  const absoluteConfigPath = path.isAbsolute(configPath)
    ? configPath
    : path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(absoluteConfigPath)) {
    console.error(`[✗] 設定ファイルが見つかりません: ${absoluteConfigPath}`);
    process.exit(1);
  }

  console.log(`[*] 設定ファイル読み込み: ${configPath}`);

  let config;
  try {
    const configContent = fs.readFileSync(absoluteConfigPath, 'utf-8');
    config = JSON.parse(configContent);
  } catch (error) {
    console.error(`[✗] 設定ファイルの読み込みに失敗: ${error.message}`);
    process.exit(1);
  }

  // flowDiagram設定の確認
  if (!config.flowDiagram || !config.flowDiagram.enabled) {
    console.log('[!] flowDiagram が有効化されていません');
    console.log('[!] 設定ファイルに以下を追加してください:');
    console.log(`
  "flowDiagram": {
    "enabled": true,
    "fileName": "画面遷移図.svg",
    "layout": "vertical",
    "thumbnailSize": { "width": 320, "height": 180 },
    "nodes": [...],
    "edges": [...]
  }
`);
    process.exit(1);
  }

  // スクリーンショットディレクトリ
  const screenshotsDir = path.isAbsolute(config.screenshotsDir)
    ? config.screenshotsDir
    : path.resolve(path.dirname(absoluteConfigPath), config.screenshotsDir);

  if (!fs.existsSync(screenshotsDir)) {
    console.error(`[✗] スクリーンショットディレクトリが見つかりません: ${screenshotsDir}`);
    process.exit(1);
  }

  // 出力先
  const outputDir = path.isAbsolute(config.outputDir)
    ? config.outputDir
    : path.resolve(path.dirname(absoluteConfigPath), config.outputDir);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fileName = config.flowDiagram.fileName || '画面遷移図.svg';
  const outputPath = path.join(outputDir, fileName);

  try {
    const generator = new FlowDiagramGenerator(config, screenshotsDir);
    await generator.generate(outputPath);

    console.log('[✓] 画面遷移図生成完了！');
    console.log(`[*] 保存先: ${outputPath}`);
  } catch (error) {
    console.error(`[✗] 生成エラー: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`[✗] Fatal error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
