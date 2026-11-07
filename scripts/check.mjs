import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const ignored = new Set(['node_modules', '.git', '.local', '.agent-context', 'dist', 'test-results', 'playwright-report']);
async function files(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await files(full));
    else found.push(full);
  }
  return found;
}

let failures = 0;
const all = await files(root);
for (const file of all.filter((file) => /\.(?:js|mjs)$/.test(file))) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) { console.error(result.stderr); failures++; }
}
for (const file of all.filter((file) => /\.md$/.test(file))) {
  const source = await readFile(file, 'utf8');
  for (const [, target] of source.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    if (/^(?:https?:|mailto:|#)/.test(target)) continue;
    const local = decodeURIComponent(target.split('#')[0]);
    try { await access(path.resolve(path.dirname(file), local)); }
    catch { console.error(`${path.relative(root, file)}: missing link ${target}`); failures++; }
  }
}
for (const filename of ['TODO\\01_MODEL_ROOM_FOUNDATION.todo', 'TODO\\02_DEVELOPMENT_LEDGER.todo']) {
  const text = await readFile(path.join(root, filename), 'utf8');
  for (const field of ['Status', 'Milestone', 'Dependencies', 'Purpose', 'Tasks', 'Acceptance criteria', 'Completion evidence', 'Completion log']) {
    if (!text.includes(`${field}:`)) { console.error(`${filename}: missing ${field}`); failures++; }
  }
}
if (failures) process.exitCode = 1;
else console.log('Source syntax, documentation links and TODO schema passed.');
