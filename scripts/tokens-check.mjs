#!/usr/bin/env node
// Design token check (spec §4.6), run by `pnpm check`.
//
//   node scripts/tokens-check.mjs            check
//   node scripts/tokens-check.mjs --update   lower the baseline after removing raw colours
//
// 1. Raw colours (#hex, rgb(), rgba()) belong in the token files. Outside the
//    allowed files, each file may keep at most the count recorded in
//    scripts/tokens-baseline.json (the legacy code before the redesign); a
//    new raw colour, or one in a new file, fails. Counts only go down.
// 2. Lists the remaining uses of the migration aliases in tokens/redesign.css.
//    With --strict (from PR 9 on), any use fails.

import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(root, 'scripts/tokens-baseline.json');
const ALIASES = path.join(root, 'src/styles/tokens/redesign.css');

/** Files that may hold raw colours: the tokens, the frozen admin, emails, and placeholder-colour data. */
const ALLOWED = [
	/^src\/styles\/tokens\/design\.css$/,
	/^src\/styles\/admin\.css$/,
	/^src\/lib\/email\//,
	/^src\/data\/(tour-photos|destination-photos|hero-image)\.ts$/,
	/^src\/config\/site\.ts$/,
	/\.test\.ts$/,
];
const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/g;

async function sourceFiles(dir) {
	const out = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...(await sourceFiles(full)));
		else if (/\.(css|astro|vue|ts|js|mjs)$/.test(entry.name)) out.push(full);
	}
	return out;
}

/** Drops comments, so a colour mentioned in a note doesn't count. */
function stripComments(text) {
	return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

const files = await sourceFiles(path.join(root, 'src'));
const counts = {};
const aliasUses = {};
const aliasNames = [...(await readFile(ALIASES, 'utf8')).matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]);

for (const file of files) {
	const rel = path.relative(root, file).split(path.sep).join('/');
	const text = stripComments(await readFile(file, 'utf8'));
	if (!ALLOWED.some((re) => re.test(rel))) {
		const n = (text.match(RAW_COLOUR) ?? []).length;
		if (n) counts[rel] = n;
	}
	if (rel.startsWith('src/styles/tokens/') || rel === 'src/styles/admin.css') continue;
	for (const name of aliasNames) {
		const n = (text.match(new RegExp(`var\\(\\s*${name}\\b`, 'g')) ?? []).length;
		if (n) aliasUses[name] = (aliasUses[name] ?? 0) + n;
	}
}

if (process.argv.includes('--update')) {
	await writeFile(BASELINE, `${JSON.stringify(Object.fromEntries(Object.entries(counts).sort()), null, '\t')}\n`);
	console.log(`tokens: baseline written (${Object.keys(counts).length} files)`);
	process.exit(0);
}

const baseline = JSON.parse(await readFile(BASELINE, 'utf8'));
const over = Object.entries(counts).filter(([file, n]) => n > (baseline[file] ?? 0));
const lowered = Object.entries(baseline).filter(([file, n]) => (counts[file] ?? 0) < n);
let failed = false;

if (over.length) {
	failed = true;
	console.error('tokens: raw colours outside the token files (use a token from src/styles/tokens/design.css):');
	for (const [file, n] of over) console.error(`  ${file}: ${n} (allowed ${baseline[file] ?? 0})`);
}
const aliasTotal = Object.values(aliasUses).reduce((a, b) => a + b, 0);
if (aliasTotal) {
	const list = Object.entries(aliasUses).map(([name, n]) => `${name} ×${n}`).join(', ');
	if (process.argv.includes('--strict')) {
		failed = true;
		console.error(`tokens: migration aliases still used: ${list}`);
	} else {
		console.log(`tokens: ${aliasTotal} migration alias uses left: ${list}`);
	}
}
if (lowered.length) console.log(`tokens: fewer raw colours than the baseline in ${lowered.map(([f]) => f).join(', ')}; run \`node scripts/tokens-check.mjs --update\` to lock that in`);
if (failed) process.exit(1);
console.log(`tokens: raw colours within the baseline (${Object.values(counts).reduce((a, b) => a + b, 0)} left in ${Object.keys(counts).length} legacy files)`);
