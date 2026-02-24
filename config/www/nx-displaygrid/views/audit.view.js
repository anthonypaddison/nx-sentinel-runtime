/* nx-displaygrid - audit timeline view (V2 admin)
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { sharedViewStyles, sharedCardStyles } from './shared.styles.js';

function labelize(value = '') {
    return String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (m) => m.toUpperCase());
}

function badgeClass(level = '') {
    const s = String(level || '').toLowerCase();
    if (s === 'critical' || s === 'error') return 'err';
    if (s === 'warn' || s === 'warning') return 'warn';
    if (s === 'info') return 'info';
    return 'ok';
}

export class FbAuditView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
        _days: { state: true },
        _component: { state: true },
        _severity: { state: true },
    };

    constructor() {
        super();
        this._days = 7;
        this._component = '';
        this._severity = '';
    }

    static styles = [
        sharedViewStyles,
        sharedCardStyles,
        css`
        .canvas {
            height: 100%;
            overflow: auto;
            padding: var(--fb-gutter);
            display: grid;
            gap: 12px;
            align-content: start;
        }
        .hero {
            border: 1px solid var(--fb-border);
            border-radius: 14px;
            background: color-mix(in srgb, var(--fb-accent-teal) 9%, var(--fb-surface));
            padding: 14px;
        }
        .heroTitle {
            font-size: 22px;
            font-weight: 800;
        }
        .heroSub {
            margin-top: 4px;
            color: var(--fb-muted);
            font-size: 14px;
        }
        .grid {
            display: grid;
            gap: 12px;
            grid-template-columns: 0.95fr 1.05fr;
        }
        .panelBody {
            padding: 12px;
            display: grid;
            gap: 10px;
        }
        .filters {
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .row {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 8px;
            align-items: center;
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            background: var(--fb-surface-2);
            padding: 8px 10px;
        }
        .label {
            font-weight: 700;
        }
        .value {
            color: var(--fb-muted);
            font-size: 13px;
        }
        .badge {
            border-radius: 999px;
            border: 1px solid var(--fb-border);
            padding: 4px 8px;
            font-size: 12px;
            font-weight: 700;
            background: var(--fb-surface);
        }
        .badge.ok { color: var(--success); }
        .badge.info { color: var(--info); }
        .badge.warn { color: var(--warning); }
        .badge.err { color: var(--urgent); }
        .topList {
            display: grid;
            gap: 8px;
        }
        .timeline {
            display: grid;
            gap: 8px;
        }
        .event {
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            background: var(--fb-surface-2);
            padding: 10px;
            display: grid;
            gap: 6px;
        }
        .eventHead {
            display: grid;
            grid-template-columns: auto auto 1fr auto;
            gap: 8px;
            align-items: center;
        }
        .pill {
            border-radius: 999px;
            border: 1px solid var(--fb-border);
            padding: 2px 8px;
            font-size: 11px;
            color: var(--fb-muted);
            background: var(--fb-surface);
        }
        .eventTitle {
            font-weight: 700;
            min-width: 0;
        }
        .eventTime {
            color: var(--fb-muted);
            font-size: 12px;
            white-space: nowrap;
        }
        .eventReason {
            color: var(--fb-muted);
            font-size: 13px;
        }
        .eventContext {
            font-size: 12px;
            color: var(--fb-muted);
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
        }
        .actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .input {
            width: 100%;
        }
        @media (max-width: 1100px) {
            .grid {
                grid-template-columns: 1fr;
            }
            .filters {
                grid-template-columns: 1fr;
            }
            .eventHead {
                grid-template-columns: 1fr;
            }
        }
        `,
    ];

    render() {
        const card = this.card;
        if (!card) return html``;
        if (!card._hasAdminAccess?.()) {
            return html`<div class="canvas"><div class="fb-card padded">Admin access required.</div></div>`;
        }

        const configDays = Number(card._v2AuditConfig?.().default_days || 7);
        const days = Number(this._days || configDays || 7);
        const summary = card._v2AuditSummary?.({ days }) || {
            events: [],
            todayCount: 0,
            periodCount: 0,
            topComponents: [],
            bySeverity: {},
        };
        const filtered = card._v2AuditEvents?.({
            days,
            component: this._component || '',
            severity: this._severity || '',
        }) || [];
        const knownComponents = Array.from(
            new Set(
                (summary.events || [])
                    .map((e) => String(e?.component || '').trim())
                    .filter(Boolean)
                    .concat([
                        'system',
                        'notifications',
                        'reminders',
                        'modes',
                        'calendar',
                        'todo',
                        'shopping',
                        'lighting',
                        'heating',
                        'security',
                        'energy',
                        'media',
                    ])
            )
        ).sort();

        return html`
            <div class="canvas">
                <div class="hero">
                    <div class="heroTitle">Audit Timeline</div>
                    <div class="heroSub">
                        Local-first timeline of what the dashboard/house surfaces did and why,
                        including blocked/suppressed actions for explainability.
                    </div>
                </div>

                <div class="fb-card">
                    <div class="fb-card-header">Filters & Summary</div>
                    <div class="panelBody">
                        <div class="filters">
                            <label>
                                <div class="value" style="margin-bottom:4px">Window</div>
                                <select
                                    class="input"
                                    .value=${String(days)}
                                    @change=${(e) => {
                                        this._days = Number(e.target.value || configDays || 7);
                                    }}
                                >
                                    <option value="1">1 day</option>
                                    <option value="3">3 days</option>
                                    <option value="7">7 days</option>
                                    <option value="14">14 days</option>
                                    <option value="30">30 days</option>
                                </select>
                            </label>
                            <label>
                                <div class="value" style="margin-bottom:4px">Component</div>
                                <select
                                    class="input"
                                    .value=${this._component || ''}
                                    @change=${(e) => {
                                        this._component = e.target.value || '';
                                    }}
                                >
                                    <option value="">All</option>
                                    ${knownComponents.map(
                                        (c) => html`<option value=${c}>${labelize(c)}</option>`
                                    )}
                                </select>
                            </label>
                            <label>
                                <div class="value" style="margin-bottom:4px">Severity</div>
                                <select
                                    class="input"
                                    .value=${this._severity || ''}
                                    @change=${(e) => {
                                        this._severity = e.target.value || '';
                                    }}
                                >
                                    <option value="">All</option>
                                    <option value="critical">Critical</option>
                                    <option value="warn">Warn</option>
                                    <option value="info">Info</option>
                                </select>
                            </label>
                        </div>

                        <div class="actions">
                            <button class="btn" @click=${() => card._clearAuditLog?.()}>
                                Clear audit log
                            </button>
                            <button
                                class="btn ghost"
                                @click=${() => card._onNav?.({ detail: { target: 'admin' } })}
                            >
                                Open Admin
                            </button>
                        </div>

                        <div class="row">
                            <div>
                                <div class="label">Today</div>
                                <div class="value">Events recorded today</div>
                            </div>
                            <div class="badge info">${summary.todayCount || 0}</div>
                        </div>
                        <div class="row">
                            <div>
                                <div class="label">${days}-day period</div>
                                <div class="value">Total events in selected window</div>
                            </div>
                            <div class="badge ok">${summary.periodCount || 0}</div>
                        </div>
                        <div class="row">
                            <div>
                                <div class="label">Severities</div>
                                <div class="value">
                                    Critical ${summary.bySeverity?.critical || 0} · Warn
                                    ${summary.bySeverity?.warn || 0} · Info
                                    ${summary.bySeverity?.info || 0}
                                </div>
                            </div>
                            <div
                                class="badge ${badgeClass(
                                    (summary.bySeverity?.critical || 0) > 0
                                        ? 'critical'
                                        : (summary.bySeverity?.warn || 0) > 0
                                        ? 'warn'
                                        : 'info'
                                )}"
                            >
                                ${(summary.bySeverity?.critical || 0) > 0
                                    ? 'Attention'
                                    : 'Normal'}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid">
                    <div class="fb-card">
                        <div class="fb-card-header">Top Components</div>
                        <div class="panelBody">
                            <div class="topList">
                                ${(summary.topComponents || []).length
                                    ? summary.topComponents.map(
                                          (item) => html`
                                              <div class="row">
                                                  <div>
                                                      <div class="label">${labelize(item.component)}</div>
                                                      <div class="value">Event count</div>
                                                  </div>
                                                  <div class="badge info">${item.count}</div>
                                              </div>
                                          `
                                      )
                                    : html`<div class="value">No audit events recorded yet.</div>`}
                            </div>
                        </div>
                    </div>

                    <div class="fb-card">
                        <div class="fb-card-header">Timeline</div>
                        <div class="panelBody">
                            <div class="timeline">
                                ${filtered.length
                                    ? filtered.slice(0, 120).map(
                                          (event) => html`
                                              <div class="event">
                                                  <div class="eventHead">
                                                      <span
                                                          class="badge ${badgeClass(
                                                              event.severity
                                                          )}"
                                                      >
                                                          ${event.severity || 'info'}
                                                      </span>
                                                      <span class="pill">
                                                          ${labelize(event.component || 'system')}
                                                      </span>
                                                      <div class="eventTitle">
                                                          ${event.title || 'Event'}
                                                      </div>
                                                      <div class="eventTime">
                                                          ${event.ts
                                                              ? new Date(
                                                                    event.ts
                                                                ).toLocaleString()
                                                              : ''}
                                                      </div>
                                                  </div>
                                                  ${event.reason
                                                      ? html`
                                                            <div class="eventReason">
                                                                ${event.reason}
                                                            </div>
                                                        `
                                                      : html``}
                                                  ${event.context &&
                                                  Object.keys(event.context).length
                                                      ? html`
                                                            <div class="eventContext">
                                                                ${JSON.stringify(
                                                                    event.context
                                                                )}
                                                            </div>
                                                        `
                                                      : html``}
                                              </div>
                                          `
                                      )
                                    : html`
                                          <div class="row">
                                              <div>
                                                  <div class="label">No events</div>
                                                  <div class="value">
                                                      No audit events match the current filters.
                                                  </div>
                                              </div>
                                              <div class="badge ok">Empty</div>
                                          </div>
                                      `}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-audit-view', FbAuditView);

