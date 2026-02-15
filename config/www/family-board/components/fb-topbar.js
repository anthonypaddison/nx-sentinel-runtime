/* Family Board - top bar
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();
import { sharedViewStyles } from '../views/shared.styles.js';

export class FbTopbar extends LitElement {
    static properties = {
        title: { type: String },
        screen: { type: String }, // schedule | important | chores | shopping | home | settings
        mainMode: { type: String }, // schedule | month
        summary: { type: Array }, // [{name, color, eventsLeft, todosLeft}]
        shoppingCount: { type: Number },
        binIndicators: { type: Object },
        dateLabel: { type: String },
        dateValue: { type: String },
        activeFilters: { type: Array },
        isAdmin: { type: Boolean },
        syncing: { type: Boolean },
        calendarStale: { type: Boolean },
        calendarError: { type: Boolean },
        calendarInFlight: { type: Boolean },
        todoRetrying: { type: Boolean },
        todoStale: { type: Boolean },
        todoError: { type: Boolean },
        shoppingRetrying: { type: Boolean },
        shoppingStale: { type: Boolean },
        shoppingError: { type: Boolean },
        idbFailed: { type: Boolean },
        idbError: { type: String },
        _timeLabel: { state: true },
        _menuOpen: { state: true },
    };

    static styles = [
        sharedViewStyles,
        css`
        :host {
            display: block;
            padding: var(--fb-gutter);
            background: var(--fb-surface);
            border-radius: 10px;
        }

        .toprow {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }

        .titleWrap {
            display: flex;
            align-items: center;
            gap: 10px;
            justify-self: start;
        }
        .binIndicators {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .binIcon {
            width: 28px;
            height: 28px;
            border-radius: 999px;
            display: grid;
            place-items: center;
            border: 2px solid var(--bin-colour);
            color: var(--bin-colour);
            background: var(--fb-surface);
            line-height: 0;
        }
        .binIcon.tomorrow {
            opacity: 0.6;
        }
        .binIcon ha-icon {
            width: 16px;
            height: 16px;
            display: grid;
            place-items: center;
            margin: 0;
            --mdc-icon-size: 16px;
        }
        .binIcon ha-svg-icon,
        .binIcon ha-svg-icon svg {
            width: 16px;
            height: 16px;
            display: block;
            margin: 0 auto;
        }

        .time {
            font-size: 24px;
            font-weight: 800;
            color: var(--fb-text);
            font-variant-numeric: tabular-nums;
        }

        .subtabs {
            display: inline-flex;
            gap: 6px;
            align-items: center;
            padding: 4px;
            border-radius: 999px;
            background: var(--fb-surface-2);
            border: 1px solid var(--fb-border);
        }

        .pill {
            --fb-btn-bg: transparent;
            --fb-btn-border-width: 0;
            --fb-btn-radius: 999px;
            --fb-btn-padding: 6px 12px;
            --fb-btn-font-size: 13px;
            --fb-btn-min-height: 36px;
            --fb-btn-min-width: 36px;
        }

        .pill.active {
            --fb-btn-bg: var(--fb-surface);
            --fb-btn-border-width: 0;
            color: var(--fb-text);
            box-shadow: var(--shadow-sm);
        }

        .dateNav {
            display: inline-flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
            margin-left: auto;
            justify-content: flex-end;
        }

        .dateLabel {
            font-weight: 700;
            font-size: 14px;
            color: var(--fb-text);
            white-space: nowrap;
        }

        .navGroup {
            display: inline-flex;
            border: 1px solid var(--fb-border);
            border-radius: 8px;
            overflow: hidden;
            background: var(--fb-surface);
        }
        .navBtn {
            --fb-btn-bg: transparent;
            --fb-btn-border-width: 0;
            --fb-btn-padding: 0 10px;
            --fb-btn-font-size: 16px;
            --fb-btn-min-height: 40px;
            --fb-btn-min-width: 40px;
            --fb-btn-radius: 0;
            display: grid;
            place-items: center;
        }
        .navBtn.prev {
            border-top-left-radius: 999px;
            border-bottom-left-radius: 999px;
            font-size: 18px;
            font-weight: 800;
        }
        .navBtn.next {
            border-top-right-radius: 999px;
            border-bottom-right-radius: 999px;
            font-size: 18px;
            font-weight: 800;
        }
        .navBtn + .navBtn {
            border-left: 1px solid var(--fb-border);
        }
        .navBtn.center {
            --fb-btn-bg: var(--fb-surface);
            font-weight: 700;
        }

        .settingsBtn {
            --fb-btn-bg: var(--fb-surface);
            --fb-btn-border: var(--fb-border);
            --fb-btn-border-width: 1px;
            --fb-btn-radius: 999px;
            --fb-btn-padding: 0 8px;
            --fb-btn-font-size: 13px;
            --fb-btn-min-height: 40px;
            --fb-btn-min-width: 40px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .menuBtn {
            --fb-btn-padding: 0;
            --fb-btn-font-size: 18px;
            --fb-btn-min-height: 40px;
            --fb-btn-min-width: 40px;
            display: grid;
            place-items: center;
        }
        .actionInline {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-left: auto;
        }
        .addBtn {
            --fb-btn-bg: var(--fb-surface);
            --fb-btn-border: var(--fb-border);
            --fb-btn-border-width: 1px;
            --fb-btn-radius: 999px;
            --fb-btn-padding: 0;
            --fb-btn-font-size: 22px;
            --fb-btn-min-height: 40px;
            --fb-btn-min-width: 40px;
            font-weight: 700;
            justify-content: center;
        }
        .menuWrap {
            position: relative;
            display: inline-flex;
            align-items: center;
        }
        .menu {
            position: absolute;
            top: calc(100% + 6px);
            right: 0;
            min-width: 160px;
            background: var(--fb-surface);
            border: 1px solid var(--fb-border);
            border-radius: 10px;
            box-shadow: var(--fb-shadow);
            padding: 6px;
            z-index: 10;
            display: grid;
            gap: 4px;
        }
        .menuItem {
            --fb-btn-bg: transparent;
            --fb-btn-border-width: 0;
            --fb-btn-radius: 8px;
            --fb-btn-padding: 8px 10px;
            --fb-btn-font-size: 13px;
            text-align: left;
        }
        .menuItem:hover {
            --fb-btn-bg: var(--fb-surface-2);
        }
        .menuItem[disabled] {
            opacity: 0.6;
            cursor: default;
        }
        .statusChip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border: 1px solid var(--fb-border);
            border-radius: 999px;
            padding: 6px 10px;
            background: var(--fb-surface-2);
            color: var(--fb-muted);
            font-size: 12px;
            margin-left: 8px;
            white-space: nowrap;
        }
        .statusNote {
            font-size: 12px;
            color: var(--fb-muted);
            margin-left: 8px;
        }
        .shoppingChip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border: 1px solid var(--fb-border);
            border-radius: 999px;
            padding: 0 14px;
            background: var(--fb-surface-2);
            color: var(--fb-text);
            font-weight: 700;
            height: 40px;
            min-width: 76px;
        }
        .shoppingChip ha-icon {
            width: 18px;
            height: 18px;
        }
        .statusBtn {
            --fb-btn-bg: transparent;
            --fb-btn-border-width: 0;
            --fb-btn-padding: 0;
            font-weight: 700;
        }
        .statusBtn[disabled] {
            opacity: 0.6;
            cursor: default;
        }

        .summaryRow {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 8px;
            padding: 12px 0 0;
        }
        .summaryRow.compact {
            padding-top: 4px;
        }

        .summaryBadge {
            display: flex;
            align-items: center;
            gap: 8px;
            border: 2px solid var(--person-colour);
            border-radius: 12px;
            padding: 6px 10px;
            background: var(--fb-surface-3);
            font-size: 13px;
            width: 100%;
            cursor: pointer;
            min-height: 44px;
            color: var(--fb-text);
            line-height: 1;
        }

        .summaryBadge:not(.active) {
            background: var(--fb-surface-3);
            filter: grayscale(1);
            opacity: 0.7;
        }

        .dot {
            width: 12px;
            height: 12px;
            border-radius: 999px;
            display: inline-block;
        }
        .summaryName {
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            line-height: 1;
        }

        .roleIcon {
            width: 16px;
            height: 16px;
            color: var(--fb-muted);
            display: grid;
            place-items: center;
            transform: translateY(-2px);
        }

        .summaryCounts {
            margin-left: auto;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-variant-numeric: tabular-nums;
        }
        .roleBadge {
            border: 1px solid var(--fb-border);
            border-radius: 999px;
            padding: 2px 6px;
            font-size: 10px;
            font-weight: 700;
            color: var(--fb-muted);
            background: var(--fb-surface);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        .summaryMetric {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
            line-height: 1;
            min-width: 26px;
        }

        .summaryMetric ha-icon {
            width: 16px;
            height: 16px;
            color: var(--fb-muted);
            display: grid;
            place-items: center;
            transform: translateY(-2px);
        }

        .summaryMetric span {
            display: inline-flex;
            align-items: center;
            line-height: 1;
            padding-left: 2px;
            transform: translateY(-1px);
        }

        @media (max-width: 900px) {
            .summaryRow {
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 8px;
            }
        }

        @media (max-width: 600px) {
            .summaryRow {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }
    `,
    ];

    connectedCallback() {
        super.connectedCallback();
        this._updateTime();
        if (!this._timeTimer) {
            this._timeTimer = setInterval(() => this._updateTime(), 60_000);
        }
        if (!this._docClickHandler) {
            this._docClickHandler = (e) => {
                if (!this._menuOpen) return;
                if (e.composedPath().includes(this)) return;
                this._menuOpen = false;
            };
            document.addEventListener('click', this._docClickHandler);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._timeTimer) {
            clearInterval(this._timeTimer);
            this._timeTimer = null;
        }
        if (this._docClickHandler) {
            document.removeEventListener('click', this._docClickHandler);
            this._docClickHandler = null;
        }
    }

    _updateTime() {
        const now = new Date();
        this._timeLabel = now.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    _setMainMode(mode) {
        this.dispatchEvent(
            new CustomEvent('fb-main-mode', {
                detail: { mode },
                bubbles: true,
                composed: true,
            })
        );
    }

    _nav(delta) {
        this.dispatchEvent(
            new CustomEvent('fb-date-nav', {
                detail: { delta },
                bubbles: true,
                composed: true,
            })
        );
    }

    _today() {
        this.dispatchEvent(
            new CustomEvent('fb-date-today', {
                bubbles: true,
                composed: true,
            })
        );
    }

    _syncCalendars() {
        if (this.syncing) return;
        this.dispatchEvent(
            new CustomEvent('fb-sync-calendars', {
                bubbles: true,
                composed: true,
            })
        );
    }

    _addAction() {
        this.dispatchEvent(new CustomEvent('fb-add', { bubbles: true, composed: true }));
    }

    _tryAgain() {
        this.dispatchEvent(
            new CustomEvent('fb-calendar-try-again', {
                bubbles: true,
                composed: true,
            })
        );
    }

    _openSources() {
        this.dispatchEvent(
            new CustomEvent('fb-open-sources', {
                bubbles: true,
                composed: true,
            })
        );
    }

    _togglePerson(id) {
        this.dispatchEvent(
            new CustomEvent('fb-person-toggle', {
                detail: { id },
                bubbles: true,
                composed: true,
            })
        );
    }

    _setDate(e) {
        const value = e.target.value;
        if (!value) return;
        this.dispatchEvent(
            new CustomEvent('fb-date-set', {
                detail: { value },
                bubbles: true,
                composed: true,
            })
        );
    }

    _openDatePicker(e) {
        const input = e.currentTarget;
        if (input && typeof input.showPicker === 'function') {
            input.showPicker();
        }
    }

    _toggleMenu(e) {
        e?.stopPropagation?.();
        this._menuOpen = !this._menuOpen;
    }

    _closeMenu() {
        this._menuOpen = false;
    }

    _blockDateInput(e) {
        e.preventDefault();
    }

    render() {
        const screen = this.screen || 'schedule';
        const mainMode = this.mainMode || 'schedule';
        const summary = Array.isArray(this.summary) ? this.summary : [];
        const activeFilters = Array.isArray(this.activeFilters) ? this.activeFilters : [];
        const statusChips = [];
        const statusNotes = [];
        const showTodoStatus = ['schedule', 'important', 'chores'].includes(screen);
        const showShoppingStatus = ['schedule', 'important', 'shopping'].includes(screen);

        if (showTodoStatus) {
            if (this.todoError) statusChips.push('Chores failed');
            else if (this.todoRetrying) statusChips.push('Chores retrying…');
            else if (this.todoStale) statusChips.push('Chores stale');
            if (this.todoError || this.todoStale || this.todoRetrying) {
                statusNotes.push('Chores are showing cached data while retrying.');
            }
        }
        if (showShoppingStatus) {
            if (this.shoppingError) statusChips.push('Shopping failed');
            else if (this.shoppingRetrying) statusChips.push('Shopping retrying…');
            else if (this.shoppingStale) statusChips.push('Shopping stale');
            if (this.shoppingError || this.shoppingStale || this.shoppingRetrying) {
                statusNotes.push('Shopping is showing cached data while retrying.');
            }
        }
        if (this.idbFailed) {
            statusChips.push('Cache fallback');
            statusNotes.push(this.idbError || 'IndexedDB unavailable; using local storage.');
        }

        const statusExtras = statusChips.map(
            (label) => html`<div class="statusChip">${label}</div>`
        );
        const statusNoteText = statusNotes.filter(Boolean).join(' ');
        const statusNote = statusNoteText
            ? html`<div class="statusNote">${statusNoteText}</div>`
            : html``;
        const addButton = html`
            <button class="btn settingsBtn addBtn" title="Add" @click=${this._addAction}>
                +
            </button>
        `;
        const shoppingCount = Number.isFinite(this.shoppingCount)
            ? this.shoppingCount
            : Number(this.shoppingCount || 0);
        const shoppingChip = html`
            <div class="shoppingChip" title="Shopping items">
                <ha-icon icon="mdi:cart-outline"></ha-icon>
                <span>${shoppingCount}</span>
            </div>
        `;
        const binIndicators = this.binIndicators || {};
        const todayBins = Array.isArray(binIndicators.today) ? binIndicators.today : [];
        const tomorrowBins = Array.isArray(binIndicators.tomorrow)
            ? binIndicators.tomorrow
            : [];
        const binIcons = todayBins.length || tomorrowBins.length
            ? html`
                  <div class="binIndicators">
                      ${todayBins.map(
                          (bin) => html`
                              <span
                                  class="binIcon"
                                  style="--bin-colour:${bin.colour || '#999999'}"
                                  title="${bin.name || 'Bin'} - Today"
                              >
                                  <ha-icon icon=${bin.icon || 'mdi:trash-can'}></ha-icon>
                              </span>
                          `
                      )}
                      ${tomorrowBins.map(
                          (bin) => html`
                              <span
                                  class="binIcon tomorrow"
                                  style="--bin-colour:${bin.colour || '#999999'}"
                                  title="${bin.name || 'Bin'} - Tomorrow"
                              >
                                  <ha-icon icon=${bin.icon || 'mdi:trash-can'}></ha-icon>
                              </span>
                          `
                      )}
                  </div>
              `
            : html``;
        const menu = html`
            <div class="menuWrap" @click=${(e) => e.stopPropagation()}>
                <button
                    class="btn settingsBtn menuBtn"
                    title="Menu"
                    @click=${this._toggleMenu}
                >
                    <ha-icon icon="mdi:dots-vertical"></ha-icon>
                </button>
                ${this._menuOpen
                    ? html`
                          <div class="menu" @click=${(e) => e.stopPropagation()}>
                              <button
                                  class="btn menuItem"
                                  ?disabled=${this.syncing}
                                  @click=${() => {
                                      this._closeMenu();
                                      this._syncCalendars();
                                  }}
                              >
                                  ${this.syncing ? 'Syncing…' : 'Sync'}
                              </button>
                          </div>
                      `
                    : html``}
            </div>
        `;
        // Retry is only shown for hard failures without usable cached data.
        return html`
            <div class="toprow">
                <div class="titleWrap">
                    <div class="time">${this._timeLabel || ''}</div>
                    ${binIcons}
                </div>

                ${screen === 'schedule'
                    ? html`
                          <div class="subtabs" role="tablist" aria-label="Main view modes">
                              <button
                                  class="btn pill ${mainMode === 'schedule' ? 'active' : ''}"
                                  @click=${() => this._setMainMode('schedule')}
                              >
                                  Schedule
                              </button>
                              <button
                                  class="btn pill ${mainMode === 'month' ? 'active' : ''}"
                                  @click=${() => this._setMainMode('month')}
                              >
                                  Month
                              </button>
                          </div>
                      `
                    : html``}
                ${screen === 'schedule'
                    ? html`
                          <div class="dateNav" aria-label="Date navigation">
                              <div class="navGroup" role="group" aria-label="Date navigation">
                                  <button
                                      class="btn navBtn prev"
                                      title="Previous"
                                      @click=${() => this._nav(-1)}
                                  >
                                      <
                                  </button>
                                  <button class="btn navBtn center" @click=${this._today}>
                                      Today
                                  </button>
                                  <button
                                      class="btn navBtn next"
                                      title="Next"
                                      @click=${() => this._nav(1)}
                                  >
                                      >
                                  </button>
                              </div>
                              ${addButton}
                              ${menu}
                              ${this.calendarStale || this.calendarError
                                  ? html`
                                        <div class="statusChip">
                                            <span>
                                                ${this.calendarError
                                                    ? 'Calendar update failed.'
                                                    : 'Calendar updating… showing last saved.'}
                                            </span>
                                            ${this.calendarError
                                                ? html`
                                                      <button
                                                          class="btn statusBtn"
                                                          ?disabled=${this.calendarInFlight}
                                                          @click=${this._tryAgain}
                                                      >
                                                          Try again
                                                      </button>
                                                  `
                                                : html``}
                                        </div>
                                    `
                                  : html``}
                              ${statusExtras}
                              ${statusNote}
                          </div>
                      `
                    : screen === 'important'
                    ? html`<div class="actionInline">
                          ${shoppingChip}
                          ${addButton}
                          ${statusExtras}
                          ${statusNote}
                      </div>`
                    : html`<div class="actionInline">
                          ${addButton}
                          ${statusExtras}
                          ${statusNote}
                      </div>`}
            </div>

            ${['schedule', 'important', 'chores'].includes(screen) && summary.length
                ? (() => {
                      const row1 = summary.filter((p) => (p.header_row || 1) === 1).slice(0, 4);
                      const row2 = summary.filter((p) => (p.header_row || 1) === 2).slice(0, 4);
                      const rows = [row1, row2].filter((r) => r.length);
                      return html`
                          ${rows.map(
                              (row) => html`
                                  <div class="summaryRow ${screen === 'important' ? 'compact' : ''}">
                                      ${row.map(
                                          (p) => html`
                                          <button
                                              class="btn summaryBadge ${activeFilters.includes(p.id)
                                                  ? 'active'
                                                  : ''}"
                                              style="--person-colour:${p.color}"
                                          title="${p.name} - ${p.eventsLeft ?? 0} events today - ${p.todosLeft ?? 0} chores due"
                                          @click=${() => this._togglePerson(p.id)}
                                      >
                                          <span class="dot" style="background:${p.color}"></span>
                                          ${(() => {
                                              const role = String(p.role || '').toLowerCase();
                                              const icon =
                                                  role === 'kid'
                                                      ? 'mdi:human-child'
                                                      : role
                                                      ? 'mdi:human-male-female-child'
                                                      : '';
                                              return icon
                                                  ? html`<ha-icon class="roleIcon" icon=${icon}></ha-icon>`
                                                  : html``;
                                          })()}
                                          <span class="summaryName" style="flex:1">${p.name}</span>
                                          <span class="summaryCounts">
                                              <span class="summaryMetric">
                                                  <ha-icon icon="mdi:calendar-month-outline"></ha-icon>
                                                  <span>${p.eventsLeft ?? 0}</span>
                                              </span>
                                              <span class="summaryMetric">
                                                  <ha-icon icon="mdi:check-circle-outline"></ha-icon>
                                                  <span>${p.todosLeft ?? 0}</span>
                                              </span>
                                          </span>
                                      </button>
                                          `
                                      )}
                                  </div>
                              `
                          )}
                      `;
                  })()
                : html``}
        `;
    }
}

customElements.define('fb-topbar', FbTopbar);
