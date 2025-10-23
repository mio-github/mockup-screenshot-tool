import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';
import ExcelJS from 'exceljs';
import sharp from 'sharp';
import { imageSize } from 'image-size';

const DEFAULT_VIEWPORT = { width: 1440, height: 900 };
const MAX_SHEET_NAME_LENGTH = 31;
const MAX_IMAGE_WIDTH = 720;
const IMAGE_ROW_HEIGHT_FACTOR = 18; // approx points per row for scaling calc

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function slugify(value) {
  if (!value) return 'spec';
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'spec';
}

function sanitizeSheetName(value) {
  const fallback = 'Screen';
  const sanitized = (value || fallback)
    .replace(/[\\/?*[\]:]/g, '_')
    .slice(0, MAX_SHEET_NAME_LENGTH);
  return sanitized.length === 0 ? fallback : sanitized;
}

function ensureUniqueName(base, usedSet) {
  let candidate = base;
  let index = 1;
  while (usedSet.has(candidate)) {
    const suffix = `_${index}`;
    candidate = `${base.slice(0, Math.max(0, MAX_SHEET_NAME_LENGTH - suffix.length))}${suffix}`;
    index += 1;
  }
  usedSet.add(candidate);
  return candidate;
}

function buildImageOverlaySvg(width, height, annotations) {
  const circles = annotations
    .map(({ number, center }) => {
      const radius = 16;
      const textY = center.y + 5;
      return `
        <g>
          <circle cx="${center.x}" cy="${center.y}" r="${radius}" fill="rgba(231,76,60,0.82)" stroke="#c0392b" stroke-width="2"/>
          <text x="${center.x}" y="${textY}" text-anchor="middle" font-family="Arial" font-size="18" fill="#ffffff" font-weight="bold">${number}</text>
        </g>
      `;
    })
    .join('\n');

  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${circles}
    </svg>`
  );
}

async function createAnnotatedScreenshot(basePath, annotations, outputPath) {
  if (!fs.existsSync(basePath)) {
    throw new Error(`スクリーンショットが見つかりません: ${basePath}`);
  }

  const { width, height } = imageSize(basePath);
  const overlay = buildImageOverlaySvg(width, height, annotations);

  await sharp(basePath)
    .composite([{ input: overlay, blend: 'over' }])
    .toFile(outputPath);

  return { width, height, annotatedPath: outputPath };
}

function buildValidationSummary(meta) {
  const details = [];
  if (meta.required) details.push('必須');
  if (meta.type && meta.type !== 'text') details.push(`タイプ: ${meta.type}`);
  if (meta.pattern) details.push(`パターン: ${meta.pattern}`);
  if (meta.minlength) details.push(`最小文字数: ${meta.minlength}`);
  if (meta.maxlength) details.push(`最大文字数: ${meta.maxlength}`);
  if (meta.min) details.push(`最小値: ${meta.min}`);
  if (meta.max) details.push(`最大値: ${meta.max}`);
  if (meta.step) details.push(`刻み: ${meta.step}`);
  if (meta.autocomplete) details.push(`autocomplete=${meta.autocomplete}`);
  if (meta.datasetRules?.length) details.push(...meta.datasetRules);
  return details.join('\n');
}

function pickActionDescriptions(elementSelector, actionMap) {
  if (!elementSelector) return [];

  const matches = [];
  for (const [selector, descriptions] of Object.entries(actionMap)) {
    if (!descriptions || descriptions.length === 0) continue;
    if (selector === elementSelector || elementSelector.includes(selector) || selector.includes(elementSelector)) {
      matches.push(...descriptions);
    }
  }
  return [...new Set(matches)];
}

function formatNotes(baseNotes, actionMatches) {
  const notes = [];
  if (baseNotes) notes.push(baseNotes);
  if (actionMatches.length > 0) {
    notes.push(`設定アクション: ${actionMatches.join(' / ')}`);
  }
  return notes.join('\n');
}

async function executeActions(page, actions = []) {
  if (!actions || actions.length === 0) return;

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'click':
          if (action.selector) await page.click(action.selector);
          break;
        case 'type':
          if (action.selector && action.value !== undefined) {
            await page.fill(action.selector, String(action.value));
          }
          break;
        case 'scroll':
          if (action.x !== undefined && action.y !== undefined) {
            await page.evaluate(({ x, y }) => window.scrollTo(x, y), { x: action.x, y: action.y });
          }
          break;
        case 'hover':
          if (action.selector) await page.hover(action.selector);
          break;
        case 'select':
          if (action.selector && action.value !== undefined) {
            await page.selectOption(action.selector, action.value);
          }
          break;
        case 'wait':
          await page.waitForTimeout(action.duration || 1000);
          break;
        case 'waitForSelector':
          if (action.selector) {
            await page.waitForSelector(action.selector, { timeout: action.timeout || 5000 });
          }
          break;
        case 'evaluate':
          if (action.code) await page.evaluate(action.code);
          break;
        default:
          break;
      }

      if (action.waitAfter) {
        await page.waitForTimeout(action.waitAfter);
      } else {
        await page.waitForTimeout(200);
      }
    } catch (error) {
      if (action.required) {
        throw error;
      }
    }
  }
}

async function waitByStrategy(page, strategy = 'basic') {
  switch (strategy) {
    case 'graph':
      try {
        await page.waitForSelector('svg, canvas', { timeout: 10000 });
        await page.waitForTimeout(3000);
      } catch {
        await page.waitForTimeout(5000);
      }
      break;
    case 'table':
      try {
        await page.waitForSelector('table, [role="table"]', { timeout: 5000 });
        await page.waitForTimeout(2000);
      } catch {
        await page.waitForTimeout(3000);
      }
      break;
    case 'live':
      await page.waitForTimeout(4000);
      break;
    case 'video':
      await page.waitForTimeout(3000);
      break;
    case 'basic':
    default:
      await page.waitForTimeout(2000);
      break;
  }
}

async function analyseDom(page, actionMap) {
  return page.evaluate((actionSelectors) => {
    function uniqueSelector(element) {
      if (!element) return '';
      if (element.id) return `#${element.id}`;

      const parts = [];
      let current = element;
      let depth = 0;

      while (current && current.nodeType === Node.ELEMENT_NODE && depth < 5) {
        let selector = current.tagName.toLowerCase();

        if (current.classList.length > 0) {
          selector += '.' + Array.from(current.classList)
            .slice(0, 2)
            .map((cls) => cls.replace(/\s+/g, ''))
            .join('.');
        }

        if (!current.id) {
          const siblings = Array.from(current.parentElement ? current.parentElement.children : []);
          const sameTagSiblings = siblings.filter((sibling) => sibling.tagName === current.tagName);
          if (sameTagSiblings.length > 1) {
            const index = sameTagSiblings.indexOf(current) + 1;
            selector += `:nth-of-type(${index})`;
          }
        }

        parts.unshift(selector);

        if (current.parentElement && current.parentElement.tagName !== 'HTML') {
          current = current.parentElement;
          depth += 1;
        } else {
          break;
        }
      }

      return parts.join(' > ');
    }

    function collectButtons() {
      const selectors = [
        'button',
        '[role="button"]',
        'input[type="button"]',
        'input[type="submit"]',
        'input[type="reset"]',
      ];
      const elements = Array.from(document.querySelectorAll(selectors.join(',')));

      return elements.map((el) => {
        const rect = el.getBoundingClientRect();
        const text = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim();
        const datasetNotes = Object.entries(el.dataset || {}).map(([key, value]) => `data-${key}=${value}`);

        return {
          selector: uniqueSelector(el),
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role') || '',
          text,
          ariaLabel: el.getAttribute('aria-label') || '',
          typeAttr: el.getAttribute('type') || '',
          href: el.getAttribute('href') || '',
          formAction: el.getAttribute('formaction') || '',
          datasetNotes,
          boundingBox: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          disabled: el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true',
        };
      });
    }

    function collectLinks(skipSelectors) {
      const skip = new Set(skipSelectors);
      const elements = Array.from(document.querySelectorAll('a[href]')).filter(
        (el) => !skip.has(el)
      );

      return elements.map((el) => {
        const rect = el.getBoundingClientRect();
        const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
        return {
          selector: uniqueSelector(el),
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role') || '',
          text,
          ariaLabel: el.getAttribute('aria-label') || '',
          href: el.getAttribute('href') || '',
          target: el.getAttribute('target') || '',
          datasetNotes: Object.entries(el.dataset || {}).map(([key, value]) => `data-${key}=${value}`),
          boundingBox: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        };
      });
    }

    function findLabel(el) {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel.trim();

      if (el.id) {
        const labelFor = document.querySelector(`label[for="${el.id}"]`);
        if (labelFor) {
          return labelFor.innerText.trim();
        }
      }

      const wrappingLabel = el.closest('label');
      if (wrappingLabel) {
        return wrappingLabel.innerText.trim();
      }

      const ariaLabelledBy = el.getAttribute('aria-labelledby');
      if (ariaLabelledBy) {
        const labelled = ariaLabelledBy
          .split(' ')
          .map((id) => document.getElementById(id))
          .filter(Boolean)
          .map((node) => node.innerText.trim());
        if (labelled.length > 0) {
          return labelled.join(' / ');
        }
      }

      return el.getAttribute('placeholder') || '';
    }

    function collectInputs() {
      const selectors = ['input', 'textarea', 'select'];
      const elements = Array.from(document.querySelectorAll(selectors.join(',')));

      return elements.map((el) => {
        const rect = el.getBoundingClientRect();

        const options =
          el.tagName.toLowerCase() === 'select'
            ? Array.from(el.options || []).map((opt) => ({
                text: opt.textContent?.trim() || '',
                value: opt.value,
                selected: opt.selected,
              }))
            : [];

        const datasetRules = Object.entries(el.dataset || {})
          .filter(([key]) => key.toLowerCase().includes('validation') || key.toLowerCase().includes('rule'))
          .map(([key, value]) => `data-${key}=${value}`);

        return {
          selector: uniqueSelector(el),
          tag: el.tagName.toLowerCase(),
          typeAttr: el.getAttribute('type') || '',
          name: el.getAttribute('name') || '',
          id: el.id || '',
          label: findLabel(el),
          placeholder: el.getAttribute('placeholder') || '',
          value: el.value || '',
          required: el.hasAttribute('required') || el.getAttribute('aria-required') === 'true',
          pattern: el.getAttribute('pattern') || '',
          minlength: el.getAttribute('minlength') || '',
          maxlength: el.getAttribute('maxlength') || '',
          min: el.getAttribute('min') || '',
          max: el.getAttribute('max') || '',
          step: el.getAttribute('step') || '',
          autocomplete: el.getAttribute('autocomplete') || '',
          datasetRules,
          ariaDescribedBy: el.getAttribute('aria-describedby') || '',
          ariaDescription: el.getAttribute('aria-description') || '',
          options,
          boundingBox: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        };
      });
    }

    const buttonElements = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]'));
    const linkElements = collectLinks(new Set(buttonElements));

    const headingNodes = Array.from(document.querySelectorAll('main h1, main h2, main h3, header h1, header h2'));
    const headings = headingNodes
      .map((heading) => heading.innerText.trim())
      .filter((text) => !!text)
      .slice(0, 10);

    const metaDescription =
      document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

    const breadcrumbTexts = Array.from(document.querySelectorAll('[aria-label*="breadcrumb"] li, nav.breadcrumb li, .breadcrumb li'))
      .map((el) => el.innerText.trim())
      .filter(Boolean);

    return {
      title: document.title || '',
      url: window.location.href,
      headings,
      metaDescription,
      breadcrumbs: breadcrumbTexts,
      buttons: collectButtons(),
      links: linkElements,
      inputs: collectInputs(),
      actionSelectors,
    };
  }, actionMap);
}

