import test from 'node:test';
import assert from 'node:assert/strict';
import {
    makeScopedKey,
    makeLegacyScopedKey,
    readJsonLocal,
    writeJsonLocal,
    removeLocalKey,
    removeLocalKeysByPrefix,
    migrateScopedStoreKey,
} from '../config/www/nx-displaygrid/util/scoped-storage.util.js';

class MemoryStorage {
    constructor() {
        this._map = new Map();
    }

    get length() {
        return this._map.size;
    }

    key(index) {
        return Array.from(this._map.keys())[index] ?? null;
    }

    getItem(key) {
        return this._map.has(key) ? this._map.get(key) : null;
    }

    setItem(key, value) {
        this._map.set(String(key), String(value));
    }

    removeItem(key) {
        this._map.delete(String(key));
    }
}

function withLocalStorage(fn) {
    const prevLocalStorage = global.localStorage;
    global.localStorage = new MemoryStorage();
    return Promise.resolve()
        .then(fn)
        .finally(() => {
            global.localStorage = prevLocalStorage;
        });
}

test('scoped storage key builders are stable', () => {
    assert.equal(makeScopedKey('nx-displaygrid:config', 'user-a'), 'nx-displaygrid:config:user-a');
    assert.equal(
        makeLegacyScopedKey('nx-displaygrid:config', 'user-a', 'desktop'),
        'nx-displaygrid:config:user-a:desktop'
    );
});

test('local JSON helpers read write and remove safely', async () =>
    withLocalStorage(async () => {
        assert.equal(writeJsonLocal('k', { a: 1 }), true);
        assert.deepEqual(readJsonLocal('k', null), { a: 1 });
        assert.equal(removeLocalKey('k'), true);
        assert.equal(readJsonLocal('k', null), null);
    }));

test('removeLocalKeysByPrefix removes matching keys only', async () =>
    withLocalStorage(async () => {
        localStorage.setItem('p:1', 'a');
        localStorage.setItem('p:2', 'b');
        localStorage.setItem('x:1', 'c');
        removeLocalKeysByPrefix('p:');
        assert.equal(localStorage.getItem('p:1'), null);
        assert.equal(localStorage.getItem('p:2'), null);
        assert.equal(localStorage.getItem('x:1'), 'c');
    }));

test('migrateScopedStoreKey migrates local and idb when current key missing', async () =>
    withLocalStorage(async () => {
        const idb = new Map();
        localStorage.setItem('legacy', '{"v":1}');
        idb.set('store:legacy', { v: 1 });

        await migrateScopedStoreKey({
            key: 'current',
            legacyKey: 'legacy',
            idbStore: 'store',
            idbGetFn: async (store, key) => idb.get(`${store}:${key}`) ?? null,
            idbSetFn: async (store, key, value) => idb.set(`${store}:${key}`, value),
        });

        assert.equal(localStorage.getItem('current'), '{"v":1}');
        assert.deepEqual(idb.get('store:current'), { v: 1 });
    }));
