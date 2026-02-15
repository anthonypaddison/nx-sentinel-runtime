/* Family Board - preference helpers
 * SPDX-License-Identifier: MIT
 */
import { DEFAULT_COMMON_ITEMS } from './family-board.defaults.js';
import { updatePrefs, savePrefs, getDeviceKind } from './util/prefs.util.js';

export function applyPrefs(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _savePrefs() {
            const userId = this._hass?.user?.id;
            if (!userId) return;
            updatePrefs(userId, {
                personFilters: Array.from(this._personFilterSet || []),
                useMobileView: Boolean(this._useMobileView),
                sidebarCollapsed: Boolean(this._sidebarCollapsed),
                slotMinutes: this._slotMinutes,
                defaultEventMinutes: this._defaultEventMinutes,
                shoppingCommon: this._shoppingCommon,
                shoppingFavourites: this._shoppingFavourites,
                adminUnlocked: Boolean(this._adminUnlocked),
                defaultView: this._defaultView || 'schedule',
                lastView: this._screen || this._defaultView || 'schedule',
                dayStartHour: this._deviceDayStartHour ?? null,
                dayEndHour: this._deviceDayEndHour ?? null,
                pxPerHour: this._devicePxPerHour ?? null,
                refreshIntervalMs: this._deviceRefreshMs ?? null,
                cacheMaxAgeMs: this._deviceCacheMaxAgeMs ?? null,
                backgroundTheme: this._deviceBackgroundTheme ?? null,
                debug: this._deviceDebug ?? null,
                peopleDisplay: Array.isArray(this._devicePeopleDisplay)
                    ? this._devicePeopleDisplay
                    : null,
            });
            this._prefsVersion = (this._prefsVersion || 0) + 1;
            this.requestUpdate();
        },

        _resetPrefsToDefaults() {
            const userId = this._hass?.user?.id;
            if (!userId) return;
            savePrefs(userId, {});
            this._prefsLoaded = false;
            this._personFilterSet = new Set();
            this._useMobileView = getDeviceKind() === 'mobile';
            this._sidebarCollapsed = false;
            this._adminUnlocked = false;
            this._defaultView = 'schedule';
            this._deviceDayStartHour = null;
            this._deviceDayEndHour = null;
            this._devicePxPerHour = null;
            this._deviceRefreshMs = null;
            this._deviceCacheMaxAgeMs = null;
            this._deviceBackgroundTheme = null;
            this._deviceDebug = null;
            this._devicePeopleDisplay = null;
            this._slotMinutes = 30;
            this._defaultEventMinutes = 30;
            this._shoppingCommon = DEFAULT_COMMON_ITEMS.slice();
            this._shoppingFavourites = [];
            this._prefsVersion = (this._prefsVersion || 0) + 1;
            this._loadPrefs();
            this._applyConfigImmediate(this._config || {}, { useDefaults: true, refresh: true });
            this.requestUpdate();
        },

        _setDefaultViewPref(view) {
            if (!['schedule', 'important', 'chores', 'shopping', 'home', 'settings'].includes(view))
                return;
            this._defaultView = view;
            this._savePrefs();
        },

        _setSidebarCollapsedPref(collapsed) {
            this._sidebarCollapsed = Boolean(collapsed);
            this._savePrefs();
            this.requestUpdate();
        },
    });
}
