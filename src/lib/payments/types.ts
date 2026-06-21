/** Supported payment backends for booking checkout. */
export type PaymentProvider = 'demo' | 'paypal' | 'teya';

export type CheckoutSessionInput = {
	amount: number;
	currency: string;
	description: string;
	referenceId: string;
	returnUrl: string;
	cancelUrl: string;
};

export type CheckoutSessionResult = {
	provider: PaymentProvider;
	orderId: string;
	redirectUrl?: string;
};
