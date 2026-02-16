/* nx-displaygrid - config validation helpers
 * SPDX-License-Identifier: MIT
 */
export function applyValidation(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _validateConfig(config) {
            const errors = [];
            if (!config || typeof config !== 'object') {
                errors.push('Config is missing or invalid.');
                return errors;
            }
            const start = Number(config.day_start_hour);
            const end = Number(config.day_end_hour);
            if (Number.isFinite(start) && (start < 0 || start > 24)) {
                errors.push('day_start_hour must be between 0 and 24.');
            }
            if (Number.isFinite(end) && (end < 0 || end > 24)) {
                errors.push('day_end_hour must be between 0 and 24.');
            }
            if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
                errors.push('day_end_hour must be after day_start_hour.');
            }
            if (config.slot_minutes !== undefined && ![30, 60].includes(Number(config.slot_minutes))) {
                errors.push('slot_minutes must be 30 or 60.');
            }
            if (config.days_to_show !== undefined && Number(config.days_to_show) <= 0) {
                errors.push('days_to_show must be greater than 0.');
            }
            if (config.px_per_hour !== undefined && Number(config.px_per_hour) <= 0) {
                errors.push('px_per_hour must be greater than 0.');
            }
            if (config.refresh_interval_ms !== undefined && Number(config.refresh_interval_ms) < 10_000) {
                errors.push('refresh_interval_ms should be at least 10000.');
            }
            if (
                config.cache_max_age_ms !== undefined &&
                Number(config.cache_max_age_ms) < 0
            ) {
                errors.push('cache_max_age_ms must be 0 or greater.');
            }
            return errors;
        },

        _validateConfigEntities(config) {
            const errors = [];
            const states = this._hass?.states;
            if (!states) return errors;
            const calendars = Array.isArray(config?.calendars) ? config.calendars : [];
            const todos = Array.isArray(config?.todos) ? config.todos : [];
            const shopping = config?.shopping?.entity ? config.shopping.entity : '';
            const homeControls = Array.isArray(config?.home_controls)
                ? config.home_controls
                : [];

            calendars.forEach((c) => {
                if (c?.entity && !states[c.entity]) {
                    errors.push(`Calendar missing: ${c.entity}`);
                }
            });
            todos.forEach((t) => {
                if (t?.entity && !states[t.entity]) {
                    errors.push(`Todo missing: ${t.entity}`);
                }
            });
            if (shopping && !states[shopping]) {
                errors.push(`Shopping list missing: ${shopping}`);
            }
            homeControls.forEach((eid) => {
                if (eid && !states[eid]) {
                    errors.push(`Home control missing: ${eid}`);
                }
            });

            return errors;
        },

        _validateIntegrationSupport(config) {
            const errors = [];
            const calendars = Array.isArray(config?.calendars) ? config.calendars : [];
            const todos = Array.isArray(config?.todos) ? config.todos : [];
            const hasShopping = Boolean(config?.shopping?.entity);
            const hasTodos = todos.length > 0 || hasShopping;
            if (hasTodos && !this._hass?.services?.todo) {
                errors.push('Todo services unavailable. Check the Todo integration.');
            }
            if (calendars.length && !this._hass?.services?.calendar) {
                errors.push('Calendar services unavailable. Add/edit may be disabled.');
            }
            return errors;
        },

        _runStartupChecks(config) {
            if (this._onboardingRequired?.(config)) return;
            const calendars = Array.isArray(config?.calendars) ? config.calendars : [];
            const todos = Array.isArray(config?.todos) ? config.todos : [];
            const hasShopping = Boolean(config?.shopping?.entity);
            const hasSources = calendars.length || todos.length || hasShopping;
            if (!hasSources) {
                if (this._shouldNotifyError?.('startup-no-sources', 120_000)) {
                    this._showToast(
                        'No sources configured',
                        'Add a calendar, todo list, or shopping list.'
                    );
                }
            }
        },

        _reportIntegrationIssues(config) {
            if (this._onboardingRequired?.(config)) return;
            const errors = this._validateIntegrationSupport(config);
            if (!errors.length) return;
            if (this._shouldNotifyError?.('integration-sanity', 120_000)) {
                this._showErrorToast('Integration needs attention', errors[0]);
            }
        },

        _reportConfigIssues(config) {
            const errors = [
                ...this._validateConfig(config),
                ...this._validateConfigEntities(config),
            ];
            if (!errors.length) return;
            if (this._shouldNotifyError?.('config-validation', 120_000)) {
                this._showErrorToast('Config needs attention', errors[0]);
            }
        },
    });
}
