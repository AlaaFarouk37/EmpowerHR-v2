const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const languageContextPath = path.join(frontendRoot, 'src', 'context', 'LanguageContext.jsx');
const reportPath = path.join(repoRoot, 'ROUTE_LANGUAGE_QA_REPORT.txt');

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractBlock(text, blockName) {
  const startToken = `  ${blockName}: {`;
  const start = text.indexOf(startToken);
  if (start === -1) {
    throw new Error(`Cannot find ${blockName} translation block`);
  }

  const tail = text.slice(start + startToken.length);
  const endIndex = tail.indexOf('\n  },');
  if (endIndex === -1) {
    throw new Error(`Cannot find end of ${blockName} translation block`);
  }

  return tail.slice(0, endIndex);
}

function extractKeysFromBlock(blockText) {
  const keys = new Set();
  const keyRegex = /'([^']+)'\s*:/g;
  let match;
  while ((match = keyRegex.exec(blockText)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

function resolveRouteFiles() {
  if (!fs.existsSync(reportPath)) {
    throw new Error('ROUTE_LANGUAGE_QA_REPORT.txt is missing, cannot resolve audit routes');
  }

  const report = readFile(reportPath);
  const routes = [...report.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
  return Array.from(new Set(routes));
}

function collectTKeys(fileText) {
  const keys = new Set();
  const directCall = /\bt\(\s*(['"`])([^'"`]+)\1\s*\)/g;
  let match;
  while ((match = directCall.exec(fileText)) !== null) {
    const key = match[2];
    if (!key.includes('${')) {
      keys.add(key);
    }
  }
  return keys;
}

function run() {
  const contextText = readFile(languageContextPath);
  const arKeys = extractKeysFromBlock(extractBlock(contextText, 'ar'));
  const routeFiles = resolveRouteFiles();

  let output = '';
  let totalMissing = 0;

  for (const routeFile of routeFiles) {
    const absolute = path.join(frontendRoot, routeFile);
    const missing = [];

    if (fs.existsSync(absolute)) {
      const fileText = readFile(absolute);
      const usedKeys = collectTKeys(fileText);
      for (const key of usedKeys) {
        if (!arKeys.has(key)) {
          missing.push(key);
        }
      }
      missing.sort((a, b) => a.localeCompare(b));
    }

    totalMissing += missing.length;
    output += `[${routeFile}]\n`;
    output += `missing_count=${missing.length}\n`;
    for (const key of missing) {
      output += `- ${key}\n`;
    }
    output += '\n';
  }

  fs.writeFileSync(reportPath, output, 'utf8');

  if (totalMissing > 0) {
    console.error(`Language audit failed: ${totalMissing} missing translation keys.`);
    process.exit(1);
  }

  console.log('Language audit passed: no missing route translation keys.');
}

run();
