import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const externallySetKeys = new Set(Object.keys(process.env));

function loadDotEnvFile(fileName: string, overrideFromFile = false) {
  const filePath = join(process.cwd(), fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key) {
      continue;
    }

    const isExternalKey = externallySetKeys.has(key);
    if (isExternalKey) {
      continue;
    }

    if (!overrideFromFile && process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadDotEnvFile('.env');
loadDotEnvFile('.env.local', true);

function parseBranch(urlString: string): string {
  try {
    const url = new URL(urlString);
    return url.searchParams.get('branch') ?? '(not-set)';
  } catch {
    return '(invalid-url)';
  }
}

function parseDbInfo(urlString: string) {
  try {
    const url = new URL(urlString);
    return {
      host: url.hostname,
      database: url.pathname.replace(/^\//, '') || '(unknown)',
      branch: parseBranch(urlString),
    };
  } catch {
    return {
      host: '(invalid-url)',
      database: '(invalid-url)',
      branch: '(invalid-url)',
    };
  }
}

const dbUrl = process.env.POSTGRES_URL;

if (!dbUrl) {
  console.error('ERROR: POSTGRES_URL is not set.');
  process.exit(1);
}

const info = parseDbInfo(dbUrl);

console.log('DB preflight:');
console.log(`- host: ${info.host}`);
console.log(`- database: ${info.database}`);
console.log(`- branch: ${info.branch}`);

const isDevBranch = info.branch === 'dev';

if (!isDevBranch && process.env.ALLOW_NON_DEV_PUSH !== 'true') {
  console.error('');
  console.error('BLOCKED: Non-dev branch detected.');
  console.error("Set ALLOW_NON_DEV_PUSH='true' only when you intentionally push non-dev schema changes.");
  process.exit(1);
}

console.log('Preflight passed.');
