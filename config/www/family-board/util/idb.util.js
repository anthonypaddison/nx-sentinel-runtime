/* Family Board - IndexedDB helper
 * SPDX-License-Identifier: MIT
 */

const DB_NAME = 'family-board';
const DB_VERSION = 1;
const STORES = ['config', 'prefs', 'cache'];

let _dbPromise = null;
let _idbFailure = null;

function markFailure(error) {
    if (_idbFailure) return;
    const message = error?.message || String(error || 'IndexedDB unavailable');
    _idbFailure = { message };
}

function openDb() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            const error = new Error('IndexedDB unavailable');
            markFailure(error);
            reject(error);
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            for (const store of STORES) {
                if (!db.objectStoreNames.contains(store)) {
                    db.createObjectStore(store);
                }
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            const error = request.error || new Error('IndexedDB open failed');
            markFailure(error);
            reject(error);
        };
    });
    return _dbPromise;
}

export async function idbGet(store, key) {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readonly');
            const req = tx.objectStore(store).get(key);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => reject(req.error);
        });
    } catch {
        markFailure(new Error('IndexedDB get failed'));
        return null;
    }
}

export async function idbSet(store, key, value) {
    try {
        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).put(value, key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
        return true;
    } catch {
        markFailure(new Error('IndexedDB write failed'));
        return false;
    }
}

export async function idbDelete(store, key) {
    try {
        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
        return true;
    } catch {
        markFailure(new Error('IndexedDB delete failed'));
        return false;
    }
}

export function idbFailureState() {
    return _idbFailure ? { failed: true, message: _idbFailure.message } : null;
}
