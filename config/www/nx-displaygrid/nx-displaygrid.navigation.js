/* nx-displaygrid - navigation helpers
 * SPDX-License-Identifier: MIT
 */
import { debugLog } from './nx-displaygrid.util.js';

export function applyNavigation(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _setMonthOffset(delta) {
            this._monthOffset = (this._monthOffset || 0) + delta;
            debugLog(this._debug, 'setMonthOffset', { delta, monthOffset: this._monthOffset });
            this._saveDateContextPrefs?.();
            this._queueRefresh();
        },

        _onNav(ev) {
            const target = ev?.detail?.target;
            if (!target) return;
            const allowed = this._allowedViews?.() || [];
            if (allowed.length && !allowed.includes(target)) return;
            const source = ev?.detail?.source || '';
            const from = this._screen || '';
            this._screen = target;
            if (target !== 'ambient' && this._focusLandscape) this._focusLandscape = false;
            debugLog(this._debug, 'nav', { target });
            if (source !== 'adaptive') {
                const now = Date.now();
                this._lastManualNavTs = now;
                // Prevent an immediate adaptive auto-screen flip on the next render tick.
                this._manualNavAdaptiveLockUntilTs = now + 5_000;
            }
            if (source !== 'adaptive') {
                this._v2AuditRecord?.({
                    type: 'navigation',
                    component: 'system',
                    severity: 'info',
                    title: `Open ${target}`,
                    reason: from ? `From ${from}` : '',
                    context: { from, to: target, source: source || 'manual' },
                });
            }
            this._savePrefs();
            this._queueRefresh();
        },

        _onMainMode(ev) {
            const mode = ev?.detail?.mode || 'schedule';
            this._mainMode = mode;
            if (mode !== 'month') this._monthOffset = 0;
            debugLog(this._debug, 'mainMode', { mode });
            this._saveDateContextPrefs?.();
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
            this._saveDateContextPrefs?.();
            this._queueRefresh();
        },

        _onToday() {
            this._dayOffset = 0;
            this._monthOffset = 0;
            debugLog(this._debug, 'today');
            this._saveDateContextPrefs?.();
            this._queueRefresh();
        },

        async _onSyncCalendars() {
            if (this._syncingCalendars || this._calendarFetchInFlight) return;
            this._syncingCalendars = true;
            this._v2AuditRecord?.({
                type: 'action',
                component: 'system',
                severity: 'info',
                title: 'Sync now',
                reason: 'Manual refresh requested',
            });
            this.requestUpdate();
            try {
                this._calendarService?.clearCache?.();
                await Promise.all([
                    this._refreshCalendarsWithEntityUpdate(),
                    this._refreshTodos(),
                    this._refreshShopping(),
                ]);
                if (!this._calendarStale) this._showToast('Calendars synced');
                this._v2AuditRecord?.({
                    type: 'action_result',
                    component: 'system',
                    severity: this._calendarStale || this._todoStale || this._shoppingStale ? 'warn' : 'info',
                    title: 'Sync completed',
                    reason:
                        this._calendarStale || this._todoStale || this._shoppingStale
                            ? 'Completed with stale data'
                            : 'Calendars, chores, and shopping refreshed',
                });
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
