const { spawnSync } = require('node:child_process');
const { existsSync, realpathSync, mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function query(args, scopedTree = false) {
  const result = spawnSync(npm, args, { encoding: 'utf8', shell: process.platform === 'win32', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  let value;
  try { value = JSON.parse(result.stdout); } catch { throw new Error('Cannot parse npm dependency/audit output'); }
  if (value.error && !(scopedTree && value.error.code === 'ELSPROBLEMS')) throw new Error(value.error.summary || 'npm query failed');
  return value;
}
function normalized(path) { const absolute = resolve(path); return existsSync(absolute) ? realpathSync(absolute) : absolute; }
const audit = query(['audit', '--json']);
if (!audit.vulnerabilities) throw new Error('npm audit report is missing vulnerabilities');
let blocked = false;
for (const [workspace, mode] of [['@petpal/backend', '--omit=dev'], ['@petpal/web', '--include=dev']]) {
  const tree = query(['ls', '--all', '--long', mode, '--workspace', workspace, '--json'], true);
  const root = tree.dependencies?.[workspace];
  if (!root) throw new Error(`Dependency tree unavailable for ${workspace}`);
  const paths = new Set();
  function visit(node) {
    // npm may report unrelated hoisted/mobile problems globally; every selected node must still be valid.
    if (node.invalid || node.missing || node.extraneous) throw new Error(`Invalid release dependency: ${node.path || node.name || 'unknown'}`);
    if (node.path) paths.add(normalized(node.path));
    for (const child of Object.values(node.dependencies || {})) visit(child);
  }
  visit(root);
  const relevant = {};
  for (const [name, issue] of Object.entries(audit.vulnerabilities)) {
    if (!Array.isArray(issue.nodes)) throw new Error(`Audit locations unavailable for ${name}`);
    const locations = issue.nodes.filter(path => paths.has(normalized(path)));
    if (locations.length) relevant[name] = { ...issue, nodes: locations };
  }
  const issues = Object.values(relevant);
  const blocking = issues.filter(issue => ['high', 'critical'].includes(issue.severity));
  blocked ||= blocking.length > 0;
  const label = workspace === '@petpal/backend' ? 'api-runtime' : 'web-build';
  mkdirSync('artifacts', { recursive: true });
  writeFileSync(`artifacts/release-audit-${label}.json`, JSON.stringify(relevant, null, 2));
  console.log(`${label}: ${issues.length} advisories in the actual installed dependency locations; ${blocking.length} high/critical.`);
  for (const [name, issue] of Object.entries(relevant)) console.log(`${issue.severity}: ${name} (${issue.nodes.join(', ')})`);
}
process.exitCode = blocked ? 1 : 0;
