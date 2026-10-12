/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Astro's Vite config, so tests can import modules that pull in images and
// other Astro-handled assets (e.g. src/data/tour-catalog.ts).
export default getViteConfig({
	test: {
		include: ['src/**/*.test.ts'],
		setupFiles: ['src/test-setup.ts'],
	},
});
