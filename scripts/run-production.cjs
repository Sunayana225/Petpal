const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, process.argv.slice(2), { env: { ...process.env, NODE_ENV: 'production' }, stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
