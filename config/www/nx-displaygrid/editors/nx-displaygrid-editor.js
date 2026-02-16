/* nx-displaygrid - Lovelace card editor
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();
import { sharedViewStyles } from '../views/shared.styles.js';

import { fireEvent } from '../nx-displaygrid.util.js';

export class FamilyBoardEditor extends LitElement {
    static properties = {
        hass: { attribute: false },
        _config: { state: true },
    };

    static styles = [
        sharedViewStyles,
        css`
        :host {
            display: block;
            padding: 12px;
            --fb-btn-bg: var(--fb-surface-2);
            --fb-btn-border: var(--fb-grid);
            --fb-btn-border-width: 1px;
            --fb-btn-radius: 8px;
            --fb-btn-padding: 6px 10px;
            --fb-btn-font-size: 14px;
        }
        .section {
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            padding: 10px;
            margin-bottom: 12px;
        }
        .row {
            display: grid;
            gap: 8px;
            grid-template-columns: 1fr 1fr 1fr auto;
            margin-top: 8px;
            align-items: center;
        }
        .row.people {
            grid-template-columns: 1fr 1fr 1fr 110px auto;
        }
        .row.calendars {
            grid-template-columns: 1fr 1fr 1fr 1fr auto;
        }
        .row.small {
            grid-template-columns: 1fr auto;
        }
        label {
            font-size: 14px;
            color: var(--fb-muted);
        }
        input,
        select {
            padding: 8px 10px;
            border-radius: 8px;
            border: 1px solid var(--fb-grid);
            font-size: 14px;
            background: var(--fb-surface);
            color: var(--fb-text);
        }
        .note {
            color: var(--fb-muted);
            font-size: 14px;
            margin-top: 6px;
        }
    `,
    ];

    setConfig(config) {
        this._config = { ...config };
    }

    _updateConfig(patch) {
        const next = { ...this._config, ...patch };
        this._config = next;
        fireEvent(this, 'config-changed', { config: next });
    }

    _ensureList(key) {
        if (!Array.isArray(this._config[key])) this._config[key] = [];
    }

    _entityExists(entityId) {
        return Boolean(this.hass?.states?.[entityId]);
    }

    _entityOptions(list, current) {
        const options = Array.isArray(list) ? [...list] : [];
        const value = String(current || '').trim();
        if (value && !options.includes(value)) {
            options.unshift(value);
        }
        return options;
    }

    render() {
        const cfg = this._config || {};
        const people = Array.isArray(cfg.people) ? cfg.people : [];
        const calendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];
        const todos = Array.isArray(cfg.todos) ? cfg.todos : [];
        const stateIds = Object.keys(this.hass?.states || {});
        const calendarEntities = stateIds.filter((id) => id.startsWith('calendar.'));
        const todoEntities = stateIds.filter((id) => id.startsWith('todo.'));

        return html`
            <div class="section">
                <div style="font-weight:700">Basics</div>
                <div class="row small">
                    <input
                        placeholder="Title"
                        .value=${cfg.title || ''}
                        @input=${(e) => this._updateConfig({ title: e.target.value })}
                    />
                    <label>
                        <input
                            type="checkbox"
                            .checked=${Boolean(cfg.debug)}
                            @change=${(e) => this._updateConfig({ debug: e.target.checked })}
                        />
                        Debug
                    </label>
                </div>
                <div class="row">
                    <input
                        type="number"
                        placeholder="Days to show (fixed to 5)"
                        .value=${5}
                        disabled
                        @input=${(e) =>
                            this._updateConfig({ days_to_show: Number(e.target.value) })}
                    />
                    <input
                        type="number"
                        placeholder="Day start hour"
                        .value=${cfg.day_start_hour ?? 6}
                        @input=${(e) =>
                            this._updateConfig({ day_start_hour: Number(e.target.value) })}
                    />
                    <input
                        type="number"
                        placeholder="Day end hour"
                        .value=${cfg.day_end_hour ?? 24}
                        @input=${(e) =>
                            this._updateConfig({ day_end_hour: Number(e.target.value) })}
                    />
                    <input
                        type="number"
                        placeholder="Refresh ms"
                        .value=${cfg.refresh_interval_ms ?? 300000}
                        @input=${(e) =>
                            this._updateConfig({ refresh_interval_ms: Number(e.target.value) })}
                    />
                </div>
            </div>

            <div class="section">
                <div style="font-weight:700">People</div>
                ${people.map(
                    (p, idx) => html`
                        <div class="row people">
                            <input
                                placeholder="id"
                                .value=${p.id || ''}
                                @input=${(e) => {
                                    p.id = e.target.value;
                                    this._updateConfig({ people: [...people] });
                                }}
                            />
                            <input
                                placeholder="name"
                                .value=${p.name || ''}
                                @input=${(e) => {
                                    p.name = e.target.value;
                                    this._updateConfig({ people: [...people] });
                                }}
                            />
                            <input
                                placeholder="colour"
                                .value=${p.color || ''}
                                @input=${(e) => {
                                    p.color = e.target.value;
                                    this._updateConfig({ people: [...people] });
                                }}
                            />
                            <select
                                .value=${p.header_row || 1}
                                @change=${(e) => {
                                    p.header_row = Number(e.target.value);
                                    this._updateConfig({ people: [...people] });
                                }}
                            >
                                <option value="1">Row 1</option>
                                <option value="2">Row 2</option>
                            </select>
                            <button
                                class="btn"
                                @click=${() => {
                                    people.splice(idx, 1);
                                    this._updateConfig({ people: [...people] });
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    `
                )}
                <div class="row small">
                    <button
                        class="btn"
                        @click=${() => {
                            this._ensureList('people');
                            people.push({ id: '', name: '', color: '' });
                            this._updateConfig({ people: [...people] });
                        }}
                    >
                        Add person
                    </button>
                </div>
            </div>

            <div class="section">
                <div style="font-weight:700">Calendars</div>
                ${calendars.map(
                    (c, idx) => html`
                        <div class="row calendars">
                            <select
                                .value=${c.entity || ''}
                                @change=${(e) => {
                                    c.entity = e.target.value;
                                    this._updateConfig({ calendars: [...calendars] });
                                }}
                            >
                                <option value="">Select calendar</option>
                                ${this._entityOptions(calendarEntities, c.entity).map(
                                    (id) => html`<option value=${id}>${id}</option>`
                                )}
                            </select>
                            <select
                                .value=${c.person_id || ''}
                                @change=${(e) => {
                                    c.person_id = e.target.value;
                                    this._updateConfig({ calendars: [...calendars] });
                                }}
                            >
                                <option value="">Select person</option>
                                ${people.map(
                                    (p) => html`<option value=${p.id}>${p.name || p.id}</option>`
                                )}
                            </select>
                            <select
                                .value=${c.role || ''}
                                @change=${(e) => {
                                    c.role = e.target.value;
                                    this._updateConfig({ calendars: [...calendars] });
                                }}
                            >
                                <option value="">Role</option>
                                <option value="family">Family</option>
                                <option value="routine">Routine</option>
                            </select>
                            <div class="note">
                                ${c.entity && !this._entityExists(c.entity)
                                    ? 'Entity not found'
                                    : ''}
                            </div>
                            <button
                                class="btn"
                                @click=${() => {
                                    calendars.splice(idx, 1);
                                    this._updateConfig({ calendars: [...calendars] });
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    `
                )}
                <div class="row small">
                    <button
                        class="btn"
                        @click=${() => {
                            this._ensureList('calendars');
                            calendars.push({ entity: '', person_id: '' });
                            this._updateConfig({ calendars: [...calendars] });
                        }}
                    >
                        Add calendar
                    </button>
                </div>
            </div>

            <div class="section">
                <div style="font-weight:700">Todo lists</div>
                ${todos.map(
                    (t, idx) => html`
                        <div class="row">
                            <select
                                .value=${t.entity || ''}
                                @change=${(e) => {
                                    t.entity = e.target.value;
                                    this._updateConfig({ todos: [...todos] });
                                }}
                            >
                                <option value="">Select todo list</option>
                                ${this._entityOptions(todoEntities, t.entity).map(
                                    (id) => html`<option value=${id}>${id}</option>`
                                )}
                            </select>
                            <input
                                placeholder="name"
                                .value=${t.name || ''}
                                @input=${(e) => {
                                    t.name = e.target.value;
                                    this._updateConfig({ todos: [...todos] });
                                }}
                            />
                            <select
                                .value=${t.person_id || ''}
                                @change=${(e) => {
                                    t.person_id = e.target.value;
                                    this._updateConfig({ todos: [...todos] });
                                }}
                            >
                                <option value="">Select person</option>
                                ${people.map(
                                    (p) => html`<option value=${p.id}>${p.name || p.id}</option>`
                                )}
                            </select>
                            <div class="note">
                                ${t.entity && !this._entityExists(t.entity)
                                    ? 'Entity not found'
                                    : ''}
                            </div>
                            <button
                                class="btn"
                                @click=${() => {
                                    todos.splice(idx, 1);
                                    this._updateConfig({ todos: [...todos] });
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    `
                )}
                <div class="row small">
                    <button
                        class="btn"
                        @click=${() => {
                            this._ensureList('todos');
                            todos.push({ entity: '', name: '', person_id: '' });
                            this._updateConfig({ todos: [...todos] });
                        }}
                    >
                        Add todo list
                    </button>
                </div>
            </div>

            <div class="section">
                <div style="font-weight:700">Shopping</div>
                <div class="row small">
                    <select
                        .value=${cfg.shopping?.entity || ''}
                        @change=${(e) =>
                            this._updateConfig({
                                shopping: { ...(cfg.shopping || {}), entity: e.target.value },
                            })}
                    >
                        <option value="">Select shopping list</option>
                        ${this._entityOptions(todoEntities, cfg.shopping?.entity).map(
                            (id) => html`<option value=${id}>${id}</option>`
                        )}
                    </select>
                </div>
                ${cfg.shopping?.entity && !this._entityExists(cfg.shopping.entity)
                    ? html`<div class="note">Entity not found</div>`
                    : html``}
            </div>
        `;
    }
}

customElements.define('nx-displaygrid-editor', FamilyBoardEditor);
