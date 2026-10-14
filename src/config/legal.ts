/**
 * Versions of the legal texts. A booking records the TERMS_VERSION it was
 * accepted under (S-4, PR 7a); bump it whenever /legal/terms changes.
 */
export const TERMS_VERSION = '2025-06-01';

/** "Last updated" on the legal pages. */
export const LEGAL_UPDATED = '1 June 2025';

/**
 * Company details for the imprint and the privacy policy's controller (C-6,
 * D-18): legal name, address, OIB, register. Null until the owner supplies
 * them; the pages show nothing rather than a guess.
 */
export const IMPRINT: { legalName: string; address: string; oib: string; register?: string } | null = null;
