#!/usr/bin/env node
// Runs `astro check` for `pnpm check` and fails unless it really checked.
//
// When @astrojs/check can't load (in Oct 2026 a missing @napi-rs/wasm-runtime
// did it), `astro check` prints "Astro requires @astrojs/check" and still
// exits 0, so a broken install would pass as green. A real run ends with its
// "Result (N files)" line.

import { spawn } from 'node:child_process';

const child = spawn('pnpm', ['exec', 'astro', 'check'], { stdio: ['inherit', 'pipe', 'pipe'] });
let output = '';
for (const stream of [child.stdout, child.stderr]) {
	stream.on('data', (chunk) => {
		output += chunk;
		(stream === child.stdout ? process.stdout : process.stderr).write(chunk);
	});
}
child.on('close', (code) => {
	if (code !== 0) process.exit(code ?? 1);
	if (!/Result \(\d+ files?\)/.test(output)) {
		console.error('astro-check: `astro check` exited 0 without checking anything (is @astrojs/check installed?)');
		process.exit(1);
	}
});
