/* Family Board - emoji picker
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();
import { sharedViewStyles } from '../views/shared.styles.js';

const RECENT_KEY = 'family-board:emoji-recent';

const CATEGORIES = {
    Recent: [],
    Tasks: ['✅', '📌', '🧹', '🧺', '🧽', '🛠️', '🧰', '🧴', '🧼', '🪣'],
    Home: ['🏠', '🛋️', '🪟', '🛏️', '🧸', '🌿', '🪴', '🚪', '🧯', '🔑'],
    Food: ['🛒', '🥛', '🍞', '🥚', '🧀', '🍎', '🥦', '🥕', '🍌', '🍫'],
    Health: ['🦷', '💊', '🩺', '🧘', '🏃', '🚴', '🛌', '🧠', '🫶', '❤️'],
};

export class FbIconPicker extends LitElement {
    static properties = {
        open: { type: Boolean },
        value: { type: String },
        _recent: { state: true },
    };

    static styles = [
        sharedViewStyles,
        css`
        :host {
            display: block;
            position: relative;
            --fb-btn-bg: var(--fb-surface-2);
            --fb-btn-border: var(--fb-grid);
            --fb-btn-border-width: 1px;
            --fb-btn-radius: 6px;
            --fb-btn-padding: 6px 0;
            --fb-btn-font-size: 17px;
        }
        .panel {
            position: absolute;
            right: 0;
            top: calc(100% + 8px);
            background: var(--fb-surface);
            border: 1px solid var(--fb-border);
            border-radius: 10px;
            padding: 10px;
            box-shadow: var(--shadow-md);
            width: 280px;
            z-index: 20;
        }
        .toolbar {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 6px;
        }
        .cat {
            font-weight: 700;
            font-size: 14px;
            margin: 6px 0;
            color: var(--fb-muted);
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 6px;
        }
        .emojiBtn {
            --fb-btn-padding: 6px 0;
            --fb-btn-font-size: 17px;
        }
        .clearBtn {
            --fb-btn-padding: 4px 8px;
            --fb-btn-font-size: 14px;
        }
    `,
    ];

    connectedCallback() {
        super.connectedCallback();
        this._recent = this._loadRecent();
    }

    _loadRecent() {
        try {
            const raw = localStorage.getItem(RECENT_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    _saveRecent(list) {
        try {
            localStorage.setItem(RECENT_KEY, JSON.stringify(list));
        } catch {
            // Ignore storage errors.
        }
    }

    _pick(emoji) {
        if (!emoji) {
            this.dispatchEvent(
                new CustomEvent('fb-emoji', { detail: { emoji: '' }, bubbles: true, composed: true })
            );
            return;
        }
        const recent = [emoji, ...this._recent.filter((e) => e !== emoji)].slice(0, 12);
        this._recent = recent;
        this._saveRecent(recent);
        this.dispatchEvent(new CustomEvent('fb-emoji', { detail: { emoji }, bubbles: true, composed: true }));
    }

    render() {
        if (!this.open) return html``;
        const recent = this._recent || [];
        const categories = { ...CATEGORIES, Recent: recent };

        return html`
            <div class="panel">
                <div class="toolbar">
                    <button class="btn clearBtn" @click=${() => this._pick('')}>
                        Remove icon
                    </button>
                </div>
                ${Object.entries(categories).map(([label, items]) =>
                    items.length
                        ? html`
                              <div class="cat">${label}</div>
                              <div class="grid">
                                  ${items.map(
                                      (emoji) =>
                                          html`<button
                                              class="btn emojiBtn"
                                              @click=${() => this._pick(emoji)}
                                          >
                                              ${emoji}
                                          </button>`
                                  )}
                              </div>
                          `
                        : html``
                )}
            </div>
        `;
    }
}

customElements.define('fb-icon-picker', FbIconPicker);
