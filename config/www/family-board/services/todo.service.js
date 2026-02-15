/* Family Board - todo service
 * SPDX-License-Identifier: MIT
 */

import { TodoListServiceBase } from './todo-list.service.js';

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
        await hass.callService('todo', 'remove_completed_items', { entity_id: resolved });
    }
}
