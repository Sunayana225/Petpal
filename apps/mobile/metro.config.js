// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the whole monorepo so edits in a sibling package are picked up.
config.watchFolders = [workspaceRoot];

// 2. Resolve packages from the app first, then from the workspace root, where
//    npm hoists the shared dependencies.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Resolve strictly through the paths above, so React Native's own npm
//    resolution cannot pull in a second copy of a package.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
