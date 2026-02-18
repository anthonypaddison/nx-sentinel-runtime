import test from 'node:test';
import assert from 'node:assert/strict';

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

    clear() {
        this._map.clear();
    }
}

function withBrowserGlobals(fn) {
    const previousWindow = global.window;
    const previousLocalStorage = global.localStorage;
    global.window = { matchMedia: () => ({ matches: false }) };
    global.localStorage = new MemoryStorage();
    return Promise.resolve()
        .then(fn)
        .finally(() => {
            global.window = previousWindow;
            global.localStorage = previousLocalStorage;
        });
}

test('user-scoped config/data/prefs keys do not include device suffix', async () =>
    withBrowserGlobals(async () => {
        const { applyPersistence } = await import(
            '../config/www/nx-displaygrid/nx-displaygrid.persistence.js'
        );
        const { applyRefresh } = await import('../config/www/nx-displaygrid/nx-displaygrid.refresh.js');
        const { savePrefs } = await import('../config/www/nx-displaygrid/util/prefs.util.js');

        class TestCard {}
        applyPersistence(TestCard);
        applyRefresh(TestCard);
        const card = new TestCard();
        card._hass = { user: { id: 'user-a' } };

        assert.equal(card._localConfigKey(), 'nx-displaygrid:config:user-a');
        assert.equal(card._dataCacheKey(), 'nx-displaygrid:data:user-a');

        savePrefs('user-a', { screen: 'schedule' });
        assert.equal(localStorage.getItem('nx-displaygrid:prefs:user-a') !== null, true);
        assert.equal(localStorage.getItem('nx-displaygrid:prefs:user-a:desktop'), null);
    }));

test('migration copies legacy device-scoped keys into user-scoped keys when missing', async () =>
    withBrowserGlobals(async () => {
        const { applyPersistence } = await import(
            '../config/www/nx-displaygrid/nx-displaygrid.persistence.js'
        );
        const { applyRefresh } = await import('../config/www/nx-displaygrid/nx-displaygrid.refresh.js');
        const { loadPrefs } = await import('../config/www/nx-displaygrid/util/prefs.util.js');

        localStorage.setItem(
            'nx-displaygrid:config:user-a:desktop',
            JSON.stringify({ title: 'Legacy config' })
        );
        localStorage.setItem(
            'nx-displaygrid:data:user-a:desktop',
            JSON.stringify({ meta: { updatedAt: 1 } })
        );
        localStorage.setItem('nx-displaygrid:prefs:user-a:desktop', JSON.stringify({ defaultView: 'home' }));

        class TestCard {}
        applyPersistence(TestCard);
        applyRefresh(TestCard);
        const card = new TestCard();
        card._hass = { user: { id: 'user-a' } };

        await card._migrateConfigStorage();
        await card._migrateDataCacheStorage();
        const prefs = loadPrefs('user-a');

        assert.deepEqual(JSON.parse(localStorage.getItem('nx-displaygrid:config:user-a')), {
            title: 'Legacy config',
        });
        assert.deepEqual(JSON.parse(localStorage.getItem('nx-displaygrid:data:user-a')), {
            meta: { updatedAt: 1 },
        });
        assert.deepEqual(prefs, { defaultView: 'home' });
        assert.equal(localStorage.getItem('nx-displaygrid:config:user-a:desktop') !== null, true);
    }));

test('reset clears user-scoped keys and legacy device-scoped keys for the user', async () =>
    withBrowserGlobals(async () => {
        const { applyPersistence } = await import(
            '../config/www/nx-displaygrid/nx-displaygrid.persistence.js'
        );

        localStorage.setItem('nx-displaygrid:config:user-a', '{"title":"current"}');
        localStorage.setItem('nx-displaygrid:prefs:user-a', '{"defaultView":"home"}');
        localStorage.setItem('nx-displaygrid:data:user-a', '{"meta":{"updatedAt":1}}');
        localStorage.setItem('nx-displaygrid:config:user-a:desktop', '{"title":"legacy-desktop"}');
        localStorage.setItem('nx-displaygrid:config:user-a:mobile', '{"title":"legacy-mobile"}');
        localStorage.setItem('nx-displaygrid:prefs:user-a:desktop', '{"v":1}');
        localStorage.setItem('nx-displaygrid:data:user-a:mobile', '{"meta":{"updatedAt":2}}');

        class TestCard {}
        applyPersistence(TestCard);
        const card = new TestCard();
        card._hass = { user: { id: 'user-a' } };
        card._callWsSet = async () => true;
        card._showToast = () => {};
        card._applyConfigImmediate = () => {};
        card.requestUpdate = () => {};
        card._personFilterSet = new Set();

        await card._resetAll('user-a');

        assert.equal(localStorage.getItem('nx-displaygrid:config:user-a'), null);
        assert.equal(localStorage.getItem('nx-displaygrid:prefs:user-a'), null);
        assert.equal(localStorage.getItem('nx-displaygrid:data:user-a'), null);
        assert.equal(localStorage.getItem('nx-displaygrid:config:user-a:desktop'), null);
        assert.equal(localStorage.getItem('nx-displaygrid:config:user-a:mobile'), null);
        assert.equal(localStorage.getItem('nx-displaygrid:prefs:user-a:desktop'), null);
        assert.equal(localStorage.getItem('nx-displaygrid:data:user-a:mobile'), null);
    }));
