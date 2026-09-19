/** Server-side verification for the contact form's Cloudflare Turnstile widget. */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileResult = { ok: true } | { ok: false; error: string };

/**
 * Verifies a Turnstile token. Enforcement only turns on once both
 * `TURNSTILE_SECRET_KEY` and `PUBLIC_TURNSTILE_SITE_KEY` are set — the site
 * key is what makes the client render the widget at all, so enforcing on the
 * secret alone would brick every real submission if only one var got set
 * (e.g. a partial config rollout). Until both are present, verification is
 * skipped so the form keeps working; set both in Netlify to turn it on
 * without any code changes.
 */
export async function verifyTurnstileToken(
	token: string,
	remoteIp: string | null,
): Promise<TurnstileResult> {
	const secret = process.env.TURNSTILE_SECRET_KEY;
	const siteKeyConfigured = Boolean(process.env.PUBLIC_TURNSTILE_SITE_KEY);
	if (!secret || !siteKeyConfigured) return { ok: true };
	if (!token) return { ok: false, error: 'Verification required — please try again' };

	const body = new URLSearchParams({ secret, response: token });
	if (remoteIp) body.set('remoteip', remoteIp);

	try {
		const res = await fetch(VERIFY_URL, { method: 'POST', body });
		const data = (await res.json()) as { success?: boolean };
		return data.success
			? { ok: true }
			: { ok: false, error: 'Verification failed — please try again' };
	} catch {
		return { ok: false, error: 'Verification unavailable — please try again' };
	}
}
