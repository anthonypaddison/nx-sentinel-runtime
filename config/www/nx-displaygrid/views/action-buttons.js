/* nx-displaygrid - action button helpers
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { html } = getHaLit();

export function renderActionButtons(actions, { wrapperClass = 'actions' } = {}) {
    const list = Array.isArray(actions) ? actions.filter(Boolean) : [];
    if (!list.length) return html``;
    return html`
        <div class=${wrapperClass}>
            ${list.map((action) => renderActionButton(action))}
        </div>
    `;
}

function renderActionButton(action) {
    const { className = '', title = '', onClick, label = '', icon = '' } = action || {};
    const content = icon ? html`<ha-icon icon=${icon}></ha-icon>` : label;
    return html`
        <button class=${className} title=${title || ''} @click=${onClick}>${content}</button>
    `;
}
