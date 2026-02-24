import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { hashAdminPin, isAdminPinHash, verifyAdminPin } from '../config/www/nx-displaygrid/util/admin-pin.util.js';

test('hashAdminPin returns salted hash format and verifyAdminPin matches', async () => {
    const hashed = await hashAdminPin('1234', { cryptoImpl: webcrypto });
    assert.equal(isAdminPinHash(hashed), true);
    const ok = await verifyAdminPin('1234', hashed, { cryptoImpl: webcrypto });
    const bad = await verifyAdminPin('9999', hashed, { cryptoImpl: webcrypto });
    assert.deepEqual(ok, { ok: true, isLegacy: false });
    assert.deepEqual(bad, { ok: false, isLegacy: false });
});

test('verifyAdminPin supports legacy plaintext values for migration', async () => {
    const ok = await verifyAdminPin('2468', '2468', { cryptoImpl: webcrypto });
    const bad = await verifyAdminPin('0000', '2468', { cryptoImpl: webcrypto });
    assert.deepEqual(ok, { ok: true, isLegacy: true });
    assert.deepEqual(bad, { ok: false, isLegacy: true });
});

test('hashAdminPin returns empty string for blank input', async () => {
    assert.equal(await hashAdminPin('', { cryptoImpl: webcrypto }), '');
    assert.equal(await hashAdminPin('   ', { cryptoImpl: webcrypto }), '');
});

