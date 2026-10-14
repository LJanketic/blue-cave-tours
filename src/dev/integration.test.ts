import { describe, expect, it } from 'vitest';
import { includesDevKit } from './integration';

describe('dev kit route', () => {
	it('is injected in dev and deploy previews only', () => {
		expect(includesDevKit('dev', undefined)).toBe(true);
		expect(includesDevKit('build', 'deploy-preview')).toBe(true);
		expect(includesDevKit('build', 'production')).toBe(false);
		expect(includesDevKit('build', 'branch-deploy')).toBe(false);
		expect(includesDevKit('build', undefined)).toBe(false);
		expect(includesDevKit('preview', 'production')).toBe(false);
	});
});
