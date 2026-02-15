/* Family Board - utilities
 * SPDX-License-Identifier: MIT
 */

export function fireEvent(node, type, detail = {}, options = {}) {
    const event = new Event(type, {
        bubbles: options.bubbles ?? true,
        cancelable: options.cancelable ?? false,
        composed: options.composed ?? true,
    });
    event.detail = detail;
    node.dispatchEvent(event);
    return event;
}

export function pad2(n) {
    return String(n).padStart(2, '0');
}

export function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

export function endOfDay(d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
}

export function addDays(d, days) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
}

export function isSameDay(a, b) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

export function formatDayTitle(d) {
    const today = new Date();
    const dd = formatWeekdayLongDayMonthShort(d);
    if (isSameDay(d, today)) return `${dd} (Today)`;
    return dd;
}

export function formatWeekdayLongDayMonthShort(d) {
    return d.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'short' });
}

export function formatWeekdayShort(d) {
    return d.toLocaleDateString(undefined, { weekday: 'short' });
}

export function formatWeekdayLong(d) {
    return d.toLocaleDateString(undefined, { weekday: 'long' });
}

export function formatDayMonthShort(d) {
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

export function formatWeekdayShortDayMonthShort(d) {
    return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
}

export function formatWeekdayLongDayMonthLong(d) {
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatMonthYearLong(d) {
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function formatTimeShort(d) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function minutesSinceMidnight(d) {
    return d.getHours() * 60 + d.getMinutes();
}

export function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

export function slugifyId(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

export function parseDateOnly(value) {
    if (!value || typeof value !== 'string') return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function parseTodoDueInfo(due) {
    if (!due) return null;

    if (typeof due === 'string') {
        const dateOnly = parseDateOnly(due);
        if (dateOnly) return { date: dateOnly, dateOnly: true };
        const dateTime = new Date(due);
        return Number.isNaN(dateTime.getTime())
            ? null
            : { date: dateTime, dateOnly: false };
    }

    if (typeof due === 'object') {
        if (due.date) {
            const dateOnly = parseDateOnly(due.date);
            return dateOnly ? { date: dateOnly, dateOnly: true } : null;
        }
        if (due.dateTime) {
            const dateTime = new Date(due.dateTime);
            return Number.isNaN(dateTime.getTime())
                ? null
                : { date: dateTime, dateOnly: false };
        }
    }

    return null;
}

export function todoItemText(item, fallback = '') {
    if (!item || typeof item !== 'object') return String(fallback || '');
    const text = item.summary ?? item.name ?? item.item ?? fallback ?? '';
    return String(text).trim();
}

export function formatTimeRange(start, end, allDay = false) {
    if (allDay) return 'All day';
    if (!(start instanceof Date)) return '—';
    const startLabel = `${pad2(start.getHours())}:${pad2(start.getMinutes())}`;
    if (!(end instanceof Date)) return startLabel;
    const endLabel = `${pad2(end.getHours())}:${pad2(end.getMinutes())}`;
    return `${startLabel}–${endLabel}`;
}

/**
 * Assign lanes for overlapping timed events in a single column.
 * Each event must have startMin/endMin.
 */
export function assignOverlapLanes(events) {
    const sorted = [...events].sort(
        (a, b) =>
            a.startMin - b.startMin ||
            a.endMin - b.endMin ||
            String(a._fbKey || '').localeCompare(String(b._fbKey || ''))
    );

    // Active events by endMin
    const active = [];
    const lanes = []; // lanes[i] = event in lane i

    function releaseEnded(currentStart) {
        for (let i = active.length - 1; i >= 0; i--) {
            if (active[i].endMin <= currentStart) {
                const lane = active[i].lane;
                lanes[lane] = null;
                active.splice(i, 1);
            }
        }
    }

    for (const ev of sorted) {
        releaseEnded(ev.startMin);

        let laneIndex = lanes.findIndex((x) => x === null);
        if (laneIndex === -1) {
            laneIndex = lanes.length;
            lanes.push(null);
        }
        ev.lane = laneIndex;
        lanes[laneIndex] = ev;
        active.push(ev);

        // Lanes in use right now
        ev.lanesTotal = Math.max(ev.lanesTotal || 1, lanes.filter(Boolean).length);

        // Update lanesTotal for other active events too
        for (const a of active) {
            a.lanesTotal = Math.max(a.lanesTotal || 1, ev.lanesTotal);
        }
    }

    return sorted;
}

/**
 * Safe logger (won't spam unless debug)
 */
export function debugLog(debug, ...args) {
    if (!debug) return;
    // eslint-disable-next-line no-console
    console.log('[family-board]', ...args);
}
