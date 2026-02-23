import test from 'node:test';
import assert from 'node:assert/strict';
import { compareTimedEventPosition } from '../config/www/nx-displaygrid/nx-displaygrid.util.js';

test('compareTimedEventPosition sorts by start then end then key', () => {
    const items = [
        { startMin: 60, endMin: 90, _fbKey: 'b' },
        { startMin: 30, endMin: 40, _fbKey: 'z' },
        { startMin: 60, endMin: 80, _fbKey: 'c' },
        { startMin: 60, endMin: 80, _fbKey: 'a' },
    ];
    const sorted = [...items].sort(compareTimedEventPosition);
    assert.deepEqual(
        sorted.map((i) => i._fbKey),
        ['z', 'a', 'c', 'b']
    );
});
