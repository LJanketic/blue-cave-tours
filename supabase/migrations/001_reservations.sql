-- Blue Cave Tours reservations (run manually in Supabase SQL editor)
-- EU (Frankfurt) project recommended

create extension if not exists pgcrypto;

create table if not exists public.reservations (
	id uuid primary key default gen_random_uuid(),
	order_id text not null unique,
	status text not null check (status in ('pending', 'paid', 'cancelled', 'failed')),
	tour_slug text not null,
	tour_date date not null,
	adults integer not null default 1 check (adults >= 0),
	children integer not null default 0 check (children >= 0),
	infants integer not null default 0 check (infants >= 0),
	customer_name text not null,
	customer_email text not null,
	customer_phone text,
	locale text,
	currency text not null default 'EUR',
	amount_total numeric(10, 2) not null default 0,
	quote_json jsonb,
	paypal_capture_id text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists reservations_tour_slug_idx on public.reservations (tour_slug);
create index if not exists reservations_tour_date_idx on public.reservations (tour_date);
create index if not exists reservations_status_idx on public.reservations (status);
create index if not exists reservations_customer_email_idx on public.reservations (customer_email);

comment on table public.reservations is 'PayPal checkout reservations for Blue Cave Tours';
