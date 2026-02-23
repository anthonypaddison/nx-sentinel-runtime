/* nx-displaygrid - config helpers
 * SPDX-License-Identifier: MIT
 */
import { debugLog } from './nx-displaygrid.util.js';
import { serializeNxDisplaygridCardConfig } from './util/config-yaml.util.js';
import { configHasPeople } from './util/source-validation.util.js';

export function applyConfigHelpers(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
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
