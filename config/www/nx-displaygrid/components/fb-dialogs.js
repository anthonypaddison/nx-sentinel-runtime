/* nx-displaygrid - simple dialogs
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { pad2, parseDateOnly } from '../nx-displaygrid.util.js';
import {
    createDialogDraftState,
    shouldHydrateDraftField,
} from '../util/dialog-draft.util.js';
import { sharedViewStyles } from '../views/shared.styles.js';
import { CALENDAR_FEATURES } from '../services/calendar.service.js';
import '../ui/icon-picker.js';

export class FbDialogs extends LitElement {
    static properties = {
        card: { type: Object },
        open: { type: Boolean },
        mode: { type: String }, // calendar | todo | shopping | home-control
        title: { type: String },
        entityId: { type: String },
        item: { type: Object },
        startValue: { type: String },
        endValue: { type: String },
        calendars: { type: Array },
        todos: { type: Array },
        shopping: { type: Object },
        canAddHomeControl: { type: Boolean },
        _selectedCalendar: { state: true },
        _selectedEntity: { state: true },
        _todoEntityValue: { state: true },
        _emoji: { state: true },
        _emojiOpen: { state: true },
        _textValue: { state: true },
        _todoDueValue: { state: true },
        _todoRepeatValue: { state: true },
    };

    static styles = [
        sharedViewStyles,
        css`
        :host {
            --fb-btn-bg: var(--fb-surface-2);
            --fb-btn-border: var(--fb-grid);
            --fb-btn-border-width: 1px;
            --fb-btn-radius: 10px;
            --fb-btn-padding: 10px 12px;
            --fb-btn-min-height: var(--fb-touch);
            --fb-btn-min-width: var(--fb-touch);
        }
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
        .row {
            display: grid;
            gap: 8px;
            margin-top: 10px;
        }
        .inlineRow {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        label {
            font-size: 14px;
            color: var(--fb-muted);
        }
        input,
        select {
            padding: 10px 12px;
            border-radius: 10px;
            border: 1px solid var(--fb-grid);
            font-size: 16px;
            background: var(--fb-surface);
            color: var(--fb-text);
            font-family: inherit;
        }
        .actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 14px;
        }
        .h {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-weight: 700;
        }
    `,
    ];

    close() {
        this.open = false;
        this.mode = '';
        this._emojiOpen = false;
        const draft = createDialogDraftState();
        this._emoji = draft.emoji;
        this._textValue = draft.textValue;
        this._selectedEntity = '';
        this._todoEntityValue = draft.todoEntityValue;
        this._todoDueValue = draft.todoDueValue;
        this._todoRepeatValue = draft.todoRepeatValue;
        this.requestUpdate();
        this.dispatchEvent(new CustomEvent('fb-dialog-close', { bubbles: true, composed: true }));
    }

    updated(changed) {
        if (changed.has('entityId') || changed.has('mode')) {
            if (this.mode === 'todo' || this.mode === 'todo-edit') {
                this._todoEntityValue = this.entityId || '';
            }
        }
        if (changed.has('open') && !this.open) {
            const draft = createDialogDraftState();
            this._todoEntityValue = draft.todoEntityValue;
            this._textValue = draft.textValue;
            this._emoji = draft.emoji;
            this._todoDueValue = draft.todoDueValue;
            this._todoRepeatValue = draft.todoRepeatValue;
        }
    }

    _emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
        this.close();
    }

    _notifyModeChange(mode) {
        this.dispatchEvent(
            new CustomEvent('fb-dialog-mode', { detail: { mode }, bubbles: true, composed: true })
        );
    }

    _todayLocalDateTimeInputValue() {
        const d = new Date();
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
            d.getHours()
        )}:${pad2(d.getMinutes())}`;
    }

    _defaultEndValue(startValue) {
        const minutes = Number(this.card?._defaultEventMinutes || 30);
        const start = startValue ? new Date(startValue) : new Date();
        if (Number.isNaN(start.getTime())) return this._todayLocalDateTimeInputValue();
        start.setMinutes(start.getMinutes() + minutes);
        return `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-${pad2(
            start.getDate()
        )}T${pad2(start.getHours())}:${pad2(start.getMinutes())}`;
    }

    _syncEndTime(e) {
        const startValue = e?.target?.value;
        const endInput = this.renderRoot.querySelector('#end');
        if (!endInput) return;
        endInput.value = this._defaultEndValue(startValue);
    }

    _extractEmoji(text) {
        const match = String(text || '').match(/^(\p{Extended_Pictographic})\s+/u);
        if (!match) return { emoji: '', text: String(text || '') };
        return { emoji: match[1], text: String(text || '').slice(match[0].length) };
    }

    _composeText(text) {
        const trimmed = String(text || '').trim();
        if (!this._emoji) return trimmed;
        return `${this._emoji} ${trimmed}`.trim();
    }

    _formatDateValue(value) {
        if (!value) return '';
        const date = parseDateOnly(value) || new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const yyyy = date.getFullYear();
        const mm = pad2(date.getMonth() + 1);
        const dd = pad2(date.getDate());
        return `${yyyy}-${mm}-${dd}`;
    }

    render() {
        if (!this.open) return html``;

        const mode = this.mode;
        const calendars = Array.isArray(this.calendars) ? this.calendars : [];
        const todos = Array.isArray(this.todos) ? this.todos : [];
        const entityIds = Object.keys(this.card?._hass?.states || {}).sort();
        if (!this._selectedCalendar && calendars.length) {
            this._selectedCalendar = calendars[0].entity;
        }
        if (!this._selectedEntity && entityIds.length) {
            this._selectedEntity = entityIds[0];
        }
        const calendarCounts = new Map();
        calendars.forEach((c) => {
            const person =
                this.card?._personForEntity?.(c.entity) ||
                this.card?._peopleById?.get?.(c.person_id || c.personId || c.person) ||
                null;
            const id = person?.id || c.person_id || c.personId || c.person || '';
            if (!id) return;
            calendarCounts.set(id, (calendarCounts.get(id) || 0) + 1);
        });
        const calendarLabel = (c) => {
            const person =
                this.card?._personForEntity?.(c.entity) ||
                this.card?._peopleById?.get?.(c.person_id || c.personId || c.person) ||
                null;
            const personName = person?.name || person?.id || '';
            const id = person?.id || c.person_id || c.personId || c.person || '';
            const calendarName = c.name || c.entity;
            if (!personName) return calendarName;
            if (calendarCounts.get(id) > 1) return `${personName} - ${calendarName}`;
            return personName;
        };
        const canCreate = this.card?._calendarSupports?.(
            this._selectedCalendar,
            CALENDAR_FEATURES.CREATE
        );

        if (mode === 'todo-edit' && this.item) {
            const current = this.item.summary ?? this.item.name ?? this.item.item ?? '';
            const parsed = this._extractEmoji(current);
            if (shouldHydrateDraftField(this._textValue)) this._textValue = parsed.text;
            if (shouldHydrateDraftField(this._emoji)) this._emoji = parsed.emoji;
            if (shouldHydrateDraftField(this._todoDueValue)) {
                const due = this.item.due || this.item.due_date || this.item.due_datetime;
                const dueValue = due?.date || due?.dateTime || due || '';
                this._todoDueValue = this._formatDateValue(dueValue);
            }
            if (shouldHydrateDraftField(this._todoRepeatValue)) {
                const repeat = this.card?._getTodoRepeat?.(this.entityId, this.item) || '';
                this._todoRepeatValue = repeat;
            }
        }

        if (mode === 'shopping-edit' && this.item) {
            const current = this.item.summary ?? this.item.name ?? this.item.item ?? '';
            const parsed = this._extractEmoji(current);
            if (shouldHydrateDraftField(this._textValue)) this._textValue = parsed.text;
            if (shouldHydrateDraftField(this._emoji)) this._emoji = parsed.emoji;
        }

        const startValue = this.startValue || this._todayLocalDateTimeInputValue();
        const endValue = this.endValue || this._defaultEndValue(startValue);
        const isAddMode = ['calendar', 'todo', 'shopping', 'home-control'].includes(mode);
        const addOptions = [
            { value: 'calendar', label: 'Event' },
            { value: 'todo', label: 'Chore' },
            { value: 'shopping', label: 'Shopping' },
        ];
        if (this.canAddHomeControl) {
            addOptions.push({ value: 'home-control', label: 'Home control' });
        }

        return html`
            <div class="backdrop" @click=${(e) => e.target === e.currentTarget && this.close()}>
                <div class="dlg">
                    <div class="h">
                        <div>${this.title || 'Add'}</div>
                        <button class="btn secondary" @click=${this.close}>Close</button>
                    </div>
                    ${isAddMode
                        ? html`
                              <div class="row">
                                  <label>Add type</label>
                                  <select
                                      .value=${mode}
                                      @change=${(e) => this._notifyModeChange(e.target.value)}
                                  >
                                      ${addOptions.map(
                                          (opt) =>
                                              html`<option value=${opt.value}>
                                                  ${opt.label}
                                              </option>`
                                      )}
                                  </select>
                              </div>
                          `
                        : html``}

                    ${mode === 'calendar'
                        ? html`
                              <div class="row">
                                  <label>Calendar</label>
                                  <select
                                      id="cal"
                                      @change=${(e) => (this._selectedCalendar = e.target.value)}
                                  >
                                      ${calendars.map(
                                          (c) =>
                                              html`<option value=${c.entity}>
                                                  ${calendarLabel(c)}
                                              </option>`
                                      )}
                                  </select>
                              </div>

                              <div class="row">
                                  <label>Title</label>
                                  <input id="summary" placeholder="e.g. School run" />
                              </div>

                              <div class="row">
                                  <label>Start</label>
                                  <input
                                      id="start"
                                      type="datetime-local"
                                      .value=${startValue}
                                      @change=${this._syncEndTime}
                                  />
                              </div>

                              <div class="row">
                                  <label>End</label>
                                  <input
                                      id="end"
                                      type="datetime-local"
                                      .value=${endValue}
                                  />
                              </div>

                              <div class="actions">
                                  <button class="btn secondary" @click=${this.close}>
                                      Cancel
                                  </button>
                                  <button
                                      class="btn primary"
                                      ?disabled=${!canCreate}
                                      @click=${() => {
                                          const cal = this.renderRoot.querySelector('#cal')?.value;
                                          const summary = this.renderRoot
                                              .querySelector('#summary')
                                              ?.value?.trim();
                                          const start =
                                              this.renderRoot.querySelector('#start')?.value;
                                          const end = this.renderRoot.querySelector('#end')?.value;
                                          this._emit('fb-add-calendar', {
                                              entityId: cal,
                                              summary,
                                              start: start ? new Date(start) : null,
                                              end: end ? new Date(end) : null,
                                          });
                                      }}
                                  >
                                      Add
                                  </button>
                              </div>
                              ${calendars.length && !canCreate
                                  ? html`<div class="row">
                                        <span style="color:var(--fb-muted);font-size:12px"
                                            >This calendar entity does not support creating
                                            events in Home Assistant.</span
                                        >
                                    </div>`
                                  : html``}
                          `
                        : html``}
                    ${mode === 'home-control'
                        ? html`
                              <div class="row">
                                  <label>Entity</label>
                                  <select
                                      id="home-entity"
                                      @change=${(e) => (this._selectedEntity = e.target.value)}
                                  >
                                      ${entityIds.map(
                                          (id) => html`<option value=${id}>${id}</option>`
                                      )}
                                  </select>
                              </div>

                              <div class="actions">
                                  <button class="btn secondary" @click=${this.close}>
                                      Cancel
                                  </button>
                                  <button
                                      class="btn primary"
                                      ?disabled=${!entityIds.length}
                                      @click=${() => {
                                          const entityId =
                                              this.renderRoot.querySelector('#home-entity')?.value;
                                          if (!entityId) return;
                                          this._emit('fb-add-home-control', { entityId });
                                      }}
                                  >
                                      Add
                                  </button>
                              </div>
                          `
                        : html``}
                    ${mode === 'todo' || mode === 'todo-edit'
                        ? (() => {
                              const dueValue = this._todoDueValue || '';
                              const repeatValue = this._todoRepeatValue || '';
                              const canSubmit = (textValue) =>
                                  Boolean(textValue) && (!repeatValue || dueValue);
                              return html`
                              <div class="row">
                                  <label>Person</label>
                                  <select
                                      id="todoEntity"
                                      .value=${this._todoEntityValue || ''}
                                      @change=${(e) => (this._todoEntityValue = e.target.value)}
                                  >
                                      ${!this._todoEntityValue
                                          ? html`<option value="">Select a list</option>`
                                          : html``}
                                      ${todos.map(
                                          (t) =>
                                              html`<option value=${t.entity}>
                                                  ${t.name || t.entity}
                                              </option>`
                                      )}
                                  </select>
                              </div>

                              <div class="row">
                                  <label>Todo</label>
                                  <div style="display:flex;gap:8px;align-items:center">
                                      <button
                                          class="btn secondary"
                                          @click=${() => (this._emojiOpen = !this._emojiOpen)}
                                          title="Pick icon"
                                      >
                                          ${this._emoji || '😊'}
                                      </button>
                                      <input
                                          id="todoText"
                                          placeholder="e.g. Book dentist"
                                          .value=${this._textValue || ''}
                                          @input=${(e) => (this._textValue = e.target.value)}
                                      />
                                      <fb-icon-picker
                                          .open=${this._emojiOpen}
                                          @fb-emoji=${(e) => {
                                              this._emoji = e.detail.emoji;
                                              this._emojiOpen = false;
                                          }}
                                      ></fb-icon-picker>
                                  </div>
                              </div>
                              <div class="row">
                                  <label>Due date</label>
                                  <div class="inlineRow">
                                      <input
                                          id="todoDue"
                                          type="date"
                                          .value=${this._todoDueValue || ''}
                                          inputmode="none"
                                          @change=${(e) =>
                                              (this._todoDueValue = e.target.value)}
                                          @beforeinput=${(e) => e.preventDefault()}
                                          @input=${(e) => {
                                              e.preventDefault();
                                              e.target.value = this._todoDueValue || '';
                                          }}
                                          @keydown=${(e) => e.preventDefault()}
                                          @click=${(e) => {
                                              const input = e.currentTarget;
                                              if (input?.showPicker) input.showPicker();
                                          }}
                                      />
                                      <button
                                          class="btn icon"
                                          title="Pick date"
                                          @click=${() => {
                                              const input =
                                                  this.renderRoot.querySelector('#todoDue');
                                              if (input?.showPicker) input.showPicker();
                                          }}
                                      >
                                          <ha-icon icon="mdi:calendar-month-outline"></ha-icon>
                                      </button>
                                  </div>
                              </div>
                              <div class="row">
                                  <label>Repeat</label>
                                  <select
                                      id="todoRepeat"
                                      .value=${this._todoRepeatValue || ''}
                                      @change=${(e) => (this._todoRepeatValue = e.target.value)}
                                  >
                                      <option value="">No repeat</option>
                                      <option value="daily">Daily</option>
                                      <option value="weekly">Weekly</option>
                                      <option value="biweekly">Every 2 weeks</option>
                                      <option value="monthly">Monthly</option>
                                  </select>
                              </div>

                              <div class="actions">
                                  <button class="btn secondary" @click=${this.close}>
                                      Cancel
                                  </button>
                                  <button
                                      class="btn primary"
                                      ?disabled=${!canSubmit(this._textValue)}
                                      @click=${() => {
                                          const entityId =
                                              this._todoEntityValue ||
                                              this.renderRoot.querySelector('#todoEntity')?.value;
                                          const text = this._composeText(this._textValue);
                                          const dueDate =
                                              this._todoDueValue ||
                                              this.renderRoot.querySelector('#todoDue')?.value ||
                                              '';
                                          const repeat =
                                              this._todoRepeatValue ||
                                              this.renderRoot.querySelector('#todoRepeat')?.value ||
                                              '';
                                          if (!text) return;
                                          if (repeat && !dueDate) return;
                                          if (mode === 'todo-edit') {
                                              this._emit('fb-edit-todo', {
                                                  entityId,
                                                  item: this.item,
                                                  text,
                                                  dueDate,
                                                  repeat,
                                              });
                                          } else {
                                              this._emit('fb-add-todo', {
                                                  entityId,
                                                  text,
                                                  dueDate,
                                                  repeat,
                                              });
                                          }
                                      }}
                                  >
                                      ${mode === 'todo-edit' ? 'Save' : 'Add'}
                                  </button>
                              </div>
                          `;
                          })()
                        : html``}
                    ${mode === 'shopping' || mode === 'shopping-edit'
                        ? html`
                              <div class="row">
                                  <label>Item</label>
                                  <div style="display:flex;gap:8px;align-items:center">
                                      <button
                                          class="btn secondary"
                                          @click=${() => (this._emojiOpen = !this._emojiOpen)}
                                          title="Pick icon"
                                      >
                                          ${this._emoji || '🛒'}
                                      </button>
                                      <input
                                          id="shopText"
                                          placeholder="e.g. Milk"
                                          .value=${this._textValue || ''}
                                          @input=${(e) => (this._textValue = e.target.value)}
                                      />
                                      <fb-icon-picker
                                          .open=${this._emojiOpen}
                                          @fb-emoji=${(e) => {
                                              this._emoji = e.detail.emoji;
                                              this._emojiOpen = false;
                                          }}
                                      ></fb-icon-picker>
                                  </div>
                              </div>

                              <div class="actions">
                                  <button class="btn secondary" @click=${this.close}>
                                      Cancel
                                  </button>
                                  <button
                                      class="btn primary"
                                      @click=${() => {
                                          const text = this._composeText(this._textValue);
                                          if (!text) return;
                                          if (mode === 'shopping-edit') {
                                              this._emit('fb-edit-shopping', {
                                                  item: this.item,
                                                  text,
                                              });
                                          } else {
                                              this._emit('fb-add-shopping', { text });
                                          }
                                      }}
                                  >
                                      ${mode === 'shopping-edit' ? 'Save' : 'Add'}
                                  </button>
                              </div>
                          `
                        : html``}
                </div>
            </div>
        `;
    }
}

customElements.define('fb-dialogs', FbDialogs);
