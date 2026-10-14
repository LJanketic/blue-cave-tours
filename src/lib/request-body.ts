/** Shared by the POST endpoints (contact, booking draft, booking). */

/** Bodies above this are refused (413): every form here fits in a few KB. */
export const MAX_BODY_BYTES = 16_384;

/**
 * Reads the body as text, stopping as soon as it passes `limit` bytes. The
 * content-length check above can't catch chunked requests that omit the
 * header, and `request.text()` would buffer the whole body before any check.
 */
export async function readBodyWithLimit(request: Request, limit: number): Promise<string | null> {
	if (!request.body) return '';
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > limit) {
			await reader.cancel();
			return null;
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new TextDecoder().decode(bytes);
}

export type ParsedBody =
	| { ok: true; asForm: boolean; fields: Record<string, unknown> }
	| { ok: false; status: 400 | 413 | 415; asForm: boolean };

/**
 * A form post (no JavaScript) or JSON (the page scripts); anything else is
 * 415 (S-9). Size-capped while reading.
 */
export async function readFormOrJson(request: Request): Promise<ParsedBody> {
	const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
	const asForm = type === 'application/x-www-form-urlencoded';
	if (!asForm && type !== 'application/json') return { ok: false, status: 415, asForm };
	const length = request.headers.get('content-length');
	if (length && Number.parseInt(length, 10) > MAX_BODY_BYTES) return { ok: false, status: 413, asForm };
	let raw: string | null;
	try {
		raw = await readBodyWithLimit(request, MAX_BODY_BYTES);
	} catch {
		return { ok: false, status: 400, asForm };
	}
	if (raw === null) return { ok: false, status: 413, asForm };
	if (asForm) return { ok: true, asForm, fields: Object.fromEntries(new URLSearchParams(raw)) };
	try {
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return { ok: false, status: 400, asForm };
		return { ok: true, asForm, fields: parsed as Record<string, unknown> };
	} catch {
		return { ok: false, status: 400, asForm };
	}
}
