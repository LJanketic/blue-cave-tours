#!/usr/bin/env node
/**
 * Fail fast with a clear message when Node is below Astro's minimum (>=22.12.0).
 */
const [major, minor] = process.versions.node.split('.').map(Number);

if (Number.isNaN(major) || Number.isNaN(minor) || major < 22 || (major === 22 && minor < 12)) {
	console.error('');
	console.error(`Node.js ${process.versions.node} is not supported (Astro requires >=22.12.0).`);
	console.error('');
	console.error('Fix:');
	console.error('  nvm install    # installs version from .nvmrc (22.22.1)');
	console.error('  nvm use');
	console.error('  pnpm dev');
	console.error('');
	process.exit(1);
}
