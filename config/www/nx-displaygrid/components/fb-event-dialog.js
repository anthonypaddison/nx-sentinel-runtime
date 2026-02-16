/* nx-displaygrid - event dialog
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { pad2 } from '../nx-displaygrid.util.js';
import { sharedViewStyles } from '../views/shared.styles.js';

export class FbEventDialog extends LitElement {
    static properties = {
        open: { type: Boolean },
        event: { type: Object },
        entityId: { type: String },
        supportsUpdate: { type: Boolean },
        supportsDelete: { type: Boolean },
        supportsCreate: { type: Boolean },
        _summary: { state: true },
        _start: { state: true },
        _end: { state: true },
        _allDay: { state: true },
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
        }
        .h {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-weight: 700;
        }
        .row {
            display: grid;
            gap: 8px;
            margin-top: 10px;
        }
        label {
            font-size: 14px;
            color: var(--fb-muted);
        }
        input {
            padding: 10px 12px;
            border-radius: 10px;
            border: 1px solid var(--fb-grid);
            font-size: 16px;
            background: var(--fb-surface);
            color: var(--fb-text);
        }
        .actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 14px;
        }
        .btn {
            --fb-btn-padding: 10px 12px;
            --fb-btn-radius: 10px;
        }
        .note {
            color: var(--fb-muted);
            font-size: 14px;
            margin-top: 8px;
        }
    `,
    ];

    willUpdate(changedProps) {
        if (changedProps.has('event') && this.event) {
            const ev = this.event;
            this._summary = ev.summary || '';
            this._allDay = Boolean(ev.all_day);
            this._start = this._toLocalInput(ev._start);
            this._end = this._toLocalInput(ev._end);
        }
    }

    _toLocalInput(d) {
        if (!d) return '';
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
            d.getHours()
        )}:${pad2(d.getMinutes())}`;
    }

    _close() {
        this.dispatchEvent(new CustomEvent('fb-event-close', { bubbles: true, composed: true }));
    }

    _update() {
        if (!this.event) return;
        this.dispatchEvent(
            new CustomEvent('fb-event-update', {
                detail: {
                    entityId: this.entityId,
                    event: this.event,
                    summary: this._summary,
                    start: this._start ? new Date(this._start) : this.event._start,
                    end: this._end ? new Date(this._end) : this.event._end,
                    allDay: this._allDay,
                },
                bubbles: true,
                composed: true,
            })
        );
        this._close();
    }

    _delete() {
        if (!this.event) return;
        this.dispatchEvent(
            new CustomEvent('fb-event-delete', {
                detail: { entityId: this.entityId, event: this.event },
                bubbles: true,
                composed: true,
            })
        );
        this._close();
    }

    _openProvider() {
        const url = this.event?.url || this.event?.htmlLink;
        if (!url) return;
        window.open(url, '_blank');
    }

    render() {
        if (!this.open || !this.event) return html``;
        const eventId = this.event?.uid || this.event?.id;
        const canUpdate = Boolean(this.supportsUpdate && eventId);
        const canDelete = Boolean(this.supportsDelete && eventId);
        const providerUrl = this.event?.url || this.event?.htmlLink;
        const showReadOnlyNote = !canUpdate || !canDelete;

        return html`
            <div class="backdrop" @click=${(e) => e.target === e.currentTarget && this._close()}>
                <div class="dlg">
                    <div class="h">
                        <div>Event</div>
                        <button class="btn secondary" @click=${this._close}>Close</button>
                    </div>

                    <div class="row">
                        <label>Title</label>
                        <input
                            .value=${this._summary || ''}
                            ?disabled=${!canUpdate}
                            @input=${(e) => (this._summary = e.target.value)}
                        />
                    </div>
                    <div class="row">
                        <label>Start</label>
                        <input
                            type="datetime-local"
                            .value=${this._start || ''}
                            ?disabled=${!canUpdate}
                            @input=${(e) => (this._start = e.target.value)}
                        />
                    </div>
                    <div class="row">
                        <label>End</label>
                        <input
                            type="datetime-local"
                            .value=${this._end || ''}
                            ?disabled=${!canUpdate}
                            @input=${(e) => (this._end = e.target.value)}
                        />
                    </div>

                    <div class="actions">
                        ${providerUrl
                            ? html`<button class="btn secondary" @click=${this._openProvider}>
                                  Open provider
                              </button>`
                            : html``}
                        ${canDelete
                            ? html`<button class="btn secondary" @click=${this._delete}>
                                  Delete
                              </button>`
                            : html``}
                        ${canUpdate
                            ? html`<button class="btn primary" @click=${this._update}>
                                  Save
                              </button>`
                            : html``}
                    </div>

                    ${showReadOnlyNote
                        ? html`<div class="note">
                              Edit/Delete not available for this calendar in Home Assistant
                              (read-only source).
                          </div>`
                        : html``}
                </div>
            </div>
        `;
    }
}

customElements.define('fb-event-dialog', FbEventDialog);
