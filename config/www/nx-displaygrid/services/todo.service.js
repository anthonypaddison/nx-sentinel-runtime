/* nx-displaygrid - todo service
 * SPDX-License-Identifier: MIT
 */

import { TodoListServiceBase } from './todo-list.service.js';

async function callTodoService(hass, domain, service, data, label) {
    if (typeof hass?.queueCallService === 'function') {
        await hass.queueCallService(domain, service, data, { label });
        return;
    }
    await hass.callService(domain, service, data);
}

export class TodoService extends TodoListServiceBase {
    constructor({ debug = false } = {}) {
        super({
            debug,
            resolveEntityId: (entityId) => entityId,
            entityLabel: 'todo',
        });
    }

    async clearCompleted(hass, entityId) {
        if (!hass) throw new Error('Missing hass');
        const resolved = this._resolveEntityId(entityId);
        await callTodoService(
            hass,
            'todo',
            'remove_completed_items',
            { entity_id: resolved },
            `Clear completed in ${resolved}`
        );
    }
}
