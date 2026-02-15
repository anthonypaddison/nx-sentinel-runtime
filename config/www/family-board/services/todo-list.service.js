/* Family Board - shared todo-list service helpers
 * SPDX-License-Identifier: MIT
 */

import { debugLog } from '../family-board.util.js';

export class TodoListServiceBase {
    constructor({ debug = false, resolveEntityId, entityLabel = 'entity' } = {}) {
        this.debug = debug;
        this._resolveEntityIdFn = resolveEntityId;
        this._entityLabel = entityLabel;
    }

    _resolveEntityId(source) {
        const entityId = this._resolveEntityIdFn ? this._resolveEntityIdFn(source) : source;
        if (!entityId) throw new Error(`Missing ${this._entityLabel} entityId`);
        return entityId;
    }

    normalizeItemRef(item) {
        if (typeof item === 'string') return item;
        if (typeof item === 'number' || typeof item === 'boolean') return String(item);
        if (item && typeof item === 'object') {
            const ref = item.id || item.uid || item.item || item.summary || item.name;
            if (ref) return String(ref);
        }
        return String(item ?? '');
    }

    _itemKeys(item) {
        if (!item || typeof item !== 'object') return [];
        return Object.keys(item);
    }

    _parseItemsResponse(res) {
        const payload = res?.response ?? res;
        if (!payload) return [];

        if (Array.isArray(payload)) return payload;

        if (payload.items && Array.isArray(payload.items)) return payload.items;

        if (typeof payload === 'object') {
            const first = Object.values(payload)[0];
            if (first?.items && Array.isArray(first.items)) return first.items;
        }

        return [];
    }

    async fetchItems(hass, source, { force = false } = {}) {
        if (!hass) throw new Error('Missing hass');
        const entityId = this._resolveEntityId(source);

        if (force) {
            try {
                await hass.callService('homeassistant', 'update_entity', {
                    entity_id: entityId,
                });
            } catch {
                // Ignore update errors; continue with fetch.
            }
        }

        // HA now requires return_response for get_items actions
        const msg = {
            type: 'call_service',
            domain: 'todo',
            service: 'get_items',
            service_data: { entity_id: entityId },
            return_response: true,
        };

        const res = await hass.connection.sendMessagePromise(msg);
        return this._parseItemsResponse(res);
    }

    async addItem(hass, source, text, options = {}) {
        if (!hass) throw new Error('Missing hass');
        if (!text) throw new Error(`Missing ${this._entityLabel} text`);
        const entityId = this._resolveEntityId(source);

        const payload = { entity_id: entityId, item: text };
        if (options.dueDate) payload.due_date = options.dueDate;
        if (options.dueDateTime) payload.due_datetime = options.dueDateTime;
        if (options.dueString) payload.due_string = options.dueString;
        await hass.callService('todo', 'add_item', payload);
    }

    async updateItem(hass, source, item, updates = {}) {
        if (!hass) throw new Error('Missing hass');
        if (!item) throw new Error('Missing item');
        const entityId = this._resolveEntityId(source);

        const ref = this.normalizeItemRef(item);
        const payload = { entity_id: entityId, item: ref };
        const rename = updates?.rename ?? updates?.name ?? updates?.summary;
        if (rename) payload.rename = rename;
        if (updates?.status) payload.status = updates.status;
        if (updates?.dueDate) payload.due_date = updates.dueDate;
        if (updates?.dueDateTime) payload.due_datetime = updates.dueDateTime;
        if (updates?.dueString) payload.due_string = updates.dueString;
        debugLog(this.debug, 'Todo list update_item', {
            entityId,
            ref,
            keys: this._itemKeys(item),
            payloadKeys: Object.keys(payload),
        });
        await hass.callService('todo', 'update_item', payload);
    }

    async removeItem(hass, source, item) {
        if (!hass) throw new Error('Missing hass');
        if (!item) throw new Error('Missing item');
        const entityId = this._resolveEntityId(source);

        const ref = this.normalizeItemRef(item);
        debugLog(this.debug, 'Todo list remove_item', {
            entityId,
            ref,
            keys: this._itemKeys(item),
        });
        await hass.callService('todo', 'remove_item', { entity_id: entityId, item: ref });
    }

    async setStatus(hass, source, item, completed) {
        if (!hass) throw new Error('Missing hass');
        if (!item) throw new Error('Missing item');
        const entityId = this._resolveEntityId(source);

        await this.updateItem(hass, entityId, item, {
            status: completed ? 'completed' : 'needs_action',
        });
    }

    async renameItem(hass, source, item, text, options = {}) {
        if (!hass) throw new Error('Missing hass');
        if (!item) throw new Error('Missing item');
        if (!text) throw new Error('Missing text');
        const entityId = this._resolveEntityId(source);

        await this.updateItem(hass, entityId, item, { rename: text, ...options });
    }
}
