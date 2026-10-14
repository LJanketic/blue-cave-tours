#!/usr/bin/env node
// Compares two computed-style dumps from public-styles.spec.ts and groups the
// differences by element and property, so a refactor's side effects can be read.
//   node tests/visual/compare-styles.mjs <before> <after>
import fs from 'node:fs';

const [a, b] = process.argv.slice(2);
const dir = (label) => `screenshots/styles/${label}`;
const parse = (file) => {
	const map = new Map();
	for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
		const at = line.indexOf(' {');
		if (at < 0) continue;
		const key = line.slice(0, at);
		const props = Object.fromEntries(line.slice(at + 2, -1).split(';').map((p) => [p.slice(0, p.indexOf(':')), p.slice(p.indexOf(':') + 1)]));
		map.set(key, [...(map.get(key) ?? []), props]);
	}
	return map;
};

const groups = new Map();
let files = 0;
for (const name of fs.readdirSync(dir(a))) {
	const before = parse(`${dir(a)}/${name}`);
	const after = parse(`${dir(b)}/${name}`);
	if (before.size !== after.size) console.log(`${name}: element count ${before.size} → ${after.size}`);
	let changed = false;
	for (const [key, list] of before) {
		const other = after.get(key) ?? [];
		list.forEach((props, i) => {
			const next = other[i] ?? {};
			for (const prop of Object.keys(props)) {
				if (props[prop] === next[prop]) continue;
				changed = true;
				const id = `${key.split(' > ').slice(-2).join(' > ')} | ${prop}: ${props[prop]} → ${next[prop]}`;
				groups.set(id, [...(groups.get(id) ?? []), name]);
			}
		});
	}
	if (changed) files++;
}
console.log(`${files} dumps differ, ${groups.size} distinct changes`);
for (const [id, names] of [...groups].sort((x, y) => y[1].length - x[1].length)) console.log(`${names.length}× ${id}`);
