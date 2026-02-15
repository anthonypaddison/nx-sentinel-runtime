/* Family Board - optimistic state helpers
 * SPDX-License-Identifier: MIT
 */
export function applyOptimistic(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _optimisticTodoAdd(entityId, text, dueDate) {
            const list = Array.isArray(this._todoItems?.[entityId])
                ? [...this._todoItems[entityId]]
                : [];
            const next = dueDate
                ? this._buildTodoItemWithDue(text, dueDate)
                : this._buildTodoItem(text);
            list.push(next);
            this._todoItems = { ...(this._todoItems || {}), [entityId]: list };
            this._todoVersion = (this._todoVersion || 0) + 1;
            this._todoRenderTick += 1;
            this.requestUpdate();
            return next;
        },

        _optimisticTodoUpdate(entityId, item, text, dueDate) {
            const list = Array.isArray(this._todoItems?.[entityId])
                ? [...this._todoItems[entityId]]
                : [];
            const targetKey = this._todoItemKey(item);
            const nextList = list.map((entry) => {
                if (entry === item) {
                    const next = {
                        ...entry,
                        summary: text,
                        name: text,
                        item: text,
                    };
                    if (dueDate) {
                        next.due = { date: dueDate };
                        next.due_date = dueDate;
                    }
                    return next;
                }
                if (!targetKey) return entry;
                if (this._todoItemKey(entry) !== targetKey) return entry;
                const next = {
                    ...entry,
                    summary: text,
                    name: text,
                    item: text,
                };
                if (dueDate) {
                    next.due = { date: dueDate };
                    next.due_date = dueDate;
                }
                return next;
            });
            this._todoItems = { ...(this._todoItems || {}), [entityId]: nextList };
            this._todoVersion = (this._todoVersion || 0) + 1;
            this._todoRenderTick += 1;
            this.requestUpdate();
        },

        _optimisticTodoRemove(entityId, item) {
            const list = Array.isArray(this._todoItems?.[entityId])
                ? this._todoItems[entityId]
                : [];
            const targetKey = this._todoItemKey(item);
            const nextList = list.filter((entry) => {
                if (entry === item) return false;
                if (!targetKey) return true;
                return this._todoItemKey(entry) !== targetKey;
            });
            this._todoItems = { ...(this._todoItems || {}), [entityId]: nextList };
            this._todoVersion = (this._todoVersion || 0) + 1;
            this._todoRenderTick += 1;
            this.requestUpdate();
        },

        _optimisticTodoStatus(entityId, item, completed) {
            const list = Array.isArray(this._todoItems?.[entityId])
                ? [...this._todoItems[entityId]]
                : [];
            const targetKey = this._todoItemKey(item);
            const nextList = list.map((entry) => {
                if (entry === item) {
                    return { ...entry, status: completed ? 'completed' : 'needs_action' };
                }
                if (!targetKey) return entry;
                if (this._todoItemKey(entry) !== targetKey) return entry;
                return { ...entry, status: completed ? 'completed' : 'needs_action' };
            });
            this._todoItems = { ...(this._todoItems || {}), [entityId]: nextList };
            this._todoVersion = (this._todoVersion || 0) + 1;
            this._todoRenderTick += 1;
            this.requestUpdate();
        },

        _optimisticShoppingAdd(text) {
            const list = Array.isArray(this._shoppingItems) ? [...this._shoppingItems] : [];
            const next = this._buildShoppingItem(text);
            list.push(next);
            this._shoppingItems = list;
            this._shoppingVersion = (this._shoppingVersion || 0) + 1;
            this.requestUpdate();
            return next;
        },

        _optimisticShoppingUpdate(item, text) {
            const list = Array.isArray(this._shoppingItems) ? [...this._shoppingItems] : [];
            const nextList = list.map((entry) => {
                if (entry !== item) return entry;
                return {
                    ...entry,
                    summary: text,
                    name: text,
                    item: text,
                };
            });
            this._shoppingItems = nextList;
            this._shoppingVersion = (this._shoppingVersion || 0) + 1;
            this.requestUpdate();
        },

        _optimisticShoppingStatus(item, completed) {
            if (!item) return;
            const list = Array.isArray(this._shoppingItems) ? [...this._shoppingItems] : [];
            const nextList = list.map((entry) => {
                if (entry !== item) return entry;
                entry.status = completed ? 'completed' : 'needs_action';
                return entry;
            });
            this._shoppingItems = nextList;
            this._shoppingVersion = (this._shoppingVersion || 0) + 1;
            this.requestUpdate();
        },

        _optimisticShoppingRemove(item) {
            const list = Array.isArray(this._shoppingItems) ? this._shoppingItems : [];
            const nextList = list.filter((entry) => entry !== item);
            this._shoppingItems = nextList;
            this._shoppingVersion = (this._shoppingVersion || 0) + 1;
            this.requestUpdate();
        },

        _optimisticCalendarAdd(entityId, { summary, start, end, allDay } = {}) {
            const list = Array.isArray(this._eventsByEntity?.[entityId])
                ? [...this._eventsByEntity[entityId]]
                : [];
            const optimistic = {
                summary: summary || '(No title)',
                _start: start,
                _end: end,
                all_day: Boolean(allDay),
                id: `optimistic-${Date.now()}`,
            };
            list.push(optimistic);
            this._eventsByEntity = { ...(this._eventsByEntity || {}), [entityId]: list };
            this._eventsVersion = (this._eventsVersion || 0) + 1;
            this.requestUpdate();
            return optimistic;
        },

        _optimisticCalendarUpdate(entityId, event, { summary, start, end, allDay } = {}) {
            if (!event) return;
            event.summary = summary ?? event.summary;
            event._start = start ?? event._start;
            event._end = end ?? event._end;
            event.all_day = allDay !== undefined ? Boolean(allDay) : event.all_day;
            this._eventsVersion = (this._eventsVersion || 0) + 1;
            this.requestUpdate();
        },

        _optimisticCalendarRemove(entityId, event) {
            if (!event) return;
            const list = Array.isArray(this._eventsByEntity?.[entityId])
                ? this._eventsByEntity[entityId]
                : [];
            const nextList = list.filter((entry) => entry !== event);
            this._eventsByEntity = { ...(this._eventsByEntity || {}), [entityId]: nextList };
            this._eventsVersion = (this._eventsVersion || 0) + 1;
            this.requestUpdate();
        },

        _restoreCalendarEvent(entityId, event) {
            if (!entityId || !event) return;
            const list = Array.isArray(this._eventsByEntity?.[entityId])
                ? [...this._eventsByEntity[entityId]]
                : [];
            if (!list.includes(event)) list.push(event);
            this._eventsByEntity = { ...(this._eventsByEntity || {}), [entityId]: list };
            this._eventsVersion = (this._eventsVersion || 0) + 1;
            this.requestUpdate();
        },

        _restoreTodoList(entityId, list) {
            if (!entityId || !Array.isArray(list)) return;
            this._todoItems = { ...(this._todoItems || {}), [entityId]: list };
            this._todoVersion = (this._todoVersion || 0) + 1;
            this.requestUpdate();
        },

        _restoreShoppingList(list) {
            if (!Array.isArray(list)) return;
            this._shoppingItems = list;
            this._shoppingVersion = (this._shoppingVersion || 0) + 1;
            this.requestUpdate();
        },
    });
}