function applyHeaderStyle(worksheet) {
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  headerRow.height = 18;
}

function setWrapAlignment(row, columnKeys) {
  columnKeys.forEach((key) => {
    const cell = row.getCell(key);
    cell.alignment = { ...cell.alignment, wrapText: true, vertical: 'top' };
  });
}

export async function generateSpecSheet(config, options = {}) {
  const specOptions = config.specSheet || {};
  const outputDir =
    options.outputDir ||
    specOptions.outputDir ||
    path.join(config.outputDir || process.cwd(), 'specifications');
  ensureDir(outputDir);

  const screenshotDir =
    options.screenshotDir ||
    specOptions.screenshotDir ||
    path.join(outputDir, 'screens');
  ensureDir(screenshotDir);

  const fileName =
    options.fileName ||
    specOptions.fileName ||
    `${slugify(config.projectName)}_screen_spec.xlsx`;
  const outputPath = path.isAbsolute(fileName)
    ? fileName
    : path.join(outputDir, fileName);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'mio_sc_capture';
  workbook.created = new Date();

  const usedSheetNames = new Set();
  const usedTableNames = new Set();

  const screenMetaMap = new Map();
  if (Array.isArray(config.screens)) {
    for (const screen of config.screens) {
      if (screen.filename) {
        screenMetaMap.set(screen.filename, screen);
      }
    }
  }

  const browser = await chromium.launch({ headless: true });

  try {
    for (const pageConfig of config.pages) {
      const actionMap = {};
      if (Array.isArray(pageConfig.actions)) {
        for (const action of pageConfig.actions) {
          if (!action.selector) continue;
          if (!actionMap[action.selector]) actionMap[action.selector] = [];
          const desc = action.description || `${action.type}${action.value ? ` (${action.value})` : ''}`;
          actionMap[action.selector].push(desc.trim());
        }
      }

      const context = await browser.newContext({
        viewport: pageConfig.viewport || config.viewport || DEFAULT_VIEWPORT,
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();

      const targetUrl = new URL(pageConfig.path || '/', config.baseUrl).toString();
      await page.goto(targetUrl, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(1500);

      try {
        await page.waitForLoadState('networkidle', { timeout: 10000 });
      } catch {
        // noop
      }

      await waitByStrategy(page, pageConfig.waitStrategy || 'basic');
      await executeActions(page, pageConfig.actions || []);
      await page.waitForTimeout(1000);

      const analysis = await analyseDom(page, actionMap);

      const screenshotPath = path.join(screenshotDir, `${pageConfig.name}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        animations: 'disabled',
      });

      const screenMeta = screenMetaMap.get(pageConfig.name) || {};

      let annotationCounter = 1;
      const annotatedEntries = [];

      const pushAnnotatedEntry = (entry) => {
        const centerX = Math.round(entry.boundingBox.x + entry.boundingBox.width / 2);
        const centerY = Math.round(entry.boundingBox.y + entry.boundingBox.height / 2);

        const actionDescriptions = pickActionDescriptions(entry.selector, actionMap);
        const validation = entry.validationDetails ? buildValidationSummary(entry.validationDetails) : '';
        const notes = formatNotes(entry.notes || '', actionDescriptions);

        annotatedEntries.push({
          number: annotationCounter,
          elementType: entry.elementType,
          label: entry.label,
          selector: entry.selector,
          action: entry.action,
          validation,
          notes,
          center: { x: centerX, y: centerY },
          boundingBox: entry.boundingBox,
        });

        annotationCounter += 1;
      };

      for (const button of analysis.buttons) {
        const attributes = [
          button.tag,
          button.role && `role=${button.role}`,
          button.typeAttr && `type=${button.typeAttr}`,
          button.formAction && `formaction=${button.formAction}`,
          button.disabled ? 'disabled' : '',
        ]
          .filter(Boolean)
          .join(' / ');

        pushAnnotatedEntry({
          elementType: 'ボタン',
          label: button.text || button.ariaLabel || '(テキストなし)',
          selector: button.selector,
          action: button.href || button.formAction || '',
          notes: attributes,
          boundingBox: button.boundingBox,
        });
      }

      for (const link of analysis.links) {
        const attributes = [
          link.tag,
          link.role && `role=${link.role}`,
          link.target && `target=${link.target}`,
        ]
          .filter(Boolean)
          .join(' / ');

        pushAnnotatedEntry({
          elementType: 'リンク',
          label: link.text || link.ariaLabel || link.href || '(リンク)',
          selector: link.selector,
          action: link.href,
          notes: attributes,
          boundingBox: link.boundingBox,
        });
      }

      for (const field of analysis.inputs) {
        const notesItems = [];
        if (field.ariaDescribedBy) notesItems.push(`aria-describedby=${field.ariaDescribedBy}`);
        if (field.ariaDescription) notesItems.push(`aria-description=${field.ariaDescription}`);
        if (field.options && field.options.length > 0) {
          const optionSummary = field.options
            .map((option) => `${option.selected ? '★ ' : ''}${option.text || option.value}`)
            .join(' / ');
          notesItems.push(`選択肢: ${optionSummary}`);
        }

        pushAnnotatedEntry({
          elementType: '入力項目',
          label: field.label || '(ラベル未検出)',
          selector: field.selector,
          action: [field.placeholder, field.value].filter(Boolean).join('\n'),
          notes: notesItems.join('\n'),
          boundingBox: field.boundingBox,
          validationDetails: field,
        });
      }

      const annotationOverlayData = annotatedEntries.map((entry) => ({
        number: entry.number,
        center: entry.center,
      }));

      const annotatedScreenshotPath = path.join(
        screenshotDir,
        `${pageConfig.name}_annotated.png`
      );

      const { width: originalWidth, height: originalHeight } = await createAnnotatedScreenshot(
        screenshotPath,
        annotationOverlayData,
        annotatedScreenshotPath
      );

      const imageId = workbook.addImage({
        filename: annotatedScreenshotPath,
        extension: 'png',
      });

      const safeSheetBase = sanitizeSheetName(pageConfig.name);
      const sheetName = ensureUniqueName(safeSheetBase, usedSheetNames);
      const worksheet = workbook.addWorksheet(sheetName);

      worksheet.getColumn(1).width = 14;
      worksheet.getColumn(2).width = 80;
      worksheet.getColumn(3).width = 18;
      worksheet.getColumn(4).width = 18;
      worksheet.getColumn(5).width = 18;
      worksheet.getColumn(6).width = 18;

      worksheet.getCell('A1').value = '画面ID';
      worksheet.getCell('B1').value = pageConfig.name;
      worksheet.getCell('A2').value = '画面タイトル';
      worksheet.getCell('B2').value = analysis.title || screenMeta.title || '';
      worksheet.getCell('A3').value = 'URL / パス';
      worksheet.getCell('B3').value = pageConfig.path;
      worksheet.getCell('A4').value = '主な見出し・機能';
      worksheet.getCell('B4').value = analysis.headings.join('\n') || '(見出しなし)';
      worksheet.getCell('A5').value = 'カテゴリ';
      worksheet.getCell('B5').value = screenMeta.category || '(未設定)';
      worksheet.getCell('A6').value = '説明';
      worksheet.getCell('B6').value =
        screenMeta.description || analysis.metaDescription || '(記述なし)';

      setWrapAlignment(worksheet.getRow(4), [2]);
      setWrapAlignment(worksheet.getRow(6), [2]);

      const scale = Math.min(1, MAX_IMAGE_WIDTH / originalWidth);
      const imageWidth = Math.round(originalWidth * scale);
      const imageHeight = Math.round(originalHeight * scale);

      const imageTopRow = 8;
      worksheet.addImage(imageId, {
        tl: { col: 0, row: imageTopRow },
        ext: { width: imageWidth, height: imageHeight },
      });

      const approximateRows = Math.ceil(imageHeight / IMAGE_ROW_HEIGHT_FACTOR);
      const tableStartRow = imageTopRow + approximateRows + 2;

      const tableNameBase = `Spec_${sheetName.replace(/[^A-Za-z0-9]/g, '') || 'Sheet'}`;
      const tableName = ensureUniqueName(tableNameBase, usedTableNames);

      const tableRows = annotatedEntries.map((entry) => [
        entry.number,
        entry.elementType,
        entry.label,
        entry.selector,
        entry.action,
        [entry.validation, entry.notes].filter(Boolean).join('\n'),
      ]);

      worksheet.addTable({
        name: tableName,
        ref: `A${tableStartRow}`,
        headerRow: true,
        totalsRow: false,
        style: {
          theme: 'TableStyleMedium9',
          showRowStripes: true,
        },
        columns: [
          { name: '番号' },
          { name: '要素種別' },
          { name: 'UIテキスト / ラベル' },
          { name: 'CSSセレクタ' },
          { name: '動作 / 初期値' },
          { name: 'バリデーション / 備考' },
        ],
        rows: tableRows,
      });

      for (let i = 0; i < tableRows.length; i += 1) {
        const row = worksheet.getRow(tableStartRow + 1 + i);
        setWrapAlignment(row, [3, 4, 5, 6]);
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  await workbook.xlsx.writeFile(outputPath);

  return {
    outputPath,
    screenshotDir,
  };
}
