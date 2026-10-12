import type { APIRoute } from 'astro';
import { bookingsCsv } from '../../lib/admin/csv';
import { businessDate } from '../../lib/bookings/dates';
import { bookings } from '../../lib/bookings/store';

export const prerender = false;

/** All bookings as a spreadsheet, oldest trip first. Behind the admin login (src/middleware.ts). */
export const GET: APIRoute = async () => {
	const rows = (await bookings().list()).sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot));
	return new Response(bookingsCsv(rows), {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="bookings-${businessDate()}.csv"`,
		},
	});
};
