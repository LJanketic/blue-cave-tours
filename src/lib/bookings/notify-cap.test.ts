import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN_NOTIFY_DAILY_CAP, recordEnquiry } from './service';
import { enquiries, outbox, resetMemoryStore } from './store';

const input = { name: 'Jane Smith', email: 'jane@example.com', phone: '', tourSlug: '', message: 'Hello there, a question.' };

describe('admin notification cap (S-6)', () => {
	beforeEach(() => resetMemoryStore());

	it(`emails the first ${ADMIN_NOTIFY_DAILY_CAP} enquiries of a day, then only stores them`, async () => {
		const day = new Date('2026-07-01T10:00:00Z');
		for (let i = 0; i < ADMIN_NOTIFY_DAILY_CAP + 2; i++) await recordEnquiry(input, 'http://localhost', day);
		const stored = await enquiries().list();
		expect(stored).toHaveLength(ADMIN_NOTIFY_DAILY_CAP + 2);
		expect(stored.filter((e) => e.notified === false)).toHaveLength(2);
		expect((await outbox().list()).filter((m) => m.kind === 'admin_enquiry')).toHaveLength(ADMIN_NOTIFY_DAILY_CAP);

		// A new day starts a new count.
		const next = await recordEnquiry(input, 'http://localhost', new Date('2026-07-02T08:00:00Z'));
		expect(next.notified).toBe(true);
	});
});
