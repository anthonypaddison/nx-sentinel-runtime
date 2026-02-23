/* nx-displaygrid - admin helpers
 * SPDX-License-Identifier: MIT
 */
export function applyAdmin(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
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
                await this._hass.callService(domain, service, { ...(cfg.snapshot_service_data || {}) });
                this._showToast('Snapshot started');
            } catch (error) {
                this._reportError?.('Snapshot now', error);
            }
        },

        _hasAdminAccess() {
            return Boolean(this._hass?.user?.is_admin || this._adminUnlocked);
        },

        _tryAdminUnlock(pin) {
            const configured = String(this._config?.admin_pin || '');
            if (!configured) {
                this._showToast('No admin PIN set');
                return false;
            }
            if (String(pin || '') === configured) {
                this._adminUnlocked = true;
                this._savePrefs();
                this._showToast('Admin access unlocked');
                this.requestUpdate();
                return true;
            }
            this._showErrorToast('Invalid PIN');
            return false;
        },

        _lockAdminAccess() {
            this._adminUnlocked = false;
            this._savePrefs();
            this._showToast('Admin access locked');
            this.requestUpdate();
        },

        async _setAdminPin(pin) {
            const trimmed = String(pin || '').trim();
            await this._updateConfigPartial({ admin_pin: trimmed || '' });
        },
    });
}
