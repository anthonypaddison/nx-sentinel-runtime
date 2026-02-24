/* nx-displaygrid - local audit / explainability helpers (V2)
 * SPDX-License-Identifier: MIT
 */
import { appendAuditEvent, clearAudit, loadAuditAsync, loadAuditLocal, saveAudit } from './util/audit-log.util.js';

function normalizeComponent(value = '') {
    const v = String(value || '').trim().toLowerCase();
    if (!v) return 'system';
    if (v.includes('calendar') || v.includes('event')) return 'calendar';
    if (v.includes('todo') || v.includes('chore')) return 'todo';
    if (v.includes('shopping')) return 'shopping';
    if (v.includes('notify')) return 'notifications';
    if (v.includes('reminder')) return 'reminders';
    if (v.includes('mode')) return 'modes';
    if (v.includes('heat')) return 'heating';
    if (v.includes('light')) return 'lighting';
    if (v.includes('media')) return 'media';
    if (v.includes('security')) return 'security';
    if (v.includes('energy')) return 'energy';
    return v.replace(/\s+/g, '_');
}

function startOfDayMs(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function applyAudit(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _v2AuditConfig() {
            const cfg = this._config?.audit_v2;
            const base = cfg && typeof cfg === 'object' ? cfg : {};
            return {
                enabled: base.enabled !== false,
                max_entries: Math.max(50, Number(base.max_entries || 400)),
                default_days: Math.max(1, Number(base.default_days || 7)),
            };
        },

        _v2AuditEnabled() {
            return Boolean(
                this._v2FeatureEnabled?.('audit_timeline') && this._v2AuditConfig?.().enabled !== false
            );
        },

        _loadAuditLog() {
            if (this._v2AuditLoaded) return;
            const userId = this._hass?.user?.id;
            if (!userId) return;
            this._v2AuditLog = loadAuditLocal(userId);
            this._v2AuditLoaded = true;
        },

        async _loadAuditLogAsync() {
            const userId = this._hass?.user?.id;
            if (!userId || this._v2AuditHydrated) return;
            const events = await loadAuditAsync(userId);
            this._v2AuditLog = Array.isArray(events) ? events : [];
            this._v2AuditLoaded = true;
            this._v2AuditHydrated = true;
            this.requestUpdate();
        },

        _saveAuditLog() {
            const userId = this._hass?.user?.id;
            if (!userId) return;
            saveAudit(userId, Array.isArray(this._v2AuditLog) ? this._v2AuditLog : []);
        },

        async _clearAuditLog() {
            const userId = this._hass?.user?.id;
            if (!userId) return;
            await clearAudit(userId);
            this._v2AuditLog = [];
            this._showToast?.('Audit log cleared');
            this.requestUpdate();
        },

        _v2AuditRecord(event = {}) {
            if (!this._v2AuditEnabled?.()) return;
            const cfg = this._v2AuditConfig?.() || {};
            const component = normalizeComponent(event.component);
            const screen = event.screen || this._screen || '';
            const actor = event.actor || (this._hass?.user?.is_admin ? 'admin' : 'user');
            this._v2AuditLog = appendAuditEvent(this._v2AuditLog, {
                ...event,
                component,
                screen,
                actor,
                ts: Number(event.ts || Date.now()),
            }, { maxEntries: cfg.max_entries || 400 });
            this._saveAuditLog?.();
            this.requestUpdate();
        },

        _v2AuditExplainBlocked(action = '', reason = '', context = {}) {
            this._v2AuditRecord?.({
                type: 'blocked',
                component: context.component || 'system',
                severity: context.severity || 'warn',
                title: action ? `Blocked: ${action}` : 'Blocked action',
                reason: String(reason || '').trim(),
                context,
            });
        },

        _v2AuditEvents({ component = '', severity = '', days } = {}) {
            const list = Array.isArray(this._v2AuditLog) ? this._v2AuditLog : [];
            const normComponent = normalizeComponent(component || '');
            const normSeverity = String(severity || '').trim().toLowerCase();
            const maxDays = Number.isFinite(Number(days))
                ? Math.max(1, Number(days))
                : this._v2AuditConfig?.().default_days || 7;
            const cutoff = Date.now() - maxDays * 24 * 3600_000;
            return list.filter((event) => {
                if (!event || typeof event !== 'object') return false;
                if (Number(event.ts || 0) < cutoff) return false;
                if (component && normalizeComponent(event.component) !== normComponent) return false;
                if (normSeverity && String(event.severity || '').toLowerCase() !== normSeverity)
                    return false;
                return true;
            });
        },

        _v2AuditSummary({ days } = {}) {
            const events = this._v2AuditEvents?.({ days }) || [];
            const nowDay = startOfDayMs(Date.now());
            const today = events.filter((e) => startOfDayMs(e.ts) === nowDay);
            const byComponent = {};
            const bySeverity = {};
            for (const event of events) {
                const component = normalizeComponent(event.component);
                const severity = String(event.severity || 'info').toLowerCase();
                byComponent[component] = (byComponent[component] || 0) + 1;
                bySeverity[severity] = (bySeverity[severity] || 0) + 1;
            }
            const topComponents = Object.entries(byComponent)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([componentName, count]) => ({ component: componentName, count }));
            return {
                events,
                todayCount: today.length,
                periodCount: events.length,
                byComponent,
                bySeverity,
                topComponents,
            };
        },

        _v2AuditRenderSig() {
            const list = Array.isArray(this._v2AuditLog) ? this._v2AuditLog : [];
            const first = list[0];
            return `${list.length}|${first?.id || ''}|${first?.ts || 0}`;
        },
    });
}
