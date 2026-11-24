import { hourlySiteOrigin, runHourly } from '../../src/lib/hourly';

/**
 * Netlify Scheduled Function (free on every plan): at the start of every hour
 * it emails the admin the bookings waiting for confirmation that no digest
 * has listed yet (src/lib/hourly.ts). The request that records such a
 * booking sends the digest itself when the hour's hasn't gone; this catches
 * the ones recorded after it, within the hour. Like nightly.mts, Netlify
 * bundles it with esbuild, so everything it imports must avoid Astro-only
 * modules (src/lib/bookings/waiting.ts, src/lib/email/digest.ts).
 *
 * Scheduled functions run only on the published (production) deploy. To run
 * it by hand: Netlify UI → Logs → Functions → hourly → "Run now".
 */

/** The parts of Netlify's function context used here. */
type Context = { deploy?: { context?: string }; site?: { url?: string } };

export default async (_request: Request, context: Context): Promise<void> => {
	// Same stores as the deploy (see nightly.mts): CONTEXT isn't among the variables Netlify gives functions at runtime.
	const deployContext = process.env.CONTEXT || context.deploy?.context;
	if (!deployContext) throw new Error('[hourly] unknown deploy context: refusing to guess which stores to use');
	process.env.CONTEXT = deployContext;
	const origin = hourlySiteOrigin(process.env, context.site?.url);
	if (!origin) throw new Error('[hourly] no site URL (URL, context.site.url or PUBLIC_SITE_URL): the digest would have no admin links');
	await runHourly(origin);
};

export const config = { schedule: '@hourly' };
