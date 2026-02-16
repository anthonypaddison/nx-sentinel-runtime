/* nx-displaygrid - shopping helpers
 * SPDX-License-Identifier: MIT
 */
import { DEFAULT_COMMON_ITEMS } from './nx-displaygrid.defaults.js';
import { todoItemText } from './nx-displaygrid.util.js';

export function applyShopping(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        async _addShoppingItem(text) {
            const parsed = this._parseShoppingText(text);
            const base = parsed.base;
            if (!base) return;
            const existing = this._findShoppingItemByName(base);
            if (existing) {
                const nextQty = existing.parsed.qty + parsed.qty;
                const nextText = this._formatShoppingText(existing.parsed.base, nextQty);
                await this._updateShoppingItemText(existing.item, nextText);
                return;
            }
            const formatted = this._formatShoppingText(base, parsed.qty);
            const optimistic = this._optimisticShoppingAdd(formatted);
            try {
                await this._shoppingService.addItem(this._hass, this._config?.shopping, formatted);
            } catch (error) {
                this._optimisticShoppingRemove(optimistic);
                this._reportError?.('Add shopping item', error);
            } finally {
                await this._refreshShopping();
            }
        },

        async _addShoppingFavourites() {
            const favs = Array.isArray(this._shoppingFavourites) ? this._shoppingFavourites : [];
            const common = Array.isArray(this._shoppingCommon) ? this._shoppingCommon : [];
            const items = [];
            const seen = new Set();
            for (const item of [...favs, ...common]) {
                const text = String(item || '').trim();
                if (!text) continue;
                const key = text.toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                items.push(text);
            }
            for (const item of items) {
                await this._addShoppingItem(item);
            }
        },

        async _clearShoppingList() {
            const list = Array.isArray(this._shoppingItems) ? [...this._shoppingItems] : [];
            if (!list.length) return;
            this._shoppingItems = [];
            this.requestUpdate();
            const results = await Promise.allSettled(
                list.map((item) =>
                    this._shoppingService.removeItem(this._hass, this._config?.shopping, item)
                )
            );
            const failed = [];
            results.forEach((result, idx) => {
                if (result.status !== 'rejected') return;
                if (this._isMissingTodoItemError(result.reason)) return;
                failed.push(list[idx]);
            });
            if (failed.length) {
                this._shoppingItems = failed;
                this._reportError?.(
                    'Clear shopping list',
                    new Error('One or more items failed to clear')
                );
            }
            await this._refreshShopping();
        },

        async _toggleShoppingItem(item, completed) {
            if (!item) return;
            const previousStatus = item.status;
            let ok = false;
            this._optimisticShoppingStatus(item, completed);
            if (!completed) {
                this._clearShoppingRemoval(item);
            }
            try {
                await this._shoppingService.setStatus(
                    this._hass,
                    this._config?.shopping,
                    item,
                    completed
                );
                ok = true;
            } catch (error) {
                const wasComplete = ['completed', 'done'].includes(
                    String(previousStatus || '').toLowerCase()
                );
                this._optimisticShoppingStatus(item, wasComplete);
                this._clearShoppingRemoval(item);
                this._reportError?.('Update shopping item', error);
            } finally {
                if (ok && completed) {
                    this._scheduleShoppingRemoval(item);
                } else {
                    await this._refreshShopping();
                }
            }
        },

        async _editShoppingItem(item) {
            if (!item) return;
            this._closeAllDialogs();
            this._dialogOpen = true;
            this._dialogMode = 'shopping-edit';
            this._dialogTitle = 'Edit item';
            this._dialogItem = item;
            this._dialogEntity = this._config?.shopping?.entity || '';
        },

        async _deleteShoppingItem(item) {
            if (!item) return;
            const previousList = Array.isArray(this._shoppingItems) ? [...this._shoppingItems] : [];
            this._clearShoppingRemoval(item);
            this._optimisticShoppingRemove(item);
            try {
                await this._shoppingService.removeItem(this._hass, this._config?.shopping, item);
            } catch (error) {
                if (!this._isMissingTodoItemError(error)) {
                    this._restoreShoppingList(previousList);
                    this._reportError?.('Delete shopping item', error);
                }
            } finally {
                await this._refreshShopping();
            }
        },

        _toggleShoppingFavourite(name) {
            const parsed = this._parseShoppingText(name);
            const text = String(parsed.base || '').trim();
            if (!text) return;
            const key = text.toLowerCase();
            const favs = Array.isArray(this._shoppingFavourites) ? this._shoppingFavourites : [];
            const common = Array.isArray(this._shoppingCommon) ? this._shoppingCommon : [];
            const exists =
                favs.some((item) => String(item).toLowerCase() === key) ||
                common.some((item) => String(item).toLowerCase() === key);
            if (exists) {
                this._shoppingFavourites = favs.filter(
                    (item) => String(item).toLowerCase() !== key
                );
                this._shoppingCommon = common.filter((item) => String(item).toLowerCase() !== key);
            } else {
                this._shoppingFavourites = [text, ...favs];
                this._trackShoppingCommon(text);
            }
            this._savePrefs();
            this.requestUpdate();
        },

        _trackShoppingCommon(text) {
            const name = String(text || '').trim();
            if (!name) return;
            const key = name.toLowerCase();
            const list = Array.isArray(this._shoppingCommon) ? this._shoppingCommon : [];
            if (list.some((item) => String(item).toLowerCase() === key)) return;
            this._shoppingCommon = [name, ...list].slice(0, 50);
            this._savePrefs();
        },

        _removeShoppingCommon(name) {
            const text = String(name || '').trim();
            if (!text) return;
            const key = text.toLowerCase();
            const list = Array.isArray(this._shoppingCommon) ? this._shoppingCommon : [];
            this._shoppingCommon = list.filter((item) => String(item).toLowerCase() !== key);
            this._savePrefs();
            this.requestUpdate();
        },

        _resetShoppingFavouritesDefaults() {
            this._shoppingFavourites = [];
            this._shoppingCommon = DEFAULT_COMMON_ITEMS.slice();
            this._savePrefs();
            this.requestUpdate();
        },

        _clearShoppingFavourites() {
            this._shoppingFavourites = [];
            this._shoppingCommon = [];
            this._savePrefs();
            this.requestUpdate();
        },

        _shoppingItemText(item) {
            return todoItemText(item);
        },

        _parseShoppingText(text) {
            const raw = String(text || '').trim();
            if (!raw) return { base: '', qty: 1 };
            const match = raw.match(/^(.*?)(?:\s+x(\d+))$/i);
            if (!match) return { base: raw, qty: 1 };
            const base = String(match[1] || '').trim();
            const qty = Math.max(1, Number(match[2] || 1));
            if (!base) return { base: raw, qty: 1 };
            return { base, qty };
        },

        _formatShoppingText(base, qty) {
            const name = String(base || '').trim();
            if (!name) return '';
            const count = Number.isFinite(qty) ? Math.max(1, Number(qty)) : 1;
            if (count <= 1) return name;
            return `${name} x${count}`;
        },

        _findShoppingItemByName(baseName) {
            const key = String(baseName || '').trim().toLowerCase();
            if (!key) return null;
            const list = Array.isArray(this._shoppingItems) ? this._shoppingItems : [];
            for (const item of list) {
                const parsed = this._parseShoppingText(this._shoppingItemText(item));
                if (parsed.base.toLowerCase() === key) return { item, parsed };
            }
            return null;
        },

        _buildShoppingItem(text) {
            return {
                summary: text,
                name: text,
                item: text,
                status: 'needs_action',
            };
        },

        async _updateShoppingItemText(item, text) {
            if (!item || !text) return;
            const previousText = this._shoppingItemText(item);
            this._optimisticShoppingUpdate(item, text);
            this._shoppingRefreshHoldUntil = Date.now() + 1500;
            const supportsUpdate = this._supportsService('todo', 'update_item');
            try {
                if (supportsUpdate) {
                    await this._shoppingService.updateItem(
                        this._hass,
                        this._config?.shopping,
                        item ?? previousText,
                        {
                            rename: text,
                        }
                    );
                } else {
                    await this._shoppingService.removeItem(
                        this._hass,
                        this._config?.shopping,
                        item ?? previousText
                    );
                    await this._shoppingService.addItem(this._hass, this._config?.shopping, text);
                }
            } catch (error) {
                if (this._isMissingTodoItemError(error)) {
                    await this._refreshShopping({ force: true });
                    return;
                }
                if (previousText) this._optimisticShoppingUpdate(item, previousText);
                this._reportError?.('Edit shopping item', error);
            } finally {
                if (!supportsUpdate) {
                    await this._refreshShopping();
                }
            }
        },

        async _adjustShoppingQuantity(item, delta) {
            if (!item || !delta) return;
            const parsed = this._parseShoppingText(this._shoppingItemText(item));
            const nextQty = parsed.qty + Number(delta);
            if (nextQty <= 0) {
                await this._deleteShoppingItem(item);
                return;
            }
            const nextText = this._formatShoppingText(parsed.base, nextQty);
            await this._updateShoppingItemText(item, nextText);
        },

        _clearShoppingRemoval(item) {
            if (!item) return;
            const timer = this._shoppingRemoveTimers?.get(item);
            if (timer) clearTimeout(timer);
            if (this._shoppingRemoveTimers) this._shoppingRemoveTimers.delete(item);
            if (typeof item === 'object') {
                item._fbPendingRemove = false;
                item._fbRemoving = false;
            }
            this.requestUpdate();
        },

        _scheduleShoppingRemoval(item) {
            if (!item) return;
            this._clearShoppingRemoval(item);
            if (typeof item === 'object') {
                item._fbPendingRemove = true;
                item._fbRemoving = false;
            }
            const previousList = Array.isArray(this._shoppingItems)
                ? [...this._shoppingItems]
                : [];
            this.requestUpdate();
            const timer = setTimeout(() => {
                if (typeof item === 'object') {
                    item._fbRemoving = true;
                    this.requestUpdate();
                }
                setTimeout(async () => {
                    this._optimisticShoppingRemove(item);
                    try {
                        await this._shoppingService.removeItem(
                            this._hass,
                            this._config?.shopping,
                            item
                        );
                    } catch (error) {
                        if (!this._isMissingTodoItemError(error)) {
                            this._restoreShoppingList(previousList);
                            this._reportError?.('Remove shopping item', error);
                        }
                    } finally {
                        if (this._shoppingRemoveTimers) this._shoppingRemoveTimers.delete(item);
                        await this._refreshShopping();
                    }
                }, 300);
            }, 10_000);
            if (this._shoppingRemoveTimers) this._shoppingRemoveTimers.set(item, timer);
        },
    });
}
