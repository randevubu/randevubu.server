const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');
const loggerModule = path.join(srcDir, 'utils', 'Logger', 'logger.ts');

const toPosix = (p) => p.replace(/\\/g, '/');

const replacements = [
  { regex: /console\.error/g, replacement: 'logger.error' },
  { regex: /console\.warn/g, replacement: 'logger.warn' },
  { regex: /console\.info/g, replacement: 'logger.info' },
  { regex: /console\.debug/g, replacement: 'logger.debug' },
  { regex: /console\.log/g, replacement: 'logger.info' },
];

const getTsFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
};

const ensureLoggerImport = (content, filePath) => {
  if (/import\s+logger\s+from\s+['"][^'"]+['"]/.test(content)) {
    return content;
  }

  const relativePath = path.relative(path.dirname(filePath), loggerModule).replace(/\\/g, '/').replace(/\.ts$/, '');
  const normalizedPath = relativePath.startsWith('.')
    ? relativePath
    : `./${relativePath}`;
  const importLine = `import logger from "${normalizedPath}";`;

  const lines = content.split(/\r?\n/);
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s*import\s+/.test(lines[i])) {
      lastImportIndex = i;
    } else if (lines[i].trim() !== '' && !lines[i].startsWith('//')) {
      break;
    }
  }

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, importLine);
  } else {
    lines.unshift(importLine);
  }

  return lines.join('\n');
};

const processFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = content;

  for (const { regex, replacement } of replacements) {
    updated = updated.replace(regex, replacement);
  }

  if (updated === content) {
    return false;
  }

  updated = ensureLoggerImport(updated, filePath);
  fs.writeFileSync(filePath, updated, 'utf8');
  return true;
};

const files = getTsFiles(srcDir);
const updatedFiles = files.filter((file) => processFile(file));

console.log(`Updated ${updatedFiles.length} files to use logger instead of console.`);

