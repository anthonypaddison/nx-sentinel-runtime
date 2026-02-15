/* Family Board - month view with per-person pips
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css, repeat } = getHaLit();

import {
    startOfDay,
    isSameDay,
    addDays,
    formatMonthYearLong,
    formatWeekdayLongDayMonthLong,
    formatTimeShort,
} from '../family-board.util.js';
import { sharedViewStyles } from './shared.styles.js';

export class FbMonthView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
    };

    static styles = [
        sharedViewStyles,
        css`
        :host {
            --fb-btn-bg: var(--fb-surface-2);
        }
        .wrap {
            overflow: hidden;
            min-height: 0;
            display: flex;
            flex-direction: column;
            gap: var(--fb-gutter);
        }
        .cal {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 14px;
            overflow: hidden;
            min-width: 0;
            width: 100%;
        }
        .calWrap {
            overflow: hidden;
            min-width: 0;
        }
        .head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
            border-bottom: 1px solid var(--fb-grid);
            position: sticky;
            top: 0;
            background: var(--fb-surface);
            z-index: 2;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
        }
        .cell {
            border-right: 1px solid var(--fb-grid);
            border-bottom: 1px solid var(--fb-grid);
            padding: 8px;
            min-height: var(--fb-month-row-height, 56px);
            cursor: pointer;
        }
        .cell:hover {
            background: var(--fb-surface-2);
        }
        .cell.header {
            cursor: default;
            background: var(--fb-surface);
            font-weight: 700;
            color: var(--fb-text);
            min-height: var(--fb-month-header-height, 40px);
            aspect-ratio: auto;
        }
        .cell:nth-child(7n) {
            border-right: 0;
        }
        .num {
            font-weight: 700;
            font-size: 14px;
        }
        .pips {
            margin-top: 8px;
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }
        .pip {
            width: 18px;
            height: 18px;
            border-radius: 999px;
            display: inline-grid;
            place-items: center;
            font-size: 10px;
            color: var(--fb-text);
            box-sizing: border-box;
        }
        .today {
            background: var(--highlight-soft);
        }
        .dayList {
            flex: 1;
            min-height: 0;
            overflow: hidden;
            border: 1px solid var(--fb-grid);
            border-radius: 14px;
            background: var(--fb-surface);
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .dayListHeader {
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }
        .eventRow {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 10px;
            border-radius: 10px;
            background: var(--fb-surface-2);
            border-left: 4px solid transparent;
        }
        .eventDot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            flex: 0 0 auto;
        }
        .eventTime {
            font-weight: 700;
            font-size: 12px;
            color: var(--fb-muted);
            min-width: 90px;
        }
        .eventTitle {
            font-size: 14px;
            color: var(--fb-text);
            flex: 1;
        }
        `,
    ];

    render() {
        const card = this.card;
        if (!card) return html``;

        const cfg = card._config || {};
        const calendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];
        const visibleSet = card._calendarVisibilityEnabled
            ? card._calendarVisibleSet || new Set(calendars.map((c) => c.entity))
            : new Set(calendars.map((c) => c.entity));
        const filteredCalendars = calendars.filter(
            (c) =>
                visibleSet.has(c.entity) &&
                card._isPersonAllowed(card._personIdForConfig(c, c.entity))
        );
        const visibleEntities = new Set(filteredCalendars.map((c) => c.entity));

        // IMPORTANT: month view must use the month-offset date, not the day view date
        const baseDay = startOfDay(card._selectedMonthDay());
        const monthStart = new Date(baseDay.getFullYear(), baseDay.getMonth(), 1);
        const monthEnd = new Date(baseDay.getFullYear(), baseDay.getMonth() + 1, 0);

        const startDow = (monthStart.getDay() + 6) % 7; // Monday=0
        const totalDays = monthEnd.getDate();

        const cells = [];
        for (let i = 0; i < startDow; i++) cells.push(null);
        for (let d = 1; d <= totalDays; d++)
            cells.push(new Date(baseDay.getFullYear(), baseDay.getMonth(), d));

        while (cells.length % 7 !== 0) cells.push(null);

        const today = startOfDay(new Date());
        const todayEnd = addDays(today, 1);
        const todayEvents = card
            ._mergedEventsForDay(today, visibleEntities)
            .slice()
            .sort((a, b) => {
                const aStart = a?._start ? a._start.getTime() : 0;
                const bStart = b?._start ? b._start.getTime() : 0;
                return aStart - bStart;
            });

        const dayStats = cells.map((d) => {
            if (!d) return { d: null, isToday: false, pips: [], remaining: 0, dayTotal: 0 };

            const perPerson = new Map();
            // Use merged events to avoid per-entity overwrite in month counts.
            const mergedEvents = card._mergedEventsForDay(d, visibleEntities);
            for (const e of mergedEvents) {
                const entityId = e._fbEntityId;
                if (!entityId) continue;
                const person = card._personForEntity(entityId);
                const id = person?.id || entityId;
                const color = person?.color || card._neutralColor();
                const textColor = person?.text_color || '#1f2937';
                const current = perPerson.get(id) || { id, color, textColor, count: 0 };
                current.count += 1;
                if (textColor) current.textColor = textColor;
                perPerson.set(id, current);
            }

            const dayTotal = mergedEvents.length;

            const pips = Array.from(perPerson.values());
            const visiblePips = pips.slice(0, 3);
            const remaining = Math.max(pips.length - visiblePips.length, 0);

            const isToday = isSameDay(d, today);

            return { d, isToday, pips: visiblePips, remaining, dayTotal };
        });

        const daysWithEvents = dayStats.filter((x) => x.dayTotal > 0).length;
        const totalEvents = dayStats.reduce((sum, x) => sum + x.dayTotal, 0);

        const repeatItems =
            repeat ||
            ((items, keyFn, templateFn) =>
                (items || []).map((item, idx) => templateFn(item, idx)));

        return html`
            <div class="wrap">
                <div class="calWrap">
                    <div class="cal">
                        <div class="head">
                            <div style="font-weight:700">
                                ${formatMonthYearLong(baseDay)}
                            </div>
                            <div style="display:flex;gap:8px">
                                <button class="btn sm" @click=${() => card._setMonthOffset(-1)}
                                    ><</button
                                >
                                <button class="btn sm" @click=${() => card._setMonthOffset(1)}>
                                    >
                                </button>
                            </div>
                        </div>

                        <div class="grid">
                            ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
                                (x) => html`
                                    <div class="cell header" style="min-height:auto">
                                        ${x}
                                    </div>
                                `
                            )}
                            ${repeatItems(
                                dayStats,
                                (stat, idx) =>
                                    stat?.d ? stat.d.toISOString().slice(0, 10) : `empty-${idx}`,
                                (stat) => {
                                    if (!stat.d) return html`<div class="cell muted"></div>`;
                                    return html`
                                        <div
                                            class="cell ${stat.isToday ? 'today' : ''}"
                                            @click=${() => card._setScheduleStart(stat.d)}
                                        >
                                            <div class="num">${stat.d.getDate()}</div>
                                            <div class="pips">
                                                ${repeatItems(
                                                    stat.pips,
                                                    (p) => p.id || `${p.color}-${p.count}`,
                                                    (p) =>
                                                        html`<span
                                                            class="pip"
                                                            style="background:${p.color};color:${p.textColor || 'var(--fb-text)'}"
                                                            title="${p.count} events"
                                                            >${p.count}</span
                                                        >`
                                                )}
                                                ${stat.remaining
                                                    ? html`<span class="pip">+${stat.remaining}</span>`
                                                    : html``}
                                            </div>
                                        </div>
                                    `;
                                }
                            )}
                        </div>
                    </div>
                </div>
                <div class="dayList">
                    <div class="dayListHeader">
                        <span>
                            ${formatWeekdayLongDayMonthLong(today)}
                        </span>
                        <span class="muted">${todayEvents.length} events</span>
                    </div>
                    ${todayEvents.length
                        ? repeatItems(
                              todayEvents,
                              (event) => event?._fbKey || event?.summary || '',
                              (event) => {
                                  const entityId = event?._fbEntityId || '';
                                  const person = card._personForEntity(entityId);
                                  const color = person?.color || card._neutralColor();
                                  const title =
                                      event?.summary || event?.title || event?.name || '(Event)';
                                  const allDay = Boolean(event?.all_day || event?.allDay);
                                  const start =
                                      event?._start && event._start > today ? event._start : today;
                                  const end =
                                      event?._end && event._end < todayEnd ? event._end : todayEnd;
                                  const timeLabel = allDay
                                      ? 'All day'
                                      : `${formatTimeShort(start)} - ${formatTimeShort(end)}`;
                                  return html`
                                      <div class="eventRow" style="border-left-color:${color}">
                                          <span class="eventDot" style="background:${color}"></span>
                                          <span class="eventTime">${timeLabel}</span>
                                          <span class="eventTitle">${title}</span>
                                      </div>
                                  `;
                              }
                          )
                        : html`<div class="muted">No events today.</div>`}
                </div>
            </div>
        `;
    }
}

customElements.define('fb-month-view', FbMonthView);
