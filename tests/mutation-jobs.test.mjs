import test from 'node:test';
import assert from 'node:assert/strict';
import { applyJobs } from '../config/www/nx-displaygrid/nx-displaygrid.jobs.js';

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

function createCard(hass) {
    class Card {}
    applyJobs(Card);
    const card = new Card();
    card._hass = hass;
    card._showToast = () => {};
    card._reportError = () => {};
    return card;
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

const QUEUE_KEY = 'nx-displaygrid:mutation-jobs:user-a';

test('mutation jobs queue processes service and websocket jobs in order', async () =>
    withLocalStorage(async () => {
        const calls = [];
        const card = createCard({
            user: { id: 'user-a' },
            callService: async (domain, service, data) => {
                calls.push({ kind: 'service', domain, service, data });
            },
            callWS: async (message) => {
                calls.push({ kind: 'ws', type: message.type, config: message.config });
            },
        });

        await Promise.all([
            card._queueCallService('todo', 'add_item', { entity_id: 'todo.house', item: 'Milk' }),
            card._queueCallWs({ type: 'nx_displaygrid/config/set', config: { title: 'Family Dashboard' } }),
            card._queueCallService('light', 'turn_off', { entity_id: 'light.kitchen' }),
        ]);

        assert.deepEqual(calls, [
            {
                kind: 'service',
                domain: 'todo',
                service: 'add_item',
                data: { entity_id: 'todo.house', item: 'Milk' },
            },
            {
                kind: 'ws',
                type: 'nx_displaygrid/config/set',
                config: { title: 'Family Dashboard' },
            },
            {
                kind: 'service',
                domain: 'light',
                service: 'turn_off',
                data: { entity_id: 'light.kitchen' },
            },
        ]);
        assert.equal(global.localStorage.getItem(QUEUE_KEY), null);
    }));

test('mutation jobs queue resumes persisted jobs after a new card instance is created', async () =>
    withLocalStorage(async () => {
        const firstCard = createCard({
            user: { id: 'user-a' },
            callService: async () => new Promise(() => {}),
            callWS: async () => {},
        });

        const queuedPromise = firstCard._queueCallService('todo', 'add_item', {
            entity_id: 'todo.house',
            item: 'Bread',
        });
        await Promise.resolve();

        const rawQueue = global.localStorage.getItem(QUEUE_KEY);
        assert.equal(typeof rawQueue, 'string');
        assert.equal(Array.isArray(JSON.parse(rawQueue)), true);
        assert.equal(JSON.parse(rawQueue).length, 1);

        const resumedCalls = [];
        const secondCard = createCard({
            user: { id: 'user-a' },
            callService: async (domain, service, data) => {
                resumedCalls.push({ domain, service, data });
            },
            callWS: async () => {},
        });

        secondCard._resumeMutationJobQueue();
        await secondCard._mutationJobQueueWorker;

        assert.deepEqual(resumedCalls, [
            {
                domain: 'todo',
                service: 'add_item',
                data: { entity_id: 'todo.house', item: 'Bread' },
            },
        ]);
        assert.equal(global.localStorage.getItem(QUEUE_KEY), null);

        void queuedPromise;
    }));
