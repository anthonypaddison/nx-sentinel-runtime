/* Family Board - main view (schedule/month)
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { html } = getHaLit();

import { getDeviceKind } from '../util/prefs.util.js';
import './schedule.view.js';
import './month.view.js';
import './mobile.view.js';

export function renderMainView(card) {
    const mode = card._mainMode || 'schedule';
    if (card._debug && card._lastMainMode !== mode) {
        card._lastMainMode = mode;
    }

    // This key MUST change when:
    // - mode changes
    // - date offset changes
    // - visible calendars change
    // - events data changes (async fetch completes)
    const personFilterSig = Array.from(card._personFilterSet || []).sort().join(',');
    const calendarFilterSig = card._calendarVisibilityEnabled
        ? Array.from(card._calendarVisibleSet || []).sort().join(',')
        : '';
    const dayKey = typeof card._selectedDayValue === 'function' ? card._selectedDayValue() : '';
    const monthKey =
        typeof card._selectedMonthDay === 'function'
            ? (() => {
                  const d = card._selectedMonthDay();
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              })()
            : '';

    const nowKey = Math.floor(Date.now() / 60000);
    const scrollKey = [
        mode,
        dayKey,
        monthKey,
        String(card._dayOffset ?? 0),
        String(card._monthOffset ?? 0),
        String(card._scheduleDays ?? 5),
        personFilterSig,
        calendarFilterSig,
    ].join('|');
    const renderKey = [
        mode,
        dayKey,
        monthKey,
        String(card._dayOffset ?? 0),
        String(card._monthOffset ?? 0),
        String(card._scheduleDays ?? 5),
        personFilterSig,
        calendarFilterSig,
        String(card._eventsVersion ?? 0), // <-- critical
        String(nowKey),
    ].join('|');

    if (card._useMobileView && getDeviceKind() === 'mobile')
        return html`<fb-mobile-view .card=${card} .renderKey=${renderKey}></fb-mobile-view>`;

    if (mode === 'month')
        return html`<fb-month-view .card=${card} .renderKey=${renderKey}></fb-month-view>`;
    return html`<fb-schedule-view .card=${card} .renderKey=${renderKey} .scrollKey=${scrollKey}></fb-schedule-view>`;
}
