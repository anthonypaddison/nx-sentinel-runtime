/* nx-displaygrid - ambient view (V2 tablet glance)
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { sharedViewStyles, sharedCardStyles } from './shared.styles.js';
import { formatTimeRange, formatWeekdayLongDayMonthLong } from '../nx-displaygrid.util.js';

function daysLabel(daysUntil) {
    if (!Number.isFinite(daysUntil)) return 'No due date';
    if (daysUntil < 0) return `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} overdue`;
    if (daysUntil === 0) return 'Due today';
    if (daysUntil === 1) return 'Due tomorrow';
    return `Due in ${daysUntil} days`;
}

export class FbAmbientView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
        _nowTick: { state: true },
        _collectionModal: { state: true },
    };

    constructor() {
        super();
        this._nowTick = Date.now();
        this._collectionModal = null;
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
        .statBtn {
            --fb-btn-bg: var(--fb-surface-2);
            --fb-btn-border: var(--fb-grid);
            --fb-btn-border-width: 1px;
            --fb-btn-radius: 12px;
            --fb-btn-padding: 10px 12px;
            text-align: left;
            width: 100%;
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
        .binLine {
            display: inline-flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
            border: 1px solid var(--fb-grid);
            border-radius: 12px;
            background: var(--fb-surface-2);
            padding: 8px 10px;
            font-size: 14px;
            font-weight: 700;
        }
        .binIcon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: var(--bin-colour);
            line-height: 0;
        }
        .binIcon ha-icon {
            --mdc-icon-size: 18px;
            width: 18px;
            height: 18px;
        }
        .todoRow {
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            background: var(--fb-surface-2);
            padding: 8px 10px;
            display: grid;
            gap: 2px;
        }
        .todoTitle {
            font-weight: 700;
        }
        .todoMeta {
            color: var(--fb-muted);
            font-size: 12px;
        }
        .actionDock {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
        }
        .dockBtn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-height: 46px;
        }
        .modalBackdrop {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: var(--overlay);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 14px;
        }
        .modal {
            width: min(640px, 100%);
            max-height: min(86vh, 760px);
            overflow: auto;
            background: var(--fb-surface);
            border: 1px solid var(--fb-border);
            border-radius: 14px;
            box-shadow: var(--fb-shadow);
            padding: 12px;
            display: grid;
            gap: 8px;
        }
        .modalHead {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            font-weight: 800;
        }
        .controlRow {
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            background: var(--fb-surface-2);
            padding: 8px 10px;
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
            gap: 10px;
        }
        .controlName {
            font-weight: 700;
        }
        .toggle {
            position: relative;
            display: inline-block;
            width: 52px;
            height: 28px;
        }
        .toggle input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            inset: 0;
            background-color: color-mix(in srgb, var(--fb-border) 70%, #ffffff);
            border: 1px solid var(--fb-border);
            border-radius: 999px;
            transition: 0.2s;
        }
        .slider::before {
            position: absolute;
            content: '';
            height: 22px;
            width: 22px;
            left: 3px;
            top: 50%;
            background-color: var(--fb-surface);
            border: 1px solid var(--fb-border);
            border-radius: 50%;
            transition: 0.2s;
            transform: translateY(-50%);
        }
        .toggle input:checked + .slider {
            background-color: var(--success);
            border-color: var(--success);
        }
        .toggle input:checked + .slider::before {
            transform: translate(24px, -50%);
            border-color: var(--success);
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

    _friendlyName(card, entityId) {
        const state = card?._hass?.states?.[entityId];
        const name = state?.attributes?.friendly_name;
        if (name) return name;
        const raw = String(entityId || '').split('.')[1] || entityId || '';
        return raw
            .split('_')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    _isEntityOn(card, entityId) {
        const state = String(card?._hass?.states?.[entityId]?.state || '').toLowerCase();
        return ['on', 'heat', 'heating', 'open'].includes(state);
    }

    _openCollection(collection) {
        this._collectionModal = collection || null;
    }

    _closeCollection() {
        this._collectionModal = null;
    }

    render() {
        const card = this.card;
        if (!card) return html``;
        const ambient = card._v2AmbientSummary?.() || {};
        const now = new Date(this._nowTick || Date.now());
        const nextEvents = Array.isArray(ambient.nextEvents) ? ambient.nextEvents : [];
        const importantTodos = card._v2ImportantTodoCountdowns?.(8) || [];
        const collections = card._v2FamilyHomeControlCollections?.() || [];
        const collectionList = Array.isArray(collections) ? collections : [];
        const findCollection = (id) =>
            collectionList.find((entry) => String(entry?.id || '').toLowerCase() === id) || null;
        const heatingCollection = findCollection('heating') || collectionList[0] || null;
        const lightingCollection =
            findCollection('lighting') ||
            collectionList.find((entry) => entry && entry !== heatingCollection) ||
            collectionList[1] ||
            null;
        const bins = card._nextBinCollectionInfo?.() || {
            line: 'Bin day: not scheduled',
            bins: [],
        };

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
                        <button class="btn stat statBtn" @click=${() => card._onNav?.({ detail: { target: 'schedule' } })}>
                            <div class="statLabel">Events now</div>
                            <div class="statValue">${ambient.eventsNow || 0}</div>
                        </button>
                        <button class="btn stat statBtn" @click=${() => card._onNav?.({ detail: { target: 'shopping' } })}>
                            <div class="statLabel">Shopping</div>
                            <div class="statValue">${ambient.shoppingCount || 0}</div>
                        </button>
                        <button class="btn stat statBtn" @click=${() => card._onNav?.({ detail: { target: 'chores' } })}>
                            <div class="statLabel">Chores due</div>
                            <div class="statValue">${ambient.choresDue || 0}</div>
                        </button>
                        <button class="btn stat statBtn" @click=${() => card._onNav?.({ detail: { target: 'home' } })}>
                            <div class="statLabel">House mode</div>
                            <div class="statValue" style="font-size:15px">
                                ${ambient.houseMode?.available
                                    ? ambient.houseMode.state || 'unknown'
                                    : 'Not set'}
                            </div>
                        </button>
                    </div>
                </div>

                <div class="grid">
                    <div class="fb-card">
                        <div class="fb-card-header">Upcoming</div>
                        <div class="panelBody">
                            <div class="binLine">
                                <span>${bins.line || 'Not scheduled'}</span>
                                ${(Array.isArray(bins.bins) ? bins.bins : []).map(
                                    (bin) => html`
                                        <span
                                            class="binIcon"
                                            style="--bin-colour:${bin.colour || '#999999'}"
                                            title=${bin.name || 'Bin'}
                                        >
                                            <ha-icon icon=${bin.icon || 'mdi:trash-can'}></ha-icon>
                                        </span>
                                    `
                                )}
                            </div>

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
                                                  ${formatTimeRange(entry.start, entry.end, entry.allDay)}
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
                            ${importantTodos.length
                                ? importantTodos.map(
                                      (row) => html`
                                          <div class="todoRow">
                                              <div class="todoTitle">${row.title}</div>
                                              <div class="todoMeta">
                                                  ${daysLabel(row.daysUntil)}
                                                  ${row.personName ? ` · ${row.personName}` : ''}
                                              </div>
                                          </div>
                                      `
                                  )
                                : html`<div class="muted">No important chores with due dates.</div>`}
                        </div>
                    </div>
                </div>

                <div class="actionDock">
                    <button
                        class="btn dockBtn"
                        ?disabled=${!heatingCollection}
                        @click=${() => heatingCollection && this._openCollection(heatingCollection)}
                    >
                        <ha-icon icon=${heatingCollection?.icon || 'mdi:radiator'}></ha-icon>
                        <span>${heatingCollection?.label || 'Heating'}</span>
                    </button>
                    <button
                        class="btn dockBtn"
                        ?disabled=${!lightingCollection}
                        @click=${() => lightingCollection && this._openCollection(lightingCollection)}
                    >
                        <ha-icon icon=${lightingCollection?.icon || 'mdi:lightbulb-group'}></ha-icon>
                        <span>${lightingCollection?.label || 'Lighting'}</span>
                    </button>
                </div>

                ${this._collectionModal
                    ? html`
                          <div
                              class="modalBackdrop"
                              @click=${(e) => e.target === e.currentTarget && this._closeCollection()}
                          >
                              <div class="modal">
                                  <div class="modalHead">
                                      <div>${this._collectionModal.label || 'Collection'}</div>
                                      <button class="btn" @click=${this._closeCollection}>Close</button>
                                  </div>
                                  ${Array.isArray(this._collectionModal.entities) &&
                                  this._collectionModal.entities.length
                                      ? this._collectionModal.entities.map(
                                            (entityId) => html`
                                                <div class="controlRow">
                                                    <div class="controlName">
                                                        ${this._friendlyName(card, entityId)}
                                                    </div>
                                                    <label class="toggle">
                                                        <input
                                                            type="checkbox"
                                                            .checked=${this._isEntityOn(card, entityId)}
                                                            @change=${(e) =>
                                                                card._setHomeEntityState(
                                                                    entityId,
                                                                    e.target.checked
                                                                )}
                                                        />
                                                        <span class="slider"></span>
                                                    </label>
                                                </div>
                                            `
                                        )
                                      : html`<div class="muted">No controls in this collection.</div>`}
                              </div>
                          </div>
                      `
                    : html``}
            </div>
        `;
    }
}

customElements.define('fb-ambient-view', FbAmbientView);
