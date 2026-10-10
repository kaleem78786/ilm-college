import { cp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
const revision = process.env.SITE_REVISION || 'local';
if (!/^(local|[a-f0-9]{40})$/.test(revision)) throw new Error('SITE_REVISION must be a full Git commit SHA or local');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, 'site'), output, { recursive: true });
let html = await readFile(path.join(output, 'index.html'), 'utf8');
for (const filename of ['style.css', 'script.js']) {
  const bytes = await readFile(path.join(output, filename));
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const extension = path.extname(filename);
  const versioned = filename.slice(0, -extension.length) + '.' + hash + extension;
  const attribute = filename.endsWith('.css') ? 'href' : 'src';
  const reference = `${attribute}="${filename}"`;
  if (!html.includes(reference)) throw new Error(`Missing ${reference} in index.html`);
  html = html.replaceAll(reference, `${attribute}="${versioned}"`);
  await rename(path.join(output, filename), path.join(output, versioned));
}
await writeFile(path.join(output, 'index.html'), html);
await writeFile(path.join(output, 'version.txt'), revision + '\n');
console.log('Built versioned static assets for ' + revision);
