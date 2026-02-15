/* Family Board - label helpers
 * SPDX-License-Identifier: MIT
 */
import { addDays, startOfDay, formatDayTitle, formatMonthYearLong } from './family-board.util.js';

export function applyLabels(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _dateLabel() {
            const mainMode = this._mainMode || 'schedule';
            if (mainMode === 'month') {
                const d = this._selectedMonthDay();
                return formatMonthYearLong(d);
            }
            if (mainMode === 'schedule') {
                const start = startOfDay(this._selectedDay());
                const end = addDays(start, (this._scheduleDays || 5) - 1);
                const startLabel = formatDayTitle(start);
                const endLabel = formatDayTitle(end);
                return `${startLabel} - ${endLabel}`;
            }
            return formatDayTitle(this._selectedDay());
        },

        _selectedDayValue() {
            const d = this._selectedDay();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
                d.getDate()
            ).padStart(2, '0')}`;
        },

        _fabLabel() {
            const screen = this._screen || 'schedule';
            if (screen === 'chores') return 'Add chore';
            if (screen === 'shopping') return 'Add shopping item';
            if (screen === 'home') return 'Add home control';
            if (screen === 'settings') return 'No action';
            return 'Add event';
        },
    });
}
