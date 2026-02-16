/* nx-displaygrid - toggle helpers
 * SPDX-License-Identifier: MIT
 */
import { debugLog } from './nx-displaygrid.util.js';

export function applyToggles(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _onPersonToggle(ev) {
            const personId = this._normalisePersonId(ev?.detail?.id);
            if (!personId) return;
            if (this._personFilterSet.has(personId)) this._personFilterSet.delete(personId);
            else this._personFilterSet.add(personId);
            this._personFilterSet = new Set(this._personFilterSet);
            debugLog(this._debug, 'personToggle', {
                personId,
                active: Array.from(this._personFilterSet || []),
            });
            this._savePrefs();
            this.requestUpdate();
            this._queueRefresh();
        },

        _setMobileView(enabled) {
            this._useMobileView = Boolean(enabled);
            debugLog(this._debug, 'setMobileView', { enabled: this._useMobileView });
            this._savePrefs();
            this._queueRefresh();
        },

        _setSlotMinutesPref(minutes) {
            const value = Number(minutes);
            if (![30, 60].includes(value)) return;
            this._slotMinutes = value;
            debugLog(this._debug, 'setSlotMinutes', { minutes: value });
            this._savePrefs();
            this._queueRefresh();
        },

        _setDefaultEventMinutesPref(minutes) {
            const value = Number(minutes);
            if (!Number.isFinite(value)) return;
            this._defaultEventMinutes = Math.max(5, value);
            debugLog(this._debug, 'setDefaultEventMinutes', {
                minutes: this._defaultEventMinutes,
            });
            this._savePrefs();
        },

        async _setDayRange({ startHour, endHour }) {
            const slotMinutes = Number(this._slotMinutes || 30);
            const minGapHours = slotMinutes / 60;
            const start = Math.min(24, Math.max(0, Number(startHour)));
            const end = Math.min(24, Math.max(0, Number(endHour)));
            if (!Number.isFinite(start) || !Number.isFinite(end)) return;
            if (end <= start + minGapHours) {
                this._showErrorToast('Invalid time range');
                return;
            }
            debugLog(this._debug, 'setDayRange', { start, end });
            await this._updateConfigPartial({
                day_start_hour: start,
                day_end_hour: end,
            });
        },

        _toggleSidebarCollapsed() {
            this._sidebarCollapsed = !this._sidebarCollapsed;
            debugLog(this._debug, 'toggleSidebarCollapsed', {
                collapsed: this._sidebarCollapsed,
            });
            this._savePrefs();
            this.requestUpdate();
        },
    });
}
