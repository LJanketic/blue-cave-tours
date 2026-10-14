import type { Booking } from '../bookings/store';

/**
 * Quotes a cell for CSV and defuses spreadsheet formulas: a value starting
 * with = + - @ (e.g. a "name" typed as =HYPERLINK(...)) would otherwise run
 * as a formula when the accountant opens the file in Excel.
 */
export function csvCell(value: string | number): string {
	let text = String(value);
	if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
	return `"${text.replace(/"/g, '""')}"`;
}

const COLUMNS: [header: string, value: (b: Booking) => string | number][] = [
	['Ref', (b) => b.ref],
	['Status', (b) => b.status],
	['Payment', (b) => b.paymentStatus],
	['Paid with', (b) => b.paymentProvider ?? ''],
	['Payment ref', (b) => b.paymentRef ?? ''],
	['Invoice no.', (b) => b.invoice?.number ?? ''],
	['Tour', (b) => b.tourTitle],
	['Date', (b) => b.date],
	['Departure', (b) => b.slot],
	['Adults', (b) => b.adults],
	['Children', (b) => b.children],
	['Infants', (b) => b.infants],
	['Total EUR', (b) => b.total],
	['First name', (b) => b.firstName],
	['Last name', (b) => b.lastName],
	['Email', (b) => b.email],
	['Phone', (b) => b.phone],
	['Special requests', (b) => b.customerNotes],
	['Booked at', (b) => b.createdAt],
];

export function bookingsCsv(rows: Booking[]): string {
	const lines = [COLUMNS.map(([header]) => csvCell(header)).join(',')];
	for (const booking of rows) lines.push(COLUMNS.map(([, value]) => csvCell(value(booking))).join(','));
	// BOM so Excel opens UTF-8 (č, ć, š, ž) correctly.
	return `﻿${lines.join('\r\n')}\r\n`;
}
