/* nx-displaygrid - editor guide dialog
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();
import { sharedViewStyles } from '../views/shared.styles.js';

export class FbEditorGuideDialog extends LitElement {
    static properties = {
        open: { type: Boolean },
        card: { type: Object },
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
            max-width: 640px;
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
        .note {
            color: var(--fb-muted);
            font-size: 14px;
            margin-top: 6px;
        }
        ul {
            margin: 10px 0 0;
            padding-left: 18px;
            color: var(--fb-text);
            font-size: 14px;
        }
        .actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 12px;
        }
    `,
    ];

    _close() {
        this.dispatchEvent(new CustomEvent('fb-editor-guide-close', { bubbles: true, composed: true }));
    }

    _openEditor() {
        this.dispatchEvent(new CustomEvent('fb-editor-guide-open', { bubbles: true, composed: true }));
    }

    _copyConfig() {
        const yaml = this.card?._buildYamlConfig?.(this.card?._config);
        if (!yaml) return;
        navigator.clipboard?.writeText?.(yaml);
    }

    render() {
        if (!this.open) return html``;
        return html`
            <div class="backdrop" @click=${(e) => e.target === e.currentTarget && this._close()}>
                <div class="dlg">
                    <div class="h">
                        <div>Edit the card</div>
                        <button class="btn" @click=${this._close}>Close</button>
                    </div>
                    <div class="note">
                        If the editor does not open automatically, use one of these options.
                    </div>
                    <ul>
                        <li>Open the card editor from the UI and update settings.</li>
                        <li>If you are in YAML mode, paste the copied config into the card.</li>
                        <li>Save changes and refresh the dashboard if needed.</li>
                    </ul>
                    <div class="actions">
                        <button class="btn" @click=${this._openEditor}>Try open editor</button>
                        <button class="btn" @click=${this._copyConfig}>Copy config</button>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-editor-guide-dialog', FbEditorGuideDialog);
