/* nx-displaygrid - ambient view (V2 tablet glance)
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { sharedViewStyles, sharedCardStyles } from './shared.styles.js';
import {
    formatWeekdayLongDayMonthLong,
    formatTimeRange,
} from '../nx-displaygrid.util.js';

export class FbAmbientView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
        _nowTick: { state: true },
    };

    constructor() {
        super();
        this._nowTick = Date.now();
        this._timer = null;
    }

    connectedCallback() {
        super.connectedCallback();
        this._timer = setInterval(() => {
            this._nowTick = Date.now();
        }, 60_000);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
    }

    static styles = [
        sharedViewStyles,
        sharedCardStyles,
        css`
        .canvas {
            height: 100%;
            padding: var(--fb-gutter);
            overflow: auto;
            display: grid;
            gap: 14px;
            align-content: start;
        }
        .hero {
            border-radius: 16px;
            border: 1px solid var(--fb-border);
            background: radial-gradient(
                    circle at 10% 10%,
                    color-mix(in srgb, var(--fb-accent) 18%, transparent),
                    transparent 50%
                ),
                var(--fb-surface);
            padding: 16px;
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 14px;
            align-items: center;
        }
        .time {
            font-size: 46px;
            line-height: 1;
            font-weight: 900;
            font-variant-numeric: tabular-nums;
        }
        .date {
            margin-top: 8px;
            color: var(--fb-muted);
            font-size: 18px;
        }
        .heroStats {
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .stat {
            border: 1px solid var(--fb-grid);
            border-radius: 12px;
            background: var(--fb-surface-2);
            padding: 10px 12px;
        }
        .statLabel {
            color: var(--fb-muted);
            font-size: 12px;
        }
        .statValue {
            font-size: 22px;
            font-weight: 800;
            margin-top: 2px;
        }
        .grid {
            display: grid;
            gap: 14px;
            grid-template-columns: 1.2fr 0.8fr;
        }
        .panelBody {
            padding: 12px;
            display: grid;
            gap: 10px;
        }
        .eventRow {
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            background: var(--fb-surface-2);
            padding: 8px 10px;
            display: grid;
            gap: 3px;
        }
        .eventTitle {
            font-weight: 700;
        }
        .eventMeta {
            color: var(--fb-muted);
            font-size: 12px;
        }
        .pillRow {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .pill {
            border: 1px solid var(--fb-border);
            background: var(--fb-surface);
            border-radius: 999px;
            padding: 4px 8px;
            font-size: 12px;
        }
        @media (max-width: 1100px) {
            .hero {
                grid-template-columns: 1fr;
            }
            .grid {
                grid-template-columns: 1fr;
            }
            .time {
                font-size: 34px;
            }
        }
        `,
    ];

    render() {
        const card = this.card;
        if (!card) return html``;
        const ambient = card._v2AmbientSummary?.() || {};
        const now = new Date(this._nowTick || Date.now());
        const nextEvents = Array.isArray(ambient.nextEvents) ? ambient.nextEvents : [];
        const binsToday = Array.isArray(ambient.binIndicators?.today) ? ambient.binIndicators.today : [];
        const binsTomorrow = Array.isArray(ambient.binIndicators?.tomorrow)
            ? ambient.binIndicators.tomorrow
            : [];

        return html`
            <div class="canvas">
                <div class="hero">
                    <div>
                        <div class="time">
                            ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div class="date">${formatWeekdayLongDayMonthLong(now)}</div>
                    </div>
                    <div class="heroStats">
                        <div class="stat">
                            <div class="statLabel">Events now</div>
                            <div class="statValue">${ambient.eventsNow || 0}</div>
                        </div>
                        <div class="stat">
                            <div class="statLabel">Shopping</div>
                            <div class="statValue">${ambient.shoppingCount || 0}</div>
                        </div>
                        <div class="stat">
                            <div class="statLabel">Chores due</div>
                            <div class="statValue">${ambient.choresDue || 0}</div>
                        </div>
                        <div class="stat">
                            <div class="statLabel">House mode</div>
                            <div class="statValue" style="font-size:15px">
                                ${ambient.houseMode?.available
                                    ? ambient.houseMode.state || 'unknown'
                                    : 'Not set'}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid">
                    <div class="fb-card">
                        <div class="fb-card-header">Upcoming</div>
                        <div class="panelBody">
                            ${nextEvents.length
                                ? nextEvents.map(
                                      (entry) => html`
                                          <div
                                              class="eventRow"
                                              @click=${() =>
                                                  entry.entityId &&
                                                  card._openEventDialog?.(entry.entityId, entry.event)}
                                          >
                                              <div class="eventTitle">${entry.title}</div>
                                              <div class="eventMeta">
                                                  ${formatTimeRange(
                                                      entry.start,
                                                      entry.end,
                                                      entry.allDay
                                                  )}
                                              </div>
                                          </div>
                                      `
                                  )
                                : html`<div class="muted">No upcoming events.</div>`}
                        </div>
                    </div>

                    <div class="fb-card">
                        <div class="fb-card-header">Glance</div>
                        <div class="panelBody">
                            <div>
                                <div class="muted">Bins today</div>
                                <div class="pillRow">
                                    ${binsToday.length
                                        ? binsToday.map(
                                              (bin) =>
                                                  html`<span class="pill">${bin.name || 'Bin'}</span>`
                                          )
                                        : html`<span class="muted">None</span>`}
                                </div>
                            </div>
                            <div>
                                <div class="muted">Bins tomorrow</div>
                                <div class="pillRow">
                                    ${binsTomorrow.length
                                        ? binsTomorrow.map(
                                              (bin) =>
                                                  html`<span class="pill">${bin.name || 'Bin'}</span>`
                                          )
                                        : html`<span class="muted">None</span>`}
                                </div>
                            </div>
                            <div>
                                <div class="muted">Last refresh</div>
                                <div class="pill">
                                    ${ambient.lastRefreshTs
                                        ? new Date(ambient.lastRefreshTs).toLocaleTimeString([], {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                          })
                                        : 'Never'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-ambient-view', FbAmbientView);
