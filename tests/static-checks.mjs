import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { parse } from 'parse5';
import postcss from 'postcss';
import { parseDocument } from 'yaml';

const root = resolve(import.meta.dirname, '..');
const site = join(root, 'site');
const read = path => readFileSync(join(root, path), 'utf8');
const files = [];
function visit(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = lstatSync(path);
    assert(!stat.isSymbolicLink(), `Website symlink is not allowed: ${relative(root, path)}`);
    if (stat.isDirectory()) visit(path);
    else { assert(stat.isFile()); assert(stat.size > 0, `Empty file: ${relative(root, path)}`); files.push(path); }
  }
}
visit(site);
for (const path of ['site/index.html', 'site/style.css', 'site/script.js', 'Dockerfile', 'docker-compose.yml', 'deploy/nginx-docker.conf', 'deploy/deploy-image.sh']) {
  assert(lstatSync(join(root, path)).isFile(), `Required file is absent: ${path}`);
}

const errors = [];
const document = parse(read('site/index.html'), { onParseError: error => errors.push(error) });
assert.deepEqual(errors, [], `HTML parse errors: ${errors.map(error => error.code).join(', ')}`);
const nodes = [];
function walk(node) { nodes.push(node); for (const child of node.childNodes || []) walk(child); }
walk(document);
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
const ids = new Set();
for (const node of nodes) {
  const id = attr(node, 'id');
  if (id) { assert(!ids.has(id), `Duplicate HTML id: ${id}`); ids.add(id); }
  if (node.tagName === 'img') assert(attr(node, 'alt') !== undefined, 'Images need an alt attribute');
  if (attr(node, 'target') === '_blank') assert(/\bnoopener\b/.test(attr(node, 'rel') || ''), 'External tabs need rel=noopener');
}
assert(attr(nodes.find(node => node.tagName === 'html'), 'lang'), 'HTML needs a document language');
assert.equal(nodes.filter(node => node.tagName === 'h1').length, 1, 'Expected one main heading');
assert.equal(nodes.filter(node => node.tagName === 'main').length, 1, 'Expected a main landmark');

function checkReference(reference, owner) {
  if (!reference || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference)) return;
  if (reference.startsWith('#')) {
    assert(ids.has(decodeURIComponent(reference.slice(1))), `Broken page anchor: ${reference}`);
    return;
  }
  const path = decodeURIComponent(reference.split(/[?#]/)[0]);
  if (!path) return;
  const target = path.startsWith('/') ? resolve(site, `.${path}`) : resolve(dirname(owner), path);
  assert(target.startsWith(`${site}${sep}`), `Reference escapes site/: ${reference}`);
  assert(lstatSync(target).isFile(), `Missing local asset: ${reference}`);
}
for (const node of nodes) {
  for (const name of ['src', 'href']) checkReference(attr(node, name), join(site, 'index.html'));
  for (const name of ['aria-controls', 'aria-labelledby', 'aria-describedby']) {
    for (const id of (attr(node, name) || '').split(/\s+/).filter(Boolean)) assert(ids.has(id), `Broken ${name}: ${id}`);
  }
  if (node.tagName === 'label' && attr(node, 'for')) assert(ids.has(attr(node, 'for')), 'Label target is absent');
}
for (const file of files.filter(path => path.endsWith('.css'))) {
  const css = readFileSync(file, 'utf8');
  postcss.parse(css, { from: file });
  for (const match of css.matchAll(/url\(\s*(['"]?)([^\s'"()]+)\1\s*\)/g)) checkReference(match[2], file);
}
for (const path of ['site/script.js', 'playwright.config.mjs']) execFileSync(process.execPath, ['--check', path], { cwd: root });
for (const path of ['deploy/setup-ec2.sh', 'deploy/deploy-image.sh', 'deploy/reload-nginx.sh']) execFileSync('bash', ['-n', path], { cwd: root });
for (const path of ['docker-compose.yml', '.github/workflows/deploy.yml']) {
  const yaml = parseDocument(read(path), { uniqueKeys: true });
  assert.equal(yaml.errors.length, 0, `Invalid YAML: ${path}`);
}

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
for (const path of tracked) {
  assert(!/(?:^|\/)(?:[^/]*\.(?:pem|key)|id_rsa|\.env(?:\..*)?)$/.test(path), `Private credential file must not be tracked: ${path}`);
  const content = readFileSync(join(root, path));
  if (!content.includes(0)) assert(!/-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/.test(content.toString()), `Private key content found in tracked file: ${path}`);
}
console.log(`Static checks passed: HTML, CSS, local assets, shell/JS syntax, YAML and ${tracked.length} tracked files.`);
