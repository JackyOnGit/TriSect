import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

let version = 'dev';

try {
  version = execSync('git rev-parse --short=8 HEAD', { encoding: 'utf8' }).trim() || 'dev';
} catch {
  version = 'dev';
}

const versionFilePath = path.resolve(process.cwd(), 'src', 'version.ts');
writeFileSync(versionFilePath, `export const APP_VERSION = '${version}';\n`);
