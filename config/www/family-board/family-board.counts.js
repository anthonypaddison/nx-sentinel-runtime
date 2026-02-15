/* Family Board - count helpers
 * SPDX-License-Identifier: MIT
 */
import { startOfDay, endOfDay, addDays, parseTodoDueInfo } from './family-board.util.js';
import { getPersonColour } from './util/colour.util.js';

export function applyCounts(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _sidebarCounts() {
            const calendars = Array.isArray(this._config?.calendars) ? this._config.calendars : [];
            const todos = Array.isArray(this._config?.todos) ? this._config.todos : [];
            const shoppingItems = this._shoppingItems || [];

            const { start, end } = this._todayRange();
            const totalEvents = calendars.reduce((sum, c) => {
                if (!this._isPersonAllowed(this._personIdForConfig(c, c.entity))) return sum;
                const items = this._eventsByEntity?.[c.entity] || [];
                const count = items.filter((e) => {
                    if (!e?._start || !e?._end) return false;
                    return e._start <= end && e._end >= start;
                }).length;
                return sum + count;
            }, 0);

            const totalTodos = todos.reduce(
                (sum, t) => {
                    if (!this._isPersonAllowed(this._personIdForConfig(t, t.entity))) return sum;
                    return sum + this._incompleteTodoCount(this._todoItems?.[t.entity] || []);
                },
                0
            );

            const shopping = this._shoppingQuantityCount(shoppingItems);

            return {
                schedule: totalEvents ? String(totalEvents) : null,
                chores: totalTodos ? String(totalTodos) : null,
                shopping: shopping ? String(shopping) : null,
            };
        },

        _summaryCounts() {
            const people = Array.isArray(this._config?.people) ? this._config.people : [];

            if (!people.length && this._peopleById?.size) {
                const fallback = Array.from(this._peopleById.values());
                return fallback.map((person) => ({
                    id: person.id,
                    name: person.name || person.id,
                    color: getPersonColour(person),
                    text_color: person.text_color || '',
                    role: person.role || '',
                    header_row: person.header_row || 1,
                    eventsLeft: this._countEventsTodayForPerson(person.id),
                    todosLeft: this._countTodosTodayForPerson(person.id),
                }));
            }

            const orderedIds = this._peopleDisplayIds(people);
            const summary = orderedIds
                .map((id) => this._peopleById?.get(id) || people.find((p) => p.id === id))
                .filter(Boolean)
                .map((person) => ({
                    id: person.id,
                    name: person.name || person.id,
                    color: getPersonColour(person),
                    text_color: person.text_color || '',
                    role: person.role || '',
                    header_row: person.header_row || 1,
                    eventsLeft: this._countEventsTodayForPerson(person.id),
                    todosLeft: this._countTodosTodayForPerson(person.id),
                }));

            return summary;
        },

        _peopleDisplayIds(people) {
            const hasDevice = Array.isArray(this._devicePeopleDisplay);
            const hasConfigured = Array.isArray(this._config?.people_display);
            const configured = hasDevice
                ? this._devicePeopleDisplay
                : hasConfigured
                ? this._config.people_display
                : [];
            const validIds = new Set(people.map((p) => p.id).filter(Boolean));
            const ordered = configured.filter((id) => validIds.has(id));
            const fallback = people.map((p) => p.id).filter(Boolean);
            const merged = hasDevice || hasConfigured ? ordered : fallback;
            const unique = [];
            for (const id of merged) {
                if (!unique.includes(id)) unique.push(id);
            }
            if (hasDevice || hasConfigured) {
                for (const id of fallback) {
                    if (!unique.includes(id)) unique.push(id);
                }
            }
            return unique.slice(0, 8);
        },

        _countEventsTodayForPerson(personId) {
            if (!this._isPersonAllowed(personId)) return 0;
            const calendars = Array.isArray(this._config?.calendars)
                ? this._config.calendars
                : [];
            const target = this._normalisePersonId(personId);
            if (!target) return 0;
            const today = startOfDay(new Date());

            return calendars.reduce((sum, c) => {
                const mappedId = this._normalisePersonId(this._personIdForConfig(c, c.entity));
                if (!mappedId || mappedId !== target) return sum;
                return sum + this._eventsForEntityOnDay(c.entity, today).length;
            }, 0);
        },

        _countTodosTodayForPerson(personId) {
            if (!this._isPersonAllowed(personId)) return 0;
            const todos = Array.isArray(this._config?.todos) ? this._config.todos : [];
            const target = this._normalisePersonId(personId);
            if (!target) return 0;
            return todos.reduce((sum, t) => {
                const mappedId = this._normalisePersonId(this._personIdForConfig(t, t.entity));
                if (!mappedId || mappedId !== target) return sum;
                const items = this._todoItems?.[t.entity] || [];
                return sum + this._dueTodayOrNoDueCount(items);
            }, 0);
        },

        _todayRange() {
            const today = startOfDay(new Date());
            return { start: startOfDay(today), end: endOfDay(today) };
        },

        _incompleteTodoCount(items) {
            return items.filter(
                (it) => !['completed', 'done'].includes(String(it.status || '').toLowerCase())
            ).length;
        },

        _shoppingQuantityCount(items) {
            return (items || []).reduce((sum, item) => {
                const status = String(item?.status || '').toLowerCase();
                if (status === 'completed' || status === 'done') return sum;
                const parsed = this._parseShoppingText(this._shoppingItemText(item));
                return sum + (parsed.qty || 1);
            }, 0);
        },

        _dueTodayOrNoDueCount(items) {
            const today = startOfDay(new Date());
            const todayMs = today.getTime();
            const tomorrowMs = addDays(today, 1).getTime();

            return items.filter((it) => {
                const status = String(it.status || '').toLowerCase();
                if (status === 'completed' || status === 'done') return false;
                const dueInfo = parseTodoDueInfo(
                    it.due || it.due_date || it.due_datetime
                );
                if (!dueInfo?.date) return true;
                const parsed = dueInfo.date;
                if (Number.isNaN(parsed.getTime())) return true;
                return parsed.getTime() >= todayMs && parsed.getTime() < tomorrowMs;
            }).length;
        },
    });
}
