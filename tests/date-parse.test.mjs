import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDateOnly } from '../src/nx-displaygrid.util.js';

test('parseDateOnly accepts valid dates', () => {
    const value = parseDateOnly('2026-02-28');
    assert.ok(value instanceof Date);
    assert.equal(value.getFullYear(), 2026);
    assert.equal(value.getMonth(), 1);
    assert.equal(value.getDate(), 28);
});

test('parseDateOnly rejects impossible dates', () => {
    assert.equal(parseDateOnly('2026-02-31'), null);
    assert.equal(parseDateOnly('2025-02-29'), null);
    assert.equal(parseDateOnly('2026-13-01'), null);
    assert.equal(parseDateOnly('2026-00-10'), null);
});

test('parseDateOnly handles leap years correctly', () => {
    const leap = parseDateOnly('2024-02-29');
    assert.ok(leap instanceof Date);
    assert.equal(leap.getFullYear(), 2024);
    assert.equal(leap.getMonth(), 1);
    assert.equal(leap.getDate(), 29);
});
