import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * 画面遷移図（フローダイアグラム）をSVGで生成
 */
class FlowDiagramGenerator {
  constructor(config, screenshotsDir) {
    this.config = config;
    this.screenshotsDir = screenshotsDir;
    this.flowConfig = config.flowDiagram || {};

    // デフォルト設定
    this.thumbnailWidth = this.flowConfig.thumbnailSize?.width || 320;
    this.thumbnailHeight = this.flowConfig.thumbnailSize?.height || 180;
    this.layout = this.flowConfig.layout || 'vertical';
    this.padding = 60;
    this.nodeSpacing = 100;
  }

  /**
   * フローダイアグラムを生成
   */
  async generate(outputPath) {
    const nodes = this.flowConfig.nodes || [];
    const edges = this.flowConfig.edges || [];

    if (nodes.length === 0) {
      throw new Error('flowDiagram.nodes が設定されていません');
    }

    console.log('[*] 画面遷移図生成開始...');
    console.log(`[*] レイアウト: ${this.layout}`);
    console.log(`[*] ノード数: ${nodes.length}, エッジ数: ${edges.length}`);

    // ノード位置を計算
    const positions = this.calculateNodePositions(nodes);

    // スクリーンショットをBase64エンコード
    const nodesWithImages = await this.encodeScreenshots(nodes);

    // SVGを生成
    const svg = this.generateSVG(nodesWithImages, positions, edges);

    // ファイル保存
    fs.writeFileSync(outputPath, svg, 'utf-8');
    console.log(`[✓] 保存完了: ${outputPath}`);

    return outputPath;
  }

  /**
   * ノード位置を計算
   */
  calculateNodePositions(nodes) {
    const positions = [];

    switch (this.layout) {
      case 'horizontal':
        // 横並び
        nodes.forEach((node, index) => {
          positions.push({
            id: node.id,
            x: this.padding + (this.thumbnailWidth + this.nodeSpacing) * index,
            y: this.padding
          });
        });
        break;

      case 'grid':
        // グリッド配置（3列）
        const cols = 3;
        nodes.forEach((node, index) => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          positions.push({
            id: node.id,
            x: this.padding + (this.thumbnailWidth + this.nodeSpacing) * col,
            y: this.padding + (this.thumbnailHeight + this.nodeSpacing) * row
          });
        });
        break;

      case 'vertical':
      default:
        // 縦並び
        nodes.forEach((node, index) => {
          positions.push({
            id: node.id,
            x: this.padding,
            y: this.padding + (this.thumbnailHeight + this.nodeSpacing) * index
          });
        });
        break;
    }

