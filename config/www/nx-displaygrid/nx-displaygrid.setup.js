/* nx-displaygrid - setup helpers
 * SPDX-License-Identifier: MIT
 */
import { NEUTRAL_COLOUR, getPersonColour } from './util/colour.util.js';
import { CalendarService } from './services/calendar.service.js';
import { TodoService } from './services/todo.service.js';
import { ShoppingService } from './services/shopping.service.js';
import { suggestShoppingEntity } from './util/discovery.util.js';
import { DEFAULT_CARD_CONFIG } from './nx-displaygrid.defaults.js';

export function applySetup(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _ensureServices() {
            if (!this._calendarService) this._calendarService = new CalendarService();
            if (!this._todoService) this._todoService = new TodoService();
            if (!this._shoppingService) this._shoppingService = new ShoppingService();

            this._calendarService.debug = this._debug;
            this._todoService.debug = this._debug;
            this._shoppingService.debug = this._debug;
        },

        _buildPeopleMap() {
            const people = Array.isArray(this._config?.people) ? this._config.people : [];
            const calendars = Array.isArray(this._config?.calendars) ? this._config.calendars : [];

            this._peopleById = new Map();
            for (const p of people) {
                if (!p?.id) continue;
                this._peopleById.set(p.id, {
                    id: p.id,
                    name: p.name || p.id,
                    color: p.color || NEUTRAL_COLOUR,
                    text_color: p.text_color || '',
                    role: p.role || '',
                    header_row: p.header_row || 1,
                });
            }

            this._personByEntity = new Map();
            for (const c of calendars) {
                const personId = c.person_id || c.personId || c.person || null;
                const personName = c.person_name || c.personName || c.name || c.entity;
                const mapped = personId ? this._peopleById.get(personId) : null;
                const color = getPersonColour(mapped) || c.color || NEUTRAL_COLOUR;
                const name = mapped?.name || personName || c.entity;
                this._personByEntity.set(c.entity, {
                    id: personId || c.entity,
                    name,
                    color,
                    text_color: mapped?.text_color || '',
                    role: mapped?.role || '',
                    header_row: mapped?.header_row || 1,
                });
            }
        },

        _applyConfigImmediate(config, { useDefaults = false, refresh = false } = {}) {
            const merged = { ...(config || {}) };
            if (this._deviceDayStartHour !== null) merged.day_start_hour = this._deviceDayStartHour;
            if (this._deviceDayEndHour !== null) merged.day_end_hour = this._deviceDayEndHour;
            if (this._devicePxPerHour !== null) merged.px_per_hour = this._devicePxPerHour;
            if (this._deviceRefreshMs !== null) merged.refresh_interval_ms = this._deviceRefreshMs;
            if (this._deviceCacheMaxAgeMs !== null)
                merged.cache_max_age_ms = this._deviceCacheMaxAgeMs;
            if (this._deviceBackgroundTheme !== null)
                merged.background_theme = this._deviceBackgroundTheme;
            if (this._deviceDebug !== null) merged.debug = this._deviceDebug;
            if (Array.isArray(this._devicePeopleDisplay))
                merged.people_display = this._devicePeopleDisplay;

            if (!merged.shopping?.entity && this._hass) {
                const fallback = suggestShoppingEntity(this._hass);
                if (fallback) merged.shopping = fallback;
            }

            this._config = merged;
            this._debug = Boolean(merged.debug);
            this._configVersion = (this._configVersion || 0) + 1;

            const dayStart = useDefaults
                ? DEFAULT_CARD_CONFIG.day_start_hour
                : this._dayStartHour ?? DEFAULT_CARD_CONFIG.day_start_hour;
            const dayEnd = useDefaults
                ? DEFAULT_CARD_CONFIG.day_end_hour
                : this._dayEndHour ?? DEFAULT_CARD_CONFIG.day_end_hour;
            const slotMinutes = useDefaults
                ? DEFAULT_CARD_CONFIG.slot_minutes
                : this._slotMinutes ?? DEFAULT_CARD_CONFIG.slot_minutes;
            const pxPerHour = useDefaults
                ? DEFAULT_CARD_CONFIG.px_per_hour
                : this._pxPerHour ?? DEFAULT_CARD_CONFIG.px_per_hour;
            const refreshMs = useDefaults
                ? DEFAULT_CARD_CONFIG.refresh_interval_ms
                : this._refreshIntervalMs ?? DEFAULT_CARD_CONFIG.refresh_interval_ms;

            this._dayStartHour = merged.day_start_hour ?? dayStart;
            this._dayEndHour = merged.day_end_hour ?? dayEnd;
            this._slotMinutes = merged.slot_minutes ?? slotMinutes;
            this._pxPerHour = merged.px_per_hour ?? pxPerHour;
            const daysToShow = merged.days_to_show ?? DEFAULT_CARD_CONFIG.days_to_show;
            this._daysToShow = daysToShow;
            this._scheduleDays = daysToShow;
            this._refreshIntervalMs = merged.refresh_interval_ms ?? refreshMs;
            this._cacheMaxAgeMs =
                merged.cache_max_age_ms !== undefined ? Number(merged.cache_max_age_ms) : 0;

            const backgroundTheme =
                typeof merged.background_theme === 'string' ? merged.background_theme.trim() : '';
            const themeMap = {
                mint: '#f2fbf7',
                sand: '#fff5e8',
                slate: '#f3f6fb',
            };
            if (backgroundTheme && themeMap[backgroundTheme]) {
                this.style.setProperty('--fb-bg', themeMap[backgroundTheme]);
            } else {
                this.style.removeProperty('--fb-bg');
            }
            this._applyV2DynamicTheme?.();

            this._ensureVisibilitySets();
            this._buildPeopleMap();
            this._ensureServices();
            this._resetRefreshTimer();
            this._reportConfigIssues?.(merged);
            if (!this._sanityChecked && this._hass) {
                this._reportIntegrationIssues?.(merged);
                this._sanityChecked = true;
            }
            if (!this._startupChecked && this._hass) {
                this._runStartupChecks?.(merged);
                this._startupChecked = true;
            }
            if (refresh) this._queueRefresh();
            this.requestUpdate();
        },
    });
}
