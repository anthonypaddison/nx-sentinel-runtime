import test from 'node:test';
import assert from 'node:assert/strict';
import { NX_DISPLAYGRID_WS } from '../config/www/nx-displaygrid/util/ws-protocol.util.js';

test('nx-displaygrid websocket command names are stable', () => {
    assert.deepEqual(NX_DISPLAYGRID_WS, {
        GET_CONFIG: 'nx_displaygrid/config/get',
        SET_CONFIG: 'nx_displaygrid/config/set',
    });
});
