/**
 * Versions of the legal texts. A booking records the TERMS_VERSION it was
 * accepted under (S-4, PR 7a); bump it whenever /legal/terms changes.
 */
export const TERMS_VERSION = '2026-10-19';

/** "Last updated" on the legal pages. */
export const LEGAL_UPDATED = '19 October 2026';

/**
 * Company details for the imprint, the terms and the privacy policy's
 * controller (C-6, D-18): legal name, address, OIB, register. Supplied by the
 * owner in the 19 October 2026 terms. Set it to null to hide them everywhere.
 */
export const IMPRINT: { legalName: string; address: string; oib: string; register?: string } | null = {
	legalName: 'Misericordia d.o.o.',
	address: 'Vukovarska 123, Split, Croatia',
	oib: '14927048054',
};
