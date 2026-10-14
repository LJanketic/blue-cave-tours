import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BESTSELLER_EVIDENCE } from '../config/site';

/**
 * Content guard (spec S-14). The design boards' copy came from a Dubrovnik
 * template: none of it may reach the site, and neither may claims nobody has
 * backed. Checks the source and, when a build exists, the built HTML.
 */

const BANNED: [RegExp, string][] = [
	// example.com is fine as an email placeholder (it's reserved for examples); never as a link.
	[/(https?:\/\/|href=["'])(www\.)?example\.com/i, 'an example.com link'],
	[/Marina Pier B/i, "the template's meeting point"],
	[/\b(help|hello|privacy)@/i, 'a mailbox that doesn’t exist (C-21)'],
	[/\+385 20 123 456/, "the template's phone number"],
	[/Elafiti/i, 'a Dubrovnik destination'],
	[/GDPR compliant/i, 'an unbacked compliance claim'],
];

const ROOT = path.resolve(__dirname, '../..');

function files(dir: string, test: (file: string) => boolean): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir).flatMap((name) => {
		const full = path.join(dir, name);
		return statSync(full).isDirectory() ? files(full, test) : test(full) ? [full] : [];
	});
}

const sourceFiles = files(path.join(ROOT, 'src'), (f) => /\.(astro|vue|ts|css|md)$/.test(f) && !f.endsWith('.test.ts'));
const builtPages = files(path.join(ROOT, 'dist'), (f) => f.endsWith('.html'));

describe('content guard', () => {
	it('keeps template copy and unbacked claims out of the source', () => {
		const hits = sourceFiles.flatMap((file) => {
			const text = readFileSync(file, 'utf8');
			return BANNED.filter(([pattern]) => pattern.test(text)).map(([, what]) => `${path.relative(ROOT, file)}: ${what}`);
		});
		expect(hits).toEqual([]);
	});

	it.skipIf(builtPages.length === 0)('keeps them out of the built pages, with "Best seller" only when backed', () => {
		const rules: [RegExp, string][] = [...BANNED, ...(BESTSELLER_EVIDENCE ? [] : [[/Best seller/i, 'an unbacked best-seller claim (C-24)'] as [RegExp, string]])];
		const hits = builtPages.flatMap((file) => {
			const text = readFileSync(file, 'utf8');
			return rules.filter(([pattern]) => pattern.test(text)).map(([, what]) => `${path.relative(ROOT, file)}: ${what}`);
		});
		expect(hits).toEqual([]);
	});
});
