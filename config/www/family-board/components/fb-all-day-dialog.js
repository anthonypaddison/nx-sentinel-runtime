/* Family Board - all-day overflow dialog
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import {
    pad2,
    formatWeekdayLongDayMonthShort,
    formatTimeRange,
} from '../family-board.util.js';
import { sharedViewStyles } from '../views/shared.styles.js';

export class FbAllDayDialog extends LitElement {
    static properties = {
        open: { type: Boolean },
        day: { type: Object },
        events: { type: Array },
        title: { type: String },
        card: { type: Object },
    };

    static styles = [
        sharedViewStyles,
        css`
        :host {
            display: block;
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
            max-width: 520px;
            background: var(--fb-surface);
            border-radius: 12px;
            border: 1px solid var(--fb-border);
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .h {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-weight: 700;
        }
        .list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .row {
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            padding: 10px 12px;
            background: var(--fb-surface-2);
            cursor: pointer;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .title {
            font-weight: 700;
        }
        .meta {
            font-size: 13px;
            color: var(--fb-muted);
        }
        .btn {
            --fb-btn-padding: 8px 12px;
            --fb-btn-radius: 10px;
        }
    `,
    ];

    _close() {
        this.dispatchEvent(new CustomEvent('fb-all-day-close', { bubbles: true, composed: true }));
    }

    _openEvent(e) {
        if (!e) return;
        const entityId = e._fbEntityId;
        if (!entityId) return;
        this.card?._openEventDialog(entityId, e);
        this._close();
    }

    _timeRange(e) {
        if (!e) return '';
        const start = e._start || e.start;
        const end = e._end || e.end;
        return formatTimeRange(start, end, Boolean(e.all_day || e.allDay));
    }

    render() {
        if (!this.open) return html``;
        const events = Array.isArray(this.events) ? this.events : [];
        const dayLabel = this.day ? formatWeekdayLongDayMonthShort(this.day) : 'All day';
        const title = this.title || 'All-day events';

        return html`
            <div class="backdrop" @click=${(e) => e.target === e.currentTarget && this._close()}>
                <div class="dlg">
                    <div class="h">
                        <div>${title} - ${dayLabel}</div>
                        <button class="btn secondary" @click=${this._close}>Close</button>
                    </div>
                    <div class="list">
                        ${events.length
                            ? events.map(
                                  (e) => html`
                                      <div
                                          class="row"
                                          style="border-color:${e._fbColour || 'var(--fb-border)'};border-left-width:6px"
                                          @click=${() => this._openEvent(e)}
                                      >
                                          <div class="title">${e.summary || '(Untitled)'}</div>
                                          <div class="meta">
                                              ${this._timeRange(e)}
                                              ${e.location ? html` - ${e.location}` : ''}
                                          </div>
                                      </div>
                                  `
                              )
                            : html`<div class="meta">No events.</div>`}
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-all-day-dialog', FbAllDayDialog);