    return positions;
  }

  /**
   * スクリーンショットをBase64エンコード
   */
  async encodeScreenshots(nodes) {
    const results = [];

    for (const node of nodes) {
      const screenshotPath = path.join(
        this.screenshotsDir,
        `${node.screenshot}.png`
      );

      if (!fs.existsSync(screenshotPath)) {
        console.warn(`[!] スクリーンショットが見つかりません: ${screenshotPath}`);
        results.push({ ...node, imageData: null });
        continue;
      }

      try {
        // 画像をリサイズしてBase64エンコード
        const buffer = await sharp(screenshotPath)
          .resize(this.thumbnailWidth, this.thumbnailHeight, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .png()
          .toBuffer();

        const base64 = buffer.toString('base64');
        results.push({
          ...node,
          imageData: `data:image/png;base64,${base64}`
        });

        console.log(`[>>] ${node.screenshot}: エンコード完了`);
      } catch (error) {
        console.error(`[✗] ${node.screenshot}: エンコード失敗 - ${error.message}`);
        results.push({ ...node, imageData: null });
      }
    }

    return results;
  }

  /**
   * SVGを生成
   */
  generateSVG(nodes, positions, edges) {
    // キャンバスサイズを計算
    const maxX = Math.max(...positions.map(p => p.x)) + this.thumbnailWidth + this.padding;
    const maxY = Math.max(...positions.map(p => p.y)) + this.thumbnailHeight + this.padding;

    // ノードIDから位置を検索するマップ
    const posMap = new Map(positions.map(p => [p.id, p]));

    // SVGヘッダー
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${maxX}" height="${maxY}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <style>
      .node-rect { fill: white; stroke: #CBD5E1; stroke-width: 2; rx: 8; }
      .node-rect:hover { stroke: #3B82F6; stroke-width: 3; }
      .node-label { font-family: 'Noto Sans JP', sans-serif; font-size: 16px; font-weight: 600; fill: #0F172A; }
      .node-desc { font-family: 'Noto Sans JP', sans-serif; font-size: 12px; fill: #64748B; }
      .edge-line { stroke: #94A3B8; stroke-width: 2; fill: none; marker-end: url(#arrowhead); }
      .edge-label { font-family: 'Noto Sans JP', sans-serif; font-size: 14px; fill: #475569; }
    </style>
    <!-- 矢印マーカー -->
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#94A3B8" />
    </marker>
  </defs>
`;

    // エッジ（矢印）を描画（ノードより先に描画して背面に）
    edges.forEach(edge => {
      const fromPos = posMap.get(edge.from);
      const toPos = posMap.get(edge.to);

      if (!fromPos || !toPos) {
        console.warn(`[!] エッジのノードが見つかりません: ${edge.from} -> ${edge.to}`);
        return;
      }

      const fromCenterX = fromPos.x + this.thumbnailWidth / 2;
      const fromCenterY = fromPos.y + this.thumbnailHeight / 2;
      const toCenterX = toPos.x + this.thumbnailWidth / 2;
      const toCenterY = toPos.y + this.thumbnailHeight / 2;

      // 矢印の始点と終点を調整（ノードの境界から出る）
      const angle = Math.atan2(toCenterY - fromCenterY, toCenterX - fromCenterX);
      const fromX = fromCenterX + Math.cos(angle) * (this.thumbnailWidth / 2 + 10);
      const fromY = fromCenterY + Math.sin(angle) * (this.thumbnailHeight / 2 + 10);
      const toX = toCenterX - Math.cos(angle) * (this.thumbnailWidth / 2 + 20);
      const toY = toCenterY - Math.sin(angle) * (this.thumbnailHeight / 2 + 20);

      svg += `  <!-- Edge: ${edge.from} -> ${edge.to} -->\n`;
      svg += `  <line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" class="edge-line" />\n`;

      // エッジラベル
      if (edge.label) {
        const labelX = (fromX + toX) / 2;
        const labelY = (fromY + toY) / 2 - 10;
        svg += `  <text x="${labelX}" y="${labelY}" class="edge-label" text-anchor="middle">${this.escapeXml(edge.label)}</text>\n`;
      }
    });

    // ノードを描画
    nodes.forEach((node, index) => {
      const pos = positions[index];
      const rectY = pos.y;
      const imageY = pos.y + 8;
      const labelY = pos.y + this.thumbnailHeight + 30;
      const descY = pos.y + this.thumbnailHeight + 50;

      svg += `  <!-- Node: ${node.id} -->\n`;
      svg += `  <g id="node-${node.id}">\n`;

      // 背景矩形
      svg += `    <rect x="${pos.x}" y="${rectY}" width="${this.thumbnailWidth}" height="${this.thumbnailHeight + 70}" class="node-rect" />\n`;

      // スクリーンショット画像
      if (node.imageData) {
        const imageWidth = this.thumbnailWidth - 16;
        const imageHeight = this.thumbnailHeight - 16;
        svg += `    <image x="${pos.x + 8}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" xlink:href="${node.imageData}" />\n`;
      } else {
        // 画像がない場合はプレースホルダー
        svg += `    <rect x="${pos.x + 8}" y="${imageY}" width="${this.thumbnailWidth - 16}" height="${this.thumbnailHeight - 16}" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="1" rx="4" />\n`;
        svg += `    <text x="${pos.x + this.thumbnailWidth / 2}" y="${pos.y + this.thumbnailHeight / 2}" class="node-desc" text-anchor="middle">画像なし</text>\n`;
      }

      // ラベル
      svg += `    <text x="${pos.x + this.thumbnailWidth / 2}" y="${labelY}" class="node-label" text-anchor="middle">${this.escapeXml(node.label)}</text>\n`;

      // 説明
      if (node.description) {
        svg += `    <text x="${pos.x + this.thumbnailWidth / 2}" y="${descY}" class="node-desc" text-anchor="middle">${this.escapeXml(node.description)}</text>\n`;
      }

      svg += `  </g>\n`;
    });

    svg += `</svg>`;

    return svg;
  }

  /**
   * XML特殊文字をエスケープ
   */
  escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export default FlowDiagramGenerator;
