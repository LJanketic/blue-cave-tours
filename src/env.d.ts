/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly STRIPE_SECRET_KEY: string;
	readonly STRIPE_PRICE_BLUE_CAVE_ADVENTURE?: string;
	readonly STRIPE_PRICE_PRIVATE_SPLIT_COAST?: string;
	readonly STRIPE_PRICE_SPLIT_ISLAND_HOPPING?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
