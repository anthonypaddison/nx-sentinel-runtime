/* nx-displaygrid - config helpers
 * SPDX-License-Identifier: MIT
 */
import { debugLog } from './nx-displaygrid.util.js';
import { yamlString } from './util/yaml.util.js';

export function applyConfigHelpers(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _onboardingSchemaVersion() {
            return 1;
        },

        _onboardingRequired(config = this._config) {
            const schemaVersion = Number(config?.schemaVersion || 0);
            const onboardingComplete = config?.onboardingComplete === true;
            const hasPeople = Array.isArray(config?.people) && config.people.length > 0;
            return !config || !hasPeople || !onboardingComplete || schemaVersion !== this._onboardingSchemaVersion();
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
            const draft = cfg || {};
            const lines = [];
            const push = (l) => lines.push(l);
            push(`type: custom:nx-displaygrid`);
            if (draft.title) push(`title: ${yamlString(draft.title)}`);
            if (draft.debug !== undefined) push(`debug: ${draft.debug ? 'true' : 'false'}`);
            push(`days_to_show: 5`);
            if (draft.day_start_hour !== undefined) push(`day_start_hour: ${draft.day_start_hour}`);
            if (draft.day_end_hour !== undefined) push(`day_end_hour: ${draft.day_end_hour}`);
            if (draft.slot_minutes !== undefined) push(`slot_minutes: ${draft.slot_minutes}`);
            if (draft.px_per_hour !== undefined) push(`px_per_hour: ${draft.px_per_hour}`);
            if (draft.refresh_interval_ms !== undefined)
                push(`refresh_interval_ms: ${draft.refresh_interval_ms}`);
            if (draft.background_theme)
                push(`background_theme: ${yamlString(draft.background_theme)}`);

            const people = Array.isArray(draft.people) ? draft.people : [];
            if (people.length) {
                push(`people:`);
                for (const p of people) {
                    push(`  - id: ${yamlString(p.id)}`);
                    if (p.name) push(`    name: ${yamlString(p.name)}`);
                    if (p.color) push(`    color: ${yamlString(p.color)}`);
                    if (p.text_color) push(`    text_color: ${yamlString(p.text_color)}`);
                    if (p.role) push(`    role: ${yamlString(p.role)}`);
                    if (p.header_row) push(`    header_row: ${p.header_row}`);
                }
            }
            const peopleDisplay = Array.isArray(draft.people_display) ? draft.people_display : [];
            if (peopleDisplay.length) {
                push(`people_display:`);
                for (const id of peopleDisplay) {
                    push(`  - ${yamlString(id)}`);
                }
            }

            if (draft.admin_pin !== undefined) {
                push(`admin_pin: ${yamlString(draft.admin_pin)}`);
            }

            const calendars = Array.isArray(draft.calendars) ? draft.calendars : [];
            if (calendars.length) {
                push(`calendars:`);
                for (const c of calendars) {
                    push(`  - entity: ${yamlString(c.entity)}`);
                    if (c.person_id) push(`    person_id: ${yamlString(c.person_id)}`);
                    if (c.role) push(`    role: ${yamlString(c.role)}`);
                }
            }

            const todos = Array.isArray(draft.todos) ? draft.todos : [];
            if (todos.length) {
                push(`todos:`);
                for (const t of todos) {
                    push(`  - entity: ${yamlString(t.entity)}`);
                    if (t.name) push(`    name: ${yamlString(t.name)}`);
                    if (t.person_id) push(`    person_id: ${yamlString(t.person_id)}`);
                }
            }

            const shopping = draft.shopping?.entity ? draft.shopping : null;
            if (shopping) {
                push(`shopping:`);
                push(`  entity: ${yamlString(shopping.entity)}`);
                if (shopping.name) push(`  name: ${yamlString(shopping.name)}`);
            }

            const homeControls = Array.isArray(draft.home_controls) ? draft.home_controls : [];
            if (homeControls.length) {
                push(`home_controls:`);
                for (const eid of homeControls) {
                    push(`  - ${yamlString(eid)}`);
                }
            }

            return lines.join('\n');
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
