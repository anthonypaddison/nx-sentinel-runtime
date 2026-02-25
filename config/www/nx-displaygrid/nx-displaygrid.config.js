/* nx-displaygrid - config helpers
 * SPDX-License-Identifier: MIT
 */
import { debugLog, isControllableEntity } from './nx-displaygrid.util.js';
import { serializeNxDisplaygridCardConfig } from './util/config-yaml.util.js';
import { configHasPeople } from './util/source-validation.util.js';

export function applyConfigHelpers(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _familyDashboardConfig() {
            const cfg = this._config?.family_dashboard_v3;
            return cfg && typeof cfg === 'object' ? cfg : {};
        },

        _isFamilyDashboardMode() {
            return this._familyDashboardConfig().enabled === true;
        },

        _familyAdminMenuConfig() {
            const cfg = this._familyDashboardConfig()?.admin_menu;
            const base = cfg && typeof cfg === 'object' ? cfg : {};
            return {
                settings: base.settings !== false,
                admin: base.admin !== false,
                audit: base.audit !== false,
            };
        },

        _v2Features(config = this._config) {
            const flags = config?.v2_features;
            return flags && typeof flags === 'object' ? flags : {};
        },

        _v2FeatureEnabled(name, config = this._config) {
            if (!name) return false;
            return this._v2Features(config)[name] === true;
        },

        _isHomeControlEntityEligible(entityId) {
            return isControllableEntity(this._hass, entityId, {
                allowAllDomains: this._v2FeatureEnabled('home_controls_broader_entities'),
            });
        },

        _v2NavScreens() {
            const screens = [];
            const familyMode = this._isFamilyDashboardMode?.();
            const adminMenu = this._familyAdminMenuConfig?.();
            if (this._v2FeatureEnabled('food_view')) {
                screens.push({ key: 'food', label: 'Food', icon: 'mdi:silverware-fork-knife' });
            }
            if (this._v2FeatureEnabled('family_dashboard')) {
                screens.push({
                    key: 'family',
                    label: familyMode ? 'Family Dashboard' : 'Family',
                    icon: 'mdi:home-heart',
                });
            }
            if (this._v2FeatureEnabled('intent_view') && !familyMode) {
                screens.push({ key: 'intent', label: 'Intent', icon: 'mdi:gesture-tap-button' });
            }
            if (this._v2FeatureEnabled('ambient_view')) {
                screens.push({ key: 'ambient', label: 'Ambient', icon: 'mdi:tablet-dashboard' });
            }
            if (
                this._v2FeatureEnabled('admin_dashboard') &&
                this._hasAdminAccess?.() &&
                (!familyMode || adminMenu?.admin)
            ) {
                screens.push({ key: 'admin', label: 'Admin', icon: 'mdi:shield-crown-outline' });
            }
            if (
                this._v2FeatureEnabled('audit_timeline') &&
                this._hasAdminAccess?.() &&
                (!familyMode || adminMenu?.audit)
            ) {
                screens.push({ key: 'audit', label: 'Audit', icon: 'mdi:timeline-text-outline' });
            }
            return screens;
        },

        _onboardingSchemaVersion() {
            return 1;
        },

        _onboardingRequired(config = this._config) {
            const schemaVersion = Number(config?.schemaVersion || 0);
            const onboardingComplete = config?.onboardingComplete === true;
            const hasPeople = configHasPeople(config);
            return (
                !config ||
                !hasPeople ||
                !onboardingComplete ||
                schemaVersion !== this._onboardingSchemaVersion()
            );
        },

        async _updateConfigPartial(patch) {
            if (!patch) return;
            debugLog(this._debug, 'updateConfigPartial', { patch });
            const deviceKeys = new Set([
                'day_start_hour',
                'day_end_hour',
                'px_per_hour',
                'refresh_interval_ms',
                'cache_max_age_ms',
                'background_theme',
                'debug',
                'people_display',
            ]);
            const devicePatch = {};
            const sharedPatch = {};
            for (const [key, value] of Object.entries(patch)) {
                if (deviceKeys.has(key)) devicePatch[key] = value;
                else sharedPatch[key] = value;
            }

            if (Object.keys(devicePatch).length) {
                debugLog(this._debug, 'device config patch', { devicePatch });
                if (devicePatch.day_start_hour !== undefined)
                    this._deviceDayStartHour = Number(devicePatch.day_start_hour);
                if (devicePatch.day_end_hour !== undefined)
                    this._deviceDayEndHour = Number(devicePatch.day_end_hour);
                if (devicePatch.px_per_hour !== undefined)
                    this._devicePxPerHour = Number(devicePatch.px_per_hour);
                if (devicePatch.refresh_interval_ms !== undefined)
                    this._deviceRefreshMs = Number(devicePatch.refresh_interval_ms);
                if (devicePatch.cache_max_age_ms !== undefined)
                    this._deviceCacheMaxAgeMs = Number(devicePatch.cache_max_age_ms);
                if (devicePatch.background_theme !== undefined)
                    this._deviceBackgroundTheme = devicePatch.background_theme || '';
                if (devicePatch.debug !== undefined)
                    this._deviceDebug = Boolean(devicePatch.debug);
                if (devicePatch.people_display !== undefined)
                    this._devicePeopleDisplay = Array.isArray(devicePatch.people_display)
                        ? devicePatch.people_display
                        : [];
                this._savePrefs();
            }

            const sharedBase = this._sharedConfig || this._config || {};
            const nextShared = { ...sharedBase, ...sharedPatch };
            this._sharedConfig = nextShared;
            debugLog(this._debug, 'shared config patch', { sharedPatch, nextShared });
            this._applyConfigImmediate(nextShared, { useDefaults: false });
            await this._refreshAll();
            if (Object.keys(sharedPatch).length) {
                const result = await this._persistConfig(nextShared);
                if (result?.mode === 'local') {
                    this._showToast('Saved', 'Saved on this device');
                } else {
                    this._showToast('Saved');
                }
            } else {
                this._showToast('Saved', 'Saved on this device');
            }
            this.requestUpdate();
        },

        _buildYamlConfig(cfg) {
            return serializeNxDisplaygridCardConfig(cfg, {
                includeBackgroundTheme: true,
                includeHomeControls: true,
            });
        },

        _openSetupWizard() {
            this._forceSetupWizard = true;
            this._screen = 'schedule';
            this.requestUpdate();
        },

        async _applySetupDraft(draft, { stepIndex = 0, stepCount = 1 } = {}) {
            const sharedBase = this._sharedConfig || this._config || {};
            const isFinished = stepIndex >= Math.max(0, Number(stepCount) - 1);
            const nextShared = {
                ...sharedBase,
                ...(draft || {}),
                onboardingComplete: Boolean(isFinished),
                schemaVersion: this._onboardingSchemaVersion(),
            };
            try {
                this._sharedConfig = nextShared;
                this._applyConfigImmediate(nextShared, { useDefaults: false });
                await this._refreshAll();
                const result = await this._persistConfig(nextShared);
                const title = isFinished ? 'Setup saved' : 'Setup step saved';
                if (isFinished) this._forceSetupWizard = false;
                if (result?.mode === 'local') {
                    this._showToast(title, 'Saved on this device');
                } else {
                    this._showToast(title);
                }
                return { ok: true, mode: result?.mode || 'local', finished: isFinished };
            } catch (error) {
                this._reportError?.('Save setup', error);
                const detail = error?.message || 'Unable to save setup';
                this._showErrorToast?.('Setup save failed', detail);
                return { ok: false, error, finished: false };
            }
        },
    });
}
