/* nx-displaygrid - schedule view
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
import '../components/fb-loading.js';
const { LitElement, html, css, repeat } = getHaLit();

import { sharedViewStyles, sharedCardStyles } from './shared.styles.js';
import {
    addDays,
    startOfDay,
    endOfDay,
    pad2,
    clamp,
    formatDayMonthShort,
    formatWeekdayShort,
    minutesSinceMidnight,
    isSameDay,
} from '../nx-displaygrid.util.js';
import { getReadableTextColour } from '../util/colour.util.js';
import { layoutDayEvents } from './schedule.layout.js';

export class FbScheduleView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
        scrollKey: { type: String },
    };

    updated(changedProps) {
        if (changedProps.has('scrollKey')) {
            this._didInitialScroll = false;
        }
        this._scrollToNow();
        this._updateScrollbarWidth();
    }

    _scrollToNow() {
        if (this._didInitialScroll) return;
        if (!this._autoScrollEnabled) return;
        const scroller = this.renderRoot.querySelector('.gridScroll');
        if (!scroller) return;
        const now = new Date();
        const nowMin = minutesSinceMidnight(now);
        const slotMinutes = this._slotMinutes ?? 30;
        const slotPx = this._slotPx ?? 0;
        const startMin = this._startMin ?? 0;
        const nowTop = ((nowMin - startMin) / slotMinutes) * slotPx;
        scroller.scrollTop = Math.max(0, nowTop - slotPx * 2);
        this._didInitialScroll = true;
    }

    _updateScrollbarWidth() {
        const scroller = this.renderRoot.querySelector('.gridScroll');
        if (!scroller) return;
        const width = scroller.offsetWidth - scroller.clientWidth;
        this.style.setProperty('--fb-scrollbar-width', `${width}px`);
    }

    _handleSlotClick(ev, day) {
        const card = this.card;
        if (!card) return;
        const target = ev?.currentTarget;
        if (!target) return;
        const rect = target.getBoundingClientRect();
        const y = ev.clientY - rect.top;
        const slotPx = this._slotPx ?? 0;
        const slotMinutes = this._slotMinutes ?? 30;
        const startMin = this._startMin ?? 0;
        const slots = this._slotCount ?? 0;
        if (!slotPx || !slots) return;
        const maxY = slots * slotPx - 1;
        const clamped = clamp(y, 0, maxY);
        const slotIndex = Math.floor(clamped / slotPx);
        const minutes = startMin + slotIndex * slotMinutes;
        const date = new Date(day);
        date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
        card._openAddEventAt?.(date);
    }

    static styles = [
        sharedViewStyles,
        sharedCardStyles,
        css`
        .wrap {
            overflow: hidden;
            background: var(--fb-bg);
            display: flex;
            flex-direction: column;
        }
        .card {
            --fb-card-shadow: var(--fb-shadow);
            --fb-card-radius: var(--fb-radius);
            --fb-card-border: 1px solid var(--fb-border);
            --fb-card-padding: 14px;
            display: flex;
            flex-direction: column;
            min-height: 0;
            height: 100%;
            flex: 1;
            box-sizing: border-box;
        }
        .board {
            min-width: 0;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-height: 0;
            flex: 1;
        }
        .linkBtn {
            border: 0;
            background: transparent;
            cursor: pointer;
            font-weight: 700;
            color: var(--fb-text);
        }
        .gridScroll {
            overflow: auto;
            min-height: 0;
            padding-top: 10px;
            padding-bottom: 6px;
            flex: 1;
            scrollbar-gutter: stable;
        }
        .row {
            display: grid;
            grid-template-columns: var(--fb-time-width, 80px) repeat(var(--fb-days), minmax(0, 1fr));
            gap: 8px;
            align-items: stretch;
            box-sizing: border-box;
        }
        .row.headerRow,
        .row.allDayRow {
            padding-right: var(--fb-scrollbar-width, 0px);
        }
        .gutterHead,
        .gutterAllDay,
        .gutterTimes {
            border-radius: 10px;
            background: var(--fb-surface);
            border: 1px solid var(--fb-border);
        }
        .gutterHead {
            height: 44px;
            background: transparent;
            border: 0;
        }
        .gutterAllDay {
            min-height: 42px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding: 6px;
            font-size: 12px;
            color: var(--fb-muted);
        }
        .gutterTimes {
            position: relative;
        }
        .timeRow {
            height: var(--fb-slot-px);
            border-top: 1px solid var(--fb-grid);
            position: relative;
            padding-left: 10px;
        }
        .timeRow.hour {
            border-top-color: color-mix(in srgb, var(--fb-grid) 70%, transparent);
        }
        .timeLabel {
            position: absolute;
            top: 0;
            left: 10px;
            font-size: 14px;
            background: var(--fb-surface);
            padding-right: 6px;
            color: var(--fb-muted);
            font-variant-numeric: tabular-nums;
            transform: translateY(-50%);
            line-height: 1;
        }
        .timeLabel.half {
            opacity: 0.7;
        }
        .dayHead {
            min-height: 44px;
            border-radius: 10px;
            border: 1px solid var(--fb-border);
            background: var(--fb-surface);
            padding: 6px 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            color: var(--fb-text);
            text-align: left;
            cursor: pointer;
        }
        .dayPips {
            display: flex;
            gap: 4px;
            flex-wrap: nowrap;
            justify-content: flex-end;
            align-items: center;
            margin-left: auto;
        }
        .dayPip {
            width: 20px;
            height: 20px;
            border-radius: 999px;
            border: 2px solid transparent;
            box-sizing: border-box;
            display: inline-grid;
            place-items: center;
            font-size: 10px;
            font-weight: 700;
            color: var(--fb-text);
            font-variant-numeric: tabular-nums;
            line-height: 1;
        }
        .dayHead.highlight {
            background: var(--highlight);
            color: var(--highlight-text);
            border-color: color-mix(in srgb, var(--highlight) 60%, var(--fb-border));
        }
        .dayLabel {
            font-weight: 800;
            font-size: 15px;
            white-space: nowrap;
        }
        .allDay {
            border-radius: 10px;
            border: 1px solid var(--fb-border);
            background: var(--fb-surface);
            padding: 4px 6px;
            min-height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        .allDay.todayCol {
            background: var(--highlight-soft);
            border-color: color-mix(in srgb, var(--highlight-soft) 60%, var(--fb-border));
        }
        .chip {
            border-radius: 10px;
            border: 1px solid color-mix(in srgb, var(--event-color) 60%, var(--fb-border));
            padding: 4px 10px;
            font-size: 13px;
            cursor: pointer;
            background: var(--event-color);
            color: var(--event-text);
            display: inline-flex;
            align-items: center;
            gap: 6px;
            width: 100%;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .chipDot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: var(--event-text);
            flex: 0 0 auto;
        }
        .dayCol {
            position: relative;
            border-radius: 10px;
            border: 1px solid var(--fb-border);
            background: color-mix(in srgb, var(--fb-surface) 92%, var(--fb-accent));
            overflow: hidden;
        }
        .dayCol.todayCol {
            background: var(--highlight-soft);
            border-color: color-mix(in srgb, var(--highlight-soft) 60%, var(--fb-border));
        }
        .dayCol.todayCol .slotBg {
            background-color: var(--highlight-soft);
        }
        .slotBg {
            position: relative;
            background: linear-gradient(
                    to bottom,
                    color-mix(in srgb, var(--fb-grid) 30%, transparent) 1px,
                    transparent 1px
                )
                top / 100% var(--fb-slot-px);
        }
        .slotRow {
            height: var(--fb-slot-px);
            border-top: 1px solid var(--fb-grid);
        }
        .eventsLayer {
            position: absolute;
            inset: 0;
            pointer-events: none;
        }
        .event {
            position: absolute;
            pointer-events: auto;
            border-radius: 10px;
            border: 1px solid color-mix(in srgb, var(--event-color) 70%, var(--fb-border));
            background: var(--event-color);
            color: var(--event-text);
            padding: 0;
            text-align: left;
            overflow: hidden;
            box-shadow: var(--shadow-sm);
            z-index: 2;
        }
        .eventHeader {
            position: sticky;
            top: 0;
            z-index: 1;
            padding: 8px 10px 6px;
            background: color-mix(in srgb, var(--event-color) 82%, #ffffff);
            border-bottom: 1px solid color-mix(in srgb, var(--event-color) 50%, transparent);
        }
        .eventTime {
            font-size: 14px;
            color: var(--event-text);
            margin-bottom: 4px;
            font-variant-numeric: tabular-nums;
            opacity: 0.9;
        }
        .eventTitle {
            font-size: 14px;
            font-weight: 800;
            line-height: 1.15;
        }
        .overflow {
            position: absolute;
            right: 8px;
            padding: 4px 8px;
            border-radius: 999px;
            border: 1px solid var(--fb-border);
            background: var(--fb-surface-2);
            font-size: 14px;
            color: var(--fb-muted);
            pointer-events: auto;
            cursor: pointer;
        }
        .nowLine {
            position: absolute;
            left: 0;
            right: 0;
            height: 2px;
            background: color-mix(in srgb, var(--fb-muted) 75%, transparent);
            z-index: 6;
        }
        .nowLine.today {
            height: 3px;
            background: color-mix(in srgb, var(--urgent) 85%, transparent);
        }
        .nowBadge {
            position: absolute;
            left: 10px;
            transform: translateY(-50%);
            padding: 4px 8px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            white-space: nowrap;
            max-width: calc(100% - 20px);
            overflow: hidden;
            text-overflow: ellipsis;
            pointer-events: none;
            z-index: 7;
            border: 1px solid color-mix(in srgb, var(--now-badge) 70%, var(--fb-border));
            background: var(--now-badge);
            color: var(--now-badge-text);
        }
        .event.current .eventHeader {
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            transform: translateY(-50%);
            text-align: center;
            z-index: 8;
        }
        .event.current .eventTime {
            font-size: 12px;
            margin-bottom: 2px;
        }
        .event.current {
            z-index: 5;
        }
        `,
    ];

    render() {
        const card = this.card;
        if (!card) return html``;

        const cfg = card._config || {};
        const daysToShow = card._scheduleDays || 5;
        const dayStartHour = card._dayStartHour ?? 6;
        const dayEndHour = card._dayEndHour ?? 22;
        const slotMinutes = card._slotMinutes ?? 30;
        const pxPerHour = card._pxPerHour ?? 120;
        const pxPerMin = pxPerHour / 60;

        const startMin = dayStartHour * 60;
        const endMin = dayEndHour * 60;
        const totalMinutes = endMin - startMin;
        const slots = Math.ceil(totalMinutes / slotMinutes);
        const slotPx = (pxPerHour / 60) * slotMinutes;
        this.style.setProperty('--fb-slot-px', `${slotPx}px`);
        this.style.setProperty('--fb-days', String(daysToShow));
        this.style.setProperty('--fb-time-width', '80px');

        const base = startOfDay(card._selectedDay());
        const days = Array.from({ length: daysToShow }).map((_, i) => addDays(base, i));

        const timeRows = [];
        for (let i = 0; i <= slots; i++) {
            const minute = startMin + i * slotMinutes;
            const h = Math.floor(minute / 60);
            const mm = minute % 60;
            timeRows.push({ label: `${pad2(h)}:${pad2(mm)}`, isHour: mm === 0 });
        }

        const now = new Date();
        const showNow = card._dayOffset === 0;
        const nowMin = minutesSinceMidnight(now);
        const nowTopSlots = (nowMin - startMin) / slotMinutes;
        const nowTop = clamp(nowTopSlots * slotPx, 0, slots * slotPx);
        this._slotMinutes = slotMinutes;
        this._slotPx = slotPx;
        this._startMin = startMin;
        this._slotCount = slots;
        this._autoScrollEnabled = showNow;

        const calendarList = Array.isArray(cfg.calendars) ? cfg.calendars : [];
        const isCalendarLoading = calendarList.length && !card._calendarLastSuccessTs;
        const visibleSet = card._calendarVisibilityEnabled
            ? card._calendarVisibleSet || new Set(calendarList.map((c) => c.entity))
            : new Set(calendarList.map((c) => c.entity));
        const calendars = calendarList.filter(
            (c) =>
                visibleSet.has(c.entity) &&
                card._isPersonAllowed(card._personIdForConfig(c, c.entity))
        );
        const calendarById = new Map(calendars.map((c) => [c.entity, c]));
        const visibleEntities = new Set(calendars.map((c) => c.entity));

        const maxAllDayVisible = 1;
        const dayData = days.map((day) => {
            const allDay = [];
            const timedRaw = [];
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);
            const perPerson = new Map();
            let nowBadge = null;

            // Use merged events to avoid one entity overwriting another.
            const mergedEvents = card._mergedEventsForDay(day, visibleEntities);
            for (const e of mergedEvents) {
                const entityId = e._fbEntityId;
                if (!entityId) continue;
                const entry = calendarById.get(entityId);
                const person = card._personForEntity(entityId);
                const colour = person?.color || card._neutralColor();
                const textColor = person?.text_color || getReadableTextColour(colour);
                const personName = person?.name || entry?.name || entityId;
                const personId = person?.id || entityId;
                const current = perPerson.get(personId) || {
                    id: personId,
                    color: colour,
                    textColor,
                    count: 0,
                };
                current.count += 1;
                if (textColor) current.textColor = textColor;
                perPerson.set(personId, current);

                const base = { ...e };
                delete base.lane;
                delete base.lanesTotal;
                if (e.all_day) {
                    allDay.push({
                        ...base,
                        _fbColour: colour,
                        _fbText: textColor,
                        _fbName: personName,
                        _fbEntityId: entityId,
                    });
                    continue;
                }

                const s = e._start;
                const en = e._end;
                if (!s || !en) continue;
                const startMinEv =
                    s <= dayStart ? startMin : s.getHours() * 60 + s.getMinutes();
                const endMinEv = en >= dayEnd ? endMin : en.getHours() * 60 + en.getMinutes();
                const clampedStart = Math.max(startMin, startMinEv);
                const clampedEnd = Math.min(endMin, endMinEv);

                timedRaw.push({
                    ...base,
                    start: s,
                    end: en,
                    startMin: clampedStart,
                    endMin: Math.max(clampedStart + 1, clampedEnd),
                    _fbColour: colour,
                    _fbText: textColor,
                    _fbName: personName,
                    _fbEntityId: entityId,
                });
            }

            if (showNow && isSameDay(day, now)) {
                const active = mergedEvents.filter((e) => {
                    if (e.all_day) return false;
                    if (!e?._start || !e?._end) return false;
                    return e._start <= now && e._end > now;
                });
                if (active.length === 1) {
                    const only = active[0];
                    const person = card._personForEntity(only._fbEntityId);
                    const color = person?.color || card._neutralColor();
                    const textColor =
                        person?.text_color || getReadableTextColour(color);
                    nowBadge = {
                        text: only.summary || '(Event)',
                        color,
                        textColor,
                    };
                } else if (active.length > 1) {
                    nowBadge = {
                        text: `${active.length} events now`,
                        color: 'var(--fb-surface)',
                        textColor: 'var(--fb-text)',
                    };
                }
            }

            const layout = layoutDayEvents(timedRaw, { maxColumns: 2 });
            const dayEvents = mergedEvents
                .map((e) => {
                    const entityId = e._fbEntityId;
                    const person = entityId ? card._personForEntity(entityId) : null;
                    const colour = person?.color || card._neutralColor();
                    const textColor = person?.text_color || getReadableTextColour(colour);
                    return { ...e, _fbColour: colour, _fbText: textColor };
                })
                .sort((a, b) => (a._start?.getTime?.() || 0) - (b._start?.getTime?.() || 0));
            const visibleAllDay = allDay.slice(0, maxAllDayVisible);
            const hiddenAllDay = Math.max(allDay.length - visibleAllDay.length, 0);
            const pips = Array.from(perPerson.values());
            return {
                day,
                allDay: visibleAllDay,
                allDayFull: allDay,
                allDayHidden: hiddenAllDay,
                timed: layout.items,
                overflows: layout.overflows,
                dayEvents,
                pips,
                nowBadge,
            };
        });

        const totalEvents = dayData.reduce(
            (sum, row) => sum + row.allDay.length + row.timed.length,
            0
        );

        if (isCalendarLoading) {
            return html`
                <div class="wrap">
                    <div class="card">
                        <fb-loading label="Loading schedule..."></fb-loading>
                    </div>
                </div>
            `;
        }

        const repeatItems =
            repeat ||
            ((items, keyFn, templateFn) =>
                (items || []).map((item, idx) => templateFn(item, idx)));

        return html`
            <div class="wrap">
                <div class="card fb-card padded">
                    <div class="board">
                    <div class="row headerRow">
                        <div class="gutterHead"></div>
                        ${repeatItems(
                            days,
                            (d) => d.toISOString().slice(0, 10),
                            (d, idx) => {
                                const dayName = formatWeekdayShort(d);
                                const dayDate = formatDayMonthShort(d);
                                const isToday = isSameDay(d, now);
                                const dayLabel = `${dayName} ${dayDate}`;
                                const pips = dayData[idx]?.pips || [];
                                const dayPips = pips.slice(0, 4);
                                return html`
                                    <button
                                        class="btn dayHead ${isToday ? 'highlight' : ''}"
                                        @click=${() =>
                                            card._openAllDayDialog(
                                                d,
                                                dayData[idx]?.dayEvents || [],
                                                'Events'
                                            )}
                                    >
                                        <div class="dayLabel">${dayLabel}</div>
                                        ${dayPips.length
                                            ? html`<div class="dayPips">
                                                  ${repeatItems(
                                                      dayPips,
                                                      (p) => p.id || `${p.color}-${p.count}`,
                                                      (p) => html`<span
                                                          class="dayPip"
                                                          style="background:${p.color};color:${p.textColor || 'var(--fb-text)'}"
                                                          title="${p.count} events"
                                                          >${p.count}</span
                                                      >`
                                                  )}
                                              </div>`
                                            : html``}
                                    </button>
                                `;
                            }
                        )}
                    </div>

                    <div class="row allDayRow">
                        <div class="gutterAllDay"></div>
                        ${repeatItems(
                            dayData,
                            (row) => row.day.toISOString().slice(0, 10),
                            (row) => {
                                const allDay = row.allDay;
                                const isToday = isSameDay(row.day, now);
                                const primary = allDay[0];
                                const more = row.allDayHidden;
                                return html`
                                    <div class="allDay ${isToday ? 'todayCol' : ''}">
                                        ${primary
                                            ? html`<button
                                                  class="btn chip"
                                                  data-key=${primary._fbKey || ''}
                                                  style="
                                                      --event-color:${primary._fbColour};
                                                      --event-text:${primary._fbText ||
                                                      getReadableTextColour(primary._fbColour)};
                                                  "
                                                  @click=${() =>
                                                      more
                                                          ? card._openAllDayDialog(
                                                                row.day,
                                                                row.allDayFull
                                                            )
                                                          : card._openEventDialog(
                                                                primary._fbEntityId,
                                                                primary
                                                            )}
                                                  title=${primary.summary}
                                              >
                                                  <span class="chipDot"></span>
                                                  <span>${primary.summary}${more ? ` +${more}` : ''}</span>
                                              </button>`
                                            : html``}
                                    </div>
                                `;
                            }
                        )}
                    </div>

                    <div class="gridScroll">
                        <div class="row">
                            <div class="gutterTimes">
                                ${timeRows.map(
                                    (r) => html`
                                        <div class="timeRow ${r.isHour ? 'hour' : ''}">
                                            <span class="timeLabel ${r.isHour ? '' : 'half'}"
                                                >${r.label}</span
                                            >
                                        </div>
                                    `
                                )}
                            </div>

                            ${repeatItems(
                                dayData,
                                (row) => row.day.toISOString().slice(0, 10),
                                (row) => {
                                    const isToday = isSameDay(row.day, now);
                                    const hasNow = showNow;
                                    return html`
                                        <div class="dayCol ${isToday ? 'todayCol' : ''}">
                                            <div
                                                class="slotBg"
                                                @click=${(ev) => this._handleSlotClick(ev, row.day)}
                                            >
                                                ${Array.from({ length: slots + 1 }).map(
                                                    () => html`<div class="slotRow"></div>`
                                                )}
                                            </div>

                                            <div class="eventsLayer">
                                                ${hasNow
                                                    ? html`<div
                                                          class="nowLine ${isToday ? 'today' : ''}"
                                                          style="top:${nowTop}px"
                                                      ></div>`
                                                    : html``}
                                                ${showNow && isSameDay(row.day, now) && row.nowBadge
                                                    ? html`<div
                                                          class="nowBadge"
                                                          style="
                                                              top:${nowTop}px;
                                                              --now-badge:${row.nowBadge.color};
                                                              --now-badge-text:${row.nowBadge.textColor};
                                                          "
                                                      >
                                                          ${row.nowBadge.text}
                                                      </div>`
                                                    : html``}
                                                ${repeatItems(
                                                    row.timed,
                                                    (ev) => ev._fbKey || `${ev.startMin}-${ev.endMin}`,
                                                    (ev) => {
                                                        const startSlots =
                                                            (ev.startMin - startMin) / slotMinutes;
                                                        const endSlots =
                                                            (ev.endMin - startMin) / slotMinutes;
                                                        const top = startSlots * slotPx;
                                                        const height = Math.max(
                                                            36,
                                                            (endSlots - startSlots) * slotPx
                                                        );
                                                        const isCurrent =
                                                            nowMin !== null &&
                                                            ev.startMin <= nowMin &&
                                                            ev.endMin > nowMin;

                                                        const widthPct = 100 / ev.lanesTotal;
                                                        const leftPct = ev.lane * widthPct;
                                                        const timeText = `${pad2(
                                                            ev.start.getHours()
                                                        )}:${pad2(
                                                            ev.start.getMinutes()
                                                        )}\u2013${pad2(ev.end.getHours())}:${pad2(
                                                            ev.end.getMinutes()
                                                        )}`;

                                                        return html`
                                                            <button
                                                                class="btn event ${isCurrent ? 'current' : ''}"
                                                                data-key=${ev._fbKey || ''}
                                                                style="
                                                                    --event-color:${ev._fbColour};
                                                                    --event-text:${ev._fbText ||
                                                                    getReadableTextColour(ev._fbColour)};
                                                                    top:${top}px;
                                                                    height:${height}px;
                                                                    left:calc(${leftPct}% + 4px);
                                                                    width:calc(${widthPct}% - 8px);
                                                                "
                                                                @click=${() =>
                                                                    card._openEventDialog(
                                                                        ev._fbEntityId,
                                                                        ev
                                                                    )}
                                                                title=${ev.summary}
                                                            >
                                                                <div class="eventHeader">
                                                                    <div class="eventTime">${timeText}</div>
                                                                    <div class="eventTitle">${ev.summary}</div>
                                                                </div>
                                                            </button>
                                                        `;
                                                    }
                                                )}
                                                ${repeatItems(
                                                    row.overflows,
                                                    (o) =>
                                                        `${row.day.toISOString().slice(0, 10)}-${o.startMin}`,
                                                    (o) => html`<button
                                                        class="btn overflow"
                                                        style="top:${(o.startMin - startMin) * pxPerMin}px"
                                                        @click=${(ev) => {
                                                            ev.stopPropagation();
                                                            card._openAllDayDialog(
                                                                row.day,
                                                                row.dayEvents || [],
                                                                'Events'
                                                            );
                                                        }}
                                                    >
                                                        +${o.count}
                                                    </button>`
                                                )}
                                            </div>
                                        </div>
                                    `;
                                }
                            )}
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-schedule-view', FbScheduleView);
