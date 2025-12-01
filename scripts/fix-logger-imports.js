const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');
const loggerModule = path.join(srcDir, 'utils', 'Logger', 'logger.ts');

const loggerImportRegex = /^\s*import\s+logger\s+from\s+['"][^'"]+['"];?\s*\r?\n?/gm;

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

const insertImport = (content, filePath) => {
  const relativePath = path
    .relative(path.dirname(filePath), loggerModule)
    .replace(/\\/g, '/')
    .replace(/\.ts$/, '');
  const importPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
  const importLine = `import logger from "${importPath}";`;

  const lines = content.split(/\r?\n/);
  let index = 0;
  let lastImportLine = -1;

  while (index < lines.length) {
    const line = lines[index];
    if (/^\s*import\b/.test(line)) {
      let statementEnd = index;
      while (statementEnd < lines.length && !/;\s*$/.test(lines[statementEnd])) {
        statementEnd += 1;
      }
      lastImportLine = statementEnd;
      index = statementEnd + 1;
      continue;
    }

    if (line.trim() === '' || line.trim().startsWith('//')) {
      index += 1;
      continue;
    }

    break;
  }

  if (lastImportLine >= 0) {
    lines.splice(lastImportLine + 1, 0, importLine);
  } else {
    lines.unshift(importLine);
  }

  return lines.join('\n');
};

const processFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');

  if (!/logger\./.test(content)) {
    return false;
  }

  const previousContent = content;
  content = content.replace(loggerImportRegex, '');
  content = insertImport(content, filePath);
  content = content.replace(/import\s+\{\s*\r?\n\s*\r?\n/g, 'import {\n');

  if (content !== previousContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
};

const files = getTsFiles(srcDir);
const updatedFiles = files.filter((file) => processFile(file));

console.log(`Normalized logger imports in ${updatedFiles.length} files.`);

