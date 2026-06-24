import * as fs from 'fs';
import * as path from 'path';
import { ERROR_CATALOG } from '../../src/constants/errorCodes';

function flatten(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(result, flatten(v, key));
    } else {
      result[key] = String(v);
    }
  }
  return result;
}

function loadClientMessages(locale: string): Set<string> {
  const filePath = path.resolve(
    __dirname,
    '../../../randevubu.client/src/messages',
    `${locale}.json`
  );
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  return new Set(Object.keys(flatten(data)));
}

const catalogErrorKeys = Object.entries(ERROR_CATALOG)
  .filter(([, entry]) => entry.key.startsWith('errors.'))
  .map(([code, entry]) => ({ code, key: entry.key }));

describe('ERROR_CATALOG ↔ client i18n coverage', () => {
  const trKeys = loadClientMessages('tr');
  const enKeys = loadClientMessages('en');

  test('every catalog error key exists in client tr.json', () => {
    const missing = catalogErrorKeys.filter(({ key }) => !trKeys.has(key));
    if (missing.length > 0) {
      const list = missing.map(m => `  ${m.code} → ${m.key}`).join('\n');
      fail(`${missing.length} catalog keys missing from tr.json:\n${list}`);
    }
  });

  test('every catalog error key exists in client en.json', () => {
    const missing = catalogErrorKeys.filter(({ key }) => !enKeys.has(key));
    if (missing.length > 0) {
      const list = missing.map(m => `  ${m.code} → ${m.key}`).join('\n');
      fail(`${missing.length} catalog keys missing from en.json:\n${list}`);
    }
  });
});
