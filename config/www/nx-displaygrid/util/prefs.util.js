/* nx-displaygrid - preference storage
 * SPDX-License-Identifier: MIT
 */

import { idbGet, idbSet, idbDelete } from './idb.util.js';

const KEY_PREFIX = 'nx-displaygrid:prefs';
const PREFS_STORE = 'prefs';

export function getDeviceKind() {
    if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) return 'mobile';
    return 'desktop';
}

export function loadPrefs(userId) {
    if (!userId) return {};
    const key = `${KEY_PREFIX}:${userId}:${getDeviceKind()}`;
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export async function loadPrefsAsync(userId) {
    if (!userId) return {};
    const key = `${KEY_PREFIX}:${userId}:${getDeviceKind()}`;
    const prefs = await idbGet(PREFS_STORE, key);
    return prefs && typeof prefs === 'object' ? prefs : {};
}

export function savePrefs(userId, prefs) {
    if (!userId) return;
    const key = `${KEY_PREFIX}:${userId}:${getDeviceKind()}`;
    try {
        localStorage.setItem(key, JSON.stringify(prefs || {}));
    } catch {
        // Ignore storage errors.
    }
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
    const key = `${KEY_PREFIX}:${userId}:${getDeviceKind()}`;
    try {
        localStorage.removeItem(key);
    } catch {
        // Ignore storage errors.
    }
    await idbDelete(PREFS_STORE, key);
}
