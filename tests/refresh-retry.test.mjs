import test from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
    constructor() {
        this._map = new Map();
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
    key(index) {
        return Array.from(this._map.keys())[index] ?? null;
    }
    get length() {
        return this._map.size;
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

function withFakeTimers(fn) {
    const prevSetTimeout = global.setTimeout;
    const prevClearTimeout = global.clearTimeout;
    const timers = [];
    const cleared = [];
    global.setTimeout = (cb, ms) => {
        const timer = { cb, ms, cleared: false };
        timers.push(timer);
        return timer;
    };
    global.clearTimeout = (timer) => {
        if (timer) timer.cleared = true;
        cleared.push(timer);
    };
    return Promise.resolve()
        .then(() => fn({ timers, cleared }))
        .finally(() => {
            global.setTimeout = prevSetTimeout;
            global.clearTimeout = prevClearTimeout;
        });
}

async function makeRefreshCard() {
    const { applyRefresh } = await import('../config/www/nx-displaygrid/nx-displaygrid.refresh.js');
    class TestCard {}
    applyRefresh(TestCard);
    return new TestCard();
}

async function makeRefreshCardWithQueueSpy() {
    const card = await makeRefreshCard();
    card._queueRefreshCalls = [];
    card._queueRefresh = (args = {}) => {
        card._queueRefreshCalls.push(args);
    };
    return card;
}

test('todo retry scheduling sets retry flag, uses base delay, and clears state', async () =>
    withBrowserGlobals(async () =>
        withFakeTimers(async ({ timers, cleared }) => {
            const card = await makeRefreshCardWithQueueSpy();
            card._refreshIntervalMs = 300_000;
            card._todoRetryMs = 0;
            card._todoRetrying = false;
            card._todoRetryTimer = null;

            card._scheduleTodoRetry();

            assert.equal(timers.length, 1);
            assert.equal(timers[0].ms, 30_000);
            assert.equal(card._todoRetryMs, 30_000);
            assert.equal(card._todoRetrying, true);
            assert.ok(card._todoRetryTimer);

            // No duplicate timer while one is active.
            card._scheduleTodoRetry();
            assert.equal(timers.length, 1);

            card._clearTodoRetry();
            assert.equal(cleared.length, 1);
            assert.equal(card._todoRetryTimer, null);
            assert.equal(card._todoRetryMs, 0);
            assert.equal(card._todoRetrying, false);
        }))
);

test('calendar retry callback queues forced calendar refresh and keeps cap at refresh interval', async () =>
    withBrowserGlobals(async () =>
        withFakeTimers(async ({ timers }) => {
            const card = await makeRefreshCardWithQueueSpy();
            card._refreshIntervalMs = 10_000;
            card._calendarRetryMs = 0;
            card._calendarRetryTimer = null;

            card._scheduleCalendarRetry();
            assert.equal(timers.length, 1);
            assert.equal(timers[0].ms, 10_000);
            assert.equal(card._calendarRetryMs, 10_000);

            timers[0].cb();
            assert.equal(card._calendarRetryTimer, null);
            assert.deepEqual(card._queueRefreshCalls, [{ forceCalendars: true, reason: 'retry' }]);

            card._scheduleCalendarRetry();
            assert.equal(timers.length, 2);
            assert.equal(timers[1].ms, 10_000);
            assert.equal(card._calendarRetryMs, 10_000);
        }))
);

test('shopping retry uses extended cap and toggles retrying flag around clear', async () =>
    withBrowserGlobals(async () =>
        withFakeTimers(async ({ timers }) => {
            const card = await makeRefreshCardWithQueueSpy();
            card._refreshIntervalMs = 10_000;
            card._shoppingRetryMs = 90_000;
            card._shoppingRetrying = false;
            card._shoppingRetryTimer = null;

            card._scheduleShoppingRetry();

            assert.equal(timers.length, 1);
            assert.equal(timers[0].ms, 120_000);
            assert.equal(card._shoppingRetryMs, 120_000);
            assert.equal(card._shoppingRetrying, true);

            timers[0].cb();
            assert.deepEqual(card._queueRefreshCalls, [{ reason: 'retry' }]);
            assert.equal(card._shoppingRetryTimer, null);

            card._clearShoppingRetry();
            assert.equal(card._shoppingRetryMs, 0);
            assert.equal(card._shoppingRetrying, false);
        }))
);

test('_queueRefresh marks pending refresh when a refresh is in flight', async () =>
    withBrowserGlobals(async () => {
        const card = await makeRefreshCard();
        card._refreshInFlight = true;
        card._refreshPending = false;
        card._refreshReasonPending = '';
        card._calendarForceNext = false;

        card._queueRefresh({ forceCalendars: true, reason: 'manual' });

        assert.equal(card._calendarForceNext, true);
        assert.equal(card._refreshPending, true);
        assert.equal(card._refreshReasonPending, 'manual');
    })
);
