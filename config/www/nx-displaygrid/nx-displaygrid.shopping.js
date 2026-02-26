/* nx-displaygrid - shopping helpers
 * SPDX-License-Identifier: MIT
 */
import { DEFAULT_COMMON_ITEMS } from './nx-displaygrid.defaults.js';
import { todoItemText } from './nx-displaygrid.util.js';

export function applyShopping(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _normaliseShoppingFavouriteEntry(value) {
            if (!value) return null;
            if (typeof value === 'object' && !Array.isArray(value)) {
                const parsed = this._parseShoppingText(
                    value.name || value.item || value.summary || ''
                );
                const name = String(parsed.base || '').trim();
                if (!name) return null;
                const qtyRaw = Number(value.qty ?? value.quantity ?? parsed.qty ?? 1);
                const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : parsed.qty || 1;
                return {
                    name,
                    qty: Math.round(qty * 100) / 100,
                };
            }
            const parsed = this._parseShoppingText(value);
            const name = String(parsed.base || '').trim();
            if (!name) return null;
            const qtyRaw = Number(parsed.qty || 1);
            const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
            return {
                name,
                qty: Math.round(qty * 100) / 100,
            };
        },

        _shoppingFavouriteEntries() {
            const raw = Array.isArray(this._shoppingFavourites) ? this._shoppingFavourites : [];
            const entries = [];
            const seen = new Set();
            for (const item of raw) {
                const entry = this._normaliseShoppingFavouriteEntry(item);
                if (!entry) continue;
                const key = String(entry.name || '').trim().toLowerCase();
                if (!key || seen.has(key)) continue;
                seen.add(key);
                entries.push(entry);
            }
            return entries;
        },

        _shoppingFavouriteQty(name) {
            const key = this._normaliseShoppingBase(name).toLowerCase();
            if (!key) return 1;
            const match = this._shoppingFavouriteEntries().find(
                (entry) => String(entry?.name || '').trim().toLowerCase() === key
            );
            return match?.qty || 1;
        },

        _setShoppingFavouriteQty(name, qty = 1) {
            const parsed = this._parseShoppingText(name);
            const base = this._normaliseShoppingBase(parsed.base);
            if (!base) return;
            const safeQtyRaw = Number(qty);
            const safeQty = Number.isFinite(safeQtyRaw) && safeQtyRaw > 0 ? safeQtyRaw : 1;
            const entries = this._shoppingFavouriteEntries();
            const key = base.toLowerCase();
            const idx = entries.findIndex(
                (entry) => String(entry.name || '').trim().toLowerCase() === key
            );
            const nextEntry = { name: base, qty: Math.round(safeQty * 100) / 100 };
            if (idx >= 0) entries.splice(idx, 1, nextEntry);
            else entries.unshift(nextEntry);
            this._shoppingFavourites = entries;
            this._trackShoppingCommon(base);
            this._savePrefs();
            this.requestUpdate();
        },

        _editShoppingFavourite(name, { nextName = '', qty = 1 } = {}) {
            const currentKey = this._normaliseShoppingBase(name).toLowerCase();
            const parsed = this._parseShoppingText(nextName || name);
            const replacementName = this._normaliseShoppingBase(parsed.base);
            if (!currentKey || !replacementName) return;
            const safeQtyRaw = Number(qty);
            const safeQty = Number.isFinite(safeQtyRaw) && safeQtyRaw > 0 ? safeQtyRaw : 1;
            const replacementKey = replacementName.toLowerCase();
            const entries = this._shoppingFavouriteEntries();
            const filtered = entries.filter((entry) => {
                const key = String(entry.name || '').trim().toLowerCase();
                return key !== currentKey && key !== replacementKey;
            });
            filtered.unshift({
                name: replacementName,
                qty: Math.round(safeQty * 100) / 100,
            });
            this._shoppingFavourites = filtered;
            const common = Array.isArray(this._shoppingCommon) ? this._shoppingCommon : [];
            this._shoppingCommon = common.map((item) => {
                const key = String(item || '').trim().toLowerCase();
                if (key === currentKey) return replacementName;
                return item;
            });
            this._trackShoppingCommon(replacementName);
            this._savePrefs();
            this.requestUpdate();
        },

        async _addShoppingItem(text) {
            const parsed = this._parseShoppingText(text);
            const base = parsed.base;
            if (!base) return;
            const existing = this._findShoppingItemByName(base);
            if (existing) {
                const merged = this._mergeShoppingQuantities(existing.parsed, parsed);
                const nextText = this._formatShoppingText(
                    existing.parsed.base,
                    merged.qty,
                    merged.unit
                );
                await this._updateShoppingItemText(existing.item, nextText);
                return;
            }
            const formatted = this._formatShoppingText(base, parsed.qty, parsed.unit);
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
            const favs = this._shoppingFavouriteEntries();
            const common = Array.isArray(this._shoppingCommon) ? this._shoppingCommon : [];
            const items = [];
            const seen = new Set();
            for (const item of favs) {
                const name = String(item?.name || '').trim();
                if (!name) continue;
                const key = name.toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                items.push(this._formatShoppingText(name, item?.qty || 1, ''));
            }
            for (const item of common) {
                const text = String(item || '').trim();
                if (!text) continue;
                const parsed = this._parseShoppingText(text);
                const key = String(parsed.base || '').trim().toLowerCase();
                if (!key || seen.has(key)) continue;
                seen.add(key);
                items.push(this._formatShoppingText(parsed.base, parsed.qty || 1, parsed.unit));
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

        _toggleShoppingFavourite(name, options = {}) {
            const parsed = this._parseShoppingText(name);
            const text = String(parsed.base || '').trim();
            if (!text) return;
            const key = text.toLowerCase();
            const qtyRaw = Number(options?.qty ?? parsed.qty ?? 1);
            const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
            const favs = this._shoppingFavouriteEntries();
            const common = Array.isArray(this._shoppingCommon) ? this._shoppingCommon : [];
            const exists =
                favs.some((item) => String(item?.name || '').trim().toLowerCase() === key) ||
                common.some((item) => String(item).toLowerCase() === key);
            if (exists) {
                this._shoppingFavourites = favs.filter(
                    (item) => String(item?.name || '').trim().toLowerCase() !== key
                );
                this._shoppingCommon = common.filter((item) => String(item).toLowerCase() !== key);
            } else {
                this._shoppingFavourites = [{ name: text, qty }, ...favs];
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
            if (!raw) return { base: '', qty: 1, unit: '' };

            const counted = raw.match(/^(.*?)(?:\s+x(\d+(?:\.\d+)?))$/i);
            if (counted) {
                const base = String(counted[1] || '').trim();
                const qty = Math.max(1, Number(counted[2] || 1));
                return { base: this._normaliseShoppingBase(base), qty, unit: '' };
            }

            const leading = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/.exec(raw);
            if (leading) {
                const base = this._normaliseShoppingBase(leading[3]);
                const qty = Math.max(1, Number(leading[1] || 1));
                const unit = this._canonicalShoppingUnit(leading[2] || '');
                return { base, qty, unit };
            }

            const trailing = /^(.+?)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/.exec(raw);
            if (trailing) {
                const base = this._normaliseShoppingBase(trailing[1]);
                const qty = Math.max(1, Number(trailing[2] || 1));
                const unit = this._canonicalShoppingUnit(trailing[3] || '');
                return { base, qty, unit };
            }

            return { base: this._normaliseShoppingBase(raw), qty: 1, unit: '' };
        },

        _formatShoppingText(base, qty, unit = '') {
            const name = String(base || '').trim();
            if (!name) return '';
            const count = Number.isFinite(qty) ? Math.max(1, Number(qty)) : 1;
            const safeUnit = this._canonicalShoppingUnit(unit);
            if (safeUnit) {
                const rounded = Math.round(count * 100) / 100;
                const qtyLabel = Number.isInteger(rounded) ? String(rounded) : String(rounded);
                return `${name} ${qtyLabel} ${safeUnit}`.trim();
            }
            if (count <= 1) return name;
            const rounded = Math.round(count * 100) / 100;
            const qtyLabel = Number.isInteger(rounded) ? String(rounded) : String(rounded);
            return `${name} x${qtyLabel}`;
        },

        _normaliseShoppingBase(baseName) {
            return String(baseName || '')
                .trim()
                .replace(/\s+/g, ' ');
        },

        _canonicalShoppingUnit(unit) {
            const raw = String(unit || '')
                .trim()
                .toLowerCase();
            if (!raw) return '';
            const map = {
                g: 'g',
                gram: 'g',
                grams: 'g',
                kg: 'kg',
                kilo: 'kg',
                kilos: 'kg',
                kilogram: 'kg',
                kilograms: 'kg',
                oz: 'oz',
                ounce: 'oz',
                ounces: 'oz',
                lb: 'lb',
                lbs: 'lb',
                pound: 'lb',
                pounds: 'lb',
                item: '',
                items: '',
                each: '',
                ea: '',
            };
            return map[raw] !== undefined ? map[raw] : raw;
        },

        _shoppingUnitFactor(unit) {
            const canonical = this._canonicalShoppingUnit(unit);
            const factors = {
                g: 1,
                kg: 1000,
                oz: 28.3495,
                lb: 453.592,
            };
            return factors[canonical] || 0;
        },

        _mergeShoppingQuantities(existingParsed, nextParsed) {
            const currentQty = Math.max(1, Number(existingParsed?.qty || 1));
            const nextQty = Math.max(1, Number(nextParsed?.qty || 1));
            const currentUnit = this._canonicalShoppingUnit(existingParsed?.unit || '');
            const nextUnit = this._canonicalShoppingUnit(nextParsed?.unit || '');
            if (!currentUnit && !nextUnit) {
                return { qty: currentQty + nextQty, unit: '' };
            }
            if (currentUnit === nextUnit) {
                return { qty: currentQty + nextQty, unit: currentUnit };
            }
            const currentFactor = this._shoppingUnitFactor(currentUnit);
            const nextFactor = this._shoppingUnitFactor(nextUnit);
            if (currentFactor > 0 && nextFactor > 0) {
                const combinedBase = currentQty * currentFactor + nextQty * nextFactor;
                const targetUnit = currentUnit || nextUnit;
                const targetFactor = this._shoppingUnitFactor(targetUnit) || 1;
                return { qty: combinedBase / targetFactor, unit: targetUnit };
            }
            if (!currentUnit && nextUnit) {
                return { qty: currentQty + nextQty, unit: nextUnit };
            }
            return { qty: currentQty + nextQty, unit: currentUnit || nextUnit };
        },

        _findShoppingItemByName(baseName) {
            const key = this._normaliseShoppingBase(baseName).toLowerCase();
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
            const nextText = this._formatShoppingText(parsed.base, nextQty, parsed.unit);
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
