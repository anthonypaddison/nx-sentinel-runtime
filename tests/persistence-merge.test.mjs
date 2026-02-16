import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPersistence } from '../config/www/nx-displaygrid/nx-displaygrid.persistence.js';

class TestCard {}
applyPersistence(TestCard);

test('mergeConfig keeps explicit empty calendars override', () => {
    const card = new TestCard();
    const base = {
        calendars: [{ entity: 'calendar.family' }],
    };
    const override = {
        calendars: [],
    };
    const merged = card._mergeConfig(base, override);
    assert.deepEqual(merged.calendars, []);
});

test('mergeConfig keeps explicit empty people override', () => {
    const card = new TestCard();
    const base = {
        people: [{ id: 'alex', name: 'Alex' }],
    };
    const override = {
        people: [],
    };
    const merged = card._mergeConfig(base, override);
    assert.deepEqual(merged.people, []);
});

test('mergeConfig keeps base calendars when calendars key is missing', () => {
    const card = new TestCard();
    const base = {
        calendars: [{ entity: 'calendar.family' }],
        people: [{ id: 'alex', name: 'Alex' }],
    };
    const override = {
        people: [{ id: 'sam', name: 'Sam' }],
    };
    const merged = card._mergeConfig(base, override);
    assert.deepEqual(merged.calendars, base.calendars);
    assert.deepEqual(merged.people, override.people);
});

test('mergeConfig handles null or undefined override safely', () => {
    const card = new TestCard();
    const base = {
        calendars: [{ entity: 'calendar.family' }],
        people: [{ id: 'alex', name: 'Alex' }],
    };

    const mergedFromNull = card._mergeConfig(base, null);
    assert.deepEqual(mergedFromNull, base);

    const mergedFromUndefined = card._mergeConfig(base, undefined);
    assert.deepEqual(mergedFromUndefined, base);
});
