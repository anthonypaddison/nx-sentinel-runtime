/* nx-displaygrid - schedule layout helpers
 * SPDX-License-Identifier: MIT
 */

import { assignOverlapLanes } from '../nx-displaygrid.util.js';

function groupByOverlap(events) {
    const sorted = [...events].sort(
        (a, b) =>
            a.startMin - b.startMin ||
            a.endMin - b.endMin ||
            String(a._fbKey || '').localeCompare(String(b._fbKey || ''))
    );
    const groups = [];
    let active = [];
    let groupStart = null;
    let groupEnd = null;

    for (const ev of sorted) {
        if (active.length === 0) {
            active = [ev];
            groupStart = ev.startMin;
            groupEnd = ev.endMin;
            continue;
        }

        if (ev.startMin >= groupEnd) {
            groups.push({ events: active, startMin: groupStart, endMin: groupEnd });
            active = [ev];
            groupStart = ev.startMin;
            groupEnd = ev.endMin;
            continue;
        }

        active.push(ev);
        groupEnd = Math.max(groupEnd, ev.endMin);
    }

    if (active.length) groups.push({ events: active, startMin: groupStart, endMin: groupEnd });
    return groups;
}

export function layoutDayEvents(events, { maxColumns = 2 } = {}) {
    const groups = groupByOverlap(events);
    const items = [];
    const overflows = [];

    for (const group of groups) {
        const laidOut = assignOverlapLanes(group.events);
        const total = Math.max(...laidOut.map((e) => e.lanesTotal || 1), 1);
        const overflowCount = total > maxColumns ? total - maxColumns : 0;
        const visible = laidOut.filter((e) => e.lane < maxColumns);

        items.push(...visible.map((e) => ({ ...e, lanesTotal: Math.min(total, maxColumns) })));

        if (overflowCount > 0) {
            overflows.push({ startMin: group.startMin, count: overflowCount });
        }
    }

    return { items, overflows };
}
