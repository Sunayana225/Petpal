const { spawnSync } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function command(args) {
  const result = spawnSync(npm, args, { encoding: 'utf8', shell: process.platform === 'win32', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  try { return JSON.parse(result.stdout); }
  catch { throw new Error(`Cannot read npm output: ${result.stderr}`); }
}
const tree = command(['ls', '--omit=dev', '--all', '--workspace', '@petpal/backend', '--json']);
const report = command(['audit', '--omit=dev', '--workspace', '@petpal/backend', '--json']);
if (report.error) throw new Error(`Audit unavailable: ${report.error.summary}`);
const names = new Set();
function visit(node) {
  for (const [name, child] of Object.entries(node.dependencies || {})) { names.add(name); visit(child); }
}
if (!tree.dependencies?.['@petpal/backend']) throw new Error('Backend dependency tree is missing');
visit(tree.dependencies['@petpal/backend']);
const relevant = Object.entries(report.vulnerabilities || {}).filter(([name]) => names.has(name));
mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/backend-audit.json', JSON.stringify(Object.fromEntries(relevant), null, 2));
for (const [name, issue] of relevant) console.log(`${issue.severity}: ${name}`);
const blocking = relevant.filter(([, issue]) => ['high', 'critical'].includes(issue.severity));
console.log(`Backend runtime audit: ${relevant.length} findings; ${blocking.length} high/critical.`);
process.exitCode = blocking.length ? 1 : 0;
