/* nx-displaygrid - admin helpers
 * SPDX-License-Identifier: MIT
 */
import { hashAdminPin, verifyAdminPin } from './util/admin-pin.util.js';

export function applyAdmin(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _v2HealthConfig() {
            const cfg = this._config?.health_v2;
            const base = cfg && typeof cfg === 'object' ? cfg : {};
            const toList = (value) =>
                Array.isArray(value)
                    ? value.map((v) => String(v || '').trim()).filter(Boolean)
                    : [];
            return {
                window_entities: toList(base.window_entities),
                heating_entities: toList(base.heating_entities),
                lights_watch_entities: toList(base.lights_watch_entities),
                device_watch_entities: toList(base.device_watch_entities),
            };
        },

        _v2IsEntityOn(entityId) {
            const st = entityId ? this._hass?.states?.[entityId] : null;
            const state = String(st?.state || '').toLowerCase();
            return ['on', 'open', 'home', 'detected', 'playing'].includes(state);
        },

        _v2IsEntityUnavailable(entityId) {
            const st = entityId ? this._hass?.states?.[entityId] : null;
            if (!st) return true;
            const state = String(st.state || '').toLowerCase();
            return !state || ['unavailable', 'unknown', 'none'].includes(state);
        },

        _v2ClimateHeatingActive(entityId) {
            const st = entityId ? this._hass?.states?.[entityId] : null;
            if (!st) return false;
            const state = String(st.state || '').toLowerCase();
            const hvacAction = String(st.attributes?.hvac_action || '').toLowerCase();
            if (hvacAction === 'heating') return true;
            if (st.attributes?.hvac_mode && String(st.attributes.hvac_mode).toLowerCase() === 'heat')
                return true;
            return ['heat', 'heating', 'on'].includes(state);
        },

        _v2HealthIssues() {
            const cfg = this._v2HealthConfig?.() || {};
            const homeControls = Array.isArray(this._config?.home_controls)
                ? this._config.home_controls
                : [];

            const defaultLightWatch = homeControls.filter((eid) => {
                const domain = String(eid || '').split('.')[0];
                return domain === 'light' || domain === 'switch';
            });

            const lightsWatch = (cfg.lights_watch_entities?.length
                ? cfg.lights_watch_entities
                : defaultLightWatch
            ).filter(Boolean);
            const windows = (cfg.window_entities || []).filter(Boolean);
            const heating = (cfg.heating_entities || []).filter(Boolean);
            const deviceWatch = Array.from(
                new Set([
                    ...(cfg.device_watch_entities || []),
                    ...homeControls,
                    ...windows,
                    ...heating,
                    ...lightsWatch,
                ].filter(Boolean))
            );

            const issues = [];
            const onLights = lightsWatch.filter((eid) => this._v2IsEntityOn?.(eid));
            if (onLights.length) {
                issues.push({
                    key: 'lights-left-on',
                    severity: onLights.length >= 4 ? 'warn' : 'info',
                    title: 'Lights left on',
                    detail: `${onLights.length} active: ${onLights.slice(0, 3).join(', ')}${
                        onLights.length > 3 ? '…' : ''
                    }`,
                    entityIds: onLights,
                });
            }

            const openWindows = windows.filter((eid) => this._v2IsEntityOn?.(eid));
            if (openWindows.length) {
                issues.push({
                    key: 'windows-open',
                    severity: 'warn',
                    title: 'Windows open',
                    detail: `${openWindows.length} open: ${openWindows.slice(0, 3).join(', ')}${
                        openWindows.length > 3 ? '…' : ''
                    }`,
                    entityIds: openWindows,
                });
            }

            const heatingActive = heating.filter((eid) => this._v2ClimateHeatingActive?.(eid));
            if (heatingActive.length && openWindows.length) {
                issues.push({
                    key: 'heating-window-conflict',
                    severity: 'critical',
                    title: 'Heating conflict',
                    detail: `${heatingActive.length} heating while ${openWindows.length} window(s) open`,
                    entityIds: [...heatingActive, ...openWindows],
                });
            }

            const unreachable = deviceWatch.filter((eid) => this._v2IsEntityUnavailable?.(eid));
            if (unreachable.length) {
                issues.push({
                    key: 'devices-unreachable',
                    severity: 'warn',
                    title: 'Unreachable devices',
                    detail: `${unreachable.length} unavailable/unknown: ${unreachable
                        .slice(0, 3)
                        .join(', ')}${unreachable.length > 3 ? '…' : ''}`,
                    entityIds: unreachable,
                });
            }

            return issues;
        },

        _v2HealthSummary() {
            const issues = this._v2HealthIssues?.() || [];
            const critical = issues.filter((i) => i.severity === 'critical').length;
            const warn = issues.filter((i) => i.severity === 'warn').length;
            const info = issues.filter((i) => i.severity === 'info').length;
            return {
                issues,
                total: issues.length,
                critical,
                warn,
                info,
                status: critical ? 'critical' : warn ? 'warn' : issues.length ? 'info' : 'ok',
            };
        },

        _v2HealthRenderSig() {
            const cfg = this._v2HealthConfig?.() || {};
            const homeControls = Array.isArray(this._config?.home_controls)
                ? this._config.home_controls
                : [];
            const ids = Array.from(
                new Set([
                    ...homeControls,
                    ...(cfg.window_entities || []),
                    ...(cfg.heating_entities || []),
                    ...(cfg.lights_watch_entities || []),
                    ...(cfg.device_watch_entities || []),
                ].filter(Boolean))
            ).sort();
            return ids
                .map((eid) => {
                    const st = this._hass?.states?.[eid];
                    return `${eid}:${st?.state || 'missing'}:${st?.attributes?.hvac_action || ''}`;
                })
                .join('|');
        },

        _v2AdminConfig() {
            const cfg = this._config?.admin_v2;
            const base = cfg && typeof cfg === 'object' ? cfg : {};
            return {
                backup_last_success_entity: String(base.backup_last_success_entity || '').trim(),
                backup_stale_hours: Math.max(1, Number(base.backup_stale_hours || 48)),
                snapshot_service: String(base.snapshot_service || '').trim(),
                snapshot_service_data:
                    base.snapshot_service_data && typeof base.snapshot_service_data === 'object'
                        ? base.snapshot_service_data
                        : {},
            };
        },

        _parseTimestampValue(value) {
            if (value === null || value === undefined || value === '') return 0;
            if (value instanceof Date) {
                const ts = value.getTime();
                return Number.isFinite(ts) ? ts : 0;
            }
            if (typeof value === 'number' && Number.isFinite(value)) {
                if (value > 1e12) return Math.trunc(value);
                if (value > 1e9) return Math.trunc(value * 1000);
                return 0;
            }
            const raw = String(value).trim();
            if (!raw) return 0;
            if (/^\d+$/.test(raw)) {
                const num = Number(raw);
                if (Number.isFinite(num)) {
                    if (num > 1e12) return Math.trunc(num);
                    if (num > 1e9) return Math.trunc(num * 1000);
                }
            }
            const parsed = new Date(raw).getTime();
            return Number.isFinite(parsed) ? parsed : 0;
        },

        _v2BackupStatus() {
            const cfg = this._v2AdminConfig?.() || {};
            const entityId = cfg.backup_last_success_entity || '';
            const staleHours = Math.max(1, Number(cfg.backup_stale_hours || 48));
            if (!entityId) {
                return {
                    configured: false,
                    entityId: '',
                    available: false,
                    ts: 0,
                    stale: false,
                    thresholdHours: staleHours,
                    status: 'Not configured',
                    detail: 'Set a backup timestamp sensor/entity in Settings.',
                };
            }
            const st = this._hass?.states?.[entityId];
            if (!st) {
                return {
                    configured: true,
                    entityId,
                    available: false,
                    ts: 0,
                    stale: true,
                    thresholdHours: staleHours,
                    status: 'Entity missing',
                    detail: `Entity not found: ${entityId}`,
                };
            }

            const attrs = st.attributes || {};
            const ts =
                this._parseTimestampValue(attrs.last_success) ||
                this._parseTimestampValue(attrs.last_backup) ||
                this._parseTimestampValue(attrs.timestamp) ||
                this._parseTimestampValue(attrs.datetime) ||
                this._parseTimestampValue(attrs.last_completed) ||
                this._parseTimestampValue(st.state);

            if (!ts) {
                return {
                    configured: true,
                    entityId,
                    available: true,
                    ts: 0,
                    stale: true,
                    thresholdHours: staleHours,
                    status: 'Unknown',
                    detail: `Unable to parse timestamp from ${entityId}`,
                    rawState: st.state,
                };
            }

            const ageMs = Math.max(0, Date.now() - ts);
            const stale = ageMs > staleHours * 3600_000;
            const ageHours = ageMs / 3600_000;
            return {
                configured: true,
                entityId,
                available: true,
                ts,
                ageMs,
                ageHours,
                stale,
                thresholdHours: staleHours,
                status: stale ? 'Stale' : 'OK',
                detail: stale
                    ? `Older than ${staleHours}h threshold`
                    : `Within ${staleHours}h threshold`,
                rawState: st.state,
            };
        },

        async _v2SnapshotNow() {
            if (!this._hasAdminAccess()) return;
            if (!this._hass) return;
            const cfg = this._v2AdminConfig?.() || {};
            let serviceRef = String(cfg.snapshot_service || '').trim();
            if (!serviceRef) {
                if (this._supportsService?.('backup', 'create')) serviceRef = 'backup.create';
                else if (this._supportsService?.('hassio', 'backup_full'))
                    serviceRef = 'hassio.backup_full';
            }
            if (!serviceRef || !serviceRef.includes('.')) {
                this._showToast('Snapshot service not configured');
                return;
            }
            const [domain, service] = serviceRef.split('.', 2);
            if (!domain || !service || !this._supportsService?.(domain, service)) {
                this._showToast('Snapshot service unavailable', serviceRef);
                return;
            }
            try {
                if (typeof this._queueCallService === 'function') {
                    await this._queueCallService(
                        domain,
                        service,
                        { ...(cfg.snapshot_service_data || {}) },
                        { label: `Snapshot ${domain}.${service}` }
                    );
                } else {
                    await this._hass.callService(domain, service, {
                        ...(cfg.snapshot_service_data || {}),
                    });
                }
                this._showToast('Snapshot started');
                this._v2AuditRecord?.({
                    type: 'action',
                    component: 'system',
                    severity: 'info',
                    title: 'Snapshot now',
                    reason: `Triggered ${domain}.${service}`,
                    context: { service: `${domain}.${service}` },
                });
            } catch (error) {
                this._reportError?.('Snapshot now', error);
            }
        },

        _hasAdminAccess() {
            return Boolean(this._hass?.user?.is_admin || this._adminUnlocked);
        },

        async _tryAdminUnlock(pin) {
            const configured = String(this._config?.admin_pin || '');
            if (!configured) {
                this._showToast('No admin PIN set');
                return false;
            }
            let result;
            try {
                result = await verifyAdminPin(pin, configured);
            } catch (error) {
                this._showErrorToast('Admin unlock failed', String(error?.message || error || ''));
                return false;
            }
            if (result?.ok) {
                this._adminUnlocked = true;
                this._savePrefs();
                this._showToast('Admin access unlocked');
                this._v2AuditRecord?.({
                    type: 'auth',
                    component: 'system',
                    severity: 'info',
                    title: 'Admin access unlocked',
                });
                this.requestUpdate();
                if (result.isLegacy) {
                    try {
                        await this._setAdminPin(pin);
                        this._showToast('Admin PIN upgraded', 'Stored as a hash');
                    } catch (error) {
                        this._showErrorToast(
                            'Admin PIN upgrade failed',
                            String(error?.message || error || '')
                        );
                    }
                }
                return true;
            }
            this._showErrorToast('Invalid PIN');
            return false;
        },

        _lockAdminAccess() {
            this._adminUnlocked = false;
            this._savePrefs();
            this._showToast('Admin access locked');
            this._v2AuditRecord?.({
                type: 'auth',
                component: 'system',
                severity: 'info',
                title: 'Admin access locked',
            });
            this.requestUpdate();
        },

        async _setAdminPin(pin) {
            const trimmed = String(pin || '').trim();
            if (!trimmed) {
                await this._updateConfigPartial({ admin_pin: '' });
                return;
            }
            const hashed = await hashAdminPin(trimmed);
            await this._updateConfigPartial({ admin_pin: hashed });
        },
    });
}
