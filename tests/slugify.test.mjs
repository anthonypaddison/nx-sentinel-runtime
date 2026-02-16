import test from 'node:test';
import assert from 'node:assert/strict';
import { slugifyId } from '../src/nx-displaygrid.util.js';

test('slugifyId normalizes ids', () => {
    assert.equal(slugifyId('Person One'), 'person_one');
    assert.equal(slugifyId('  Person--Two  '), 'person_two');
    assert.equal(slugifyId('JOY!'), 'joy');
});

test('slugifyId handles empty input', () => {
    assert.equal(slugifyId(''), '');
    assert.equal(slugifyId(null), '');
});
