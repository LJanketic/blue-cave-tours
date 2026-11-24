import { sendWaitingDigest } from './bookings/waiting';

/**
 * The site's main address, for the admin links in the digest. Netlify gives
 * functions URL at runtime (the main address: the custom domain once there
 * is one) and the same value as context.site.url; PUBLIC_SITE_URL only if
 * it was set for functions in the Netlify UI. Null when none is a URL.
 */
export function hourlySiteOrigin(env: Record<string, string | undefined>, siteUrl?: string): string | null {
	for (const candidate of [env.URL, siteUrl, env.PUBLIC_SITE_URL]) {
		if (candidate && URL.canParse(candidate)) return new URL(candidate).origin;
	}
	return null;
}

/**
 * What the scheduled function (netlify/functions/hourly.mts) does each hour:
 * emails the admin the bookings waiting for confirmation, when one started
 * waiting since the last digest and that hour's digest hasn't gone yet
 * (sendWaitingDigest). Most hours that is one Blobs read and nothing else.
 */
export async function runHourly(siteOrigin: string, now: Date = new Date()): Promise<{ digestSent: boolean }> {
	const digestSent = await sendWaitingDigest(siteOrigin, now);
	console.log('[hourly] waiting-for-confirmation digest', digestSent ? 'sent' : 'not due');
	return { digestSent };
}
