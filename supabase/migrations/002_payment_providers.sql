-- Payment provider columns for PayPal + Teya Hosted Checkout

alter table public.reservations
	add column if not exists payment_provider text check (payment_provider in ('paypal', 'teya', 'demo')),
	add column if not exists teya_session_id text,
	add column if not exists teya_transaction_id text;

create index if not exists reservations_payment_provider_idx on public.reservations (payment_provider);

comment on column public.reservations.payment_provider is 'paypal | teya | demo';
comment on column public.reservations.teya_session_id is 'Teya Hosted Checkout session id';
comment on column public.reservations.teya_transaction_id is 'Teya transaction id after successful payment';
