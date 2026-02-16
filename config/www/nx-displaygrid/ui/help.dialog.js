/* nx-displaygrid - help dialog
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();
import { sharedViewStyles } from '../views/shared.styles.js';

export class FbHelpDialog extends LitElement {
    static properties = {
        open: { type: Boolean },
    };

    static styles = [
        sharedViewStyles,
        css`
        :host {
            display: block;
            --fb-btn-bg: var(--fb-surface-2);
            --fb-btn-border: var(--fb-grid);
            --fb-btn-border-width: 1px;
            --fb-btn-radius: 8px;
            --fb-btn-padding: 6px 10px;
            --fb-btn-font-size: 14px;
        }
        .backdrop {
            position: fixed;
            inset: 0;
            background: var(--overlay);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 14px;
        }
        .dlg {
            width: 100%;
            max-width: 720px;
            background: var(--fb-surface);
            border-radius: 12px;
            border: 1px solid var(--fb-border);
            padding: 14px;
            max-height: 90vh;
            overflow: auto;
        }
        .h {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-weight: 700;
        }
        .section {
            margin-top: 12px;
        }
        .title {
            font-weight: 700;
            margin-bottom: 6px;
            font-size: 16px;
        }
        ul {
            margin: 6px 0 0;
            padding-left: 18px;
            color: var(--fb-muted);
            font-size: 14px;
        }
    `,
    ];

    _close() {
        this.dispatchEvent(new CustomEvent('fb-help-close', { bubbles: true, composed: true }));
    }

    render() {
        if (!this.open) return html``;
        return html`
            <div class="backdrop" @click=${(e) => e.target === e.currentTarget && this._close()}>
                <div class="dlg">
                    <div class="h">
                        <div>Help</div>
                        <button class="btn" @click=${this._close}>Close</button>
                    </div>

                    <div class="section">
                        <div class="title">Google Calendar setup</div>
                        <ul>
                            <li>Install the Google Calendar integration in Home Assistant.</li>
                            <li>Verify calendars appear as calendar.* entities.</li>
                            <li>Use those entities in this card's calendar list.</li>
                        </ul>
                    </div>

                    <div class="section">
                        <div class="title">Todoist setup</div>
                        <ul>
                            <li>Install the Todoist integration and create todo lists.</li>
                            <li>Ensure lists appear as todo.* entities.</li>
                            <li>Set a shopping list in Settings or name a todo list “Shopping”.</li>
                        </ul>
                    </div>

                    <div class="section">
                        <div class="title">Add this card</div>
                        <ul>
                            <li>Add the resource: /local/nx-displaygrid/nx-displaygrid.js?v=...</li>
                            <li>Use the card editor or paste the YAML snippet.</li>
                            <li>After edits, hard refresh to clear cached JS.</li>
                        </ul>
                    </div>

                    <div class="section">
                        <div class="title">Troubleshooting</div>
                        <ul>
                            <li>Confirm entities exist and match the config.</li>
                            <li>Enable debug: true to see logs.</li>
                            <li>Clear cache when changing JS or resources.</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-help-dialog', FbHelpDialog);
