import test from 'node:test';
import assert from 'node:assert/strict';
import { isControllableEntity } from '../config/www/nx-displaygrid/nx-displaygrid.util.js';

test('isControllableEntity rejects missing state or unsupported domains', () => {
    const hass = {
        states: {
            'sensor.temp': {},
            'binary_sensor.door': {},
            'light.kitchen': {},
        },
        services: {
            light: { turn_on: {}, turn_off: {} },
        },
    };

    assert.equal(isControllableEntity(null, 'light.kitchen'), false);
    assert.equal(isControllableEntity(hass, ''), false);
    assert.equal(isControllableEntity(hass, 'sensor.temp'), false);
    assert.equal(isControllableEntity(hass, 'binary_sensor.door'), false);
    assert.equal(isControllableEntity(hass, 'switch.missing'), false);
});

test('isControllableEntity accepts allowed domains with toggle or on/off services', () => {
    const hass = {
        states: {
            'light.kitchen': {},
            'switch.boiler': {},
            'input_boolean.away_mode': {},
            'fan.office': {},
        },
        services: {
            light: { turn_on: {}, turn_off: {} },
            switch: { toggle: {} },
            input_boolean: { turn_on: {}, turn_off: {} },
            fan: { turn_on: {}, turn_off: {} },
        },
    };

    assert.equal(isControllableEntity(hass, 'light.kitchen'), true);
    assert.equal(isControllableEntity(hass, 'switch.boiler'), true);
    assert.equal(isControllableEntity(hass, 'input_boolean.away_mode'), true);
    assert.equal(isControllableEntity(hass, 'fan.office'), true);
});

test('isControllableEntity is permissive when service registry is unavailable', () => {
    const hass = {
        states: { 'light.kitchen': {} },
    };
    assert.equal(isControllableEntity(hass, 'light.kitchen'), true);
});
