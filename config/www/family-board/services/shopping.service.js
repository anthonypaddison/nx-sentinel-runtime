/* Family Board - shopping list service
 * SPDX-License-Identifier: MIT
 */

import { TodoListServiceBase } from './todo-list.service.js';

export class ShoppingService extends TodoListServiceBase {
    constructor({ debug = false } = {}) {
        super({
            debug,
            resolveEntityId: (shoppingConfig) =>
                (typeof shoppingConfig === 'object' && shoppingConfig?.entity) ||
                (typeof shoppingConfig === 'string' ? shoppingConfig : null),
            entityLabel: 'shopping',
        });
    }
}
