/* nx-displaygrid - scoped browser storage helpers
 * SPDX-License-Identifier: MIT
 */

export function makeScopedKey(scope, userId = 'unknown') {
    return `${String(scope || '').replace(/:+$/, '')}:${userId || 'unknown'}`;
}

export function makeLegacyScopedKey(scope, userId = 'unknown', deviceKind = 'desktop') {
    return `${makeScopedKey(scope, userId)}:${deviceKind || 'desktop'}`;
}

export function readJsonLocal(key, fallback = null) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

export function writeJsonLocal(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value || {}));
        return true;
    } catch {
        return false;
    }
}

export function removeLocalKey(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

export function removeLocalKeysByPrefix(prefix) {
    try {
        for (let i = localStorage.length - 1; i >= 0; i -= 1) {
            const key = localStorage.key(i);
            if (!key || !String(key).startsWith(prefix)) continue;
            localStorage.removeItem(key);
        }
        return true;
    } catch {
        return false;
    }
}

export async function migrateScopedStoreKey({
    key,
    legacyKey,
    idbStore,
    idbGetFn,
    idbSetFn,
} = {}) {
    if (!key || !legacyKey || !idbStore || !idbGetFn || !idbSetFn) return;

    try {
        const currentRaw = localStorage.getItem(key);
        if (currentRaw === null) {
            const legacyRaw = localStorage.getItem(legacyKey);
            if (legacyRaw !== null) localStorage.setItem(key, legacyRaw);
        }
    } catch {
        // Ignore storage errors.
    }

    const currentIdb = await idbGetFn(idbStore, key);
    if (currentIdb && typeof currentIdb === 'object') return;
    const legacyIdb = await idbGetFn(idbStore, legacyKey);
    if (legacyIdb && typeof legacyIdb === 'object') {
        await idbSetFn(idbStore, key, legacyIdb);
    }
}
