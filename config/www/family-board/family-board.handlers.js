/* Family Board - event handlers
 * SPDX-License-Identifier: MIT
 */
import { CALENDAR_FEATURES } from './services/calendar.service.js';
import { debugLog } from './family-board.util.js';
export function applyHandlers(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _onAddCalendar: async function (ev) {
            const { entityId, summary, start, end } = ev?.detail || {};
            if (!entityId || !summary || !start || !end) return;
            if (!this._calendarSupports(entityId, CALENDAR_FEATURES.CREATE)) return;
            debugLog(this._debug, 'addCalendar', { entityId, summary, start, end });
            const optimistic = this._optimisticCalendarAdd(entityId, {
                summary,
                start,
                end,
                allDay: false,
            });
            try {
                await this._calendarService.createEvent(this._hass, entityId, {
                    summary,
                    start,
                    end,
                });
            } catch (error) {
                this._optimisticCalendarRemove(entityId, optimistic);
                this._reportError?.('Add event', error);
            } finally {
                this._queueRefresh();
            }
        },

        _onAddTodo: async function (ev) {
            const { entityId, text, dueDate, repeat } = ev?.detail || {};
            if (!entityId || !text) return;
            debugLog(this._debug, 'addTodo', { entityId, text, dueDate, repeat });
            const optimistic = this._optimisticTodoAdd(entityId, text, dueDate);
            try {
                await this._todoService.addItem(this._hass, entityId, text, {
                    dueDate: dueDate || '',
                });
                if (repeat) {
                    this._setTodoRepeat(entityId, text, repeat);
                } else {
                    this._clearTodoRepeat(entityId, text);
                }
            } catch (error) {
                this._optimisticTodoRemove(entityId, optimistic);
                this._reportError?.('Add chore', error);
            }
        },

        _onAddShopping: async function (ev) {
            const { text } = ev?.detail || {};
            if (!text) return;
            debugLog(this._debug, 'addShopping', { text });
            await this._addShoppingItem(text);
        },

        _onAddHomeControl: async function (ev) {
            const entityId = ev?.detail?.entityId;
            if (!entityId) return;
            if (!this._hasAdminAccess()) return;
            debugLog(this._debug, 'addHomeControl', { entityId });
            const controls = Array.isArray(this._config?.home_controls)
                ? this._config.home_controls
                : [];
            if (controls.includes(entityId)) {
                this._showToast('Already added');
                return;
            }
            await this._updateConfigPartial({ home_controls: [...controls, entityId] });
        },

        _onEditTodo: async function (ev) {
            const { entityId, item, text, dueDate, repeat } = ev?.detail || {};
            if (!entityId || !item || !text) return;
            debugLog(this._debug, 'editTodo', { entityId, text, dueDate, repeat });
            const previous = {
                summary: item.summary,
                name: item.name,
                item: item.item,
            };
            const previousText = previous.summary ?? previous.name ?? previous.item ?? '';
            this._optimisticTodoUpdate(entityId, item, text, dueDate);
            try {
                await this._todoService.renameItem(this._hass, entityId, item, text, {
                    dueDate: dueDate || '',
                });
                if (previousText && previousText !== text) {
                    this._clearTodoRepeat(entityId, previousText);
                }
                if (repeat) this._setTodoRepeat(entityId, text, repeat);
                else this._clearTodoRepeat(entityId, text);
            } catch (error) {
                this._optimisticTodoUpdate(entityId, item, previousText, dueDate);
                this._reportError?.('Edit chore', error);
            } finally {
                await this._refreshTodoEntity(entityId);
            }
        },

        _onEditShopping: async function (ev) {
            const { item, text } = ev?.detail || {};
            if (!item || !text) return;
            debugLog(this._debug, 'editShopping', { text });
            const parsed = this._parseShoppingText(text);
            const normalised = this._formatShoppingText(parsed.base, parsed.qty);
            this._trackShoppingCommon(parsed.base);
            await this._updateShoppingItemText(item, normalised);
        },

        _onSourcesSave: async function (ev) {
            const next = ev?.detail?.config;
            if (!next) return;
            debugLog(this._debug, 'sourcesSave', { next });
            const sharedBase = this._sharedConfig || this._config || {};
            const nextShared = { ...sharedBase, ...next };
            this._sharedConfig = nextShared;
            this._applyConfigImmediate(nextShared, { useDefaults: false });
            await this._refreshAll();
            const result = await this._persistConfig(nextShared);
            if (result?.mode === 'local') {
                this._showToast('Saved', 'Saved on this device');
            } else {
                this._showToast('Saved');
            }
            this.requestUpdate();
        },

        _onEventUpdate: async function (ev) {
            const { entityId, event, summary, start, end, allDay } = ev?.detail || {};
            if (!entityId || !event) return;
            if (!this._calendarSupports(entityId, CALENDAR_FEATURES.UPDATE)) return;
            debugLog(this._debug, 'eventUpdate', { entityId, summary, start, end, allDay });
            const previous = {
                summary: event.summary,
                start: event._start,
                end: event._end,
                allDay: event.all_day,
            };
            this._optimisticCalendarUpdate(entityId, event, { summary, start, end, allDay });
            try {
                await this._calendarService.updateEvent(this._hass, entityId, event, {
                    summary,
                    start,
                    end,
                    allDay,
                });
            } catch (error) {
                this._optimisticCalendarUpdate(entityId, event, {
                    summary: previous.summary,
                    start: previous.start,
                    end: previous.end,
                    allDay: previous.allDay,
                });
                this._reportError?.('Edit event', error);
            } finally {
                this._queueRefresh();
            }
        },

        _onEventDelete: async function (ev) {
            const { entityId, event } = ev?.detail || {};
            if (!entityId || !event) return;
            if (!this._calendarSupports(entityId, CALENDAR_FEATURES.DELETE)) return;
            debugLog(this._debug, 'eventDelete', { entityId });
            this._optimisticCalendarRemove(entityId, event);
            try {
                await this._calendarService.deleteEvent(this._hass, entityId, event);
            } catch (error) {
                this._restoreCalendarEvent(entityId, event);
                this._reportError?.('Delete event', error);
            } finally {
                this._queueRefresh();
            }
        },

        _toggleTodoItem: async function (entityId, item, completed) {
            if (!entityId || !item) return;
            const previous = item.status;
            const previousDone =
                ['completed', 'done'].includes(String(previous || '').toLowerCase()) ||
                Boolean(item.completed);
            const hasStableId = Boolean(item.id || item.uid);
            let shouldRefresh = false;
            debugLog(this._debug, 'toggleTodo', { entityId, completed, hasStableId });
            this._optimisticTodoStatus(entityId, item, completed);
            try {
                await this._todoService.setStatus(this._hass, entityId, item, completed);
                if (completed) {
                    const repeat = this._repeatForTodo(entityId, item);
                    if (repeat?.cadence) {
                        const dueInfo = this._todoItemDueInfo(item);
                        const dueDate = dueInfo?.date || null;
                        if (dueDate && !Number.isNaN(dueDate.getTime())) {
                            const nextDate = this._nextRepeatDate(dueDate, repeat.cadence);
                            if (nextDate) {
                                const yyyy = nextDate.getFullYear();
                                const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
                                const dd = String(nextDate.getDate()).padStart(2, '0');
                                const dueDateStr = `${yyyy}-${mm}-${dd}`;
                                const text = this._todoItemText(item, '(Todo)');
                                await this._todoService.addItem(this._hass, entityId, text, {
                                    dueDate: dueDateStr,
                                });
                                this._optimisticTodoAdd(entityId, text, dueDateStr);
                            }
                        }
                    }
                }
            } catch (error) {
                if (!hasStableId) {
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
                    } catch {
                        // fall through to revert + error
                    }
                }
                const text = this._todoItemText(item);
                if (this._isMissingTodoItemError(error)) {
                    if (!completed && text) {
                        try {
                            await this._todoService.addItem(this._hass, entityId, text);
                            return;
                        } catch {
                            // fall through to revert + error
                        }
                    }
                    if (completed && !hasStableId) {
                        this._queueTodoStatusRetry(entityId, item, completed, previousDone);
                        return;
                    }
                }
                this._optimisticTodoStatus(entityId, item, previousDone);
                this._reportError?.('Update chore', error);
                shouldRefresh = true;
            } finally {
                if (shouldRefresh) {
                    await this._refreshTodoEntity(entityId);
                }
            }
        },

    });
}
