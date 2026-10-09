const { resolve, dirname } = require('node:path');
const { readFileSync, rmSync } = require('node:fs');
const root = resolve(__dirname, '../apps/backend');
const target = resolve(root, 'dist');
if (dirname(target) !== root || JSON.parse(readFileSync(resolve(root, 'package.json'))).name !== '@petpal/backend') throw new Error('Unexpected build output path');
rmSync(target, { recursive: true, force: true });
