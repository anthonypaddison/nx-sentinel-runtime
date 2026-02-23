import test from 'node:test';
import assert from 'node:assert/strict';
import {
    configHasPeople,
    configHasSources,
    configHasSourceData,
} from '../config/www/nx-displaygrid/util/source-validation.util.js';

test('configHasPeople detects configured people only', () => {
    assert.equal(configHasPeople(null), false);
    assert.equal(configHasPeople({ people: [] }), false);
    assert.equal(configHasPeople({ people: [{ id: 'alex' }] }), true);
});

test('configHasSources detects calendars, todos, or shopping entity', () => {
    assert.equal(configHasSources({}), false);
    assert.equal(configHasSources({ calendars: [{ entity: 'calendar.home' }] }), true);
    assert.equal(configHasSources({ todos: [{ entity: 'todo.chores' }] }), true);
    assert.equal(configHasSources({ shopping: { entity: 'todo.shopping' } }), true);
    assert.equal(configHasSources({ shopping: { entity: '' } }), false);
});

test('configHasSourceData combines people and source checks', () => {
    assert.equal(configHasSourceData(undefined), false);
    assert.equal(configHasSourceData({ title: 'Only title' }), false);
    assert.equal(configHasSourceData({ people: [{ id: 'a' }] }), true);
    assert.equal(configHasSourceData({ shopping: { entity: 'todo.shopping' } }), true);
});
