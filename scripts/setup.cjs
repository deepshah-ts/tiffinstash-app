'use strict';
const {spawnSync} = require('node:child_process');

const major = Number(process.versions.node.split('.')[0]);
if (major < 20) {
  console.error('Install Node.js 20.19 or newer first.');
  process.exit(1);
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
function run(command, args) {
  const result = spawnSync(command, args, {stdio: 'inherit', shell: process.platform === 'win32'});
  if (result.status !== 0) process.exit(result.status || 1);
}

run(npm, ['install']);
run(npx, ['expo', 'install', '--fix']);
console.log('\nSetup complete. Run npm start for iOS/Android development, or npm run preview for the Expo web preview.');
