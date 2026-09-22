import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const rootDir = process.cwd();
const serverTypesDir = resolve(rootDir, 'server/src/types');
const clientTypesDir = resolve(rootDir, 'client/src/types');

function normalizeContent(content) {
  return content
    // Normalize line endings to LF
    .replace(/\r\n/g, '\n')
    // Remove .js extension in relative import/export paths (e.g. from './blocks.js' -> from './blocks')
    .replace(/(from\s+['"][^'"]+)\.js(['"])/g, '$1$2')
    // Trim trailing whitespace per line
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

console.log('--- Checking Server & Client Contract Equivalence ---');

if (!existsSync(serverTypesDir) || !existsSync(clientTypesDir)) {
  console.error('Error: server/src/types or client/src/types directory does not exist.');
  process.exit(1);
}

const serverFiles = readdirSync(serverTypesDir).filter(f => f.endsWith('.ts'));
const clientFiles = readdirSync(clientTypesDir).filter(f => f.endsWith('.ts'));

const allFiles = Array.from(new Set([...serverFiles, ...clientFiles])).sort();
let hasMismatch = false;

for (const file of allFiles) {
  const serverFilePath = join(serverTypesDir, file);
  const clientFilePath = join(clientTypesDir, file);

  if (!existsSync(serverFilePath)) {
    console.error(`✖ ${file}: missing in server/src/types`);
    hasMismatch = true;
    continue;
  }

  if (!existsSync(clientFilePath)) {
    console.error(`✖ ${file}: missing in client/src/types`);
    hasMismatch = true;
    continue;
  }

  const serverContent = readFileSync(serverFilePath, 'utf-8');
  const clientContent = readFileSync(clientFilePath, 'utf-8');

  const normalizedServer = normalizeContent(serverContent);
  const normalizedClient = normalizeContent(clientContent);

  if (normalizedServer !== normalizedClient) {
    console.error(`✖ ${file}: Contract mismatch between server and client!`);
    hasMismatch = true;
  } else {
    console.log(`✔ ${file}: Contracts match`);
  }
}

if (hasMismatch) {
  console.error('\nFAIL: Server and client contracts are out of sync!');
  process.exit(1);
} else {
  console.log('\nSUCCESS: All server and client contracts are strictly equivalent.');
  process.exit(0);
}
