import { runNightly } from '../../src/lib/nightly';

/**
 * Netlify Scheduled Function (free on every plan): once a day at 00:00 UTC
 * (01:00 or 02:00 in Split) it runs the GDPR retention sweep and writes the
 * nightly backup (src/lib/nightly.ts). Netlify finds it in netlify/functions
 * on its own, next to the Astro adapter's function, and bundles it with
 * esbuild, so everything it imports must avoid Astro-only modules.
 *
 * Scheduled functions run only on the published (production) deploy. To run
 * it by hand: Netlify UI → Logs → Functions → nightly → "Run now".
 */

/** The part of Netlify's function context used here. */
type Context = { deploy?: { context?: string } };

export default async (_request: Request, context: Context): Promise<void> => {
	// The stores are named per deploy context (scopedName in src/lib/bookings/store.ts),
	// which the site's server code gets inlined at build time. Here it comes from
	// the runtime, so this run reads and writes the same stores as that deploy.
	const deployContext = process.env.CONTEXT || context.deploy?.context;
	if (!deployContext) throw new Error('[nightly] unknown deploy context: refusing to guess which stores to use');
	process.env.CONTEXT = deployContext;
	await runNightly();
};

export const config = { schedule: '@daily' };
