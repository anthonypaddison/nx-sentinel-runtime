/* Family Board - navigation helpers
 * SPDX-License-Identifier: MIT
 */
import { debugLog } from './family-board.util.js';

export function applyNavigation(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _setMonthOffset(delta) {
            this._monthOffset = (this._monthOffset || 0) + delta;
            debugLog(this._debug, 'setMonthOffset', { delta, monthOffset: this._monthOffset });
            this._queueRefresh();
        },

        _onNav(ev) {
            const target = ev?.detail?.target;
            if (!target) return;
            this._screen = target;
            debugLog(this._debug, 'nav', { target });
            this._savePrefs();
            this._queueRefresh();
        },

        _onMainMode(ev) {
            const mode = ev?.detail?.mode || 'schedule';
            this._mainMode = mode;
            if (mode !== 'month') this._monthOffset = 0;
            debugLog(this._debug, 'mainMode', { mode });
            this._queueRefresh();
        },

        _onDateNav(ev) {
            const delta = Number(ev?.detail?.delta || 0);
            if (!delta) return;

            if (this._mainMode === 'month') {
                this._setMonthOffset(delta);
                return;
            }

            const step = this._mainMode === 'schedule' ? 1 : 1;
            this._dayOffset = (this._dayOffset || 0) + delta * step;
            debugLog(this._debug, 'dateNav', { delta, dayOffset: this._dayOffset });
            this._queueRefresh();
        },

        _onToday() {
            this._dayOffset = 0;
            this._monthOffset = 0;
            debugLog(this._debug, 'today');
            this._queueRefresh();
        },

        async _onSyncCalendars() {
            if (this._syncingCalendars || this._calendarFetchInFlight) return;
            this._syncingCalendars = true;
            this.requestUpdate();
            try {
                this._calendarService?.clearCache?.();
                await Promise.all([
                    this._refreshCalendarsWithEntityUpdate(),
                    this._refreshTodos(),
                    this._refreshShopping(),
                ]);
                if (!this._calendarStale) this._showToast('Calendars synced');
            } finally {
                this._syncingCalendars = false;
                this.requestUpdate();
            }
        },

        _onCalendarTryAgain() {
            if (this._syncingCalendars || this._calendarFetchInFlight) return;
            this._syncingCalendars = true;
            this.requestUpdate();
            this._calendarService?.clearCache?.();
            Promise.all([
                this._refreshCalendarsWithEntityUpdate(),
                this._refreshTodos(),
                this._refreshShopping(),
            ]).finally(() => {
                this._syncingCalendars = false;
                this.requestUpdate();
            });
        },

        _onDateSet(ev) {
            const value = ev?.detail?.value;
            if (!value) return;
            const target = new Date(`${value}T00:00:00`);
            this._setScheduleStart(target);
        },
    });
}
