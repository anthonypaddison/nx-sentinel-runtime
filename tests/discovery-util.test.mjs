import test from 'node:test';
import assert from 'node:assert/strict';
import {
    discoverEntities,
    suggestShoppingEntity,
    suggestSetup,
} from '../config/www/nx-displaygrid/util/discovery.util.js';

test('discoverEntities returns calendar and todo domains only', () => {
    const hass = {
        states: {
            'calendar.work': {},
            'todo.chores': {},
            'light.kitchen': {},
        },
    };
    const result = discoverEntities(hass);
    assert.deepEqual(result.calendars, ['calendar.work']);
    assert.deepEqual(result.todos, ['todo.chores']);
});

test('suggestShoppingEntity prefers shopping-like names', () => {
    const hass = {
        states: {
            'todo.house': { attributes: { friendly_name: 'House Tasks' } },
            'todo.shopping_list': { attributes: { friendly_name: 'Shopping List' } },
        },
    };
    const result = suggestShoppingEntity(hass);
    assert.deepEqual(result, { entity: 'todo.shopping_list', name: 'Shopping List' });
});

test('suggestSetup maps entities into people/calendars/todos/shopping', () => {
    const hass = {
        states: {
            'calendar.family': { attributes: { friendly_name: 'Family Calendar' } },
            'calendar.routine': { attributes: { friendly_name: 'Routine Calendar' } },
            'todo.shopping': { attributes: { friendly_name: 'Shopping' } },
            'todo.alex_tasks': { attributes: { friendly_name: 'Alex Tasks' } },
        },
    };
    const setup = suggestSetup(hass);

    assert.ok(Array.isArray(setup.people));
    assert.ok(setup.people.length >= 1);
    assert.equal(setup.shopping?.entity, 'todo.shopping');
    assert.ok(setup.calendars.some((c) => c.entity === 'calendar.family' && c.role === 'family'));
    assert.ok(setup.calendars.some((c) => c.entity === 'calendar.routine' && c.role === 'routine'));
    assert.ok(setup.todos.some((t) => t.entity === 'todo.alex_tasks'));
});

