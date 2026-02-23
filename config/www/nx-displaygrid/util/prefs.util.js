/* nx-displaygrid - preference storage
 * SPDX-License-Identifier: MIT
 */

import { idbGet, idbSet, idbDelete } from './idb.util.js';
import {
    makeScopedKey,
    makeLegacyScopedKey,
    migrateScopedStoreKey,
    readJsonLocal,
    writeJsonLocal,
    removeLocalKey,
} from './scoped-storage.util.js';

const KEY_PREFIX = 'nx-displaygrid:prefs';
const PREFS_STORE = 'prefs';

export function getDeviceKind() {
    if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) return 'mobile';
    return 'desktop';
}

export function loadPrefs(userId) {
    if (!userId) return {};
    const key = makeScopedKey(KEY_PREFIX, userId);
    const legacyKey = makeLegacyScopedKey(KEY_PREFIX, userId, getDeviceKind());
    const current = readJsonLocal(key, null);
    if (current && typeof current === 'object') return current;
    const legacy = readJsonLocal(legacyKey, null);
    if (legacy && typeof legacy === 'object') {
        writeJsonLocal(key, legacy);
        return legacy;
    }
    return {};
}

export async function loadPrefsAsync(userId) {
    if (!userId) return {};
    const key = makeScopedKey(KEY_PREFIX, userId);
    const legacyKey = makeLegacyScopedKey(KEY_PREFIX, userId, getDeviceKind());
    await migrateScopedStoreKey({
        key,
        legacyKey,
        idbStore: PREFS_STORE,
        idbGetFn: idbGet,
        idbSetFn: idbSet,
    });
    const prefs = await idbGet(PREFS_STORE, key);
    if (prefs && typeof prefs === 'object') return prefs;
    const legacy = await idbGet(PREFS_STORE, legacyKey);
    if (legacy && typeof legacy === 'object') {
        await idbSet(PREFS_STORE, key, legacy || {});
        return legacy;
    }
    return {};
}

export function savePrefs(userId, prefs) {
    if (!userId) return;
    const key = makeScopedKey(KEY_PREFIX, userId);
    writeJsonLocal(key, prefs || {});
    idbSet(PREFS_STORE, key, prefs || {}).catch(() => {});
}

export function updatePrefs(userId, patch) {
    const current = loadPrefs(userId);
    const next = { ...current, ...patch };
    savePrefs(userId, next);
    return next;
}

export async function clearPrefs(userId) {
    if (!userId) return;
    const key = makeScopedKey(KEY_PREFIX, userId);
    removeLocalKey(key);
    await idbDelete(PREFS_STORE, key);
}
