import { pageTitle } from '../config/site';
import { CONTACT_MIN_SUBMIT_MS, HONEYPOT_FIELD } from './contact-validation';

/**
 * The confirm step for plain form posts (S5). The contact and charter pages
 * are prerendered, so their no-JavaScript forms can't carry a start time: only
 * the page script sets `_startedAt`. A form post without one used to skip the
 * time check entirely, which is exactly what a simple bot sends.
 *
 * Now such a post gets this page instead of being stored: the same fields as
 * hidden inputs, a start time written by the server, and one button. A person
 * clicks it; a bot that posts once and moves on never does. Nothing is stored
 * until the second post, and nothing typed goes into a URL (S-2).
 *
 * The start time is plain, not signed, like the one the page script sends: it
 * stops naive bots, not a script that sets its own. Turnstile is the real gate.
 */

/** How long the confirm page must be open before the button counts (the full minimum would trip a quick click). */
const CONFIRM_MIN_MS = 1000;

/** Fields never carried over: the honeypot, the old start time and a Turnstile token (single use). */
const DROPPED = new Set([HONEYPOT_FIELD, '_startedAt', 'turnstileToken', 'cf-turnstile-response']);

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** A start time that passes the minimum fill time after CONFIRM_MIN_MS more. */
export function confirmStartedAt(now = Date.now()): number {
	return now - CONTACT_MIN_SUBMIT_MS + CONFIRM_MIN_MS;
}

export function confirmFormResponse(
	{ action, fields }: { action: string; fields: Record<string, unknown> },
	now = Date.now(),
): Response {
	const hidden = Object.entries(fields)
		.filter(([name, value]) => typeof value === 'string' && !DROPPED.has(name))
		.map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value as string)}">`)
		.join('\n\t\t\t');
	const html = `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="robots" content="noindex, nofollow">
	<title>${escapeHtml(pageTitle('Check and send'))}</title>
	<style>
		/* A stand-alone page without the site stylesheet, so no colour tokens: the browser's own light or dark colours. */
		:root { color-scheme: light dark; }
		body { margin: 0; font: 16px/1.5 system-ui, sans-serif; }
		main { max-width: 32rem; margin: 0 auto; padding: 3rem 16px; }
		h1 { margin: 0 0 .5rem; font-size: 1.75rem; line-height: 1.2; }
		p, form { margin: 0 0 1.5rem; }
		button { padding: .75rem 1.5rem; font: inherit; font-weight: 600; cursor: pointer; }
	</style>
</head>
<body>
	<main>
		<h1>One more step</h1>
		<p>Your browser isn't running JavaScript, so we ask you to confirm before we send this. Nothing has been sent yet.</p>
		<form method="post" action="${escapeHtml(action)}">
			${hidden}
			<input type="hidden" name="_startedAt" value="${confirmStartedAt(now)}">
			<button type="submit">Send</button>
		</form>
		<p>To change something, use your browser's Back button: what you typed is still there.</p>
	</main>
</body>
</html>
`;
	return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
