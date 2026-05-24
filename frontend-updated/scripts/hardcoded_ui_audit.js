const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const scanRoots = [
  path.join(root, 'src', 'pages'),
  path.join(root, 'src', 'components'),
];

const ALLOWED_TAGS = new Set(['style', 'script']);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      walk(full, files);
    } else if (item.isFile() && full.endsWith('.jsx')) {
      files.push(full);
    }
  }
  return files;
}

function relative(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

function collectFindings(filePath, text) {
  const findings = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const toastLiteral = line.match(/\btoast\(\s*(['"])\s*[^'"`{][^'"]*\1\s*(,|\))/);
    if (toastLiteral && !line.includes('toast(t(')) {
      findings.push({ type: 'toast-literal', line: i + 1, value: line.trim() });
    }

    const jsxTextRegex = />\s*([A-Za-z][^<{]{2,})\s*</g;
    let match;
    while ((match = jsxTextRegex.exec(line)) !== null) {
      const textValue = match[1].trim();
      if (!textValue) continue;
      if (textValue.includes('{') || textValue.includes('}')) continue;
      if (/^[A-Z0-9 _\-:.]+$/.test(textValue) && textValue.length < 4) continue;
      if (/^https?:\/\//i.test(textValue)) continue;
      if (/^\d+[\d\s.,:%-]*$/.test(textValue)) continue;
      if (line.includes('t(') || line.includes('aria-') || line.includes('data-')) continue;
      if ([...ALLOWED_TAGS].some((tag) => line.includes(`<${tag}`) || line.includes(`</${tag}`))) continue;

      findings.push({ type: 'jsx-literal', line: i + 1, value: textValue });
    }
  }

  return findings;
}

function run() {
  const strict = process.argv.includes('--strict');
  const files = scanRoots.flatMap((dir) => walk(dir));

  const findings = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const finding of collectFindings(file, text)) {
      findings.push({ file: relative(file), ...finding });
    }
  }

  const toastFindings = findings.filter((f) => f.type === 'toast-literal');
  const jsxFindings = findings.filter((f) => f.type === 'jsx-literal');

  if (toastFindings.length > 0 || (strict && jsxFindings.length > 0)) {
    const blocking = [...toastFindings, ...(strict ? jsxFindings : [])];
    console.error('Hardcoded UI audit failed. Blocking findings:');
    for (const f of blocking.slice(0, 120)) {
      console.error(`- ${f.file}:${f.line} [${f.type}] ${f.value}`);
    }
    if (blocking.length > 120) {
      console.error(`... and ${blocking.length - 120} more findings`);
    }
    process.exit(1);
  }

  console.log(`Hardcoded UI audit passed for blocking rules. JSX informational findings: ${jsxFindings.length}`);
}

run();
