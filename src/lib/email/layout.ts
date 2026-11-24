import { SITE_EMAIL, SITE_NAME, SITE_PHONE_DISPLAY } from '../../config/site';

/*
 * The building blocks every email shares (escaping, label/value rows, the
 * shell), apart from templates.ts so the hourly digest (digest.ts, run by
 * netlify/functions/hourly.mts) can use them: this module imports nothing
 * Astro-only, so Netlify's own function bundler can build it.
 */

export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** A label and value; with a link, the value itself is the link (e.g. the meeting point opens Google Maps). */
export type Row = [label: string, value: string, link?: { href: string; hint: string }];

// Brand blue-900 for links (9.8:1 on white); the brand blue for the name line.
// Emails can't use CSS variables, so these mirror tokens/design.css (§9.4).
export const LINK_COLOR = '#0c447c';
export const BRAND_COLOR = '#1a6fc4';

function rowValueHtml(value: string, link?: Row[2]): string {
	if (!link) return escapeHtml(value);
	// One link: the value, with the hint underneath, so it's a single tap target.
	return (
		`<a href="${escapeHtml(link.href)}" target="_blank" rel="noopener" style="color:${LINK_COLOR};text-decoration:underline">${escapeHtml(value)}` +
		`<br><span style="font-size:13px;font-weight:400">${escapeHtml(link.hint)} &#8599;</span></a>`
	);
}

export function rowsHtml(rows: Row[]): string {
	return rows
		.map(
			([label, value, link]) =>
				`<tr><td style="padding:6px 0;color:#555;font-size:14px;vertical-align:top;width:40%">${escapeHtml(label)}</td>` +
				`<td style="padding:6px 0;color:#111;font-size:14px;font-weight:600;text-align:right">${rowValueHtml(value, link)}</td></tr>`,
		)
		.join('');
}

export function rowsText(rows: Row[]): string {
	return rows.map(([label, value, link]) => `${label}: ${value}${link ? `\n${link.hint}: ${link.href}` : ''}`).join('\n');
}

/**
 * One shared shell: plain table layout and inline styles, which every mail client renders.
 * Without a heading the email opens straight on the intro; `footer` replaces the default address line.
 */
export function layout(heading: string, intro: string, body: string, options: { title?: string; footer?: string } = {}): string {
	const footer = options.footer ?? `${escapeHtml(SITE_NAME)} · Riva promenade, stand 14, Split, Croatia<br>${escapeHtml(SITE_PHONE_DISPLAY)} · ${escapeHtml(SITE_EMAIL)}`;
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(options.title ?? heading)}</title></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td style="font-size:13px;font-weight:600;color:${BRAND_COLOR};letter-spacing:.04em;text-transform:uppercase;padding-bottom:12px">${escapeHtml(SITE_NAME)}</td></tr>
${heading ? `<tr><td style="font-size:22px;font-weight:600;color:#111;padding-bottom:8px">${escapeHtml(heading)}</td></tr>\n` : ''}<tr><td style="font-size:15px;line-height:1.5;color:#333;padding-bottom:20px">${intro}</td></tr>
${body}
<tr><td style="font-size:12px;line-height:1.5;color:#767676;padding-top:24px;border-top:1px solid #e5e5e3">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

export function section(title: string, rows: Row[]): string {
	return `<tr><td style="padding-bottom:20px"><div style="font-size:13px;font-weight:600;color:#111;padding-bottom:6px;border-bottom:1px solid #e5e5e3">${escapeHtml(title)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml(rows)}</table></td></tr>`;
}

export function paragraph(html: string): string {
	return `<tr><td style="font-size:14px;line-height:1.5;color:#333;padding-bottom:16px">${html}</td></tr>`;
}
