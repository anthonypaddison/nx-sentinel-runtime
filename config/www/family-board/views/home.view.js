/* Family Board - home controls view
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { sharedViewStyles, sharedCardStyles } from './shared.styles.js';
export class FbHomeView extends LitElement {
    static properties = { card: { type: Object } };

    static styles = [
        sharedViewStyles,
        sharedCardStyles,
        css`
        .grid {
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(auto-fit, minmax(220px, 25%));
            align-items: stretch;
        }
        .banner {
            border: 1px dashed var(--fb-border);
            border-radius: 12px;
            padding: 12px;
            color: var(--fb-muted);
            background: var(--fb-surface-2);
        }
        .tile {
            --fb-card-padding: 8px 10px;
            display: flex;
            align-items: center;
            gap: 12px;
            justify-content: space-between;
            width: 100%;
            min-height: var(--fb-touch);
        }
        .name {
            font-weight: 700;
            overflow-wrap: anywhere;
            white-space: normal;
        }
        button {
            border: 0;
            cursor: pointer;
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
        .toggle:hover input:checked + .slider {
            background-color: var(--urgent);
            border-color: var(--urgent);
        }
        .toggle:hover input:not(:checked) + .slider {
            background-color: var(--success);
            border-color: var(--success);
        }
        .toggle input:checked + .slider::before {
            transform: translate(24px, -50%);
            border-color: var(--success);
        }
        `,
    ];

    _friendlyName(entityId, state) {
        const name = state?.attributes?.friendly_name;
        if (name) return name;
        const raw = String(entityId || '').split('.')[1] || entityId || '';
        return raw
            .split('_')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    render() {
        const card = this.card;
        if (!card) return html``;

        const hass = card.hass;
        const controls = Array.isArray(card._config?.home_controls)
            ? card._config.home_controls
            : [];
        const validControls = controls.filter((eid) => hass?.states?.[eid]);

        return html`
            <div class="wrap scroll">
                ${validControls.length === 0
                    ? html`<div class="banner">
                          No home controls configured.
                          ${card._hass?.user?.is_admin
                              ? html`Add entities in Settings -> Home controls.`
                              : html`Ask an admin to configure home controls.`}
                      </div>`
                    : html``}
                <div class="grid">
                    ${validControls.map((eid) => {
                        const st = hass?.states?.[eid];
                        const label = this._friendlyName(eid, st);
                        const state = st?.state ?? 'unknown';
                        const isOn = state === 'on';
                        return html`
                            <div class="tile fb-card padded">
                                <div style="flex:1;min-width:0">
                                    <div class="name">${label}</div>
                                </div>
                                <label class="toggle">
                                    <input
                                        type="checkbox"
                                        .checked=${isOn}
                                        ?disabled=${!st}
                                        @change=${(e) =>
                                            card._setHomeEntityState(eid, e.target.checked)}
                                    />
                                    <span class="slider"></span>
                                </label>
                            </div>
                        `;
                    })}
                </div>
            </div>
        `;
    }
}

customElements.define('fb-home-view', FbHomeView);
