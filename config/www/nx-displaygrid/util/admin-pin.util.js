/* nx-displaygrid - admin PIN hashing helpers
 * SPDX-License-Identifier: MIT
 */

const ADMIN_PIN_HASH_PREFIX = 'sha256$';

function getCrypto(cryptoImpl) {
    const c = cryptoImpl || globalThis.crypto;
    if (!c?.subtle || typeof c.getRandomValues !== 'function') {
        throw new Error('Web Crypto API unavailable');
    }
    return c;
}

function bytesToHex(bytes) {
    return Array.from(bytes || [])
        .map((b) => Number(b).toString(16).padStart(2, '0'))
        .join('');
}

function hexToBytes(hex) {
    const clean = String(hex || '').trim().toLowerCase();
    if (!/^[0-9a-f]+$/.test(clean) || clean.length % 2 !== 0) return null;
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i += 1) {
        out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
}

async function sha256Hex(input, { cryptoImpl } = {}) {
    const cryptoApi = getCrypto(cryptoImpl);
    const encoder = new TextEncoder();
    const data = encoder.encode(String(input || ''));
    const digest = await cryptoApi.subtle.digest('SHA-256', data);
    return bytesToHex(new Uint8Array(digest));
}

export function isAdminPinHash(value) {
    return /^sha256\$[0-9a-f]{32}\$[0-9a-f]{64}$/i.test(String(value || '').trim());
}

export async function hashAdminPin(pin, { cryptoImpl, saltHex } = {}) {
    const trimmed = String(pin || '').trim();
    if (!trimmed) return '';
    const cryptoApi = getCrypto(cryptoImpl);
    let salt = hexToBytes(saltHex);
    if (!salt) {
        salt = new Uint8Array(16);
        cryptoApi.getRandomValues(salt);
    }
    const saltValue = bytesToHex(salt);
    const hashValue = await sha256Hex(`${saltValue}:${trimmed}`, { cryptoImpl: cryptoApi });
    return `${ADMIN_PIN_HASH_PREFIX}${saltValue}$${hashValue}`;
}

export async function verifyAdminPin(pin, storedValue, { cryptoImpl } = {}) {
    const stored = String(storedValue || '').trim();
    const candidate = String(pin || '').trim();
    if (!stored) return { ok: false, isLegacy: false };
    if (!isAdminPinHash(stored)) {
        return { ok: candidate === stored, isLegacy: true };
    }
    const [, saltHex, hashHex] = stored.split('$');
    const computed = await hashAdminPin(candidate, { cryptoImpl, saltHex });
    return { ok: computed === `sha256$${saltHex}$${hashHex}`, isLegacy: false };
}

