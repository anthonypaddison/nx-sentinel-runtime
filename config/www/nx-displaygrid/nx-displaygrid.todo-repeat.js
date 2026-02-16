/* nx-displaygrid - todo repeat helpers
 * SPDX-License-Identifier: MIT
 */
import { addDays, todoItemText } from './nx-displaygrid.util.js';

export function applyTodoRepeat(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _todoRepeatKeyFromText(text) {
            return String(text || '').trim().toLowerCase();
        },

        _todoRepeatsForEntity(entityId) {
            const allRepeats = this._config?.todo_repeats || {};
            return allRepeats?.[entityId] || {};
        },

        _getTodoRepeat(entityId, item) {
            if (!entityId || !item) return '';
            const key = this._todoRepeatKeyFromText(
                todoItemText(item)
            );
            const repeats = this._todoRepeatsForEntity(entityId);
            return repeats?.[key]?.cadence || '';
        },

        _setTodoRepeat(entityId, text, cadence) {
            if (!entityId || !text) return;
            const key = this._todoRepeatKeyFromText(text);
            const current = this._config?.todo_repeats || {};
            const entityRepeats = { ...(current[entityId] || {}) };
            entityRepeats[key] = { cadence };
            const next = { ...current, [entityId]: entityRepeats };
            this._updateConfigPartial({ todo_repeats: next });
        },

        _clearTodoRepeat(entityId, text) {
            if (!entityId || !text) return;
            const key = this._todoRepeatKeyFromText(text);
            const current = this._config?.todo_repeats || {};
            if (!current[entityId]?.[key]) return;
            const entityRepeats = { ...(current[entityId] || {}) };
            delete entityRepeats[key];
            const next = { ...current, [entityId]: entityRepeats };
            this._updateConfigPartial({ todo_repeats: next });
        },

        _nextRepeatDate(date, cadence) {
            if (!date || Number.isNaN(date.getTime())) return null;
            const next = new Date(date);
            if (cadence === 'daily') return addDays(next, 1);
            if (cadence === 'weekly') return addDays(next, 7);
            if (cadence === 'biweekly') return addDays(next, 14);
            if (cadence === 'monthly') {
                const month = next.getMonth();
                next.setMonth(month + 1);
                return next;
            }
            return null;
        },

        _repeatForTodo(entityId, item) {
            if (!entityId || !item) return null;
            const key = this._todoRepeatKeyFromText(
                todoItemText(item)
            );
            const repeats = this._todoRepeatsForEntity(entityId);
            return repeats?.[key] || null;
        },
    });
}
