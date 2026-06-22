import Stripe from 'stripe';

export type VerifiedCheckout = {
	ok: boolean;
	tourId?: string;
	tourTitle?: string;
	customerEmail?: string;
};

export async function verifyCheckoutSession(
	sessionId: string,
	secret: string,
	resolveTourTitle: (slug: string) => string | undefined,
): Promise<VerifiedCheckout> {
	const stripe = new Stripe(secret);
	const session = await stripe.checkout.sessions.retrieve(sessionId);

	if (session.payment_status !== 'paid') {
		return { ok: false };
	}

	const tourId = session.metadata?.tourId;
	return {
		ok: true,
		tourId,
		tourTitle: tourId ? resolveTourTitle(tourId) : undefined,
		customerEmail: session.customer_details?.email ?? undefined,
	};
}
