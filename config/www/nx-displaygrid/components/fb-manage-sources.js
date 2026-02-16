/* nx-displaygrid - manage sources dialog
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { sharedViewStyles } from '../views/shared.styles.js';
import { yamlString } from '../util/yaml.util.js';

export class FbManageSources extends LitElement {
    static properties = {
        open: { type: Boolean },
        config: { type: Object },
        hass: { type: Object },
        _draft: { state: true },
        _saveError: { state: true },
    };

    static styles = [
        sharedViewStyles,
        css`
        :host {
            --fb-btn-bg: var(--fb-surface-2);
            --fb-btn-radius: 8px;
            --fb-btn-padding: 4px 8px;
            --fb-btn-font-size: 13px;
            --fb-btn-min-height: 34px;
            --fb-btn-min-width: 34px;
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
            max-width: 760px;
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
            margin-top: 14px;
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            padding: 10px;
        }
        .row {
            display: grid;
            gap: 8px;
            grid-template-columns: 1fr 1fr 1fr auto;
            margin-top: 8px;
            align-items: center;
        }
        .row.people {
            grid-template-columns: 18px 1fr 1fr 1fr 110px 96px auto;
        }
        .row.calendars {
            grid-template-columns: 1fr 1fr 1fr auto auto;
        }
        .row.small {
            grid-template-columns: 1fr auto;
        }
        .rowDot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: var(--row-dot, var(--fb-muted));
            border: 1px solid var(--fb-border);
        }
        label {
            font-size: 13px;
            color: var(--fb-muted);
        }
        input,
        select,
        textarea {
            padding: 6px 8px;
            border-radius: 8px;
            border: 1px solid var(--fb-grid);
            font-size: 13px;
            background: var(--fb-surface);
            color: var(--fb-text);
        }
        textarea {
            min-height: 96px;
            font-family: monospace;
            font-size: 12px;
            width: 100%;
            box-sizing: border-box;
        }
        .btn.danger {
            --fb-btn-color: var(--urgent);
            --fb-btn-border: var(--urgent);
            --fb-btn-bg: transparent;
        }
        .note {
            color: var(--fb-muted);
            font-size: 14px;
            margin-top: 8px;
        }
        @media (max-width: 720px) {
            .dlg {
                max-height: 95vh;
                padding: 12px;
            }
            .row,
            .row.people,
            .row.calendars,
            .row.small {
                grid-template-columns: 1fr;
            }
            .row.people,
            .row.calendars {
                align-items: stretch;
            }
            .rowDot {
                display: none;
            }
            .btn {
                width: 100%;
            }
        }
    `,
    ];

    static PEOPLE_COLOURS = [
        { name: 'Mint', color: '#36B37E', text: '#FFFFFF' },
        { name: 'Violet', color: '#7E57C2', text: '#FFFFFF' },
        { name: 'Amber', color: '#F4B400', text: '#1A1A1A' },
        { name: 'Rose', color: '#EC407A', text: '#FFFFFF' },
        { name: 'Sky', color: '#42A5F5', text: '#FFFFFF' },
        { name: 'Lime', color: '#B2FD7F', text: '#1A1A1A' },
        { name: 'Teal', color: '#00897B', text: '#FFFFFF' },
        { name: 'Indigo', color: '#5E35B1', text: '#FFFFFF' },
        { name: 'Tangerine', color: '#FB8C00', text: '#1A1A1A' },
        { name: 'Magenta', color: '#D81B60', text: '#FFFFFF' },
        { name: 'Azure', color: '#1E88E5', text: '#FFFFFF' },
        { name: 'Leaf', color: '#8BC34A', text: '#1A1A1A' },
    ];

    willUpdate(changedProps) {
        const opened = changedProps.has('open') && this.open;
        const configChangedWhileOpen = this.open && changedProps.has('config');
        if (opened || configChangedWhileOpen) {
            this._draft = JSON.parse(JSON.stringify(this.config || {}));
        }
    }

    _configHasData(config) {
        if (!config || typeof config !== 'object') return false;
        if (Array.isArray(config.people) && config.people.length) return true;
        if (Array.isArray(config.calendars) && config.calendars.length) return true;
        if (Array.isArray(config.todos) && config.todos.length) return true;
        if (config.shopping?.entity) return true;
        return Object.keys(config).length > 0;
    }

    _peopleColourOptions(current) {
        const options = [...FbManageSources.PEOPLE_COLOURS];
        const value = String(current || '').trim();
        if (value && !options.some((c) => c.color === value)) {
            options.unshift({ name: `Custom ${value}`, color: value, text: '' });
        }
        return options;
    }

    close() {
        this.open = false;
        this._saveError = '';
        this.requestUpdate();
        this.dispatchEvent(new CustomEvent('fb-sources-close', { bubbles: true, composed: true }));
    }

    _emitSave() {
        const cfg = this._draft || {};
        const people = Array.isArray(cfg.people) ? cfg.people : [];
        const calendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];
        const todos = Array.isArray(cfg.todos) ? cfg.todos : [];
        const stateIds = Object.keys(this.hass?.states || {});
        const stateSet = new Set(stateIds);
        for (const c of calendars) {
            if (c?.entity && !stateSet.has(c.entity)) {
                this._saveError = `Calendar entity not found: ${c.entity}`;
                return;
            }
        }
        for (const t of todos) {
            if (t?.entity && !stateSet.has(t.entity)) {
                this._saveError = `Todo entity not found: ${t.entity}`;
                return;
            }
        }
        for (const p of people) {
            if (!p?.id) continue;
            const hasCalendar = calendars.some((c) => c?.person_id === p.id);
            const hasTodo = todos.some((t) => t?.person_id === p.id);
            if (!hasCalendar && !hasTodo) {
                this._saveError = `Person "${p.name || p.id}" needs a calendar or todo list.`;
                return;
            }
        }
        this._saveError = '';
        this.dispatchEvent(
            new CustomEvent('fb-sources-save', {
                detail: { config: this._draft },
                bubbles: true,
                composed: true,
            })
        );
        this.close();
    }

    _emitOpenEditor() {
        this.dispatchEvent(new CustomEvent('fb-open-editor', { bubbles: true, composed: true }));
    }

    _copyConfig() {
        const yaml = this._toYaml(this._draft || {});
        navigator.clipboard?.writeText?.(yaml);
    }

    _toYaml(cfg) {
        const lines = [];
        const push = (l) => lines.push(l);
        push(`type: custom:nx-displaygrid`);
        if (cfg.title) push(`title: ${yamlString(cfg.title)}`);
        if (cfg.debug !== undefined) push(`debug: ${cfg.debug ? 'true' : 'false'}`);
        push(`days_to_show: 5`);
        if (cfg.day_start_hour !== undefined) push(`day_start_hour: ${cfg.day_start_hour}`);
        if (cfg.day_end_hour !== undefined) push(`day_end_hour: ${cfg.day_end_hour}`);
        if (cfg.slot_minutes !== undefined) push(`slot_minutes: ${cfg.slot_minutes}`);
        if (cfg.px_per_hour !== undefined) push(`px_per_hour: ${cfg.px_per_hour}`);
        if (cfg.refresh_interval_ms !== undefined)
            push(`refresh_interval_ms: ${cfg.refresh_interval_ms}`);

        const people = Array.isArray(cfg.people) ? cfg.people : [];
        if (people.length) {
            push(`people:`);
            for (const p of people) {
                push(`  - id: ${yamlString(p.id)}`);
                if (p.name) push(`    name: ${yamlString(p.name)}`);
                if (p.color) push(`    color: ${yamlString(p.color)}`);
                if (p.text_color) push(`    text_color: ${yamlString(p.text_color)}`);
                if (p.role) push(`    role: ${yamlString(p.role)}`);
                if (p.header_row) push(`    header_row: ${p.header_row}`);
            }
        }
        const peopleDisplay = Array.isArray(cfg.people_display) ? cfg.people_display : [];
        if (peopleDisplay.length) {
            push(`people_display:`);
            for (const id of peopleDisplay) {
                push(`  - ${yamlString(id)}`);
            }
        }

        if (cfg.admin_pin !== undefined) {
            push(`admin_pin: ${yamlString(cfg.admin_pin)}`);
        }

        const calendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];
        if (calendars.length) {
            push(`calendars:`);
            for (const c of calendars) {
                push(`  - entity: ${yamlString(c.entity)}`);
                if (c.person_id) push(`    person_id: ${yamlString(c.person_id)}`);
                if (c.role) push(`    role: ${yamlString(c.role)}`);
            }
        }

        const todos = Array.isArray(cfg.todos) ? cfg.todos : [];
        if (todos.length) {
            push(`todos:`);
            for (const t of todos) {
                push(`  - entity: ${yamlString(t.entity)}`);
                if (t.name) push(`    name: ${yamlString(t.name)}`);
                if (t.person_id) push(`    person_id: ${yamlString(t.person_id)}`);
            }
        }

        if (cfg.shopping?.entity) {
            push(`shopping:`);
            push(`  entity: ${yamlString(cfg.shopping.entity)}`);
            if (cfg.shopping.name) push(`  name: ${yamlString(cfg.shopping.name)}`);
        }

        return lines.join('\n');
    }

    _ensureList(path) {
        if (!this._draft[path]) this._draft[path] = [];
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
        if (!this.open) return html``;
        const cfg = this._draft || {};
        const people = Array.isArray(cfg.people) ? cfg.people : [];
        const calendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];
        const todos = Array.isArray(cfg.todos) ? cfg.todos : [];
        const stateIds = Object.keys(this.hass?.states || {});
        const calendarEntities = stateIds.filter((id) => id.startsWith('calendar.'));
        const todoEntities = stateIds.filter((id) => id.startsWith('todo.'));

        return html`
            <div class="backdrop" @click=${(e) => e.target === e.currentTarget && this.close()}>
                <div class="dlg">
                    <div class="h">
                        <div>Manage sources</div>
                        <button class="btn" @click=${this.close}>Close</button>
                    </div>
                    ${this._saveError
                        ? html`<div class="note" style="color:var(--urgent)">
                              ${this._saveError}
                          </div>`
                        : html``}

                    <div class="section">
                        <div style="font-weight:700">People</div>
                        <div class="note">
                            Roles show a badge: Kid = child, Grownup = adult, Group = shared household.
                            Rows show up to 4 people each (8 total).
                        </div>
                        ${people.map((p, idx) => {
                            const colourOptions = this._peopleColourOptions(p.color);
                            const selected = colourOptions.find((c) => c.color === p.color);
                            return html`
                                <div class="row people">
                                    <span
                                        class="rowDot"
                                        style="--row-dot:${p.color || 'var(--fb-muted)'}"
                                    ></span>
                                    <input
                                        placeholder="id"
                                        .value=${p.id || ''}
                                        @input=${(e) => (p.id = e.target.value)}
                                    />
                                    <input
                                        placeholder="name"
                                        .value=${p.name || ''}
                                        @input=${(e) => (p.name = e.target.value)}
                                    />
                                    <select
                                        .value=${p.color || ''}
                                        @change=${(e) => {
                                            const choice = colourOptions.find(
                                                (c) => c.color === e.target.value
                                            );
                                            p.color = choice?.color || '';
                                            p.text_color = choice?.text || '';
                                            this.requestUpdate();
                                        }}
                                    >
                                        <option value="">Select colour</option>
                                        ${colourOptions.map(
                                            (c) =>
                                                html`<option
                                                    value=${c.color}
                                                    ?selected=${c.color === p.color}
                                                >
                                                    ${c.name}
                                                </option>`
                                        )}
                                    </select>
                                    <select
                                        .value=${p.role || ''}
                                        @change=${(e) => (p.role = e.target.value)}
                                    >
                                        <option value="">Role</option>
                                        <option value="kid" ?selected=${p.role === 'kid'}>Kid</option>
                                        <option value="grownup" ?selected=${p.role === 'grownup'}>
                                            Grownup
                                        </option>
                                        <option value="group" ?selected=${p.role === 'group'}>
                                            Group
                                        </option>
                                    </select>
                                    <select
                                        .value=${p.header_row || 1}
                                        @change=${(e) => (p.header_row = Number(e.target.value))}
                                    >
                                        <option value="1" ?selected=${p.header_row === 1}>
                                            Row 1
                                        </option>
                                        <option value="2" ?selected=${p.header_row === 2}>
                                            Row 2
                                        </option>
                                    </select>
                                    <button
                                        class="btn icon danger"
                                        aria-label="Remove person"
                                        @click=${() => {
                                            people.splice(idx, 1);
                                            this.requestUpdate();
                                        }}
                                    >
                                        x
                                    </button>
                                </div>
                            `;
                        })}
                        <div class="row small">
                            <button
                                class="btn"
                                @click=${() => {
                                    this._ensureList('people');
                                    people.push({ id: '', name: '', color: '' });
                                    this.requestUpdate();
                                }}
                            >
                                Add person
                            </button>
                        </div>
                    </div>

                    <div class="section">
                        <div style="font-weight:700">Calendars</div>
                        <div class="note">
                            Roles: Family = shared household calendar, Routine = background schedule.
                        </div>
                        ${calendars.map(
                            (c, idx) => html`
                                <div class="row calendars">
                                    <select
                                        .value=${c.entity || ''}
                                        @change=${(e) => (c.entity = e.target.value)}
                                    >
                                        <option value="">Select calendar</option>
                                        ${this._entityOptions(calendarEntities, c.entity).map(
                                            (id) =>
                                                html`<option
                                                    value=${id}
                                                    ?selected=${id === c.entity}
                                                >
                                                    ${id}
                                                </option>`
                                        )}
                                    </select>
                                    <select
                                        .value=${c.person_id || ''}
                                        @change=${(e) => (c.person_id = e.target.value)}
                                    >
                                        <option value="">Select person</option>
                                        ${people.map(
                                            (p) =>
                                                html`<option
                                                    value=${p.id}
                                                    ?selected=${p.id === c.person_id}
                                                >
                                                    ${p.name || p.id}
                                                </option>`
                                        )}
                                    </select>
                                    <select
                                        .value=${c.role || ''}
                                        @change=${(e) => (c.role = e.target.value)}
                                    >
                                        <option value="">Role</option>
                                        <option value="family" ?selected=${c.role === 'family'}>
                                            Family
                                        </option>
                                        <option value="routine" ?selected=${c.role === 'routine'}>
                                            Routine
                                        </option>
                                    </select>
                                    <button
                                        class="btn icon danger"
                                        aria-label="Remove calendar"
                                        @click=${() => {
                                            calendars.splice(idx, 1);
                                            this.requestUpdate();
                                        }}
                                    >
                                        x
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
                                    this.requestUpdate();
                                }}
                            >
                                Add calendar
                            </button>
                        </div>
                    </div>

                    <div class="section">
                        <div style="font-weight:700">Todo lists</div>
                        <div class="note">
                            Select existing todo lists and map them to people.
                        </div>
                        ${todos.map(
                            (t, idx) => html`
                                <div class="row">
                                    <select
                                        .value=${t.entity || ''}
                                        @change=${(e) => (t.entity = e.target.value)}
                                    >
                                        <option value="">Select todo list</option>
                                        ${this._entityOptions(todoEntities, t.entity).map(
                                            (id) =>
                                                html`<option
                                                    value=${id}
                                                    ?selected=${id === t.entity}
                                                >
                                                    ${id}
                                                </option>`
                                        )}
                                    </select>
                                    <input
                                        placeholder="name"
                                        .value=${t.name || ''}
                                        @input=${(e) => (t.name = e.target.value)}
                                    />
                                    <select
                                        .value=${t.person_id || ''}
                                        @change=${(e) => (t.person_id = e.target.value)}
                                    >
                                        <option value="">Select person</option>
                                        ${people.map(
                                            (p) =>
                                                html`<option
                                                    value=${p.id}
                                                    ?selected=${p.id === t.person_id}
                                                >
                                                    ${p.name || p.id}
                                                </option>`
                                        )}
                                    </select>
                                    <button
                                        class="btn icon danger"
                                        aria-label="Remove todo list"
                                        @click=${() => {
                                            todos.splice(idx, 1);
                                            this.requestUpdate();
                                        }}
                                    >
                                        x
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
                                    this.requestUpdate();
                                }}
                            >
                                Add todo list
                            </button>
                        </div>
                    </div>

                    <div class="section">
                        <div style="font-weight:700">Shopping</div>
                        <div class="note">Pick the todo list entity used for shopping.</div>
                        <div class="row small">
                            <select
                                .value=${cfg.shopping?.entity || ''}
                                @change=${(e) => {
                                    if (!cfg.shopping) cfg.shopping = {};
                                    cfg.shopping.entity = e.target.value;
                                }}
                            >
                                <option value="">Select shopping list</option>
                                ${this._entityOptions(todoEntities, cfg.shopping?.entity).map(
                                    (id) =>
                                        html`<option
                                            value=${id}
                                            ?selected=${id === cfg.shopping?.entity}
                                        >
                                            ${id}
                                        </option>`
                                )}
                            </select>
                        </div>
                    </div>

                    <div class="section">
                        <div style="font-weight:700">Copy config</div>
                        <textarea readonly .value=${this._toYaml(cfg)}></textarea>
                        <div class="row small">
                            <button class="btn" @click=${this._copyConfig}>Copy config</button>
                            <button class="btn primary" @click=${this._emitSave}>Save</button>
                        </div>
                        <div class="note">
                            Saved configs are stored in Home Assistant when available. Use Copy config
                            if you want a YAML backup.
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-manage-sources', FbManageSources);
