/* nx-displaygrid - todo helpers
 * SPDX-License-Identifier: MIT
 */
import { debugLog, parseTodoDueInfo, todoItemText } from './nx-displaygrid.util.js';

export function applyTodoHelpers(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _buildTodoItem(text) {
            return {
                summary: text,
                name: text,
                item: text,
                status: 'needs_action',
                _fbKey: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            };
        },

        _buildTodoItemWithDue(text, dueDate) {
            const item = this._buildTodoItem(text);
            if (dueDate) {
                item.due = { date: dueDate };
                item.due_date = dueDate;
            }
            return item;
        },

        _todoItemKey(item) {
            if (!item || typeof item !== 'object') return '';
            return (
                item.id ||
                item.uid ||
                item._fbKey ||
                item.item ||
                item.summary ||
                item.name ||
                ''
            );
        },

        _todoItemText(item, fallback = '') {
            return todoItemText(item, fallback);
        },

        _todoItemDueInfo(item) {
            if (!item || typeof item !== 'object') return null;
            const due = item.due || item.due_date || item.due_datetime;
            return parseTodoDueInfo(due);
        },

        _todoItemDueKey(item) {
            const info = this._todoItemDueInfo(item);
            if (!info?.date) return '';
            const date = info.date;
            if (info.dateOnly) {
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            }
            return date.toISOString();
        },

        _todoItemsMatch(a, b) {
            if (!a || !b) return false;
            const keyA = this._todoItemKey(a);
            const keyB = this._todoItemKey(b);
            if (keyA && keyB && keyA === keyB) return true;

            const textA = this._todoItemText(a);
            const textB = this._todoItemText(b);
            if (!textA || !textB) return false;
            if (textA.toLowerCase() !== textB.toLowerCase()) return false;

            const dueA = this._todoItemDueKey(a);
            const dueB = this._todoItemDueKey(b);
            if (dueA && dueB) return dueA === dueB;
            if (!dueA && !dueB) return true;
            return false;
        },

        _logMissingTodoIds(entityId, items) {
            if (!this._debug) return;
            const list = Array.isArray(items) ? items : [];
            if (!list.length) return;
            const missing = list.filter((it) => !it?.id && !it?.uid).length;
            if (!missing) return;
            if (!this._todoMissingIdCounts) this._todoMissingIdCounts = new Map();
            const prev = this._todoMissingIdCounts.get(entityId);
            if (prev === missing) return;
            this._todoMissingIdCounts.set(entityId, missing);
            const sample = list.find((it) => !it?.id && !it?.uid);
            debugLog(this._debug, 'todo items missing id/uid', {
                entityId,
                missing,
                total: list.length,
                sample: this._todoItemText(sample, '(Todo)'),
            });
        },

        async _editTodoItem(entityId, item) {
            if (!entityId || !item) return;
            this._closeAllDialogs();
            this._dialogOpen = true;
            this._dialogMode = 'todo-edit';
            this._dialogTitle = 'Edit chore';
            this._dialogItem = item;
            this._dialogEntity = entityId;
        },

        async _deleteTodoItem(entityId, item) {
            if (!entityId || !item) return;
            const previousList = Array.isArray(this._todoItems?.[entityId])
                ? [...this._todoItems[entityId]]
                : [];
            this._optimisticTodoRemove(entityId, item);
            try {
                await this._todoService.removeItem(this._hass, entityId, item);
            } catch (error) {
                this._restoreTodoList(entityId, previousList);
                this._reportError?.('Delete chore', error);
            } finally {
                await this._refreshTodoEntity(entityId);
            }
        },

        _queueTodoStatusRetry(entityId, item, completed, previousDone) {
            if (!entityId || !item) return;
            if (!this._todoStatusRetryTimers) this._todoStatusRetryTimers = new Map();
            const key = `${entityId}:${this._todoItemKey(item)}`;
            if (this._todoStatusRetryTimers.has(key)) return;
            const text = this._todoItemText(item);
            const timer = setTimeout(async () => {
                this._todoStatusRetryTimers.delete(key);
                try {
                    const items = await this._todoService.fetchItems(this._hass, entityId);
                    const match = items.find((entry) => {
                        return this._todoItemsMatch(entry, item);
                    });
                    if (match) {
                        await this._todoService.setStatus(
                            this._hass,
                            entityId,
                            match,
                            completed
                        );
                        return;
                    }
                    if (!completed && text) {
                        await this._todoService.addItem(this._hass, entityId, text);
                        return;
                    }
                    throw new Error('Unable to find to-do list item');
                } catch {
                    this._optimisticTodoStatus(entityId, item, previousDone);
                    this._reportError?.('Update chore', new Error('Unable to update chore'));
                    await this._refreshTodoEntity(entityId);
                }
            }, 600);
            this._todoStatusRetryTimers.set(key, timer);
        },

        async _clearCompletedTodos(entityId) {
            if (!entityId) return;
            try {
                await this._todoService.clearCompleted(this._hass, entityId);
            } catch (error) {
                this._reportError?.('Clear completed chores', error);
            } finally {
                this._queueRefresh();
            }
        },
    });
}
