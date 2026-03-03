/* nx-displaygrid - adaptive presentation helpers (V2)
 * SPDX-License-Identifier: MIT
 */

function timeBucket(now = new Date()) {
    const h = now.getHours();
    if (h < 6) return 'night';
    if (h < 12) return 'morning';
    if (h < 17) return 'day';
    if (h < 22) return 'evening';
    return 'night';
}

function normId(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
}

function defaultHouseModes() {
    return [
        { id: 'home', label: 'Home' },
        { id: 'away', label: 'Away' },
        { id: 'away_off', label: 'Away/Off' },
        { id: 'guest', label: 'Guest' },
        { id: 'quiet', label: 'Quiet' },
        { id: 'calm', label: 'Calm' },
    ];
}

export function applyAdaptive(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _allowedViews() {
            const extras = (this._v2NavScreens?.() || []).map((s) => s.key).filter(Boolean);
            const familyMode = this._isFamilyDashboardMode?.();
            if (familyMode) {
                const familyBase = ['schedule', 'chores', 'home'];
                const isAdmin = this._hasAdminAccess?.();
                const adminMenu = this._familyAdminMenuConfig?.() || {};
                if (isAdmin && adminMenu.settings !== false) familyBase.push('settings');
                return [...new Set([...familyBase, ...extras])];
            }
            const base = ['schedule', 'important', 'chores', 'shopping', 'home', 'settings'];
            return [...base, ...extras];
        },

        _v2AdaptiveConfig() {
            const cfg = this._config?.adaptive_v2;
            const base = cfg && typeof cfg === 'object' ? cfg : {};
            return {
                auto_screen: base.auto_screen === true,
                auto_screen_idle_seconds: Number(base.auto_screen_idle_seconds || 180),
                dynamic_theme: base.dynamic_theme === true,
                occupancy_entity: String(base.occupancy_entity || '').trim(),
                confidence_entity: String(base.confidence_entity || '').trim(),
                confidence_uncertain_below: Number(base.confidence_uncertain_below ?? 70),
            };
        },

        _v2HouseModes() {
            const raw = Array.isArray(this._config?.house_modes_v2) ? this._config.house_modes_v2 : [];
            const parsed = raw
                .map((mode) => {
                    if (!mode || typeof mode !== 'object') return null;
                    const id = normId(mode.id || mode.value || mode.label);
                    if (!id) return null;
                    return {
                        id,
                        label: String(mode.label || mode.name || id)
                            .trim()
                            .replace(/\b\w/g, (m) => m.toUpperCase()),
                    };
                })
                .filter(Boolean);
            return parsed.length ? parsed : defaultHouseModes();
        },

        _v2OccupancyState() {
            const entityId = this._v2AdaptiveConfig().occupancy_entity;
            const st = entityId ? this._hass?.states?.[entityId] : null;
            const state = String(st?.state || '').toLowerCase();
            const occupied = ['on', 'home', 'occupied', 'present'].includes(state);
            const away = ['off', 'not_home', 'away', 'unoccupied'].includes(state);
            return { entityId, state, occupied, away, available: Boolean(st) };
        },

        _v2PresenceConfidence() {
            const adaptive = this._v2AdaptiveConfig();
            const entityId = adaptive.confidence_entity || '';
            const st = entityId ? this._hass?.states?.[entityId] : null;
            const raw =
                st?.attributes?.confidence ??
                st?.attributes?.score ??
                st?.attributes?.value ??
                st?.state;
            let value = Number(raw);
            if (!Number.isFinite(value)) value = NaN;
            if (Number.isFinite(value) && value <= 1) value *= 100;
            const threshold = Math.max(1, Math.min(100, Number(adaptive.confidence_uncertain_below || 70)));
            const available = Boolean(st) && Number.isFinite(value);
            const rounded = available ? Math.max(0, Math.min(100, Math.round(value))) : null;
            const uncertain = Boolean(available && rounded < threshold);
            return {
                entityId,
                available,
                value: rounded,
                threshold,
                uncertain,
                state: String(st?.state || ''),
            };
        },

        _v2PresenceState() {
            const occupancy = this._v2OccupancyState();
            const confidence = this._v2PresenceConfidence();
            const uncertainAway = Boolean(occupancy.away && confidence.available && confidence.uncertain);
            const uncertainOccupied = Boolean(
                occupancy.occupied && confidence.available && confidence.uncertain
            );
            return {
                occupancy,
                confidence,
                uncertain: Boolean(confidence.available && confidence.uncertain),
                uncertainAway,
                uncertainOccupied,
            };
        },

        _v2PresenceRenderSig() {
            const presence = this._v2PresenceState?.();
            if (!presence) return '';
            const occ = presence.occupancy || {};
            const conf = presence.confidence || {};
            return [
                occ.entityId || '',
                occ.state || '',
                conf.entityId || '',
                conf.available ? conf.value : '',
                conf.threshold || '',
                conf.uncertain ? '1' : '0',
            ].join('|');
        },

        _v2AdaptiveSeverity() {
            const hard = Boolean(this._calendarError || this._todoError || this._shoppingError);
            const soft = Boolean(this._calendarStale || this._todoStale || this._shoppingStale);
            if (hard) return 'critical';
            if (soft) return 'warn';
            return 'normal';
        },

        _v2ThemePaletteKey() {
            if (!this._v2FeatureEnabled?.('dynamic_themes')) return '';
            const adaptive = this._v2AdaptiveConfig();
            if (!adaptive.dynamic_theme) return '';
            const severity = this._v2AdaptiveSeverity();
            if (severity === 'critical') return 'critical';
            if (severity === 'warn') return 'warn';

            const houseMode = this._v2HouseModeState?.() || { state: '' };
            const mode = normId(houseMode.state);
            if (mode === 'away_off' || mode === 'away-off') return 'away_off';
            if (mode === 'guest') return 'guest';
            if (mode === 'quiet' || mode === 'calm') return 'quiet';

            const occupancy = this._v2OccupancyState();
            if (occupancy.available && occupancy.away) return 'away';
            const presence = this._v2PresenceState?.();
            if (presence?.uncertain) return 'warn';

            const bucket = timeBucket(new Date());
            if (bucket === 'night') return 'night';
            if (bucket === 'evening') return 'evening';
            return 'day';
        },

        _applyV2DynamicTheme() {
            const key = this._v2ThemePaletteKey?.() || '';
            if (this._v2AdaptiveThemeKey === key && this._v2AdaptiveThemeApplied) return;

            const clearKeys = [
                '--fb-bg',
                '--fb-surface',
                '--fb-surface-2',
                '--fb-border',
                '--fb-accent',
                '--fb-accent-teal',
            ];
            const applyVars = (vars) => {
                clearKeys.forEach((name) => this.style.removeProperty(name));
                Object.entries(vars || {}).forEach(([name, value]) => {
                    if (value) this.style.setProperty(name, value);
                });
                this._v2AdaptiveThemeApplied = true;
            };

            const palettes = {
                day: {
                    '--fb-bg': '#f3fbfa',
                    '--fb-surface': '#ffffff',
                    '--fb-surface-2': '#f7fcfb',
                    '--fb-border': '#dbe8e5',
                    '--fb-accent': '#f5c58d',
                    '--fb-accent-teal': '#7dd8d7',
                },
                evening: {
                    '--fb-bg': '#f5f4fb',
                    '--fb-surface': '#ffffff',
                    '--fb-surface-2': '#f7f6fd',
                    '--fb-border': '#ddd8ee',
                    '--fb-accent': '#d9c4ff',
                    '--fb-accent-teal': '#9cc9f5',
                },
                night: {
                    '--fb-bg': '#eef2f9',
                    '--fb-surface': '#ffffff',
                    '--fb-surface-2': '#f1f4fa',
                    '--fb-border': '#d8deea',
                    '--fb-accent': '#c8d7ff',
                    '--fb-accent-teal': '#9dc2ff',
                },
                away: {
                    '--fb-bg': '#f7f7f2',
                    '--fb-surface': '#ffffff',
                    '--fb-surface-2': '#fbfbf6',
                    '--fb-border': '#e4e2d8',
                    '--fb-accent': '#d7d1b3',
                    '--fb-accent-teal': '#bfc8a4',
                },
                away_off: {
                    '--fb-bg': '#f4f4f4',
                    '--fb-surface': '#ffffff',
                    '--fb-surface-2': '#f8f8f8',
                    '--fb-border': '#dddddd',
                    '--fb-accent': '#d0d0d0',
                    '--fb-accent-teal': '#bcbcbc',
                },
                guest: {
                    '--fb-bg': '#fff8ef',
                    '--fb-surface': '#ffffff',
                    '--fb-surface-2': '#fffaf3',
                    '--fb-border': '#eedfca',
                    '--fb-accent': '#ffd5a8',
                    '--fb-accent-teal': '#8fd8ce',
                },
                quiet: {
                    '--fb-bg': '#f3f8fb',
                    '--fb-surface': '#ffffff',
                    '--fb-surface-2': '#f7fbfd',
                    '--fb-border': '#d8e5ee',
                    '--fb-accent': '#c7def3',
                    '--fb-accent-teal': '#9fd0df',
                },
                warn: {
                    '--fb-bg': '#fff8ea',
                    '--fb-surface': '#ffffff',
                    '--fb-surface-2': '#fffbf2',
                    '--fb-border': '#eddcb2',
                    '--fb-accent': '#ffd87a',
                    '--fb-accent-teal': '#8fd7d6',
                },
                critical: {
                    '--fb-bg': '#fff1f4',
                    '--fb-surface': '#ffffff',
                    '--fb-surface-2': '#fff5f7',
                    '--fb-border': '#efc4cf',
                    '--fb-accent': '#ffb6c9',
                    '--fb-accent-teal': '#ff8ca8',
                },
            };

            if (!key || !palettes[key]) {
                this._v2AdaptiveThemeKey = '';
                this._v2AdaptiveThemeApplied = false;
                // Let static background theme / base tokens apply.
                clearKeys.forEach((name) => this.style.removeProperty(name));
                return;
            }
            this._v2AdaptiveThemeKey = key;
            applyVars(palettes[key]);
        },

        _v2RecommendedScreen() {
            if (!this._v2FeatureEnabled?.('adaptive_layout')) return '';
            const adaptive = this._v2AdaptiveConfig();
            if (!adaptive.auto_screen) return '';
            const familyMode = this._isFamilyDashboardMode?.();

            const severity = this._v2AdaptiveSeverity();
            if (severity !== 'normal' && this._v2FeatureEnabled?.('intent_view') && !familyMode)
                return 'intent';

            const bucket = timeBucket(new Date());
            const occupancy = this._v2OccupancyState();
            const presence = this._v2PresenceState?.();
            const eventsNow = this._v2CurrentEventsNowCount?.() || 0;
            const choresDue = this._v2TodoDueTodayCount?.() || 0;
            const shoppingCount = this._shoppingQuantityCount?.(this._shoppingItems || []) || 0;

            if (presence?.uncertain && this._v2FeatureEnabled?.('intent_view') && !familyMode) {
                return 'intent';
            }

            if ((bucket === 'night' || bucket === 'evening') && this._v2FeatureEnabled?.('ambient_view')) {
                return 'ambient';
            }
            if (bucket === 'morning' && (choresDue > 0 || shoppingCount > 0)) {
                return familyMode ? 'family' : 'important';
            }
            if (occupancy.available && occupancy.away && this._v2FeatureEnabled?.('ambient_view')) {
                return 'ambient';
            }
            if (eventsNow > 0) return 'schedule';
            if (familyMode) return 'family';
            if (this._v2FeatureEnabled?.('intent_view')) return 'intent';
            return '';
        },

        _maybeApplyV2AdaptiveScreen({ force = false } = {}) {
            if (!this._v2FeatureEnabled?.('adaptive_layout')) return;
            const adaptive = this._v2AdaptiveConfig();
            if (!adaptive.auto_screen) return;
            const recommended = this._v2RecommendedScreen?.();
            if (!recommended) return;
            const allowed = this._allowedViews?.() || [];
            if (allowed.length && !allowed.includes(recommended)) return;
            if (this._screen === recommended) return;
            if (Number(this._manualNavAdaptiveLockUntilTs || 0) > Date.now()) return;

            const idleSeconds = Math.max(30, Number(adaptive.auto_screen_idle_seconds || 180));
            const sinceManual = Date.now() - Number(this._lastManualNavTs || 0);
            if (this._lastManualNavTs && sinceManual < idleSeconds * 1000) return;

            this._screen = recommended;
            this._adaptiveScreenTs = Date.now();
            this._savePrefs?.();
            this.requestUpdate();
        },

        _tickV2AdaptivePresentation({ force = false } = {}) {
            const now = Date.now();
            if (!force && this._lastAdaptiveTickTs && now - this._lastAdaptiveTickTs < 30_000) {
                return;
            }
            this._lastAdaptiveTickTs = now;
            this._applyV2DynamicTheme?.();
            this._maybeApplyV2AdaptiveScreen?.({ force });
        },

        async _v2SetHouseMode(modeId) {
            const target = normId(modeId);
            if (!target) return;
            const entityId = this._v2HouseModeState?.().entityId || '';
            if (!entityId || !this._hass) return;
            const domain = entityId.split('.')[0];
            if (domain === 'input_select' || domain === 'select') {
                const service = domain === 'input_select' ? 'select_option' : 'select_option';
                const option = this._v2HouseModes().find((m) => m.id === target)?.label || target;
                if (typeof this._queueCallService === 'function') {
                    await this._queueCallService(
                        domain,
                        service,
                        {
                            entity_id: entityId,
                            option,
                        },
                        { label: `Set house mode ${option}` }
                    );
                } else {
                    await this._hass.callService(domain, service, {
                        entity_id: entityId,
                        option,
                    });
                }
                this._showToast?.('House mode', `Set to ${option}`);
                this._v2AuditRecord?.({
                    type: 'mode_change',
                    component: 'modes',
                    severity: 'info',
                    title: 'House mode changed',
                    reason: `Set to ${option}`,
                    context: { entityId, modeId: target, option },
                });
                return;
            }
            this._openMoreInfo?.(entityId);
        },
    });
}
