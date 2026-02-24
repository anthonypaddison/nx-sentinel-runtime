import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeNxDisplaygridCardConfig } from '../config/www/nx-displaygrid/util/config-yaml.util.js';

test('serializeNxDisplaygridCardConfig omits optional background theme and home controls by default', () => {
    const yaml = serializeNxDisplaygridCardConfig({
        title: 'Test Board',
        background_theme: 'mint',
        home_controls: ['light.kitchen'],
        admin_pin: 'sha256$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa$bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        shopping: { entity: 'todo.shopping' },
    });
    assert.match(yaml, /type: custom:nx-displaygrid/);
    assert.match(yaml, /days_to_show: 5/);
    assert.match(yaml, /title: 'Test Board'/);
    assert.match(yaml, /shopping:\n  entity: 'todo\.shopping'/);
    assert.doesNotMatch(yaml, /background_theme:/);
    assert.doesNotMatch(yaml, /home_controls:/);
    assert.doesNotMatch(yaml, /admin_pin:/);
});

test('serializeNxDisplaygridCardConfig includes optional sections when requested', () => {
    const yaml = serializeNxDisplaygridCardConfig(
        {
            background_theme: 'sand',
            home_controls: ['light.kitchen', 'switch.boiler'],
            people: [{ id: 'alex', name: 'Alex', header_row: 1 }],
        },
        { includeBackgroundTheme: true, includeHomeControls: true }
    );
    assert.match(yaml, /background_theme: 'sand'/);
    assert.match(yaml, /home_controls:\n  - 'light\.kitchen'\n  - 'switch\.boiler'/);
    assert.match(yaml, /people:\n  - id: 'alex'\n    name: 'Alex'\n    header_row: 1/);
});
