/**
 * 設定ファイル読み込みモジュール
 */

const fs = require('fs');
const path = require('path');

/**
 * 設定ファイルを読み込む
 * @param {string} configPath - 設定ファイルのパス（省略時はカレントディレクトリから探索）
 * @returns {object} - 設定オブジェクト
 */
function loadConfig(configPath = null) {
  let finalConfigPath = configPath;

  // 設定ファイルのパスが指定されていない場合、カレントディレクトリから探索
  if (!finalConfigPath) {
    const cwd = process.cwd();
    const candidates = [
      path.join(cwd, 'mockup-config.json'),
      path.join(cwd, 'config.json'),
      path.join(cwd, 'mockup-screenshot.config.json'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        finalConfigPath = candidate;
        break;
      }
    }

    if (!finalConfigPath) {
      throw new Error(
        '設定ファイルが見つかりません。' +
        'カレントディレクトリに mockup-config.json を作成するか、' +
        '--config オプションでパスを指定してください。'
      );
    }
  }

  // ファイル存在確認
  if (!fs.existsSync(finalConfigPath)) {
    throw new Error(`設定ファイルが見つかりません: ${finalConfigPath}`);
  }

  console.log(`[*] 設定ファイル読み込み: ${finalConfigPath}`);

  // JSON読み込み
  try {
    const configData = fs.readFileSync(finalConfigPath, 'utf-8');
    const config = JSON.parse(configData);

    // 必須フィールドの検証
    validateConfig(config);

    // 相対パスを絶対パスに変換
    const configDir = path.dirname(finalConfigPath);
    config.outputDir = resolvePathFromConfig(config.outputDir, configDir);
    config.screenshotsDir = resolvePathFromConfig(config.screenshotsDir, configDir);
    config.annotatedDir = resolvePathFromConfig(config.annotatedDir, configDir);

    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`設定ファイルのJSON形式が不正です: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 設定ファイルのバリデーション
 * @param {object} config - 設定オブジェクト
 */
function validateConfig(config) {
  const requiredFields = [
    'projectName',
    'baseUrl',
    'outputDir',
    'pages',
    'annotations',
  ];

  for (const field of requiredFields) {
    if (!(field in config)) {
      throw new Error(`設定ファイルに必須フィールド "${field}" がありません`);
    }
  }

  if (!Array.isArray(config.pages) || config.pages.length === 0) {
    throw new Error('pages は空でない配列である必要があります');
  }

  if (typeof config.annotations !== 'object') {
    throw new Error('annotations はオブジェクトである必要があります');
  }
}

/**
 * パスを解決する（相対パスの場合は設定ファイルのディレクトリからの相対パス）
 * @param {string} pathStr - パス文字列
 * @param {string} baseDir - 基準ディレクトリ
 * @returns {string} - 解決されたパス
 */
function resolvePathFromConfig(pathStr, baseDir) {
  if (path.isAbsolute(pathStr)) {
    return pathStr;
  }
  return path.resolve(baseDir, pathStr);
}

module.exports = {
  loadConfig,
  validateConfig,
};
