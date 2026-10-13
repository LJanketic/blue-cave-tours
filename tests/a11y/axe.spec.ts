import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { publicRoutes } from './routes';

/**
 * axe on every public page. The redesign must never make a page worse: each
 * page's count of serious and critical violations stays at or below the
 * baseline recorded before the redesign started (PR 0b).
 *
 *   pnpm test:a11y                 compare with the baseline
 *   AXE_UPDATE=1 pnpm test:a11y    record a new baseline (only when a PR lowers counts)
 */
const BASELINE_FILE = 'tests/a11y/axe-baseline.json';
type Baseline = Record<string, { count: number; rules: string[] }>;

test('no page gets more serious or critical axe violations', async ({ page }) => {
	test.setTimeout(300_000);
	const baseline: Baseline = fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')) : {};
	const results: Baseline = {};

	for (const route of await publicRoutes(page)) {
		await page.goto(route);
		const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
		const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
		results[route] = { count: bad.reduce((n, v) => n + v.nodes.length, 0), rules: bad.map((v) => v.id).sort() };
	}

	if (process.env.AXE_UPDATE) {
		fs.writeFileSync(BASELINE_FILE, JSON.stringify(results, null, '\t') + '\n');
		return;
	}
	for (const [route, { count, rules }] of Object.entries(results)) {
		const allowed = baseline[route]?.count ?? 0;
		expect.soft(count, `${route}: ${rules.join(', ')}`).toBeLessThanOrEqual(allowed);
	}
});
