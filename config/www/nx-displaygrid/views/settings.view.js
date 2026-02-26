/* nx-displaygrid - settings view
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { sharedViewStyles, sharedCardStyles } from './shared.styles.js';
import { slugifyId } from '../nx-displaygrid.util.js';
import { DEFAULT_CARD_CONFIG } from '../nx-displaygrid.defaults.js';

const SETTINGS_WEEKDAY_OPTIONS = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];

const BIN_COLOUR_OPTIONS = [
    { label: 'Dark Grey', colour: '#1e1e1e' },
    { label: 'Blue', colour: '#0000FF' },
    { label: 'Green', colour: '#008000' },
    { label: 'Brown', colour: '#421f01' },
    { label: 'Red', colour: '#FF0000' },
    { label: 'Yellow', colour: '#FFFF00' },
    { label: 'Orange', colour: '#FFA500' },
    { label: 'Purple', colour: '#4e0e63' },
];

function buildRotationPatternLabel(bins, binRotation = {}) {
    const weeks = Array.isArray(binRotation.weeks) ? binRotation.weeks : [];
    return weeks
        .map((week) => {
            const ids = Array.isArray(week?.bins) ? week.bins : [];
            const names = ids
                .map((id) => bins.find((b) => b.id === id)?.name || id)
                .filter(Boolean);
            return names.join('+');
        })
        .filter(Boolean)
        .join(', ');
}

function buildPeopleDisplayState(people, rawPeopleDisplay) {
    const hasPeopleDisplay = Array.isArray(rawPeopleDisplay);
    const peopleDisplay = hasPeopleDisplay
        ? rawPeopleDisplay.filter((id) => people.some((p) => p.id === id))
        : people.map((p) => p.id).filter(Boolean);
    const allPeopleIds = people.map((p) => p.id).filter(Boolean);
    const peopleDisplayFull = [
        ...peopleDisplay,
        ...allPeopleIds.filter((id) => !peopleDisplay.includes(id)),
    ];
    return { hasPeopleDisplay, peopleDisplay, allPeopleIds, peopleDisplayFull };
}

function formatRefreshAge(ts) {
    if (!ts) return 'Never';
    const minutes = Math.max(0, Math.round((Date.now() - ts) / 60000));
    return `${minutes} min ago`;
}

function formatTimestamp(ts) {
    return ts ? new Date(ts).toLocaleString() : '—';
}

function formatRefreshReasonLabel(reason) {
    const map = {
        startup: 'Startup',
        resume: 'Resume',
        interval: 'Interval',
        'cache-max-age': 'Cache max age',
        manual: 'Manual',
        retry: 'Retry',
    };
    return map[reason] || (reason ? reason : '—');
}

export class FbSettingsView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
        _homeControlAdd: { state: true },
        _infoOpen: { state: true },
        _infoTitle: { state: true },
        _infoText: { state: true },
        _pinValue: { state: true },
        _pinSetValue: { state: true },
        _dragPersonId: { state: true },
        _resetStep: { state: true },
        _resetDashboardStep: { state: true },
        _resetDashboardBusy: { state: true },
        _shoppingFavouritesResetStep: { state: true },
        _shoppingFavouritesResetType: { state: true },
        _personWizardOpen: { state: true },
        _personWizardStep: { state: true },
        _personWizardDraft: { state: true },
        _personWizardMode: { state: true },
        _personWizardError: { state: true },
        _personWizardAutoId: { state: true },
        _binRotationPattern: { state: true },
        _binRotationWeekday: { state: true },
        _binRotationAnchor: { state: true },
        _settingsPanel: { state: true },
        _settingsSettingsTab: { state: true },
        _settingsPreferencesTab: { state: true },
        _settingsAdminTab: { state: true },
    };

    static styles = [
        sharedViewStyles,
        sharedCardStyles,
        css`
        :host {
            --fb-btn-bg: var(--fb-accent);
            --fb-btn-border: transparent;
            --fb-btn-border-width: 0;
            --fb-btn-radius: 8px;
            --fb-btn-padding: 6px 8px;
            --fb-btn-font-size: 13px;
            --fb-btn-min-height: 34px;
            --fb-btn-min-width: 34px;
        }
        .layout {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
            height: 100%;
            min-height: 0;
        }
        .panelTabs {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 4px;
            position: sticky;
            top: 0;
            z-index: 3;
            background: var(--fb-bg);
            padding-bottom: 6px;
        }
        .subTabs {
            display: inline-flex;
            gap: 6px;
            padding: 4px;
            background: var(--fb-surface-2);
            border: 1px solid var(--fb-border);
            border-radius: 999px;
            width: fit-content;
            flex-wrap: wrap;
        }
        .subTabs .btn {
            --fb-btn-border-width: 0;
            --fb-btn-bg: transparent;
            --fb-btn-radius: 999px;
            --fb-btn-padding: 6px 10px;
            white-space: nowrap;
        }
        .subTabs .btn.active {
            --fb-btn-bg: var(--fb-surface);
            box-shadow: var(--shadow-sm);
            font-weight: 700;
        }
        .tabs {
            display: inline-flex;
            gap: 6px;
            padding: 4px;
            background: var(--fb-surface-2);
            border: 1px solid var(--fb-border);
            border-radius: 999px;
            width: fit-content;
        }
        .tabs .btn {
            --fb-btn-border-width: 0;
            --fb-btn-bg: transparent;
            --fb-btn-radius: 999px;
            --fb-btn-padding: 6px 12px;
        }
        .tabs .btn.active {
            --fb-btn-bg: var(--fb-surface);
            box-shadow: var(--shadow-sm);
            font-weight: 700;
        }
        .saveState {
            font-size: 12px;
            color: var(--fb-muted);
            margin-left: 4px;
        }
        .column {
            display: flex;
            flex-direction: column;
            gap: 10px;
            overflow: hidden;
            min-height: 0;
        }
        .section {
            --fb-card-radius: 12px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            min-height: 0;
            flex: 1;
        }
        .panelBody {
            min-height: 0;
            overflow: auto;
            flex: 1;
            padding-right: 8px;
            scrollbar-gutter: stable;
        }
        .row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            padding: 6px 0;
            border-bottom: 1px dashed var(--fb-grid);
            align-items: center;
        }
        .row.binRow {
            display: grid;
            grid-template-columns: 18px 34px 1fr 140px 160px auto;
            align-items: center;
        }
        .row label {
            color: var(--fb-text);
        }
        .rowDot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: var(--row-dot, var(--fb-muted));
            border: 1px solid var(--fb-border);
        }
        .row:last-child {
            border-bottom: 0;
        }
        .title {
            font-weight: 700;
            margin-bottom: 6px;
            color: var(--fb-text);
            font-size: 18px;
        }
        .titleRow {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }
        .infoBtn {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 999px;
            width: 28px;
            height: 28px;
            display: grid;
            place-items: center;
            cursor: pointer;
            color: var(--fb-muted);
            font-weight: 700;
        }
        .infoBackdrop {
            position: fixed;
            inset: 0;
            background: var(--overlay);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 14px;
        }
        .infoDlg {
            width: 100%;
            max-width: 520px;
            background: var(--fb-surface);
            border-radius: 12px;
            border: 1px solid var(--fb-border);
            padding: 14px;
            display: grid;
            gap: 10px;
        }
        .wizardDlg {
            width: 100%;
            max-width: 700px;
            background: var(--fb-surface);
            border-radius: 12px;
            border: 1px solid var(--fb-border);
            padding: 16px;
            display: grid;
            gap: 12px;
        }
        .wizardSteps {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            font-size: 12px;
            color: var(--fb-muted);
        }
        .wizardStep {
            padding: 4px 8px;
            border-radius: 999px;
            border: 1px solid var(--fb-grid);
        }
        .wizardStep.active {
            background: var(--fb-surface-2);
            color: var(--fb-text);
            font-weight: 700;
        }
        .wizardGrid {
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .wizardGrid.full {
            grid-template-columns: 1fr;
        }
        .wizardNav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }
        .wizardError {
            color: var(--urgent);
            font-size: 13px;
        }
        .infoHead {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-weight: 700;
        }
        .input {
            border: 1px solid var(--fb-grid);
            border-radius: 8px;
            padding: 5px 8px;
            font-size: 14px;
            background: var(--fb-surface);
            color: var(--fb-text);
            min-height: 34px;
        }
        select.input {
            color: var(--fb-text);
            -webkit-text-fill-color: var(--fb-text);
        }
        .unitRow {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .unit {
            color: var(--fb-muted);
            font-size: 12px;
        }
        .multiSelect {
            min-height: 88px;
            height: auto;
            padding: 6px;
        }
        .anchorPad {
            scroll-margin-top: 60px;
        }
        .status {
            font-weight: 700;
        }
        .status.on {
            color: var(--warning);
        }
        .status.off {
            color: var(--success);
        }
        ul {
            margin: 6px 0 0;
            padding-left: 18px;
            color: var(--fb-muted);
            font-size: 14px;
        }
        .actions {
            display: flex;
            gap: 8px;
            margin-top: 10px;
            flex-wrap: wrap;
            align-items: center;
        }
        .subTitle {
            font-weight: 700;
            margin-top: 12px;
            font-size: 14px;
        }
        .subTitle:first-of-type {
            margin-top: 0;
        }
        .toggleGroup {
            display: inline-flex;
            gap: 6px;
            align-items: center;
            padding: 4px;
            border-radius: 999px;
            background: var(--fb-surface-2);
            border: 1px solid var(--fb-border);
        }
        .toggleBtn {
            border: 0;
            background: transparent;
            color: var(--fb-text);
            border-radius: 999px;
            padding: 4px 10px;
            cursor: pointer;
            font-size: 13px;
            min-height: 32px;
            min-width: 32px;
        }
        .toggleBtn.active {
            background: var(--fb-surface);
            box-shadow: var(--shadow-sm);
            font-weight: 700;
        }
        .dragList {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px;
            margin-top: 8px;
        }
        .dragItem {
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            padding: 5px 8px;
            background: var(--fb-surface-2);
            cursor: grab;
            text-align: center;
            font-weight: 600;
            font-size: 13px;
        }
        .dragItem.dragging {
            opacity: 0.5;
        }
        .panelBody {
            scrollbar-width: thin;
            scrollbar-color: var(--fb-grid) transparent;
        }
        .panelBody::-webkit-scrollbar {
            width: 10px;
        }
        .panelBody::-webkit-scrollbar-track {
            background: transparent;
        }
        .panelBody::-webkit-scrollbar-thumb {
            background: var(--fb-grid);
            border-radius: 999px;
            border: 3px solid transparent;
            background-clip: padding-box;
        }
        .panelBody::-webkit-scrollbar-thumb:hover {
            background: var(--fb-border);
            background-clip: padding-box;
        }
        @media (max-width: 900px) {
            .layout {
                grid-template-columns: 1fr;
            }
            .row.binRow {
                grid-template-columns: 1fr;
            }
            .rowDot {
                display: none;
            }
        }
        `,
    ];

    constructor() {
        super();
        this._settingsPanel = 'settings';
        this._settingsSettingsTab = 'sources';
        this._settingsPreferencesTab = 'health';
        this._settingsAdminTab = 'admin';
        this._shoppingFavouritesResetStep = 0;
        this._shoppingFavouritesResetType = '';
    }

    _openPersonWizard(person) {
        const card = this.card;
        const cfg = card?._config || {};
        const calendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];
        const todos = Array.isArray(cfg.todos) ? cfg.todos : [];
        const existing = person || {};
        const originalId = existing.id || '';
        const calendarIds = calendars
            .filter((c) => (c.person_id || c.personId || c.person) === originalId)
            .map((c) => c.entity)
            .filter(Boolean);
        const todoIds = todos
            .filter((t) => (t.person_id || t.personId || t.person) === originalId)
            .map((t) => t.entity)
            .filter(Boolean);
        this._personWizardDraft = {
            originalId,
            id: existing.id || '',
            name: existing.name || '',
            color: existing.color || '',
            text_color: existing.text_color || '',
            role: existing.role || '',
            header_row: existing.header_row || 1,
            calendarIds,
            todoIds,
        };
        this._personWizardMode = person ? 'edit' : 'add';
        this._personWizardAutoId = !existing.id;
        this._personWizardError = '';
        this._personWizardStep = 0;
        this._personWizardOpen = true;
    }

    _closePersonWizard() {
        this._personWizardOpen = false;
        this._personWizardDraft = null;
        this._personWizardError = '';
    }

    _setPersonWizardStep(nextStep) {
        const value = Math.max(0, Math.min(3, Number(nextStep || 0)));
        this._personWizardStep = value;
        this._personWizardError = '';
    }

    _updatePersonWizardDraft(patch) {
        const current = this._personWizardDraft && typeof this._personWizardDraft === 'object'
            ? this._personWizardDraft
            : {};
        this._personWizardDraft = { ...current, ...(patch || {}) };
        this._personWizardError = '';
    }

    _applyPersonWizard() {
        const card = this.card;
        const cfg = card?._config || {};
        const people = Array.isArray(cfg.people) ? [...cfg.people] : [];
        const calendars = Array.isArray(cfg.calendars) ? [...cfg.calendars] : [];
        const todos = Array.isArray(cfg.todos) ? [...cfg.todos] : [];
        const draft = this._personWizardDraft || {};
        const newId = slugifyId(draft.id || draft.name);
        const name = String(draft.name || '').trim();

        if (!name || !newId) {
            this._personWizardError = 'Name and id are required.';
            return;
        }

        const originalId = draft.originalId || newId;
        const idConflict =
            newId &&
            people.some((p) => p.id === newId && String(p.id || '') !== String(originalId));
        if (idConflict) {
            this._personWizardError = 'That id is already used by another person.';
            return;
        }
        const existingIdx = people.findIndex((p) => p.id === originalId);
        const nextPerson = {
            ...(existingIdx >= 0 ? people[existingIdx] : {}),
            id: newId,
            name,
            color: draft.color || '',
            text_color: draft.text_color || '',
            role: draft.role || '',
            header_row: Number(draft.header_row) || 1,
        };
        if (existingIdx >= 0) {
            people.splice(existingIdx, 1, nextPerson);
        } else {
            people.push(nextPerson);
        }

        const calendarIds = new Set(draft.calendarIds || []);
        const todoIds = new Set(draft.todoIds || []);
        const nextCalendars = calendars.map((c) => {
            const current = c.person_id || c.personId || c.person || '';
            const shouldAssign = calendarIds.has(c.entity);
            if (shouldAssign) return { ...c, person_id: newId };
            if (current === originalId || current === newId) {
                return { ...c, person_id: '' };
            }
            return c;
        });
        const nextTodos = todos.map((t) => {
            const current = t.person_id || t.personId || t.person || '';
            const shouldAssign = todoIds.has(t.entity);
            if (shouldAssign) return { ...t, person_id: newId };
            if (current === originalId || current === newId) {
                return { ...t, person_id: '' };
            }
            return t;
        });

        const display = Array.isArray(cfg.people_display)
            ? [...cfg.people_display]
            : people.map((p) => p.id);
        const nextDisplay = display
            .map((id) => (id === originalId ? newId : id))
            .filter((id) => id && people.some((p) => p.id === id));
        if (!nextDisplay.includes(newId)) nextDisplay.push(newId);

        card._updateConfigPartial({
            people,
            calendars: nextCalendars,
            todos: nextTodos,
            people_display: nextDisplay,
        });
        this._closePersonWizard();
    }

    _renderPersonWizardDialog(card, { calendars, todos, people }) {
        if (!this._personWizardOpen) return html``;
        const draft = this._personWizardDraft || {};
        const mode = this._personWizardMode || 'add';
        const step = Number(this._personWizardStep || 0);
        const steps = ['Basics', 'Calendars', 'Todos', 'Confirm'];
        const calendarIds = new Set(Array.isArray(draft.calendarIds) ? draft.calendarIds : []);
        const todoIds = new Set(Array.isArray(draft.todoIds) ? draft.todoIds : []);
        const canNextFromBasics = Boolean(String(draft.name || '').trim());
        const currentId = String(draft.originalId || draft.id || '');
        const otherPeople = (Array.isArray(people) ? people : []).filter(
            (p) => String(p?.id || '') !== currentId
        );

        const renderBasics = () => html`
            <div class="wizardGrid">
                <div class="row" style="grid-template-columns:1fr;">
                    <div>Name</div>
                    <input
                        class="input"
                        .value=${draft.name || ''}
                        @input=${(e) => {
                            const name = e.target.value;
                            const patch = { name };
                            if (this._personWizardAutoId) patch.id = slugifyId(name);
                            this._updatePersonWizardDraft(patch);
                        }}
                    />
                </div>
                <div class="row" style="grid-template-columns:1fr;">
                    <div>ID</div>
                    <input
                        class="input"
                        .value=${draft.id || ''}
                        ?disabled=${this._personWizardAutoId}
                        @input=${(e) => this._updatePersonWizardDraft({ id: e.target.value })}
                    />
                </div>
                <div class="row" style="grid-template-columns:1fr;">
                    <div>Colour</div>
                    <input
                        class="input"
                        type="color"
                        .value=${draft.color || '#36B37E'}
                        @input=${(e) => this._updatePersonWizardDraft({ color: e.target.value })}
                    />
                </div>
                <div class="row" style="grid-template-columns:1fr;">
                    <div>Role</div>
                    <select
                        class="input"
                        .value=${draft.role || ''}
                        @change=${(e) => this._updatePersonWizardDraft({ role: e.target.value })}
                    >
                        <option value="">None</option>
                        <option value="kid">Kid</option>
                        <option value="grownup">Grownup</option>
                    </select>
                </div>
                <div class="row" style="grid-template-columns:1fr;">
                    <div>Header row</div>
                    <select
                        class="input"
                        .value=${String(Number(draft.header_row) || 1)}
                        @change=${(e) =>
                            this._updatePersonWizardDraft({ header_row: Number(e.target.value) })}
                    >
                        <option value="1">Row 1</option>
                        <option value="2">Row 2</option>
                    </select>
                </div>
                <div class="row" style="grid-template-columns:1fr;">
                    <div>Auto ID</div>
                    <label>
                        <input
                            type="checkbox"
                            .checked=${Boolean(this._personWizardAutoId)}
                            @change=${(e) => {
                                const checked = e.target.checked;
                                this._personWizardAutoId = checked;
                                if (checked) {
                                    this._updatePersonWizardDraft({
                                        id: slugifyId(this._personWizardDraft?.name || ''),
                                    });
                                } else {
                                    this.requestUpdate();
                                }
                            }}
                        />
                        <span class="muted">Generate from name</span>
                    </label>
                </div>
            </div>
        `;

        const renderEntityAssign = (title, rows, selectedIds, key) => html`
            <div class="wizardGrid full">
                <div class="muted">
                    Choose which ${title.toLowerCase()} belong to this person. Cancel discards all
                    changes.
                </div>
                ${rows.length
                    ? rows.map((row) => html`
                          <label class="row" style="grid-template-columns:auto 1fr;">
                              <input
                                  type="checkbox"
                                  .checked=${selectedIds.has(row.entity)}
                                  @change=${(e) => {
                                      const next = new Set(selectedIds);
                                      if (e.target.checked) next.add(row.entity);
                                      else next.delete(row.entity);
                                      this._updatePersonWizardDraft({
                                          [key]: Array.from(next),
                                      });
                                  }}
                              />
                              <span>${row.entity}</span>
                          </label>
                      `)
                    : html`<div class="muted">No ${title.toLowerCase()} configured yet.</div>`}
            </div>
        `;

        const renderReview = () => {
            const previewId = slugifyId(draft.id || draft.name);
            const selectedCalendars = calendars.filter((c) => calendarIds.has(c.entity));
            const selectedTodos = todos.filter((t) => todoIds.has(t.entity));
            return html`
                <div class="wizardGrid full">
                    <div class="row">
                        <div>Name</div>
                        <div class="muted">${draft.name || '—'}</div>
                    </div>
                    <div class="row">
                        <div>ID</div>
                        <div class="muted">${previewId || '—'}</div>
                    </div>
                    <div class="row">
                        <div>Colour</div>
                        <div class="unitRow">
                            <span
                                style="width:14px;height:14px;border-radius:999px;border:1px solid var(--fb-grid);background:${draft.color || '#36B37E'};display:inline-block"
                            ></span>
                            <span class="muted">${draft.color || 'default'}</span>
                        </div>
                    </div>
                    <div class="row">
                        <div>Header row</div>
                        <div class="muted">Row ${Number(draft.header_row) || 1}</div>
                    </div>
                    <div class="row">
                        <div>Calendars</div>
                        <div class="muted">
                            ${selectedCalendars.length
                                ? selectedCalendars.map((c) => c.entity).join(', ')
                                : 'None'}
                        </div>
                    </div>
                    <div class="row">
                        <div>Todo lists</div>
                        <div class="muted">
                            ${selectedTodos.length
                                ? selectedTodos.map((t) => t.entity).join(', ')
                                : 'None'}
                        </div>
                    </div>
                    ${otherPeople.length
                        ? html`<div class="muted">
                              Existing people keep their order unless you later reorder in People order.
                          </div>`
                        : html``}
                </div>
            `;
        };

        const canNext =
            step === 0 ? canNextFromBasics : true;

        return html`
            <div
                class="infoBackdrop"
                @click=${(e) => e.target === e.currentTarget && this._closePersonWizard()}
            >
                <div class="wizardDlg">
                    <div class="infoHead">
                        <div>${mode === 'edit' ? 'Edit person' : 'Add person'} wizard</div>
                        <button class="btn" @click=${() => this._closePersonWizard()}>Cancel</button>
                    </div>
                    <div class="wizardSteps">
                        ${steps.map(
                            (label, idx) => html`
                                <div class="wizardStep ${idx === step ? 'active' : ''}">
                                    ${idx + 1}. ${label}
                                </div>
                            `
                        )}
                    </div>
                    ${step === 0
                        ? renderBasics()
                        : step === 1
                        ? renderEntityAssign('Calendars', calendars, calendarIds, 'calendarIds')
                        : step === 2
                        ? renderEntityAssign('Todo lists', todos, todoIds, 'todoIds')
                        : renderReview()}
                    ${this._personWizardError
                        ? html`<div class="wizardError">${this._personWizardError}</div>`
                        : html``}
                    <div class="wizardNav">
                        <button
                            class="btn"
                            ?disabled=${step <= 0}
                            @click=${() => this._setPersonWizardStep(step - 1)}
                        >
                            Back
                        </button>
                        <div class="unitRow">
                            <button class="btn secondary" @click=${() => this._closePersonWizard()}>
                                Cancel
                            </button>
                            ${step < 3
                                ? html`<button
                                      class="btn"
                                      ?disabled=${!canNext}
                                      @click=${() => this._setPersonWizardStep(step + 1)}
                                  >
                                      Next
                                  </button>`
                                : html`<button class="btn" @click=${() => this._applyPersonWizard()}>
                                      Confirm
                                  </button>`}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _renderAdminLocked({ card, hasPin }) {
        return html`
            <div class="wrap">
                <div class="section fb-card">
                    <div class="title">Admin access</div>
                    <div class="panelBody">
                        ${hasPin
                            ? html`
                                  <div class="muted">
                                      Enter the admin PIN to unlock settings on this device.
                                  </div>
                                  <div class="row">
                                      <div>PIN</div>
                                      <div class="unitRow">
                                          <input
                                              class="input"
                                              type="password"
                                              .value=${this._pinValue || ''}
                                              @input=${(e) => (this._pinValue = e.target.value)}
                                          />
                                          <button
                                              class="btn"
                                              @click=${async () => {
                                                  const ok = await card._tryAdminUnlock?.(
                                                      this._pinValue
                                                  );
                                                  if (ok) this._pinValue = '';
                                              }}
                                          >
                                              Unlock
                                          </button>
                                      </div>
                                  </div>
                              `
                            : html`<div class="muted">
                                  No admin PIN is set. Ask an admin to configure one.
                              </div>`}
                    </div>
                </div>
            </div>
        `;
    }

    _renderPreferencesDebugCacheStatus({ card, hasAdminAccess, formatAge, formatTs, refreshReasonLabel }) {
        if (!(hasAdminAccess && card._debug)) return html``;
        return html`
            <div class="subTitle">Cache status</div>
            <div class="row">
                <div>Calendar</div>
                <div class="muted">
                    ${formatAge(card._calendarLastSuccessTs)} (${formatTs(card._calendarLastSuccessTs)})
                </div>
            </div>
            <div class="row">
                <div>Todos</div>
                <div class="muted">
                    ${formatAge(card._todoLastSuccessTs)} (${formatTs(card._todoLastSuccessTs)})
                </div>
            </div>
            <div class="row">
                <div>Shopping</div>
                <div class="muted">
                    ${formatAge(card._shoppingLastSuccessTs)} (${formatTs(card._shoppingLastSuccessTs)})
                </div>
            </div>
            <div class="row">
                <div>Cache write</div>
                <div class="muted">
                    ${formatAge(card._dataCache?.meta?.updatedAt)} (${formatTs(
                        card._dataCache?.meta?.updatedAt
                    )})
                </div>
            </div>
            <div class="row">
                <div>Last refresh</div>
                <div class="muted">
                    ${refreshReasonLabel} · ${formatAge(card._lastRefreshTs)} (${formatTs(
                        card._lastRefreshTs
                    )})
                </div>
            </div>
            <div class="row">
                <div>IndexedDB</div>
                <div class="muted">
                    ${card._idbFailed ? card._idbError || 'Unavailable' : 'Available'}
                </div>
            </div>
            <div class="row">
                <div>Cache tools</div>
                <div class="unitRow">
                    <button
                        class="btn"
                        @click=${() => {
                            const ok = window.confirm('Clear cached data for this device?');
                            if (ok) card._clearDataCacheAndRefresh?.();
                        }}
                    >
                        Clear data cache
                    </button>
                    <button
                        class="btn"
                        @click=${() => {
                            const ok = window.confirm('Clear cached config for this device?');
                            if (ok) card._clearConfigCacheAndReload?.();
                        }}
                    >
                        Clear config cache
                    </button>
                    <button
                        class="btn"
                        @click=${() => {
                            const ok = window.confirm('Clear cached preferences for this device?');
                            if (ok) card._clearPrefsCache?.();
                        }}
                    >
                        Clear prefs cache
                    </button>
                </div>
            </div>
            <div class="muted">Clears local caches on this device and forces a refresh.</div>
            <div class="row">
                <div>State</div>
                <div class="muted">
                    ${card._calendarError
                        ? 'Calendar error'
                        : card._calendarStale
                        ? 'Calendar stale'
                        : 'Calendar ok'}
                    ·
                    ${card._todoError
                        ? 'Chores error'
                        : card._todoStale
                        ? 'Chores stale'
                        : 'Chores ok'}
                    ·
                    ${card._shoppingError
                        ? 'Shopping error'
                        : card._shoppingStale
                        ? 'Shopping stale'
                        : 'Shopping ok'}
                </div>
            </div>
        `;
    }

    _renderAdminReliabilitySettings({ card, adminV2, backupStatus }) {
        if (!card?._v2FeatureEnabled?.('admin_dashboard')) return html``;
        return html`
            <div class="section fb-card" style="margin-top:10px;">
                <div class="titleRow">
                    <div class="title">Admin Settings</div>
                </div>
                <div class="panelBody">
                    <div class="subTitle">V2 Admin Reliability</div>
                    <div class="muted">
                        Backup freshness indicator and manual snapshot action for the V2 Admin
                        dashboard.
                    </div>
                    <div class="row">
                        <div>Backup last-success entity</div>
                        <input
                            class="input"
                            placeholder="sensor.last_backup_success"
                            .value=${adminV2.backup_last_success_entity || ''}
                            @change=${(e) =>
                                card._updateConfigPartial({
                                    admin_v2: {
                                        ...adminV2,
                                        backup_last_success_entity: e.target.value,
                                    },
                                })}
                        />
                    </div>
                    <div class="row">
                        <div>Backup stale threshold</div>
                        <div class="unitRow">
                            <input
                                class="input"
                                type="number"
                                min="1"
                                .value=${Number(adminV2.backup_stale_hours || 48)}
                                @change=${(e) =>
                                    card._updateConfigPartial({
                                        admin_v2: {
                                            ...adminV2,
                                            backup_stale_hours: Math.max(
                                                1,
                                                Number(e.target.value || 48)
                                            ),
                                        },
                                    })}
                            />
                            <span class="unit">hours</span>
                        </div>
                    </div>
                    <div class="row">
                        <div>Snapshot now service</div>
                        <input
                            class="input"
                            placeholder="backup.create"
                            .value=${adminV2.snapshot_service || ''}
                            @change=${(e) =>
                                card._updateConfigPartial({
                                    admin_v2: {
                                        ...adminV2,
                                        snapshot_service: e.target.value,
                                    },
                                })}
                        />
                    </div>
                    <div class="muted">
                        Current backup status:
                        ${backupStatus.status}
                        ${backupStatus.entityId ? ` · ${backupStatus.entityId}` : ''}
                        ${backupStatus.detail ? ` · ${backupStatus.detail}` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    _renderDialogs(card) {
        const cfg = card?._config || {};
        const calendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];
        const todos = Array.isArray(cfg.todos) ? cfg.todos : [];
        const people = Array.isArray(cfg.people) ? cfg.people : [];
        return html`
            ${this._renderPersonWizardDialog(card, { calendars, todos, people })}
            ${this._resetStep
                ? html`<div
                      class="infoBackdrop"
                      @click=${(e) => e.target === e.currentTarget && (this._resetStep = 0)}
                  >
                      <div class="infoDlg">
                          <div class="infoHead">
                              <div>
                                  ${this._resetStep === 1
                                      ? 'Reset preferences?'
                                      : 'Confirm reset'}
                              </div>
                          </div>
                          <div class="muted">
                              ${this._resetStep === 1
                                  ? 'This will reset all per-device preferences back to defaults.'
                                  : 'Are you 100% sure you want to reset everything on this device?'}
                          </div>
                          <div class="actions">
                              ${this._resetStep === 1
                                  ? html`
                                        <button class="btn" @click=${() => (this._resetStep = 0)}>
                                            Cancel
                                        </button>
                                        <button class="btn" @click=${() => (this._resetStep = 2)}>
                                            Yes
                                        </button>
                                    `
                                  : html`
                                        <button
                                            class="btn"
                                            @click=${() => {
                                                card._resetPrefsToDefaults?.();
                                                this._resetStep = 0;
                                            }}
                                        >
                                            Yes, really reset
                                        </button>
                                        <button class="btn" @click=${() => (this._resetStep = 0)}>
                                            Cancel
                                        </button>
                                    `}
                          </div>
                      </div>
                  </div>`
                : html``}
            ${this._resetDashboardStep
                ? html`<div
                      class="infoBackdrop"
                      @click=${(e) =>
                          !this._resetDashboardBusy &&
                          e.target === e.currentTarget &&
                          (this._resetDashboardStep = 0)}
                  >
                      <div class="infoDlg">
                          <div class="infoHead">
                              <div>
                                  ${this._resetDashboardStep === 1
                                      ? 'Reset dashboard?'
                                      : 'Confirm dashboard reset'}
                              </div>
                          </div>
                          <div class="muted">
                              ${this._resetDashboardStep === 1
                                  ? 'This clears dashboard config for this device and resets onboarding.'
                                  : 'This is destructive. Config, prefs, and cached data will be cleared for this user/device.'}
                          </div>
                          <div class="actions">
                              ${this._resetDashboardStep === 1
                                  ? html`
                                        <button
                                            class="btn"
                                            ?disabled=${this._resetDashboardBusy}
                                            @click=${() => (this._resetDashboardStep = 0)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            class="btn"
                                            ?disabled=${this._resetDashboardBusy}
                                            @click=${() => (this._resetDashboardStep = 2)}
                                        >
                                            Yes
                                        </button>
                                    `
                                  : html`
                                        <button
                                            class="btn"
                                            ?disabled=${this._resetDashboardBusy}
                                            @click=${async () => {
                                                this._resetDashboardBusy = true;
                                                try {
                                                    const userId = card?._hass?.user?.id || '';
                                                    const result = await card._resetAll?.(userId);
                                                    if (!result?.ok) {
                                                        card._showErrorToast?.(
                                                            'Reset dashboard failed',
                                                            'Please try again.'
                                                        );
                                                    }
                                                } finally {
                                                    this._resetDashboardBusy = false;
                                                    this._resetDashboardStep = 0;
                                                }
                                            }}
                                        >
                                            ${this._resetDashboardBusy
                                                ? 'Resetting...'
                                                : 'Yes, really reset dashboard'}
                                        </button>
                                        <button
                                            class="btn"
                                            ?disabled=${this._resetDashboardBusy}
                                            @click=${() => (this._resetDashboardStep = 0)}
                                        >
                                            Cancel
                                        </button>
                                    `}
                          </div>
                      </div>
                  </div>`
                : html``}
            ${this._infoOpen
                ? html`<div
                      class="infoBackdrop"
                      @click=${(e) => e.target === e.currentTarget && (this._infoOpen = false)}
                  >
                      <div class="infoDlg">
                          <div class="infoHead">
                              <div>${this._infoTitle || 'Info'}</div>
                              <button class="btn" @click=${() => (this._infoOpen = false)}>
                                  Close
                              </button>
                          </div>
                          <div class="muted">${this._infoText || ''}</div>
                      </div>
                  </div>`
                : html``}
        `;
    }

    _scrollToSection(sectionId) {
        if (!sectionId || !this.renderRoot) return;
        const target = this.renderRoot.querySelector(`#${sectionId}`);
        target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }

    _renderSettingsPanelTabs({ card, showAdminPanel, showAuditPanel }) {
        const pending = Boolean(card?._hasPendingSettingsChanges?.());
        const mainPanel = this._settingsPanel || 'settings';
        const canShowAdmin = Boolean(showAdminPanel || showAuditPanel);
        const settingsTabs = [
            { id: 'sources', label: 'Sources', section: 'settings-sources' },
            { id: 'people', label: 'People', section: 'settings-people' },
            { id: 'family-panels', label: 'Family Panels', section: 'settings-family-panels' },
            { id: 'value-config', label: 'Value Config', section: 'settings-value-config' },
            { id: 'home-controls', label: 'Home Controls', section: 'settings-home-controls' },
            { id: 'bins', label: 'Bins', section: 'settings-bins' },
        ];
        const preferenceTabs = [
            { id: 'health', label: 'Health & Drift', section: 'prefs-health' },
            { id: 'styles', label: 'Styles & Config', section: 'prefs-styles' },
            { id: 'reminders', label: 'Reminders', section: 'prefs-reminders' },
        ];
        return html`
            <div class="panelTabs">
                <div class="tabs" role="tablist" aria-label="Settings panels">
                    <button
                        class="btn ${mainPanel === 'settings' ? 'active' : ''}"
                        @click=${() => (this._settingsPanel = 'settings')}
                    >
                        Settings
                    </button>
                    <button
                        class="btn ${mainPanel === 'preferences' ? 'active' : ''}"
                        @click=${() => (this._settingsPanel = 'preferences')}
                    >
                        Preferences
                    </button>
                    ${canShowAdmin
                        ? html`<button
                              class="btn ${mainPanel === 'admin' ? 'active' : ''}"
                              @click=${() => (this._settingsPanel = 'admin')}
                          >
                              Admin
                          </button>`
                        : html``}
                </div>
                <div class="subTabs" role="tablist" aria-label="Settings sub-tabs">
                    ${mainPanel === 'settings'
                        ? settingsTabs.map(
                              (tab) => html`
                                  <button
                                      class="btn ${this._settingsSettingsTab === tab.id ? 'active' : ''}"
                                      @click=${() => {
                                          this._settingsSettingsTab = tab.id;
                                          this._scrollToSection(tab.section);
                                      }}
                                  >
                                      ${tab.label}
                                  </button>
                              `
                          )
                        : html``}
                    ${mainPanel === 'preferences'
                        ? preferenceTabs.map(
                              (tab) => html`
                                  <button
                                      class="btn ${this._settingsPreferencesTab === tab.id ? 'active' : ''}"
                                      @click=${() => {
                                          this._settingsPreferencesTab = tab.id;
                                          this._scrollToSection(tab.section);
                                      }}
                                  >
                                      ${tab.label}
                                  </button>
                              `
                          )
                        : html``}
                    ${mainPanel === 'admin'
                        ? html`
                              <button
                                  class="btn ${this._settingsAdminTab === 'admin' ? 'active' : ''}"
                                  @click=${() => (this._settingsAdminTab = 'admin')}
                              >
                                  Admin
                              </button>
                              ${showAuditPanel
                                  ? html`<button
                                        class="btn ${this._settingsAdminTab === 'audit'
                                            ? 'active'
                                            : ''}"
                                        @click=${() => (this._settingsAdminTab = 'audit')}
                                    >
                                        Audit
                                    </button>`
                                  : html``}
                          `
                        : html``}
                </div>
                <button
                    class="btn"
                    ?disabled=${!pending}
                    @click=${async () => {
                        await card?._savePendingSettingsChanges?.();
                        this.requestUpdate();
                    }}
                >
                    Save changes
                </button>
                <span class="saveState">${pending ? 'Unsaved changes' : 'All changes saved'}</span>
            </div>
        `;
    }

    render() {
        const card = this.card;
        if (!card) return html``;

        const cfg = card._config || {};
        const calendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];
        const todos = Array.isArray(cfg.todos) ? cfg.todos : [];
        const people = Array.isArray(cfg.people) ? cfg.people : [];
        const shopping = cfg.shopping?.entity || 'Not configured';
        const homeControls = Array.isArray(cfg.home_controls) ? cfg.home_controls : [];
        const bins = Array.isArray(cfg.bins) ? cfg.bins : [];
        const binSchedule = cfg.bin_schedule || {};
        const binScheduleMode = binSchedule.mode || 'simple';
        const binSimple = binSchedule.simple || {};
        const binRotation = binSchedule.rotation || {};
        const rotationPattern =
            this._binRotationPattern !== undefined
                ? this._binRotationPattern
                : buildRotationPatternLabel(bins, binRotation);
        const rotationWeekday =
            this._binRotationWeekday !== undefined
                ? this._binRotationWeekday
                : binRotation.weekday ?? '';
        const rotationAnchor =
            this._binRotationAnchor !== undefined
                ? this._binRotationAnchor
                : binRotation.anchor_date || '';
        const entityIds = Object.keys(card._hass?.states || {}).sort();
        const controllableEntityIds = entityIds.filter((eid) =>
            card._isHomeControlEntityEligible?.(eid)
        );
        const invalidHomeControls = homeControls.filter(
            (eid) => !card._isHomeControlEntityEligible?.(eid)
        );
        const addValue = this._homeControlAdd || '';
        const { hasPeopleDisplay, peopleDisplay, allPeopleIds, peopleDisplayFull } =
            buildPeopleDisplayState(people, cfg.people_display);
        const updatePeopleDisplay = (next) => {
            card._updateConfigPartial({ people_display: next });
        };
        const hasAdminAccess = card._hasAdminAccess?.() || false;
        const isHaAdmin = Boolean(card._hass?.user?.is_admin);
        const hasPin = Boolean(cfg.admin_pin);
        const startHour = Number.isFinite(cfg.day_start_hour)
            ? cfg.day_start_hour
            : DEFAULT_CARD_CONFIG.day_start_hour;
        const endHour = Number.isFinite(cfg.day_end_hour)
            ? cfg.day_end_hour
            : DEFAULT_CARD_CONFIG.day_end_hour;
        const minGapHours = Number(card._slotMinutes || 30) / 60;
        const orderedPeople = peopleDisplayFull
            .map((id) => people.find((p) => p.id === id))
            .filter(Boolean);
        const rawDeviceTheme =
            card._deviceBackgroundTheme !== null && card._deviceBackgroundTheme !== undefined
                ? String(card._deviceBackgroundTheme || '').trim()
                : String(cfg.background_theme || '').trim();
        const legacyThemeMap = {
            mint: 'pale',
            sand: 'pale',
            slate: 'pale',
        };
        const mappedTheme = legacyThemeMap[rawDeviceTheme] || rawDeviceTheme || 'default';
        const deviceTheme = ['default', 'pale', 'dark', 'crystal'].includes(mappedTheme)
            ? mappedTheme
            : 'default';
        const themeSelectValue = deviceTheme === 'default' ? '' : deviceTheme;
        const adaptiveV2 =
            cfg.adaptive_v2 && typeof cfg.adaptive_v2 === 'object' ? cfg.adaptive_v2 : {};
        const intentV2 =
            cfg.intent_v2 && typeof cfg.intent_v2 === 'object' ? cfg.intent_v2 : {};
        const houseModes = card._v2HouseModes?.() || [];
        const houseModeState = card._v2HouseModeState?.() || {
            entityId: '',
            state: '',
            available: false,
        };
        const occupancyState = card._v2OccupancyState?.() || {
            entityId: '',
            state: '',
            available: false,
        };
        const presenceState = card._v2PresenceState?.() || {
            confidence: { entityId: '', available: false, value: null, threshold: 70, uncertain: false },
            occupancy: occupancyState,
            uncertain: false,
        };
        const remindersV2 = Array.isArray(cfg.reminders_v2) ? cfg.reminders_v2 : [];
        const notificationsV2 =
            cfg.notifications_v2 && typeof cfg.notifications_v2 === 'object'
                ? cfg.notifications_v2
                : {};
        const notifyServices = Object.keys(card._hass?.services?.notify || {})
            .map((service) => String(service || '').trim())
            .filter((service) => service && service !== 'reload')
            .sort((a, b) => a.localeCompare(b))
            .map((service) => `notify.${service}`);
        const selectedNotifyServices = Array.from(
            new Set(
                (
                    Array.isArray(notificationsV2.notify_services)
                        ? notificationsV2.notify_services
                        : notificationsV2.notify_service
                        ? [notificationsV2.notify_service]
                        : []
                )
                    .map((service) => String(service || '').trim())
                    .filter(Boolean)
            )
        );
        const notifyServiceOptions = Array.from(
            new Set([...notifyServices, ...selectedNotifyServices])
        ).sort((a, b) => a.localeCompare(b));
        const notificationsEnabled = notificationsV2.enabled !== false;
        const familyDashboardV3 =
            cfg.family_dashboard_v3 && typeof cfg.family_dashboard_v3 === 'object'
                ? cfg.family_dashboard_v3
                : {};
        const familyAdminMenu =
            familyDashboardV3.admin_menu && typeof familyDashboardV3.admin_menu === 'object'
                ? familyDashboardV3.admin_menu
                : {};
        const familyCollectionDefaults = [
            {
                id: 'heating',
                label: 'Heating',
                icon: 'mdi:radiator',
                domains: ['climate', 'switch', 'input_boolean'],
                name_contains: ['heat', 'heating', 'boiler', 'radiator', 'thermostat'],
                entities: [],
            },
            {
                id: 'lighting',
                label: 'Lighting',
                icon: 'mdi:lightbulb-group',
                domains: ['light', 'switch'],
                name_contains: ['light', 'lamp'],
                entities: [],
            },
        ];
        const familyCollectionsRaw = Array.isArray(familyDashboardV3.home_control_collections)
            ? familyDashboardV3.home_control_collections
            : [];
        const familyCollectionById = new Map(
            familyCollectionsRaw
                .filter((entry) => entry && typeof entry === 'object')
                .map((entry) => [String(entry.id || '').toLowerCase(), entry])
                .filter(([id]) => Boolean(id))
        );
        const heatingCollectionCfg = {
            ...familyCollectionDefaults[0],
            ...(familyCollectionById.get('heating') || {}),
        };
        const lightingCollectionCfg = {
            ...familyCollectionDefaults[1],
            ...(familyCollectionById.get('lighting') || {}),
        };
        const heatingEntitiesSelected = Array.isArray(heatingCollectionCfg.entities)
            ? heatingCollectionCfg.entities.map((entity) => String(entity || '').trim()).filter(Boolean)
            : [];
        const lightingEntitiesSelected = Array.isArray(lightingCollectionCfg.entities)
            ? lightingCollectionCfg.entities.map((entity) => String(entity || '').trim()).filter(Boolean)
            : [];
        const homeCollectionEntityOptions = Array.from(
            new Set([...homeControls, ...heatingEntitiesSelected, ...lightingEntitiesSelected])
        )
            .map((entity) => String(entity || '').trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
        const familyMode = card._isFamilyDashboardMode?.() === true;
        const showAdminPanel =
            card._v2FeatureEnabled?.('admin_dashboard') &&
            hasAdminAccess &&
            (!familyMode || familyAdminMenu.admin !== false);
        const showAuditPanel =
            card._v2FeatureEnabled?.('audit_timeline') &&
            hasAdminAccess &&
            (!familyMode || familyAdminMenu.audit !== false);
        const foodV2 = cfg.food_v2 && typeof cfg.food_v2 === 'object' ? cfg.food_v2 : {};
        const adminV2 =
            cfg.admin_v2 && typeof cfg.admin_v2 === 'object' ? cfg.admin_v2 : {};
        const healthV2 =
            cfg.health_v2 && typeof cfg.health_v2 === 'object' ? cfg.health_v2 : {};
        const backupStatus = card._v2BackupStatus?.() || {
            configured: false,
            available: false,
            status: 'Not configured',
            detail: '',
            entityId: '',
            thresholdHours: 48,
        };
        const healthSummary = card._v2HealthSummary?.() || { total: 0, issues: [] };
        const healthWindowsCsv = Array.isArray(healthV2.window_entities)
            ? healthV2.window_entities.join(', ')
            : '';
        const healthHeatingCsv = Array.isArray(healthV2.heating_entities)
            ? healthV2.heating_entities.join(', ')
            : '';
        const healthLightsCsv = Array.isArray(healthV2.lights_watch_entities)
            ? healthV2.lights_watch_entities.join(', ')
            : '';
        const healthDevicesCsv = Array.isArray(healthV2.device_watch_entities)
            ? healthV2.device_watch_entities.join(', ')
            : '';
        const parseEntityCsv = (value) =>
            String(value || '')
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean);
        const parseTextCsv = (value) =>
            String(value || '')
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean);
        const updateHomeControlCollectionEntities = (id, entities) => {
            const updates = new Map(
                familyCollectionDefaults.map((entry) => [entry.id, { ...entry, entities: [] }])
            );
            familyCollectionsRaw.forEach((entry) => {
                if (!entry || typeof entry !== 'object') return;
                const key = String(entry.id || '').toLowerCase();
                if (!key || !updates.has(key)) return;
                updates.set(key, { ...updates.get(key), ...entry });
            });
            if (updates.has(id)) {
                const parsedEntities = Array.isArray(entities)
                    ? entities.map((entity) => String(entity || '').trim()).filter(Boolean)
                    : parseTextCsv(entities);
                updates.set(id, {
                    ...updates.get(id),
                    entities: parsedEntities,
                });
            }
            card._updateConfigPartial({
                family_dashboard_v3: {
                    ...familyDashboardV3,
                    home_control_collections: Array.from(updates.values()),
                },
            });
        };
        const foodUnitsCsv = Array.isArray(foodV2.units) ? foodV2.units.join(', ') : '';
        const cacheMaxAgeMinutes = Number.isFinite(card._cacheMaxAgeMs)
            ? Math.round(card._cacheMaxAgeMs / 60000)
            : 0;
        const formatAge = formatRefreshAge;
        const formatTs = formatTimestamp;
        const refreshReasonLabel = formatRefreshReasonLabel(card._lastRefreshReason || '');
        const wizard = this._personWizardDraft || {};
        const wizardStep = Number(this._personWizardStep || 0);
        const wizardSteps = ['Basics', 'Calendars', 'Todos', 'Review'];
        const personWizardEnabled = Boolean(card._v2FeatureEnabled?.('person_wizard_settings'));
        const weekdayOptions = SETTINGS_WEEKDAY_OPTIONS;
        const binColourOptions = BIN_COLOUR_OPTIONS;
        const adminRenderKey = `${this.renderKey || ''}|${card._v2HealthRenderSig?.() || ''}|${card._lastRefreshTs || 0}`;
        const auditRenderKey = `${this.renderKey || ''}|${card._v2AuditRenderSig?.() || ''}`;
        const updateBinConfig = (nextBins, nextSchedule) => {
            card._updateConfigPartial({
                bins: nextBins,
                bin_schedule: nextSchedule,
            });
            this.requestUpdate();
        };
        const makeBinId = () =>
            `bin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

        if (!hasAdminAccess) return this._renderAdminLocked({ card, hasPin });
        if (!['settings', 'preferences', 'admin'].includes(this._settingsPanel || '')) {
            this._settingsPanel = 'settings';
        }
        if (this._settingsPanel === 'admin' && !(showAdminPanel || showAuditPanel)) {
            this._settingsPanel = 'settings';
        }

        if (this._settingsPanel === 'admin' && (showAdminPanel || showAuditPanel)) {
            const showAudit = this._settingsAdminTab === 'audit' && showAuditPanel;
            return html`
                <div class="wrap hidden">
                    ${this._renderSettingsPanelTabs({ card, showAdminPanel, showAuditPanel })}
                    ${showAudit
                        ? html`<fb-audit-view .card=${card} .renderKey=${auditRenderKey}></fb-audit-view>`
                        : html`
                              <fb-admin-view
                                  .card=${card}
                                  .renderKey=${adminRenderKey}
                              ></fb-admin-view>
                              ${this._renderAdminReliabilitySettings({
                                  card,
                                  adminV2,
                                  backupStatus,
                              })}
                          `}
                </div>
                ${this._renderDialogs(card)}
            `;
        }
        const showSettingsColumn = this._settingsPanel === 'settings';
        const showPreferencesColumn = this._settingsPanel === 'preferences';

        return html`
            <div class="wrap hidden">
                ${this._renderSettingsPanelTabs({ card, showAdminPanel, showAuditPanel })}
                <div class="layout">
                    ${showSettingsColumn
                        ? html`<div class="column">
                        <div class="section fb-card">
                            <div class="titleRow">
                                <div class="title">Sources & Dashboard</div>
                                <button
                                    class="btn icon ghost infoBtn"
                                    title="About sources"
                                    @click=${() => {
                                        this._infoTitle = 'Sources & Dashboard';
                                        this._infoText =
                                            'Manage sources, people order, admin access, home controls, and bins. Each person needs at least one calendar or todo list.';
                                        this._infoOpen = true;
                                    }}
                                >
                                    ⓘ
                                </button>
                            </div>
                            <div class="panelBody">
                                <div id="settings-sources" class="anchorPad"></div>
                                <div class="subTitle">Sources</div>
                                <div class="muted">
                                    Connect calendars, todo lists, people, and the shopping entity.
                                </div>
                                <div class="row">
                                    <div>Calendars</div>
                                    <div class="muted">${calendars.length}</div>
                                </div>
                                ${calendars.length
                                    ? html`<ul>
                                          ${calendars.map((c) => {
                                              const person =
                                                  card._peopleById?.get(
                                                      c.person_id || c.personId || c.person
                                                  ) || null;
                                              return html`<li>
                                                  ${c.entity} ->
                                                  ${person?.name || c.person_id || 'Unmapped'}
                                              </li>`;
                                          })}
                                      </ul>`
                                    : html``}
                                <div class="row">
                                    <div>Todo lists</div>
                                    <div class="muted">${todos.length}</div>
                                </div>
                                ${todos.length
                                    ? html`<ul>
                                          ${todos.map((t) => {
                                              const person =
                                                  card._peopleById?.get(
                                                      t.person_id || t.personId || t.person
                                                  ) || null;
                                              return html`<li>
                                                  ${t.entity} ->
                                                  ${person?.name || t.person_id || 'Unmapped'}
                                              </li>`;
                                          })}
                                      </ul>`
                                    : html``}
                                <div class="row">
                                    <div>People</div>
                                    <div class="muted">${people.length}</div>
                                </div>
                                ${people.length
                                    ? html`<ul>
                                          ${people.map((p) => html`<li>${p.name || p.id}</li>`)}
                                      </ul>`
                                    : html``}
                                <div id="settings-people" class="anchorPad"></div>
                                <div class="subTitle">People</div>
                                <div class="muted">
                                    People and source mapping are configured through first-run setup.
                                    Use Open setup wizard to re-run onboarding without reset.
                                </div>
                                <div class="actions">
                                    <button class="btn" @click=${() => card._openSetupWizard?.()}>
                                        Open setup wizard
                                    </button>
                                    ${personWizardEnabled
                                        ? html`<button
                                              class="btn"
                                              @click=${() => this._openPersonWizard()}
                                          >
                                              Add person (wizard)
                                          </button>`
                                        : html``}
                                </div>
                                ${people.length
                                    ? html`<ul>
                                          ${people.map(
                                              (p) => html`<li>
                                                  ${p.name || p.id}
                                                  ${personWizardEnabled
                                                      ? html`<button
                                                            class="btn sm ghost"
                                                            style="margin-left:8px"
                                                            @click=${() => this._openPersonWizard(p)}
                                                        >
                                                            Edit
                                                        </button>`
                                                      : html``}
                                              </li>`
                                          )}
                                      </ul>`
                                    : html`<div class="muted">No people configured yet.</div>`}
                                <div class="row">
                                    <div>Shopping entity</div>
                                    <div class="muted">${shopping}</div>
                                </div>
                                <div class="actions">
                                    <button class="btn" @click=${() => card._openManageSources()}>
                                        Manage sources
                                    </button>
                                    <button class="btn" @click=${() => card._openHelp()}>ⓘ</button>
                                </div>

                                <div class="subTitle">People order</div>
                                <div class="muted">
                                    Drag names to reorder the header. Two rows mirror the header.
                                </div>
                                ${orderedPeople.length
                                    ? html`<div class="dragList">
                                          ${orderedPeople.map(
                                              (p) => html`
                                                  <div
                                                      class="dragItem ${this._dragPersonId === p.id
                                                          ? 'dragging'
                                                          : ''}"
                                                      draggable="true"
                                                      @dragstart=${(e) => {
                                                          this._dragPersonId = p.id;
                                                          e.dataTransfer.effectAllowed = 'move';
                                                      }}
                                                      @dragover=${(e) => e.preventDefault()}
                                                      @drop=${(e) => {
                                                          e.preventDefault();
                                                          const from = this._dragPersonId;
                                                          if (!from || from === p.id) return;
                                                          const next = [...peopleDisplay];
                                                          const fromIdx = next.indexOf(from);
                                                          const toIdx = next.indexOf(p.id);
                                                          if (fromIdx === -1 || toIdx === -1)
                                                              return;
                                                          next.splice(fromIdx, 1);
                                                          next.splice(toIdx, 0, from);
                                                          updatePeopleDisplay(next);
                                                          this._dragPersonId = '';
                                                      }}
                                                      @dragend=${() => (this._dragPersonId = '')}
                                                  >
                                                      ${p.name || p.id}
                                                  </div>
                                              `
                                          )}
                                      </div>`
                                    : html`<div class="muted">No people configured yet.</div>`}

                                <div class="subTitle">Admin access</div>
                                <div class="muted">
                                    ${isHaAdmin
                                        ? 'You are a Home Assistant admin.'
                                        : 'Admin access is unlocked on this device.'}
                                </div>
                                <div class="row">
                                    <div>Admin PIN</div>
                                    <div class="unitRow">
                                        <input
                                            class="input"
                                            type="password"
                                            placeholder=${hasPin ? '••••' : 'Set PIN'}
                                            .value=${this._pinSetValue || ''}
                                            ?disabled=${!isHaAdmin}
                                            @input=${(e) => (this._pinSetValue = e.target.value)}
                                        />
                                        <button
                                            class="btn"
                                            ?disabled=${!isHaAdmin}
                                            @click=${() => {
                                                card._setAdminPin?.(this._pinSetValue);
                                                this._pinSetValue = '';
                                            }}
                                        >
                                            Save
                                        </button>
                                        <button
                                            class="btn"
                                            ?disabled=${!isHaAdmin}
                                            @click=${() => card._setAdminPin?.('')}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                                ${!isHaAdmin
                                    ? html`
                                          <div class="row">
                                              <div>Device access</div>
                                              <button
                                                  class="btn"
                                                  @click=${() => card._lockAdminAccess?.()}
                                              >
                                                  Lock this device
                                              </button>
                                          </div>
                                      `
                                    : html``}

                                <div id="settings-family-panels" class="anchorPad"></div>
                                <div class="subTitle">Family dashboard panels</div>
                                <div class="muted">
                                    Control which admin-only settings panels are visible to admins.
                                </div>
                                <div class="row">
                                    <div>Family dashboard title</div>
                                    <input
                                        class="input"
                                        placeholder="Family Dashboard"
                                        .value=${familyDashboardV3.title || ''}
                                        @change=${(e) =>
                                            card._updateConfigPartial({
                                                family_dashboard_v3: {
                                                    ...familyDashboardV3,
                                                    title: String(e.target.value || '').trim() ||
                                                        'Family Dashboard',
                                                },
                                            })}
                                    />
                                </div>
                                <div class="row">
                                    <div>People chips per row</div>
                                    <div class="unitRow">
                                        <input
                                            class="input"
                                            type="number"
                                            min="1"
                                            max="8"
                                            .value=${String(
                                                Number(familyDashboardV3.people_chips_per_row || 5) ||
                                                    5
                                            )}
                                            @change=${(e) =>
                                                card._updateConfigPartial({
                                                    family_dashboard_v3: {
                                                        ...familyDashboardV3,
                                                        people_chips_per_row: Math.max(
                                                            1,
                                                            Math.min(
                                                                8,
                                                                Number(e.target.value || 5) || 5
                                                            )
                                                        ),
                                                    },
                                                })}
                                        />
                                        <span class="unit">Default 5</span>
                                    </div>
                                </div>
                                <div class="row">
                                    <div>Show Settings entry</div>
                                    <label>
                                        <input
                                            type="checkbox"
                                            .checked=${familyAdminMenu.settings !== false}
                                            @change=${(e) =>
                                                card._updateConfigPartial({
                                                    family_dashboard_v3: {
                                                        ...familyDashboardV3,
                                                        admin_menu: {
                                                            ...familyAdminMenu,
                                                            settings: e.target.checked,
                                                        },
                                                    },
                                                })}
                                        />
                                        <span class="muted">
                                            ${familyAdminMenu.settings !== false ? 'On' : 'Off'}
                                        </span>
                                    </label>
                                </div>
                                <div class="row">
                                    <div>Show Admin panel tab</div>
                                    <label>
                                        <input
                                            type="checkbox"
                                            .checked=${familyAdminMenu.admin !== false}
                                            @change=${(e) =>
                                                card._updateConfigPartial({
                                                    family_dashboard_v3: {
                                                        ...familyDashboardV3,
                                                        admin_menu: {
                                                            ...familyAdminMenu,
                                                            admin: e.target.checked,
                                                        },
                                                    },
                                                })}
                                        />
                                        <span class="muted">
                                            ${familyAdminMenu.admin !== false ? 'On' : 'Off'}
                                        </span>
                                    </label>
                                </div>
                                <div class="row">
                                    <div>Show Audit panel tab</div>
                                    <label>
                                        <input
                                            type="checkbox"
                                            .checked=${familyAdminMenu.audit !== false}
                                            @change=${(e) =>
                                                card._updateConfigPartial({
                                                    family_dashboard_v3: {
                                                        ...familyDashboardV3,
                                                        admin_menu: {
                                                            ...familyAdminMenu,
                                                            audit: e.target.checked,
                                                        },
                                                    },
                                                })}
                                        />
                                        <span class="muted">
                                            ${familyAdminMenu.audit !== false ? 'On' : 'Off'}
                                        </span>
                                    </label>
                                </div>

                                <div id="settings-value-config" class="anchorPad"></div>
                                <div class="subTitle">Food quantity units</div>
                                <div class="muted">
                                    Comma-separated units available in recipe ingredients.
                                </div>
                                <div class="row">
                                    <div>Units</div>
                                    <input
                                        class="input"
                                        placeholder="grams, oz, kg, breasts, legs"
                                        .value=${foodUnitsCsv}
                                        @change=${(e) =>
                                            card._updateConfigPartial({
                                                food_v2: {
                                                    ...foodV2,
                                                    units: parseTextCsv(e.target.value),
                                                },
                                            })}
                                    />
                                </div>

                                <div id="settings-home-controls" class="anchorPad"></div>
                                <div class="subTitle">Home control collections</div>
                                <div class="muted">
                                    Override which entities appear in the Ambient Heating and Lighting
                                    collection buttons.
                                </div>
                                <div class="row">
                                    <div>Heating entities</div>
                                    <select
                                        class="input multiSelect"
                                        multiple
                                        @change=${(e) =>
                                            updateHomeControlCollectionEntities(
                                                'heating',
                                                Array.from(e.target.selectedOptions || []).map(
                                                    (option) => option.value
                                                )
                                            )}
                                    >
                                        ${homeCollectionEntityOptions.map((entityId) => {
                                            const state = card._hass?.states?.[entityId];
                                            const name =
                                                String(
                                                    state?.attributes?.friendly_name || entityId
                                                ).trim() || entityId;
                                            return html`<option
                                                value=${entityId}
                                                ?selected=${heatingEntitiesSelected.includes(entityId)}
                                            >
                                                ${name} (${entityId})
                                            </option>`;
                                        })}
                                    </select>
                                </div>
                                <div class="row">
                                    <div>Lighting entities</div>
                                    <select
                                        class="input multiSelect"
                                        multiple
                                        @change=${(e) =>
                                            updateHomeControlCollectionEntities(
                                                'lighting',
                                                Array.from(e.target.selectedOptions || []).map(
                                                    (option) => option.value
                                                )
                                            )}
                                    >
                                        ${homeCollectionEntityOptions.map((entityId) => {
                                            const state = card._hass?.states?.[entityId];
                                            const name =
                                                String(
                                                    state?.attributes?.friendly_name || entityId
                                                ).trim() || entityId;
                                            return html`<option
                                                value=${entityId}
                                                ?selected=${lightingEntitiesSelected.includes(entityId)}
                                            >
                                                ${name} (${entityId})
                                            </option>`;
                                        })}
                                    </select>
                                </div>
                                ${homeCollectionEntityOptions.length
                                    ? html`<div class="muted">
                                          Choose from entities currently shown on Home controls.
                                      </div>`
                                    : html`<div class="muted">
                                          Add entities in Home controls first, then assign them to
                                          Heating or Lighting collections.
                                      </div>`}

                                <div class="subTitle">Home controls</div>
                                <div class="muted">Pick entities to show on the Home view.</div>
                                <div class="row">
                                    <div>Add entity</div>
                                    <div class="unitRow">
                                        <select
                                            class="input"
                                            .value=${addValue}
                                            @change=${(e) => (this._homeControlAdd = e.target.value)}
                                        >
                                            <option value="">Select entity</option>
                                            ${controllableEntityIds.map(
                                                (eid) =>
                                                    html`<option value=${eid}>${eid}</option>`
                                            )}
                                        </select>
                                        <button
                                            class="btn"
                                            ?disabled=${!addValue}
                                            @click=${async () => {
                                                if (!addValue) return;
                                                if (!controllableEntityIds.includes(addValue)) return;
                                                if (homeControls.includes(addValue)) return;
                                                const next = [...homeControls, addValue];
                                                await card._updateConfigPartial({
                                                    home_controls: next,
                                                });
                                                this._homeControlAdd = '';
                                                this.requestUpdate();
                                            }}
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                                ${invalidHomeControls.length
                                    ? html`
                                          <div class="row">
                                              <div class="muted">
                                                  ${invalidHomeControls.length} invalid home control${invalidHomeControls.length === 1 ? '' : 's'} selected
                                              </div>
                                              <button
                                                  class="btn"
                                                  @click=${async () => {
                                                      const next = homeControls.filter(
                                                          (eid) =>
                                                              !invalidHomeControls.includes(eid)
                                                      );
                                                      await card._updateConfigPartial({
                                                          home_controls: next,
                                                      });
                                                      this.requestUpdate();
                                                  }}
                                              >
                                                  Remove invalid
                                              </button>
                                          </div>
                                      `
                                    : html``}
                                ${homeControls.length
                                    ? homeControls.map(
                                          (eid) => html`
                                              <div class="row">
                                                  <div>
                                                      ${eid}
                                                      ${invalidHomeControls.includes(eid)
                                                          ? html` <span class="muted">(Unavailable)</span>`
                                                          : html``}
                                                  </div>
                                                  <button
                                                      class="btn"
                                                      @click=${async () => {
                                                          const next = homeControls.filter(
                                                              (item) => item !== eid
                                                          );
                                                          await card._updateConfigPartial({
                                                              home_controls: next,
                                                          });
                                                          this.requestUpdate();
                                                      }}
                                                  >
                                                      Remove
                                                  </button>
                                              </div>
                                          `
                                      )
                                    : html`<div class="muted">No home controls selected.</div>`}

                                <div id="settings-bins" class="anchorPad"></div>
                                <div class="subTitle">Bin collections</div>
                                <div class="muted">
                                    Configure up to 10 bins and set collection schedules.
                                </div>
                                <div class="actions">
                                    <button
                                        class="btn"
                                        ?disabled=${bins.length >= 10}
                                        @click=${() => {
                                            if (bins.length >= 10) return;
                                            const next = [
                                                ...bins,
                                                {
                                                    id: makeBinId(),
                                                    name: `Bin ${bins.length + 1}`,
                                                    colour: '#7E57C2',
                                                    icon: 'mdi:trash-can',
                                                    enabled: true,
                                                },
                                            ];
                                            updateBinConfig(next, binSchedule);
                                        }}
                                    >
                                        Add bin
                                    </button>
                                </div>
                                ${bins.length
                                    ? bins.map(
                                          (bin, idx) => html`
                                              <div class="row binRow">
                                                  <span
                                                      class="rowDot"
                                                      style="--row-dot:${bin.colour || '#1e1e1e'}"
                                                  ></span>
                                                  <div class="unitRow">
                                                      <input
                                                          type="checkbox"
                                                          .checked=${bin.enabled !== false}
                                                          @change=${(e) => {
                                                              const next = bins.map((b, i) =>
                                                                  i === idx
                                                                      ? {
                                                                            ...b,
                                                                            enabled:
                                                                                e.target.checked,
                                                                        }
                                                                      : b
                                                              );
                                                              updateBinConfig(next, binSchedule);
                                                          }}
                                                      />
                                                  </div>
                                                  <input
                                                      class="input"
                                                      style="flex:1"
                                                      placeholder="Name"
                                                      .value=${bin.name || ''}
                                                      @change=${(e) => {
                                                          const next = bins.map((b, i) =>
                                                              i === idx
                                                                  ? { ...b, name: e.target.value }
                                                                  : b
                                                          );
                                                          updateBinConfig(next, binSchedule);
                                                      }}
                                                  />
                                                  <select
                                                      class="input"
                                                      .value=${bin.colour || '#1e1e1e'}
                                                      @change=${(e) => {
                                                          const next = bins.map((b, i) =>
                                                              i === idx
                                                                  ? {
                                                                        ...b,
                                                                        colour: e.target.value,
                                                                    }
                                                                  : b
                                                          );
                                                          updateBinConfig(next, binSchedule);
                                                      }}
                                                  >
                                                      ${binColourOptions.map(
                                                          (opt) => html`
                                                              <option
                                                                  value=${opt.colour}
                                                              >
                                                                  ${opt.label}
                                                              </option>
                                                          `
                                                      )}
                                                  </select>
                                                  <input
                                                      class="input"
                                                      style="width:160px"
                                                      placeholder="mdi:trash-can"
                                                      .value=${bin.icon || ''}
                                                      @change=${(e) => {
                                                          const next = bins.map((b, i) =>
                                                              i === idx
                                                                  ? { ...b, icon: e.target.value }
                                                                  : b
                                                          );
                                                          updateBinConfig(next, binSchedule);
                                                      }}
                                                  />
                                                  <button
                                                      class="btn"
                                                      @click=${() => {
                                                          const next = bins.filter(
                                                              (_, i) => i !== idx
                                                          );
                                                          const nextSimple = { ...binSimple };
                                                          delete nextSimple[bin.id];
                                                          const nextRotation = {
                                                              ...binRotation,
                                                              weeks: Array.isArray(
                                                                  binRotation.weeks
                                                              )
                                                                  ? binRotation.weeks.map(
                                                                        (week) => ({
                                                                            ...week,
                                                                            bins: Array.isArray(
                                                                                week.bins
                                                                            )
                                                                                ? week.bins.filter(
                                                                                      (id) =>
                                                                                          id !==
                                                                                          bin.id
                                                                                  )
                                                                                : [],
                                                                        })
                                                                    )
                                                                  : [],
                                                          };
                                                          updateBinConfig(next, {
                                                              ...binSchedule,
                                                              simple: nextSimple,
                                                              rotation: nextRotation,
                                                          });
                                                      }}
                                                  >
                                                      Remove
                                                  </button>
                                              </div>
                                          `
                                      )
                                    : html`<div class="muted">No bins configured yet.</div>`}

                                <div class="subTitle">Bin schedules</div>
                                <div class="muted">
                                    Choose a schedule mode and define collection timing.
                                </div>
                                <div class="subTitle">Rotation helper</div>
                                <div class="muted">
                                    Enter a comma-separated sequence of bin names (use + to combine
                                    bins for the same week). Example: Blue, Black, Brown, Black,
                                    Blue, Black, Brown.
                                </div>
                                <div class="row">
                                    <div>Pattern</div>
                                    <input
                                        class="input"
                                        style="flex:1"
                                        placeholder="Blue, Black, Brown, Black"
                                        .value=${rotationPattern}
                                        @input=${(e) =>
                                            (this._binRotationPattern = e.target.value)}
                                    />
                                </div>
                                <div class="row">
                                    <div>Weekday</div>
                                    <select
                                        class="input"
                                        .value=${String(rotationWeekday)}
                                        @change=${(e) =>
                                            (this._binRotationWeekday = e.target.value)}
                                    >
                                        <option value="">Weekday</option>
                                        ${weekdayOptions.map(
                                            (opt) => html`
                                                <option value=${opt.value}>${opt.label}</option>
                                            `
                                        )}
                                    </select>
                                    <input
                                        class="input"
                                        type="date"
                                        .value=${rotationAnchor}
                                        @change=${(e) =>
                                            (this._binRotationAnchor = e.target.value)}
                                    />
                                    <button
                                        class="btn"
                                        @click=${() => {
                                            const pattern = String(rotationPattern || '').trim();
                                            const weekday =
                                                rotationWeekday === ''
                                                    ? null
                                                    : Number(rotationWeekday);
                                            const anchor = String(rotationAnchor || '').trim();
                                            if (!pattern) {
                                                card._showErrorToast?.(
                                                    'Rotation helper',
                                                    'Enter a pattern.'
                                                );
                                                return;
                                            }
                                            if (!Number.isFinite(weekday)) {
                                                card._showErrorToast?.(
                                                    'Rotation helper',
                                                    'Pick a weekday.'
                                                );
                                                return;
                                            }
                                            if (!anchor) {
                                                card._showErrorToast?.(
                                                    'Rotation helper',
                                                    'Pick an anchor date.'
                                                );
                                                return;
                                            }
                                            const binMap = new Map(
                                                bins.map((b) => [
                                                    String(b.name || b.id).toLowerCase(),
                                                    b.id,
                                                ])
                                            );
                                            const unknown = new Set();
                                            const weeks = pattern
                                                .split(',')
                                                .map((entry) =>
                                                    entry
                                                        .split('+')
                                                        .map((part) => part.trim())
                                                        .filter(Boolean)
                                                )
                                                .map((names) => {
                                                    const ids = names
                                                        .map((name) => {
                                                            const id = binMap.get(
                                                                name.toLowerCase()
                                                            );
                                                            if (!id) unknown.add(name);
                                                            return id;
                                                        })
                                                        .filter(Boolean);
                                                    return { bins: ids };
                                                })
                                                .filter((week) => week.bins.length);
                                            if (unknown.size) {
                                                card._showErrorToast?.(
                                                    'Rotation helper',
                                                    `Unknown bins: ${Array.from(
                                                        unknown
                                                    ).join(', ')}`
                                                );
                                                return;
                                            }
                                            if (!weeks.length) {
                                                card._showErrorToast?.(
                                                    'Rotation helper',
                                                    'Pattern did not match any bins.'
                                                );
                                                return;
                                            }
                                            updateBinConfig(bins, {
                                                ...binSchedule,
                                                mode: 'rotation',
                                                rotation: {
                                                    ...binRotation,
                                                    weekday,
                                                    anchor_date: anchor,
                                                    weeks,
                                                },
                                            });
                                        }}
                                    >
                                        Apply rotation
                                    </button>
                                </div>
                                <div class="row">
                                    <div>Schedule mode</div>
                                    <div class="toggleGroup" role="group" aria-label="Schedule mode">
                                        <button
                                            class="toggleBtn ${binScheduleMode === 'simple'
                                                ? 'active'
                                                : ''}"
                                            @click=${() =>
                                                updateBinConfig(bins, {
                                                    ...binSchedule,
                                                    mode: 'simple',
                                                })}
                                        >
                                            Simple repeat
                                        </button>
                                        <button
                                            class="toggleBtn ${binScheduleMode === 'rotation'
                                                ? 'active'
                                                : ''}"
                                            @click=${() =>
                                                updateBinConfig(bins, {
                                                    ...binSchedule,
                                                    mode: 'rotation',
                                                })}
                                        >
                                            Rotation
                                        </button>
                                    </div>
                                </div>
                                ${binScheduleMode === 'simple'
                                    ? html`
                                          <div class="muted">
                                              Set a weekday, repeat interval, and anchor date for
                                              each bin.
                                          </div>
                                          ${bins.map((bin) => {
                                              const cfg = binSimple?.[bin.id] || {};
                                              return html`
                                                  <div class="row">
                                                      <div style="min-width:120px">
                                                          ${bin.name || 'Bin'}
                                                      </div>
                                                      <select
                                                          class="input"
                                                          .value=${String(
                                                              cfg.weekday ?? ''
                                                          )}
                                                          @change=${(e) => {
                                                              const raw = e.target.value;
                                                              const nextWeekday =
                                                                  raw === '' ? null : Number(raw);
                                                              const nextSimple = {
                                                                  ...binSimple,
                                                                  [bin.id]: {
                                                                      ...cfg,
                                                                      weekday: nextWeekday,
                                                                  },
                                                              };
                                                              updateBinConfig(bins, {
                                                                  ...binSchedule,
                                                                  simple: nextSimple,
                                                              });
                                                          }}
                                                          @input=${(e) => {
                                                              e.target.dispatchEvent(
                                                                  new Event('change')
                                                              );
                                                          }}
                                                      >
                                                          <option value="">Weekday</option>
                                                          ${weekdayOptions.map(
                                                              (opt) => html`
                                                                  <option
                                                                      value=${opt.value}
                                                                  >
                                                                      ${opt.label}
                                                                  </option>
                                                              `
                                                          )}
                                                      </select>
                                                      <input
                                                          class="input"
                                                          style="width:120px"
                                                          type="number"
                                                          min="1"
                                                          max="8"
                                                          .value=${cfg.every ?? 1}
                                                          @change=${(e) => {
                                                              const nextSimple = {
                                                                  ...binSimple,
                                                                  [bin.id]: {
                                                                      ...cfg,
                                                                      every: Number(
                                                                          e.target.value
                                                                      ),
                                                                  },
                                                              };
                                                              updateBinConfig(bins, {
                                                                  ...binSchedule,
                                                                  simple: nextSimple,
                                                              });
                                                          }}
                                                      />
                                                      <input
                                                          class="input"
                                                          type="date"
                                                          .value=${cfg.anchor_date || ''}
                                                          @change=${(e) => {
                                                              const nextSimple = {
                                                                  ...binSimple,
                                                                  [bin.id]: {
                                                                      ...cfg,
                                                                      anchor_date: e.target.value,
                                                                  },
                                                              };
                                                              updateBinConfig(bins, {
                                                                  ...binSchedule,
                                                                  simple: nextSimple,
                                                              });
                                                          }}
                                                      />
                                                  </div>
                                              `;
                                          })}
                                      `
                                    : html`
                                          <div class="muted">
                                              Pick the collection weekday and define a repeating
                                              sequence of weeks.
                                          </div>
                                          <div class="row">
                                              <div>Weekday</div>
                                              <select
                                                  class="input"
                                                  .value=${String(binRotation.weekday ?? '')}
                                                  @change=${(e) => {
                                                      const raw = e.target.value;
                                                      const nextWeekday =
                                                          raw === '' ? null : Number(raw);
                                                      updateBinConfig(bins, {
                                                          ...binSchedule,
                                                          rotation: {
                                                              ...binRotation,
                                                              weekday: nextWeekday,
                                                          },
                                                      });
                                                  }}
                                                  @input=${(e) => {
                                                      e.target.dispatchEvent(new Event('change'));
                                                  }}
                                              >
                                                  <option value="">Weekday</option>
                                                  ${weekdayOptions.map(
                                                      (opt) => html`
                                                          <option value=${opt.value}>
                                                              ${opt.label}
                                                          </option>
                                                      `
                                                  )}
                                              </select>
                                              <input
                                                  class="input"
                                                  type="date"
                                                  .value=${binRotation.anchor_date || ''}
                                                  @change=${(e) =>
                                                      updateBinConfig(bins, {
                                                          ...binSchedule,
                                                          rotation: {
                                                              ...binRotation,
                                                              anchor_date: e.target.value,
                                                          },
                                                      })}
                                              />
                                          </div>
                                          <div class="actions">
                                              <button
                                                  class="btn"
                                                  @click=${() => {
                                                      const weeks = Array.isArray(
                                                          binRotation.weeks
                                                      )
                                                          ? binRotation.weeks
                                                          : [];
                                                      const nextWeeks = [
                                                          ...weeks,
                                                          { bins: [] },
                                                      ];
                                                      updateBinConfig(bins, {
                                                          ...binSchedule,
                                                          rotation: {
                                                              ...binRotation,
                                                              weeks: nextWeeks,
                                                          },
                                                      });
                                                  }}
                                              >
                                                  Add week
                                              </button>
                                          </div>
                                          ${(Array.isArray(binRotation.weeks)
                                              ? binRotation.weeks
                                              : []
                                          ).map(
                                              (week, weekIdx) => html`
                                                  <div class="row">
                                                      <div style="min-width:80px">
                                                          Week ${weekIdx + 1}
                                                      </div>
                                                      <div class="unitRow" style="flex-wrap:wrap">
                                                          ${bins.map((bin) => {
                                                              const weekBins = Array.isArray(
                                                                  week.bins
                                                              )
                                                                  ? week.bins
                                                                  : [];
                                                              const checked = weekBins.includes(
                                                                  bin.id
                                                              );
                                                              return html`
                                                                  <label
                                                                      style="display:inline-flex;align-items:center;gap:6px;margin-right:8px"
                                                                  >
                                                                      <input
                                                                          type="checkbox"
                                                                          .checked=${checked}
                                                                          @change=${(e) => {
                                                                              const weeks = Array.isArray(
                                                                                  binRotation.weeks
                                                                              )
                                                                                  ? binRotation.weeks
                                                                                  : [];
                                                                              const nextWeeks = weeks.map(
                                                                                  (w, i) => {
                                                                                      if (
                                                                                          i !==
                                                                                          weekIdx
                                                                                      )
                                                                                          return w;
                                                                                      const binsForWeek = Array.isArray(
                                                                                          w.bins
                                                                                      )
                                                                                          ? w.bins
                                                                                          : [];
                                                                                      const nextBins = e
                                                                                          .target
                                                                                          .checked
                                                                                          ? [
                                                                                                ...new Set(
                                                                                                    [
                                                                                                        ...binsForWeek,
                                                                                                        bin.id,
                                                                                                    ]
                                                                                                ),
                                                                                            ]
                                                                                          : binsForWeek.filter(
                                                                                                (
                                                                                                    id
                                                                                                ) =>
                                                                                                    id !==
                                                                                                    bin.id
                                                                                            );
                                                                                      return {
                                                                                          ...w,
                                                                                          bins: nextBins,
                                                                                      };
                                                                                  }
                                                                              );
                                                                              updateBinConfig(
                                                                                  bins,
                                                                                  {
                                                                                      ...binSchedule,
                                                                                      rotation: {
                                                                                          ...binRotation,
                                                                                          weeks: nextWeeks,
                                                                                      },
                                                                                  }
                                                                              );
                                                                          }}
                                                                      />
                                                                      ${bin.name || 'Bin'}
                                                                  </label>
                                                              `;
                                                          })}
                                                      </div>
                                                      <button
                                                          class="btn"
                                                          @click=${() => {
                                                              const weeks = Array.isArray(
                                                                  binRotation.weeks
                                                              )
                                                                  ? binRotation.weeks
                                                                  : [];
                                                              const nextWeeks = weeks.filter(
                                                                  (_, i) => i !== weekIdx
                                                              );
                                                              updateBinConfig(bins, {
                                                                  ...binSchedule,
                                                                  rotation: {
                                                                      ...binRotation,
                                                                      weeks: nextWeeks,
                                                                  },
                                                              });
                                                          }}
                                                      >
                                                          Remove
                                                      </button>
                                                  </div>
                                              `
                                          )}
                                      `}

                            </div>
                        </div>
                    </div>`
                        : html``}

                    ${showPreferencesColumn
                        ? html`<div class="column">
                        <div class="section fb-card">
                            <div class="titleRow">
                                <div class="title">Preferences</div>
                                <button
                                    class="infoBtn"
                                    title="About preferences"
                                    @click=${() => {
                                        this._infoTitle = 'Preferences';
                                        this._infoText =
                                            'Preferences are stored per user/device. Theme controls the overall look. Use Reset all defaults to clear this device back to the base settings.';
                                        this._infoOpen = true;
                                    }}
                                >
                                    ⓘ
                                </button>
                            </div>
                            <div class="panelBody">
                                <div id="prefs-styles" class="anchorPad"></div>
                                <div class="muted">
                                    Saved per user/device unless stated otherwise.
                                </div>
                                <div class="row">
                                    <div>Theme (this device)</div>
                                    <select
                                        class="input"
                                        .value=${themeSelectValue}
                                        @change=${(e) =>
                                            card._updateConfigPartial({
                                                background_theme: e.target.value || '',
                                            })}
                                    >
                                        <option value="">Current</option>
                                        <option value="pale">Pale</option>
                                        <option value="dark">Dark mode</option>
                                        <option value="crystal">Crystal glass</option>
                                    </select>
                                </div>
                                <div class="muted">
                                    Stored per user/device and does not affect other devices.
                                </div>
                                <div class="row">
                                    <div>Refresh interval</div>
                                    <div class="unitRow">
                                        <input
                                            class="input"
                                            type="number"
                                            min="1"
                                            .value=${Math.round(card._refreshIntervalMs / 60000)}
                                            @change=${(e) =>
                                                card._updateConfigPartial({
                                                    refresh_interval_ms:
                                                        Number(e.target.value) * 60000,
                                                })}
                                        />
                                        <span class="unit">minutes</span>
                                    </div>
                                </div>
                                <div class="muted">How often the board refreshes data.</div>
                                <div class="row">
                                    <div>Cache max age</div>
                                    <div class="unitRow">
                                        <input
                                            class="input"
                                            type="number"
                                            min="0"
                                            .value=${cacheMaxAgeMinutes}
                                            @change=${(e) =>
                                                card._updateConfigPartial({
                                                    cache_max_age_ms:
                                                        Math.max(0, Number(e.target.value)) *
                                                        60000,
                                                })}
                                        />
                                        <span class="unit">minutes</span>
                                    </div>
                                </div>
                                <div class="muted">
                                    Force a refresh when cached data is older than this value.
                                    Use 0 to disable.
                                </div>
                                <div class="muted">
                                    If set lower than the refresh interval, the board refreshes
                                    on the cache max age instead.
                                </div>
                                <div class="row">
                                    <div>Force refresh</div>
                                    <button class="btn" @click=${() => card._forceRefreshAll?.()}>
                                        Refresh now
                                    </button>
                                </div>
                                <div class="row">
                                    <div>Debug</div>
                                    <div class="toggleGroup" role="group" aria-label="Debug toggle">
                                        <button
                                            class="toggleBtn ${card._debug ? 'active' : ''}"
                                            @click=${() =>
                                                card._updateConfigPartial({ debug: true })}
                                        >
                                            On
                                        </button>
                                        <button
                                            class="toggleBtn ${card._debug ? '' : 'active'}"
                                            @click=${() =>
                                                card._updateConfigPartial({ debug: false })}
                                        >
                                            Off
                                        </button>
                                    </div>
                                </div>
                                <div class="muted">
                                    Debug adds console logs and persists in the card config.
                                </div>
                                ${this._renderPreferencesDebugCacheStatus({
                                    card,
                                    hasAdminAccess,
                                    formatAge,
                                    formatTs,
                                    refreshReasonLabel,
                                })}
                                <div class="row">
                                    <div>Time slots (this device)</div>
                                    <select
                                        class="input"
                                        .value=${String(card._slotMinutes || 30)}
                                        @change=${(e) => card._setSlotMinutesPref(e.target.value)}
                                    >
                                        <option value="30">30 minutes</option>
                                        <option value="60">60 minutes</option>
                                    </select>
                                </div>
                                <div class="muted">
                                    Controls schedule zoom on this device only.
                                </div>
                                <div class="row">
                                    <div>Visible hours</div>
                                    <div class="unitRow">
                                        <input
                                            class="input"
                                            type="number"
                                            min="0"
                                            max="24"
                                            step="1"
                                            .value=${startHour}
                                            @change=${(e) =>
                                                card._setDayRange?.({
                                                    startHour: e.target.value,
                                                    endHour,
                                                })}
                                        />
                                        <span class="unit">to</span>
                                        <input
                                            class="input"
                                            type="number"
                                            min="0"
                                            max="24"
                                            step="1"
                                            .value=${endHour}
                                            @change=${(e) =>
                                                card._setDayRange?.({
                                                    startHour,
                                                    endHour: e.target.value,
                                                })}
                                        />
                                        <span class="unit">hours</span>
                                    </div>
                                </div>
                                <div class="muted">
                                    Earliest 00:00, latest 24:00, minimum range ${minGapHours}h.
                                </div>
                                <div class="row">
                                    <div>Default event duration (minutes)</div>
                                    <div class="unitRow">
                                        <input
                                            class="input"
                                            type="number"
                                            min="5"
                                            .value=${card._defaultEventMinutes || 30}
                                            @change=${(e) =>
                                                card._setDefaultEventMinutesPref(e.target.value)}
                                        />
                                        <span class="unit">minutes</span>
                                    </div>
                                </div>
                                <div class="muted">Used when creating new calendar events.</div>
                                <div class="row">
                                    <div>Mobile layout (this device)</div>
                                    <label>
                                        <input
                                            type="checkbox"
                                            .checked=${card._useMobileView}
                                            @change=${(e) => card._setMobileView(e.target.checked)}
                                        />
                                        <span class="muted">
                                            ${card._useMobileView ? 'On' : 'Off'}
                                        </span>
                                    </label>
                                </div>
                                <div class="muted">
                                    Per user/device and only applies on mobile screens.
                                </div>
                                <div class="row">
                                <div>Default landing view (this device)</div>
                            <select
                                class="input"
                                .value=${card._defaultView || 'schedule'}
                                @change=${(e) => card._setDefaultViewPref(e.target.value)}
                            >
                                <option value="schedule">Schedule</option>
                                <option value="important">Important</option>
                                <option value="chores">Chores</option>
                                <option value="shopping">Shopping</option>
                                ${card._v2FeatureEnabled?.('food_view')
                                    ? html`<option value="food">Food</option>`
                                    : html``}
                                ${card._v2FeatureEnabled?.('family_dashboard')
                                    ? html`<option value="family">Family</option>`
                                    : html``}
                                ${card._v2FeatureEnabled?.('intent_view')
                                    ? html`<option value="intent">Intent</option>`
                                    : html``}
                                ${card._v2FeatureEnabled?.('ambient_view')
                                    ? html`<option value="ambient">Ambient</option>`
                                    : html``}
                                <option value="home">Home</option>
                                <option value="settings">Settings</option>
                            </select>
                                </div>
                                <div class="muted">
                                    Used when the board first loads on this device.
                                </div>
                                ${card._v2FeatureEnabled?.('adaptive_layout') ||
                                card._v2FeatureEnabled?.('dynamic_themes')
                                    ? html`
                                          <div class="subTitle">V2 Adaptive & House Modes</div>
                                          <div class="muted">
                                              Auto layout switching, dynamic themes, and explicit
                                              house-mode scaffolding for V2 dashboards.
                                          </div>
                                          <div class="row">
                                              <div>House mode entity</div>
                                              <input
                                                  class="input"
                                                  placeholder="input_select.house_mode"
                                                  .value=${intentV2.house_mode_entity || ''}
                                                  @change=${(e) =>
                                                      card._updateConfigPartial({
                                                          intent_v2: {
                                                              ...intentV2,
                                                              house_mode_entity: e.target.value,
                                                          },
                                                      })}
                                              />
                                          </div>
                                          <div class="muted">
                                              Current:
                                              ${houseModeState.available
                                                  ? `${houseModeState.entityId} = ${houseModeState.state || 'unknown'}`
                                                  : houseModeState.entityId
                                                  ? `Entity not found (${houseModeState.entityId})`
                                                  : 'Not configured'}
                                          </div>
                                          ${houseModeState.entityId
                                              ? html`
                                                    <div class="actions">
                                                        ${houseModes.map(
                                                            (mode) => html`
                                                                <button
                                                                    class="btn"
                                                                    @click=${() =>
                                                                        card._v2SetHouseMode?.(
                                                                            mode.id
                                                                        )}
                                                                >
                                                                    ${mode.label}
                                                                </button>
                                                            `
                                                        )}
                                                    </div>
                                                `
                                              : html``}
                                          <div class="row">
                                              <div>Occupancy entity</div>
                                              <input
                                                  class="input"
                                                  placeholder="person.home / binary_sensor.occupied"
                                                  .value=${adaptiveV2.occupancy_entity || ''}
                                                  @change=${(e) =>
                                                      card._updateConfigPartial({
                                                          adaptive_v2: {
                                                              ...adaptiveV2,
                                                              occupancy_entity: e.target.value,
                                                          },
                                                      })}
                                              />
                                          </div>
                                          <div class="muted">
                                              Current:
                                              ${occupancyState.available
                                                  ? `${occupancyState.entityId} = ${occupancyState.state || 'unknown'}`
                                                  : occupancyState.entityId
                                                  ? `Entity not found (${occupancyState.entityId})`
                                                  : 'Not configured'}
                                          </div>
                                          <div class="row">
                                              <div>Presence confidence entity</div>
                                              <input
                                                  class="input"
                                                  placeholder="sensor.presence_confidence"
                                                  .value=${adaptiveV2.confidence_entity || ''}
                                                  @change=${(e) =>
                                                      card._updateConfigPartial({
                                                          adaptive_v2: {
                                                              ...adaptiveV2,
                                                              confidence_entity:
                                                                  e.target.value,
                                                          },
                                                      })}
                                              />
                                          </div>
                                          <div class="row">
                                              <div>Uncertain if below</div>
                                              <div class="unitRow">
                                                  <input
                                                      class="input"
                                                      type="number"
                                                      min="1"
                                                      max="100"
                                                      .value=${Number(
                                                          adaptiveV2.confidence_uncertain_below ??
                                                              70
                                                      )}
                                                      @change=${(e) =>
                                                          card._updateConfigPartial({
                                                              adaptive_v2: {
                                                                  ...adaptiveV2,
                                                                  confidence_uncertain_below:
                                                                      Math.max(
                                                                          1,
                                                                          Math.min(
                                                                              100,
                                                                              Number(
                                                                                  e.target.value ||
                                                                                      70
                                                                              )
                                                                          )
                                                                      ),
                                                              },
                                                          })}
                                                  />
                                                  <span class="unit">%</span>
                                              </div>
                                          </div>
                                          <div class="muted">
                                              Presence confidence:
                                              ${presenceState.confidence?.available
                                                  ? `${presenceState.confidence.value}% (threshold ${presenceState.confidence.threshold}%)${presenceState.uncertain ? ' · Uncertain' : ''}`
                                                  : presenceState.confidence?.entityId
                                                  ? `Entity not found or non-numeric (${presenceState.confidence.entityId})`
                                                  : 'Not configured'}
                                          </div>
                                          <div class="row">
                                              <div>Auto screen switching (V2)</div>
                                              <label>
                                                  <input
                                                      type="checkbox"
                                                      .checked=${adaptiveV2.auto_screen === true}
                                                      @change=${(e) =>
                                                          card._updateConfigPartial({
                                                              adaptive_v2: {
                                                                  ...adaptiveV2,
                                                                  auto_screen:
                                                                      e.target.checked,
                                                              },
                                                          })}
                                                  />
                                                  <span class="muted">
                                                      ${adaptiveV2.auto_screen === true
                                                          ? 'On'
                                                          : 'Off'}
                                                  </span>
                                              </label>
                                          </div>
                                          <div class="row">
                                              <div>Auto screen idle delay</div>
                                              <div class="unitRow">
                                                  <input
                                                      class="input"
                                                      type="number"
                                                      min="30"
                                                      step="30"
                                                      .value=${Number(
                                                          adaptiveV2.auto_screen_idle_seconds || 180
                                                      )}
                                                      @change=${(e) =>
                                                          card._updateConfigPartial({
                                                              adaptive_v2: {
                                                                  ...adaptiveV2,
                                                                  auto_screen_idle_seconds:
                                                                      Number(e.target.value) || 180,
                                                              },
                                                          })}
                                                  />
                                                  <span class="unit">seconds</span>
                                              </div>
                                          </div>
                                          <div class="row">
                                              <div>Dynamic themes (V2)</div>
                                              <label>
                                                  <input
                                                      type="checkbox"
                                                      .checked=${adaptiveV2.dynamic_theme === true}
                                                      @change=${(e) =>
                                                          card._updateConfigPartial({
                                                              adaptive_v2: {
                                                                  ...adaptiveV2,
                                                                  dynamic_theme:
                                                                      e.target.checked,
                                                              },
                                                          })}
                                                  />
                                                  <span class="muted">
                                                      ${adaptiveV2.dynamic_theme === true
                                                          ? 'On'
                                                          : 'Off'}
                                                  </span>
                                              </label>
                                          </div>
                                          <div class="muted">
                                              Dynamic theme reacts to time of day, stale/error
                                              states, occupancy, and configured house mode.
                                          </div>
                                      `
                                    : html``}
                                ${card._v2FeatureEnabled?.('reminder_banners')
                                    ? html`
                                          <div id="prefs-reminders" class="anchorPad"></div>
                                          <div class="subTitle">V2 Reminders</div>
                                          <div class="muted">
                                              Timed reminder banners with optional countdown and
                                              sound.
                                          </div>
                                          <div class="actions">
                                              <button
                                                  class="btn"
                                                  @click=${() =>
                                                      card._v2PlayReminderSound?.({
                                                          pattern: 'double',
                                                      })}
                                              >
                                                  Test reminder sound
                                              </button>
                                              <button
                                                  class="btn"
                                                  @click=${async () => {
                                                      const next = [
                                                          ...remindersV2,
                                                          {
                                                              id: `rem_${Date.now().toString(36)}`,
                                                              label: 'Reminder',
                                                              message: '',
                                                              time: '09:00',
                                                              enabled: true,
                                                              countdown_minutes: 10,
                                                              sound: true,
                                                              sound_pattern: 'double',
                                                              days: [],
                                                          },
                                                      ];
                                                      await card._v2SaveReminderList?.(next);
                                                  }}
                                              >
                                                  Add reminder
                                              </button>
                                          </div>
                                          <div class="muted">
                                              Empty <code>days</code> means every day. Use 0-6
                                              checkboxes for Sun-Sat.
                                          </div>
                                          ${remindersV2.length
                                              ? html`${remindersV2.map((reminder, idx) => {
                                                    const daySet = new Set(
                                                        Array.isArray(reminder.days)
                                                            ? reminder.days.map(Number)
                                                            : []
                                                    );
                                                    const updateReminder = async (patch) => {
                                                        const next = remindersV2.map((r, i) =>
                                                            i === idx ? { ...r, ...patch } : r
                                                        );
                                                        await card._v2SaveReminderList?.(next);
                                                    };
                                                    return html`
                                                        <div class="fb-card padded" style="margin-top:10px">
                                                            <div class="row">
                                                                <div>Label</div>
                                                                <input
                                                                    class="input"
                                                                    .value=${reminder.label || ''}
                                                                    @change=${(e) =>
                                                                        updateReminder({
                                                                            label: e.target.value,
                                                                        })}
                                                                />
                                                            </div>
                                                            <div class="row">
                                                                <div>Message</div>
                                                                <input
                                                                    class="input"
                                                                    .value=${reminder.message || ''}
                                                                    @change=${(e) =>
                                                                        updateReminder({
                                                                            message:
                                                                                e.target.value,
                                                                        })}
                                                                />
                                                            </div>
                                                            <div class="row">
                                                                <div>Time</div>
                                                                <div class="unitRow">
                                                                    <input
                                                                        class="input"
                                                                        type="time"
                                                                        .value=${reminder.time ||
                                                                        '09:00'}
                                                                        @change=${(e) =>
                                                                            updateReminder({
                                                                                time: e.target
                                                                                    .value,
                                                                            })}
                                                                    />
                                                                    <span class="unit">
                                                                        Countdown
                                                                    </span>
                                                                    <input
                                                                        class="input"
                                                                        type="number"
                                                                        min="0"
                                                                        max="180"
                                                                        style="max-width:90px"
                                                                        .value=${Number(
                                                                            reminder.countdown_minutes ??
                                                                                10
                                                                        )}
                                                                        @change=${(e) =>
                                                                            updateReminder({
                                                                                countdown_minutes:
                                                                                    Number(
                                                                                        e.target
                                                                                            .value
                                                                                    ) || 0,
                                                                            })}
                                                                    />
                                                                    <span class="unit">min</span>
                                                                </div>
                                                            </div>
                                                            <div class="row">
                                                                <div>Options</div>
                                                                <div class="unitRow">
                                                                    <label>
                                                                        <input
                                                                            type="checkbox"
                                                                            .checked=${reminder.enabled !==
                                                                            false}
                                                                            @change=${(e) =>
                                                                                updateReminder({
                                                                                    enabled: e
                                                                                        .target
                                                                                        .checked,
                                                                                })}
                                                                        />
                                                                        <span class="muted">
                                                                            Enabled
                                                                        </span>
                                                                    </label>
                                                                    <label>
                                                                        <input
                                                                            type="checkbox"
                                                                            .checked=${reminder.sound !==
                                                                            false}
                                                                            @change=${(e) =>
                                                                                updateReminder({
                                                                                    sound: e.target
                                                                                        .checked,
                                                                                })}
                                                                        />
                                                                        <span class="muted">
                                                                            Sound
                                                                        </span>
                                                                    </label>
                                                                    <select
                                                                        class="input"
                                                                        style="max-width:120px"
                                                                        .value=${reminder.sound_pattern ||
                                                                        'double'}
                                                                        @change=${(e) =>
                                                                            updateReminder({
                                                                                sound_pattern:
                                                                                    e.target
                                                                                        .value,
                                                                            })}
                                                                    >
                                                                        <option value="double">
                                                                            Double
                                                                        </option>
                                                                        <option value="triple">
                                                                            Triple
                                                                        </option>
                                                                        <option value="long">
                                                                            Long
                                                                        </option>
                                                                    </select>
                                                                    <button
                                                                        class="btn sm"
                                                                        @click=${() =>
                                                                            card._v2PlayReminderSound?.({
                                                                                pattern:
                                                                                    reminder.sound_pattern ||
                                                                                    'double',
                                                                            })}
                                                                    >
                                                                        Test
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div class="row">
                                                                <div>Days</div>
                                                                <div class="unitRow" style="flex-wrap:wrap">
                                                                    ${[
                                                                        ['S', 0],
                                                                        ['M', 1],
                                                                        ['T', 2],
                                                                        ['W', 3],
                                                                        ['T', 4],
                                                                        ['F', 5],
                                                                        ['S', 6],
                                                                    ].map(
                                                                        ([label, day]) => html`
                                                                            <label>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    .checked=${daySet.has(
                                                                                        day
                                                                                    )}
                                                                                    @change=${async (
                                                                                        e
                                                                                    ) => {
                                                                                        const nextDays = new Set(
                                                                                            daySet
                                                                                        );
                                                                                        if (
                                                                                            e.target
                                                                                                .checked
                                                                                        )
                                                                                            nextDays.add(
                                                                                                day
                                                                                            );
                                                                                        else
                                                                                            nextDays.delete(
                                                                                                day
                                                                                            );
                                                                                        await updateReminder(
                                                                                            {
                                                                                                days: Array.from(
                                                                                                    nextDays
                                                                                                ).sort(),
                                                                                            }
                                                                                        );
                                                                                    }}
                                                                                />
                                                                                <span class="muted">
                                                                                    ${label}
                                                                                </span>
                                                                            </label>
                                                                        `
                                                                    )}
                                                                    <button
                                                                        class="btn sm ghost"
                                                                        @click=${() =>
                                                                            updateReminder({
                                                                                days: [],
                                                                            })}
                                                                    >
                                                                        Every day
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div class="actions">
                                                                <button
                                                                    class="btn"
                                                                    @click=${async () => {
                                                                        const next = remindersV2.filter(
                                                                            (_, i) =>
                                                                                i !== idx
                                                                        );
                                                                        await card._v2SaveReminderList?.(
                                                                            next
                                                                        );
                                                                    }}
                                                                >
                                                                    Remove reminder
                                                                </button>
                                                            </div>
                                                        </div>
                                                    `;
                                                })}`
                                              : html`<div class="muted">No reminders configured yet.</div>`}
                                      `
                                    : html``}
                                ${card._v2FeatureEnabled?.('notification_policy')
                                    ? html`
                                          <div class="subTitle">V2 Notification Policy</div>
                                          <div class="muted">
                                              State-aware phone notification scaffolding for alerts
                                              with severity thresholds, reasons, and dashboard
                                              visibility suppression.
                                          </div>
                                          <div class="row">
                                              <div>Phone notifications</div>
                                              <label>
                                                  <input
                                                      type="checkbox"
                                                      .checked=${notificationsEnabled}
                                                      @change=${(e) =>
                                                          card._updateConfigPartial({
                                                              notifications_v2: {
                                                                  ...notificationsV2,
                                                                  enabled: e.target.checked,
                                                              },
                                                          })}
                                                  />
                                                  <span class="muted">
                                                      ${notificationsEnabled ? 'On' : 'Off'}
                                                  </span>
                                              </label>
                                          </div>
                                          <div class="row">
                                              <div>Notify services</div>
                                              <select
                                                  class="input multiSelect"
                                                  multiple
                                                  @change=${(e) =>
                                                      (() => {
                                                          const nextServices = Array.from(
                                                              e.target.selectedOptions || []
                                                          )
                                                              .map((option) =>
                                                                  String(option.value || '').trim()
                                                              )
                                                              .filter(Boolean);
                                                          card._updateConfigPartial({
                                                              notifications_v2: {
                                                                  ...notificationsV2,
                                                                  notify_services: nextServices,
                                                                  notify_service:
                                                                      nextServices[0] || '',
                                                              },
                                                          });
                                                      })()}
                                              >
                                                  ${notifyServiceOptions.map(
                                                      (service) => html`<option
                                                          value=${service}
                                                          ?selected=${selectedNotifyServices.includes(
                                                              service
                                                          )}
                                                      >
                                                          ${service}
                                                      </option>`
                                                  )}
                                              </select>
                                          </div>
                                          ${notifyServiceOptions.length
                                              ? html``
                                              : html`<div class="muted">
                                                    No notify services found. Configure Home
                                                    Assistant mobile app notification services first.
                                                </div>`}
                                          <div class="row">
                                              <div>Minimum severity</div>
                                              <select
                                                  class="input"
                                                  .value=${notificationsV2.min_severity || 'warn'}
                                                  @change=${(e) =>
                                                      card._updateConfigPartial({
                                                          notifications_v2: {
                                                              ...notificationsV2,
                                                              min_severity:
                                                                  e.target.value,
                                                          },
                                                      })}
                                              >
                                                  <option value="info">Info</option>
                                                  <option value="warn">Warn</option>
                                                  <option value="critical">Critical</option>
                                              </select>
                                          </div>
                                          <div class="row">
                                              <div>Suppress when visible</div>
                                              <label>
                                                  <input
                                                      type="checkbox"
                                                      .checked=${notificationsV2.suppress_when_visible !==
                                                      false}
                                                      @change=${(e) =>
                                                          card._updateConfigPartial({
                                                              notifications_v2: {
                                                                  ...notificationsV2,
                                                                  suppress_when_visible:
                                                                      e.target.checked,
                                                              },
                                                          })}
                                                  />
                                                  <span class="muted">
                                                      ${notificationsV2.suppress_when_visible !==
                                                      false
                                                          ? 'On'
                                                          : 'Off'}
                                                  </span>
                                              </label>
                                          </div>
                                          <div class="muted">
                                              Current screen-specific suppression applies to known
                                              dashboard surfaces (Schedule, Chores, Shopping,
                                              Home) when the related issue is already visible.
                                          </div>
                                      `
                                    : html``}
                                ${card._v2FeatureEnabled?.('admin_dashboard')
                                    ? html`
                                          <div id="prefs-health" class="anchorPad"></div>
                                          <div class="subTitle">V2 House Health & Drift</div>
                                          <div class="muted">
                                              Dashboard-visible issue list (instead of push alerts)
                                              for lights left on, windows open, heating conflicts,
                                              and unreachable devices.
                                          </div>
                                          <div class="row">
                                              <div>Window sensors</div>
                                              <input
                                                  class="input"
                                                  placeholder="binary_sensor.kitchen_window, binary_sensor.bedroom_window"
                                                  .value=${healthWindowsCsv}
                                                  @change=${(e) =>
                                                      card._updateConfigPartial({
                                                          health_v2: {
                                                              ...healthV2,
                                                              window_entities: parseEntityCsv(
                                                                  e.target.value
                                                              ),
                                                          },
                                                      })}
                                              />
                                          </div>
                                          <div class="row">
                                              <div>Heating entities</div>
                                              <input
                                                  class="input"
                                                  placeholder="climate.house, switch.boiler"
                                                  .value=${healthHeatingCsv}
                                                  @change=${(e) =>
                                                      card._updateConfigPartial({
                                                          health_v2: {
                                                              ...healthV2,
                                                              heating_entities: parseEntityCsv(
                                                                  e.target.value
                                                              ),
                                                          },
                                                      })}
                                              />
                                          </div>
                                          <div class="row">
                                              <div>Lights watch list</div>
                                              <input
                                                  class="input"
                                                  placeholder="Optional; blank uses Home Controls lights/switches"
                                                  .value=${healthLightsCsv}
                                                  @change=${(e) =>
                                                      card._updateConfigPartial({
                                                          health_v2: {
                                                              ...healthV2,
                                                              lights_watch_entities:
                                                                  parseEntityCsv(
                                                                      e.target.value
                                                                  ),
                                                          },
                                                      })}
                                              />
                                          </div>
                                          <div class="row">
                                              <div>Extra device watch list</div>
                                              <input
                                                  class="input"
                                                  placeholder="Optional entities to flag when unavailable"
                                                  .value=${healthDevicesCsv}
                                                  @change=${(e) =>
                                                      card._updateConfigPartial({
                                                          health_v2: {
                                                              ...healthV2,
                                                              device_watch_entities:
                                                                  parseEntityCsv(
                                                                      e.target.value
                                                                  ),
                                                          },
                                                      })}
                                              />
                                          </div>
                                          <div class="muted">
                                              Current issues detected: ${healthSummary.total || 0}
                                          </div>
                                      `
                                    : html``}
                                <div class="actions">
                                    <button
                                        class="btn"
                                        @click=${() => {
                                            this._resetStep = 1;
                                        }}
                                    >
                                        Reset all defaults
                                    </button>
                                    <button
                                        class="btn"
                                        @click=${() => {
                                            this._resetDashboardStep = 1;
                                        }}
                                    >
                                        Reset dashboard
                                    </button>
                                </div>
                                <div class="muted">
                                    Reset dashboard clears configured people/sources and local caches for
                                    this device.
                                </div>
                            </div>
                        </div>
                    </div>`
                        : html``}
                </div>
            </div>
            ${this._renderDialogs(card)}
        `;
    }
}

customElements.define('fb-settings-view', FbSettingsView);
