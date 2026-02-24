/* nx-displaygrid - audit log local/idb storage
 * SPDX-License-Identifier: MIT
 */
import { idbGet, idbSet, idbDelete } from './idb.util.js';
import { makeScopedKey, readJsonLocal, writeJsonLocal, removeLocalKey } from './scoped-storage.util.js';

const KEY_PREFIX = 'nx-displaygrid:audit';
const AUDIT_STORE = 'audit';

function normalizeEvent(event = {}) {
    const ts = Number(event.ts || Date.now());
    return {
        id:
            String(event.id || '').trim() ||
            `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        ts: Number.isFinite(ts) ? ts : Date.now(),
        type: String(event.type || 'info').trim() || 'info',
        component: String(event.component || 'system').trim() || 'system',
        severity: String(event.severity || 'info').trim() || 'info',
        title: String(event.title || 'Event').trim() || 'Event',
        reason: String(event.reason || '').trim(),
        screen: String(event.screen || '').trim(),
        actor: String(event.actor || 'system').trim() || 'system',
        context:
            event.context && typeof event.context === 'object' && !Array.isArray(event.context)
                ? event.context
                : {},
    };
}

export function auditStorageKey(userId) {
    return makeScopedKey(KEY_PREFIX, userId || 'unknown');
}

export function loadAuditLocal(userId) {
    if (!userId) return [];
    const key = auditStorageKey(userId);
    const data = readJsonLocal(key, []);
    if (!Array.isArray(data)) return [];
    return data.map((event) => normalizeEvent(event));
}

export async function loadAuditAsync(userId) {
    if (!userId) return [];
    const key = auditStorageKey(userId);
    const idb = await idbGet(AUDIT_STORE, key);
    if (Array.isArray(idb)) {
        const normalized = idb.map((event) => normalizeEvent(event));
        writeJsonLocal(key, normalized);
        return normalized;
    }
    return loadAuditLocal(userId);
}

export function saveAudit(userId, events) {
    if (!userId) return;
    const key = auditStorageKey(userId);
    const list = Array.isArray(events) ? events.map((event) => normalizeEvent(event)) : [];
    writeJsonLocal(key, list);
    idbSet(AUDIT_STORE, key, list).catch(() => {});
}

export async function clearAudit(userId) {
    if (!userId) return;
    const key = auditStorageKey(userId);
    removeLocalKey(key);
    await idbDelete(AUDIT_STORE, key);
}

export function appendAuditEvent(list, event, { maxEntries = 400 } = {}) {
    const current = Array.isArray(list) ? list : [];
    const next = [normalizeEvent(event), ...current]
        .sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0))
        .slice(0, Math.max(50, Number(maxEntries || 400)));
    return next;
}

