/* Family Board - calendar service
 * SPDX-License-Identifier: MIT
 */

import { addDays } from '../family-board.util.js';

export const CALENDAR_FEATURES = {
    CREATE: 1,
    DELETE: 2,
    UPDATE: 4,
};

export class CalendarService {
    constructor({ debug = false } = {}) {
        this.debug = debug;
        this._cache = new Map();
        this._cacheMs = 300_000;
    }

    clearCache() {
        this._cache.clear();
    }

    _calendarDebugEnabled() {
        try {
            return localStorage.getItem('FB_DEBUG_CALENDAR') === '1';
        } catch {
            return false;
        }
    }

    _debugLog(...args) {
        if (!this._calendarDebugEnabled()) return;
        // eslint-disable-next-line no-console
        console.log('[family-board]', ...args);
    }

    _toRfc3339NoMs(date) {
        return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
    }

    _key(entityId, startISO, endISO) {
        return `${entityId}|${startISO}|${endISO}`;
    }

    async fetchEvents(hass, entityId, start, end, { force = false } = {}) {
        if (!hass) throw new Error('Missing hass');
        if (!entityId) throw new Error('Missing calendar entityId');

        // Calendar endpoints reject timestamps with milliseconds.
        const startISO = this._toRfc3339NoMs(start);
        const endISO = this._toRfc3339NoMs(end);
        const key = this._key(entityId, startISO, endISO);

        if (!force) {
            const cached = this._cache.get(key);
            if (cached && Date.now() - cached.ts < this._cacheMs) return cached.data;
        } else {
            this._cache.delete(key);
        }

        const cacheBust = force ? `&_fb=${Date.now()}` : '';
        const path = `calendars/${encodeURIComponent(entityId)}?start=${encodeURIComponent(
            startISO
        )}&end=${encodeURIComponent(endISO)}${cacheBust}`;
        const url = `/api/${path}`;
        this._debugLog('calendar fetch', { entityId, url });

        const fetchOnce = async (retryOn400) => {
            // Log response details when calendars return non-2xx to diagnose 400s.
            const res = await hass.fetchWithAuth(url, { method: 'GET' });
            if (!res.ok) {
                const body = this._calendarDebugEnabled() ? await res.text() : '';
                this._debugLog('calendar fetch failed', {
                    entityId,
                    status: res.status,
                    body,
                });
                if (res.status === 400 && retryOn400) {
                    this._debugLog('calendar fetch retry', { entityId, url });
                    return fetchOnce(false);
                }
                throw new Error(`Calendar fetch failed (${res.status})`);
            }
            return res.json();
        };

        const data = await fetchOnce(true);
        const normalised = Array.isArray(data)
            ? data.map((e) => this._normaliseEvent(e)).filter(Boolean)
            : [];

        this._cache.set(key, { ts: Date.now(), data: normalised });
        return normalised;
    }

    _parseHaDate(dt) {
        if (!dt) return null;

        if (typeof dt === 'string') {
            const d = new Date(dt);
            return Number.isNaN(d.getTime()) ? null : d;
        }

        if (typeof dt === 'object') {
            if (dt.dateTime) {
                const d = new Date(dt.dateTime);
                return Number.isNaN(d.getTime()) ? null : d;
            }
            if (dt.date) {
                const d = new Date(`${dt.date}T00:00:00`);
                return Number.isNaN(d.getTime()) ? null : d;
            }
        }

        return null;
    }

    _normaliseEvent(e) {
        const start = this._parseHaDate(e.start);
        let end = this._parseHaDate(e.end);

        const allDay = Boolean(e?.start?.date) || Boolean(e?.end?.date) || Boolean(e.all_day);

        if (!start) return null;
        if (!end) end = new Date(start);

        if (allDay && end <= start) end = addDays(start, 1);
        if (!allDay && end <= start) end = new Date(start.getTime() + 60 * 1000);

        return {
            ...e,
            _start: start,
            _end: end,
            all_day: allDay,
            summary: e.summary ?? '(No title)',
        };
    }

    async createEvent(hass, entityId, { summary, start, end, allDay = false } = {}) {
        if (!summary) throw new Error('Missing summary');
        if (!start) throw new Error('Missing start');
        if (!end) throw new Error('Missing end');

        const data = {
            entity_id: entityId,
            summary,
            start_date_time: allDay ? undefined : start.toISOString(),
            end_date_time: allDay ? undefined : end.toISOString(),
            start_date: allDay ? start.toISOString().slice(0, 10) : undefined,
            end_date: allDay ? end.toISOString().slice(0, 10) : undefined,
        };

        Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

        await hass.callService('calendar', 'create_event', data);
    }

    async updateEvent(hass, entityId, event, { summary, start, end, allDay = false } = {}) {
        if (!summary) throw new Error('Missing summary');
        if (!start) throw new Error('Missing start');
        if (!end) throw new Error('Missing end');
        if (!event) throw new Error('Missing event');

        const eventId = event.uid || event.id;
        if (!eventId) throw new Error('Missing event id');

        const data = {
            entity_id: entityId,
            event_id: eventId,
            summary,
            start_date_time: allDay ? undefined : start.toISOString(),
            end_date_time: allDay ? undefined : end.toISOString(),
            start_date: allDay ? start.toISOString().slice(0, 10) : undefined,
            end_date: allDay ? end.toISOString().slice(0, 10) : undefined,
        };

        Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

        await hass.callService('calendar', 'update_event', data);
    }

    async deleteEvent(hass, entityId, event) {
        if (!event) throw new Error('Missing event');
        const eventId = event.uid || event.id;
        if (!eventId) throw new Error('Missing event id');

        await hass.callService('calendar', 'delete_event', {
            entity_id: entityId,
            event_id: eventId,
        });
    }
}
