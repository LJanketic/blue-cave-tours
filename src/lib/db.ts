import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './env';

export type ReservationStatus = 'pending' | 'paid' | 'cancelled' | 'failed';

export type ReservationInsert = {
	order_id: string;
	status: ReservationStatus;
	payment_provider?: 'paypal' | 'teya' | 'demo' | null;
	tour_slug: string;
	tour_date: string;
	adults: number;
	children: number;
	infants: number;
	customer_name: string;
	customer_email: string;
	customer_phone?: string | null;
	locale?: string | null;
	currency: string;
	amount_total: number;
	quote_json?: Record<string, unknown> | null;
	paypal_capture_id?: string | null;
	teya_session_id?: string | null;
	teya_transaction_id?: string | null;
};

export type ReservationRow = ReservationInsert & {
	id: string;
	created_at: string;
	updated_at: string;
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
	if (!isSupabaseConfigured()) return null;
	if (!client) {
		client = createClient(
			import.meta.env.SUPABASE_URL!,
			import.meta.env.SUPABASE_SERVICE_ROLE_KEY!,
			{ auth: { persistSession: false, autoRefreshToken: false } },
		);
	}
	return client;
}

export async function insertReservation(row: ReservationInsert): Promise<ReservationRow | null> {
	const db = getSupabase();
	if (!db) return null;
	const { data, error } = await db.from('reservations').insert(row).select().single();
	if (error) {
		console.error('[db] insertReservation', error.message);
		return null;
	}
	return data as ReservationRow;
}

export async function updateReservationByOrderId(
	orderId: string,
	patch: Partial<
		Pick<
			ReservationInsert,
			'status' | 'paypal_capture_id' | 'teya_session_id' | 'teya_transaction_id' | 'amount_total'
		>
	>,
): Promise<ReservationRow | null> {
	const db = getSupabase();
	if (!db) return null;
	const { data, error } = await db
		.from('reservations')
		.update({ ...patch, updated_at: new Date().toISOString() })
		.eq('order_id', orderId)
		.select()
		.single();
	if (error) {
		console.error('[db] updateReservationByOrderId', error.message);
		return null;
	}
	return data as ReservationRow;
}

export async function getReservationByOrderId(orderId: string): Promise<ReservationRow | null> {
	const db = getSupabase();
	if (!db) return null;
	const { data, error } = await db.from('reservations').select().eq('order_id', orderId).maybeSingle();
	if (error) {
		console.error('[db] getReservationByOrderId', error.message);
		return null;
	}
	return (data as ReservationRow | null) ?? null;
}
