import { describe, expect, it } from 'vitest';
import { hashClient, ipNetwork } from './rate-limit';

describe('rate-limit keys (S-11)', () => {
	it('cuts IPv6 to its /64, keeps IPv4 whole', () => {
		expect(ipNetwork('2001:db8:85a3:12:8a2e:370:7334:1')).toBe('2001:db8:85a3:12::/64');
		expect(ipNetwork('2001:db8::1')).toBe('2001:db8:0:0::/64');
		// IPv4 written as IPv6 keeps its own bucket instead of sharing ::/64 with every IPv4 visitor.
		expect(ipNetwork('::ffff:1.2.3.4')).toBe('1.2.3.4');
		expect(ipNetwork('::FFFF:8.8.8.8')).toBe('8.8.8.8');
		expect(ipNetwork('203.0.113.7')).toBe('203.0.113.7');
	});

	it('never stores the IP: a 16-byte keyed hash, the same for one /64', () => {
		const a = hashClient('2001:db8:85a3:12:8a2e:370:7334:1') as string;
		expect(a).not.toContain('2001');
		expect(Buffer.from(a, 'base64url')).toHaveLength(16);
		expect(hashClient('2001:db8:85a3:12::99')).toBe(a);
		expect(hashClient('2001:db8:85a3:13::1')).not.toBe(a);
		expect(hashClient('203.0.113.7')).not.toContain('203');
	});
});
