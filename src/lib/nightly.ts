import { openBlobsStore, writeBackup, type OpenStore } from './backup';
import { sweepPersonalDataDaily } from './bookings/retention';
import { pruneLedgers } from './bookings/capacity';
import { businessDate } from './bookings/dates';

/** Ledgers of departures this many days past are deleted: a week's margin for late payment webhooks and staff changes. */
export const LEDGER_KEEP_DAYS = 7;

/**
 * What the scheduled function (netlify/functions/nightly.mts) does each night:
 * the retention sweep first, then the backup, so the snapshot holds only what
 * may still be kept, then the capacity ledgers of past departures go. Each
 * step runs even if another fails; any failure is thrown at the end so it
 * shows as a failed run in the Netlify function log.
 */
export async function runNightly(now: Date = new Date(), open: OpenStore = openBlobsStore): Promise<{ swept: unknown; backup: unknown; ledgersPruned: number | null }> {
	const errors: unknown[] = [];
	let swept: unknown = null;
	let backup: unknown = null;
	let ledgersPruned: number | null = null;
	try {
		// Null when the dashboard fallback already swept today (same once-per-day guard).
		swept = await sweepPersonalDataDaily(now);
		console.log('[nightly] retention sweep', JSON.stringify(swept));
	} catch (error) {
		console.error('[nightly] retention sweep failed', error);
		errors.push(error);
	}
	try {
		backup = await writeBackup(open, now);
		console.log('[nightly] backup', JSON.stringify(backup));
	} catch (error) {
		console.error('[nightly] backup failed', error);
		errors.push(error);
	}
	try {
		ledgersPruned = await pruneLedgers(businessDate(now, -LEDGER_KEEP_DAYS));
		console.log('[nightly] capacity ledgers pruned', ledgersPruned);
	} catch (error) {
		console.error('[nightly] capacity ledger pruning failed', error);
		errors.push(error);
	}
	if (errors.length) throw new AggregateError(errors, '[nightly] failed');
	return { swept, backup, ledgersPruned };
}
