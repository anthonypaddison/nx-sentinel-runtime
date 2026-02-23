/* nx-displaygrid - family dashboard view (V2)
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { sharedViewStyles, sharedCardStyles } from './shared.styles.js';
import { formatWeekdayLongDayMonthLong } from '../nx-displaygrid.util.js';

export class FbFamilyView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
    };

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
            background: var(--fb-surface);
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
            grid-template-columns: 1.1fr 0.9fr;
        }
        .panelBody {
            padding: 12px;
            display: grid;
            gap: 10px;
        }
        .statGrid {
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .stat {
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            background: var(--fb-surface-2);
            padding: 10px;
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
        .actionGrid {
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }
        .actionBtn {
            text-align: left;
            min-height: 64px;
            border-radius: 12px;
        }
        .list {
            display: grid;
            gap: 8px;
        }
        .item {
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            background: var(--fb-surface-2);
            padding: 8px 10px;
            display: grid;
            gap: 2px;
        }
        .itemTitle {
            font-weight: 700;
        }
        .itemMeta {
            font-size: 12px;
            color: var(--fb-muted);
        }
        @media (max-width: 1000px) {
            .grid {
                grid-template-columns: 1fr;
            }
        }
        `,
    ];

    render() {
        const card = this.card;
        if (!card) return html``;
        const ambient = card._v2AmbientSummary?.() || {};
        const actions = card._v2IntentActions?.() || [];
        const summary = Array.isArray(card._summaryCounts?.()) ? card._summaryCounts() : [];
        const topPeople = summary.slice(0, 4);

        return html`
            <div class="canvas">
                <div class="hero">
                    <div class="heroTitle">Family Dashboard</div>
                    <div class="heroSub">
                        ${formatWeekdayLongDayMonthLong(new Date())} · Clear daily summary, house
                        status, and common actions.
                    </div>
                </div>

                <div class="grid">
                    <div class="fb-card">
                        <div class="fb-card-header">Today Summary</div>
                        <div class="panelBody">
                            <div class="statGrid">
                                <div class="stat">
                                    <div class="statLabel">Shopping</div>
                                    <div class="statValue">${ambient.shoppingCount || 0}</div>
                                </div>
                                <div class="stat">
                                    <div class="statLabel">Chores due</div>
                                    <div class="statValue">${ambient.choresDue || 0}</div>
                                </div>
                                <div class="stat">
                                    <div class="statLabel">Events now</div>
                                    <div class="statValue">${ambient.eventsNow || 0}</div>
                                </div>
                                <div class="stat">
                                    <div class="statLabel">House mode</div>
                                    <div class="statValue" style="font-size:16px">
                                        ${ambient.houseMode?.available
                                            ? ambient.houseMode.state || 'unknown'
                                            : 'Not set'}
                                    </div>
                                </div>
                            </div>

                            <div class="actionGrid">
                                ${actions.slice(0, 4).map(
                                    (action) => html`
                                        <button class="btn actionBtn" @click=${() => action.run?.()}>
                                            <div style="font-weight:800">${action.title}</div>
                                            <div class="itemMeta">${action.subtitle || ''}</div>
                                        </button>
                                    `
                                )}
                            </div>
                        </div>
                    </div>

                    <div class="fb-card">
                        <div class="fb-card-header">People & Upcoming</div>
                        <div class="panelBody">
                            <div class="list">
                                ${topPeople.length
                                    ? topPeople.map(
                                          (p) => html`
                                              <div class="item">
                                                  <div class="itemTitle">${p.name}</div>
                                                  <div class="itemMeta">
                                                      ${p.eventsLeft ?? 0} events · ${p.todosLeft ?? 0}
                                                      chores
                                                  </div>
                                              </div>
                                          `
                                      )
                                    : html`<div class="itemMeta">No people configured.</div>`}
                            </div>
                            <div class="actionGrid">
                                <button
                                    class="btn actionBtn"
                                    @click=${() => card._onNav?.({ detail: { target: 'important' } })}
                                >
                                    <div style="font-weight:800">Open Important</div>
                                    <div class="itemMeta">Today/tomorrow view</div>
                                </button>
                                <button
                                    class="btn actionBtn"
                                    @click=${() => card._onNav?.({ detail: { target: 'family' } })}
                                >
                                    <div style="font-weight:800">Stay on Family</div>
                                    <div class="itemMeta">Daily glance mode</div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-family-view', FbFamilyView);
