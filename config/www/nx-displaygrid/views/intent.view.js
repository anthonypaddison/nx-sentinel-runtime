/* nx-displaygrid - intent view (V2 mobile-first)
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { sharedViewStyles, sharedCardStyles } from './shared.styles.js';

export class FbIntentView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
    };

    static styles = [
        sharedViewStyles,
        sharedCardStyles,
        css`
        .wrapIntent {
            height: 100%;
            padding: var(--fb-gutter);
            overflow: auto;
            display: grid;
            gap: 12px;
            align-content: start;
        }
        .hero {
            display: grid;
            gap: 8px;
            padding: 14px;
            border-radius: 14px;
            border: 1px solid var(--fb-border);
            background: linear-gradient(
                135deg,
                color-mix(in srgb, var(--fb-accent) 16%, var(--fb-surface)),
                var(--fb-surface)
            );
        }
        .heroTitle {
            font-size: 22px;
            font-weight: 800;
        }
        .heroSub {
            color: var(--fb-muted);
            font-size: 14px;
        }
        .actions {
            display: grid;
            gap: 12px;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }
        .action {
            text-align: left;
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 12px;
            align-items: center;
            border-radius: 14px;
            border: 1px solid var(--fb-border);
            background: var(--fb-surface);
            padding: 14px;
            min-height: 92px;
            cursor: pointer;
        }
        .actionIcon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: grid;
            place-items: center;
            background: var(--tone-bg, var(--fb-surface-2));
            color: var(--tone-fg, var(--fb-text));
        }
        .actionIcon ha-icon {
            width: 26px;
            height: 26px;
            font-size: 26px;
        }
        .actionTitle {
            font-weight: 800;
            font-size: 18px;
        }
        .actionSub {
            color: var(--fb-muted);
            font-size: 13px;
            margin-top: 2px;
        }
        .micro {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 10px;
        }
        .modeStrip {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .modeBtn {
            border-radius: 999px;
        }
        .microCard {
            border: 1px solid var(--fb-grid);
            border-radius: 12px;
            background: var(--fb-surface-2);
            padding: 10px 12px;
        }
        .microLabel {
            color: var(--fb-muted);
            font-size: 12px;
        }
        .microValue {
            font-size: 20px;
            font-weight: 800;
            margin-top: 2px;
        }
        `,
    ];

    _toneStyle(tone) {
        if (tone === 'warn') {
            return '--tone-bg: color-mix(in srgb, var(--warning) 18%, var(--fb-surface)); --tone-fg: var(--warning);';
        }
        if (tone === 'calm') {
            return '--tone-bg: color-mix(in srgb, var(--info) 16%, var(--fb-surface)); --tone-fg: var(--info);';
        }
        if (tone === 'primary') {
            return '--tone-bg: color-mix(in srgb, var(--fb-accent) 18%, var(--fb-surface)); --tone-fg: var(--fb-accent);';
        }
        return '';
    }

    render() {
        const card = this.card;
        if (!card) return html``;

        const actions = card._v2IntentActions?.() || [];
        const ambient = card._v2AmbientSummary?.() || {};
        const houseModes = card._v2HouseModes?.() || [];
        const currentMode = String(ambient.houseMode?.state || '').toLowerCase();

        return html`
            <div class="wrapIntent">
                <div class="hero">
                    <div class="heroTitle">Intent</div>
                    <div class="heroSub">
                        Large actions for quick decisions. Priorities adapt to time of day, house mode,
                        and recent refresh/board state.
                    </div>
                </div>

                <div class="micro">
                    <div class="microCard">
                        <div class="microLabel">Shopping</div>
                        <div class="microValue">${ambient.shoppingCount || 0}</div>
                    </div>
                    <div class="microCard">
                        <div class="microLabel">Chores due</div>
                        <div class="microValue">${ambient.choresDue || 0}</div>
                    </div>
                    <div class="microCard">
                        <div class="microLabel">Events now</div>
                        <div class="microValue">${ambient.eventsNow || 0}</div>
                    </div>
                    <div class="microCard">
                        <div class="microLabel">House mode</div>
                        <div class="microValue" style="font-size:16px">
                            ${ambient.houseMode?.available
                                ? ambient.houseMode.state || 'unknown'
                                : 'Not set'}
                        </div>
                    </div>
                </div>
                ${ambient.houseMode?.entityId
                    ? html`
                          <div class="fb-card padded">
                              <div class="heroSub" style="margin-bottom:8px">
                                  House modes
                                  ${ambient.houseMode.available
                                      ? `(${ambient.houseMode.entityId})`
                                      : '(entity unavailable)'}
                              </div>
                              <div class="modeStrip">
                                  ${houseModes.map(
                                      (mode) => html`
                                          <button
                                              class="btn modeBtn ${currentMode === String(mode.id).toLowerCase()
                                                  ? 'primary'
                                                  : 'secondary'}"
                                              @click=${() => card._v2SetHouseMode?.(mode.id)}
                                          >
                                              ${mode.label}
                                          </button>
                                      `
                                  )}
                              </div>
                          </div>
                      `
                    : html``}

                <div class="actions">
                    ${actions.map(
                        (action) => html`
                            <button
                                class="action"
                                style=${this._toneStyle(action.tone)}
                                @click=${() => action.run?.()}
                            >
                                <div class="actionIcon">
                                    <ha-icon icon=${action.icon || 'mdi:gesture-tap'}></ha-icon>
                                </div>
                                <div>
                                    <div class="actionTitle">${action.title || 'Action'}</div>
                                    <div class="actionSub">${action.subtitle || ''}</div>
                                </div>
                            </button>
                        `
                    )}
                </div>
            </div>
        `;
    }
}

customElements.define('fb-intent-view', FbIntentView);
