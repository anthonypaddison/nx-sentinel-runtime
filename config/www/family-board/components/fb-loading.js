/* Family Board - loading indicator
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
import { loadingStyles } from '../views/loading.styles.js';
const { LitElement, html, css } = getHaLit();

export class FbLoading extends LitElement {
    static properties = {
        label: { type: String },
    };

    static styles = [
        loadingStyles,
        css`
            :host {
                display: inline-block;
            }
        `,
    ];

    render() {
        return html`
            <div class="loadingState">
                <span class="spinner" aria-hidden="true"></span>
                <span>${this.label || 'Loading...'}</span>
            </div>
        `;
    }
}

customElements.define('fb-loading', FbLoading);
