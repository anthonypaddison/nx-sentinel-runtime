import test from 'node:test';
import assert from 'node:assert/strict';
import { TodoListServiceBase } from '../config/www/nx-displaygrid/services/todo-list.service.js';

function createService() {
    return new TodoListServiceBase({
        resolveEntityId: (entityId) => entityId,
        entityLabel: 'todo',
    });
}

test('TodoListServiceBase parses array and wrapped payload variants', () => {
    const service = createService();
    const list = [{ item: 'A' }];

    assert.deepEqual(service._parseItemsResponse(list), list);
    assert.deepEqual(service._parseItemsResponse({ items: list }), list);
    assert.deepEqual(service._parseItemsResponse({ response: { items: list } }), list);
    assert.deepEqual(service._parseItemsResponse({ response: { abc: { items: list } } }), list);
    assert.deepEqual(service._parseItemsResponse({ response: {} }), []);
});

test('TodoListServiceBase fetchItems sends return_response and supports force update', async () => {
    const calls = [];
    const messages = [];
    const service = createService();
    const hass = {
        callService: async (...args) => calls.push(args),
        connection: {
            sendMessagePromise: async (msg) => {
                messages.push(msg);
                return { response: { items: [{ item: 'Milk' }] } };
            },
        },
    };

    const result = await service.fetchItems(hass, 'todo.shopping', { force: true });
    assert.deepEqual(result, [{ item: 'Milk' }]);
    assert.deepEqual(calls[0], ['homeassistant', 'update_entity', { entity_id: 'todo.shopping' }]);
    assert.equal(messages[0].return_response, true);
    assert.equal(messages[0].service, 'get_items');
});

