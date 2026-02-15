/* Family Board - schedule helpers
 * SPDX-License-Identifier: MIT
 */
import { startOfDay } from './family-board.util.js';

export function applySchedule(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _setScheduleStart(date) {
            if (!date) return;
            const today = startOfDay(new Date());
            const target = startOfDay(date);
            const diffDays = Math.round((target - today) / (24 * 60 * 60 * 1000));
            this._dayOffset = diffDays;
            this._mainMode = 'schedule';
            this._screen = 'schedule';
            this._queueRefresh();
        },
    });
}
