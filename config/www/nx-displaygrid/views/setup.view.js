/* nx-displaygrid - setup wizard
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { sharedViewStyles } from './shared.styles.js';

const WIZARD_STEPS = ['People', 'Calendars', 'Integrations', 'Review'];
const DEFAULT_PEOPLE_COLOURS = ['#36B37E', '#7E57C2', '#F4B400', '#EC407A', '#42A5F5', '#00897B'];
const PEOPLE_COLOUR_OPTIONS = [
    { name: 'Mint', color: '#36B37E', text: '#FFFFFF' },
    { name: 'Violet', color: '#7E57C2', text: '#FFFFFF' },
    { name: 'Amber', color: '#F4B400', text: '#1A1A1A' },
    { name: 'Rose', color: '#EC407A', text: '#FFFFFF' },
    { name: 'Sky', color: '#42A5F5', text: '#FFFFFF' },
    { name: 'Teal', color: '#00897B', text: '#FFFFFF' },
];

export class FbSetupView extends LitElement {
    static properties = {
        card: { type: Object },
        _draft: { state: true },
        _ready: { state: true },
        _saving: { state: true },
        _saveError: { state: true },
        _stepIndex: { state: true },
        _stepError: { state: true },
        _calendarStepSkipped: { state: true },
        _todoStepSkipped: { state: true },
        _detectedCalendar: { state: true },
        _detectedTodo: { state: true },
        _editMode: { state: true },
        _initialConfigSnapshot: { state: true },
    };

    static styles = [
        sharedViewStyles,
        css`
        :host {
            --fb-btn-bg: var(--fb-surface-2);
        }
        .wrap.setup {
            padding: 16px;
        }
        .panel {
            max-width: 940px;
            margin: 0 auto;
            border: 1px solid var(--fb-grid);
            border-radius: 16px;
            background: var(--fb-surface);
            padding: 14px;
            display: grid;
            gap: 10px;
        }
        .h {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-weight: 800;
            font-size: 16px;
        }
        .stepList {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .stepChip {
            border: 1px solid var(--fb-grid);
            border-radius: 999px;
            padding: 4px 10px;
            font-size: 12px;
            color: var(--fb-muted);
        }
        .stepChip.active {
            color: var(--fb-text);
            background: var(--fb-surface-2);
            font-weight: 700;
        }
        .section {
            margin-top: 0;
            border: 1px solid var(--fb-grid);
            border-radius: 12px;
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
            grid-template-columns: 1fr 1fr auto;
        }
        .row.small {
            grid-template-columns: 1fr auto;
        }
        .row.actions {
            grid-template-columns: auto auto;
            justify-content: end;
        }
        input,
        select,
        textarea {
            padding: 8px 10px;
            border-radius: 10px;
            border: 1px solid var(--fb-grid);
            font-size: 14px;
            background: var(--fb-surface);
            color: var(--fb-text);
        }
        textarea {
            min-height: 120px;
            font-family: monospace;
            font-size: 14px;
        }
        .note {
            color: var(--fb-muted);
            font-size: 14px;
            margin-top: 8px;
        }
        .error {
            color: var(--urgent);
            font-size: 14px;
        }
        .summaryList {
            margin: 8px 0 0;
            padding-left: 18px;
            color: var(--fb-muted);
            font-size: 14px;
        }
        @media (max-width: 760px) {
            .row,
            .row.people,
            .row.small,
            .row.actions {
                grid-template-columns: 1fr;
            }
        }
        `,
    ];

    connectedCallback() {
        super.connectedCallback();
        this._initDraft();
    }

    _schemaVersion() {
        return Number(this.card?._onboardingSchemaVersion?.() || 1);
    }

    _initDraft() {
        if (this._ready) return;
        const cfg = this.card?._config || {};
        const defaultColour = DEFAULT_PEOPLE_COLOURS[0];
        const clone = (list) => (Array.isArray(list) ? list.map((item) => ({ ...item })) : []);
        const cloneObj = (obj) => {
            try {
                return JSON.parse(JSON.stringify(obj || {}));
            } catch {
                return { ...(obj || {}) };
            }
        };
        const onboardingRequired = Boolean(this.card?._onboardingRequired?.(cfg));
        this._editMode = Boolean(this.card?._forceSetupWizard && !onboardingRequired);
        this._initialConfigSnapshot = cloneObj(this.card?._sharedConfig || cfg);
        this._draft = {
            ...cfg,
            people: clone(cfg.people),
            calendars: clone(cfg.calendars),
            todos: clone(cfg.todos),
            shopping: cfg.shopping ? { ...cfg.shopping } : {},
            onboardingComplete: false,
            schemaVersion: this._schemaVersion(),
        };
        if (!this._draft.people.length) {
            this._draft.people.push({ id: '', name: '', color: defaultColour, header_row: 1 });
        } else {
            this._draft.people = this._draft.people.map((person) => ({
                ...person,
                color: String(person?.color || '').trim() || defaultColour,
            }));
        }
        this._stepIndex = 0;
        this._stepError = '';
        this._calendarStepSkipped = false;
        this._todoStepSkipped = false;
        this._saveError = '';
        this._detectedCalendar = '';
        this._detectedTodo = '';
        this._ready = true;
    }

    _copyConfig() {
        const yaml = this.card?._buildYamlConfig(this._draft);
        if (!yaml) return;
        navigator.clipboard?.writeText?.(yaml);
    }

    _personIdSeed(name) {
        const lower = String(name || '').trim().toLowerCase();
        const underscored = lower.replace(/\s+/g, '_');
        const cleaned = underscored.replace(/[^a-z0-9_]/g, '').replace(/_+/g, '_');
        return cleaned.replace(/^_+|_+$/g, '');
    }

    _uniquePersonId(baseId, people, currentIndex) {
        let candidate = this._personIdSeed(baseId);
        if (!candidate) candidate = `person${currentIndex + 1}`;
        const seen = new Set(
            people
                .map((p, idx) => (idx === currentIndex ? '' : String(p?.id || '').trim()))
                .map((id) => id.toLowerCase())
                .filter(Boolean)
        );
        if (!seen.has(candidate)) return candidate;
        let i = 1;
        while (seen.has(`${candidate}${i}`)) i += 1;
        return `${candidate}${i}`;
    }

    _peopleColourOptions(people) {
        const options = [...PEOPLE_COLOUR_OPTIONS];
        const seen = new Set(options.map((item) => item.color));
        for (const person of Array.isArray(people) ? people : []) {
            const color = String(person?.color || '').trim();
            if (!color || seen.has(color)) continue;
            options.push({ name: `Custom ${color}`, color, text: '' });
            seen.add(color);
        }
        return options;
    }

    _normalisePeople(people) {
        const defaultColour = DEFAULT_PEOPLE_COLOURS[0];
        const nameCounts = new Map();
        return people.map((person, idx) => {
            const baseName = String(person?.name || '').trim();
            let name = baseName;
            if (baseName) {
                const key = baseName.toLowerCase();
                const seen = (nameCounts.get(key) || 0) + 1;
                nameCounts.set(key, seen);
                if (seen > 1) name = `${baseName} ${seen}`;
            }
            const id = this._uniquePersonId(baseName, people, idx);
            return {
                ...(person || {}),
                name,
                id,
                color: String(person?.color || '').trim() || defaultColour,
                text_color: String(person?.text_color || '').trim(),
                header_row: 1,
            };
        });
    }

    _validateStep(stepIndex, draft) {
        const people = Array.isArray(draft.people) ? draft.people : [];
        if (stepIndex === 0) {
            const names = people.map((p) => String(p?.name || '').trim());
            if (!names.length) return 'Add at least one person name to continue.';
            if (names.some((name) => !name))
                return 'Each person must have a name (blank or whitespace-only names are not allowed).';
            return '';
        }

        if (stepIndex === 1) {
            const calendarOptions = this._calendarEntityOptions();
            if (!calendarOptions.length || this._calendarStepSkipped) return '';
            const calendars = Array.isArray(draft.calendars) ? draft.calendars : [];
            const selectedByPerson = new Map();
            for (const c of calendars) {
                const entity = String(c?.entity || '').trim();
                const personId = String(c?.person_id || '').trim();
                if (!entity || !personId) continue;
                if (!entity.startsWith('calendar.')) return `Calendar entity must start with calendar.: ${entity}`;
                if (!selectedByPerson.has(personId)) selectedByPerson.set(personId, entity);
            }
            const missing = people.some((p) => !selectedByPerson.get(String(p?.id || '').trim()));
            if (missing) return 'Select one calendar for each person, or skip this step.';
            return '';
        }

        if (stepIndex === 2) {
            const todoOptions = this._todoEntityOptions();
            if (!todoOptions.length || this._todoStepSkipped) return '';
            const todos = Array.isArray(draft.todos) ? draft.todos : [];
            const selectedByPerson = new Map();
            for (const t of todos) {
                const entity = String(t?.entity || '').trim();
                const personId = String(t?.person_id || '').trim();
                if (!entity || !personId) continue;
                if (!entity.startsWith('todo.')) return `Todo entity must start with todo.: ${entity}`;
                if (!selectedByPerson.has(personId)) selectedByPerson.set(personId, entity);
            }
            const missing = people.some((p) => !selectedByPerson.get(String(p?.id || '').trim()));
            if (missing) return 'Select one todo list for each person, or skip this step.';
            return '';
        }

        return this._validateStep(0, draft);
    }

    _buildPersistDraft({ finish = false } = {}) {
        const src = this._draft || {};
        const peopleRaw = Array.isArray(src.people) ? src.people : [];
        const calendarsRaw = Array.isArray(src.calendars) ? src.calendars : [];
        const todosRaw = Array.isArray(src.todos) ? src.todos : [];

        const filteredPeople = peopleRaw.filter((p) => String(p?.name || '').trim());
        const people = this._normalisePeople(filteredPeople);
        const personIds = new Set(people.map((p) => p.id));
        const defaultPersonId = people[0]?.id || '';

        const calendars = calendarsRaw
            .map((c) => ({
                ...c,
                entity: String(c?.entity || '').trim(),
                person_id: String(c?.person_id || '').trim(),
                role: String(c?.role || '').trim(),
            }))
            .filter((c) => c.entity)
            .map((c) => ({
                ...c,
                person_id: personIds.has(c.person_id) ? c.person_id : defaultPersonId,
            }));

        const todos = todosRaw
            .map((t) => ({
                ...t,
                entity: String(t?.entity || '').trim(),
                name: String(t?.name || '').trim(),
                person_id: String(t?.person_id || '').trim(),
            }))
            .filter((t) => t.entity)
            .map((t) => ({
                ...t,
                person_id: personIds.has(t.person_id) ? t.person_id : defaultPersonId,
            }));

        const shoppingEntity = String(src.shopping?.entity || '').trim();
        const shopping = shoppingEntity
            ? {
                  ...(src.shopping || {}),
                  entity: shoppingEntity,
              }
            : {};

        return {
            ...src,
            people,
            people_display: people.map((p) => p.id),
            calendars,
            todos,
            shopping,
            onboardingComplete: Boolean(finish),
            schemaVersion: this._schemaVersion(),
        };
    }

    async _persistStep({ finish = false } = {}) {
        if (this._saving) return false;
        const validationError = this._validateStep(this._stepIndex, this._draft || {});
        if (validationError) {
            this._stepError = validationError;
            return false;
        }

        this._saving = true;
        this._saveError = '';
        this._stepError = '';
        try {
            const payload = this._buildPersistDraft({ finish });
            this._draft = payload;
            if (this._editMode && !finish) {
                return true;
            }
            const result = await this.card?._applySetupDraft?.(payload, {
                stepIndex: this._stepIndex,
                stepCount: WIZARD_STEPS.length,
            });
            if (!result?.ok) {
                this._saveError = 'Save failed. Please try again.';
                return false;
            }
            return true;
        } catch {
            this._saveError = 'Save failed. Please try again.';
            return false;
        } finally {
            this._saving = false;
        }
    }

    async _nextStep() {
        const ok = await this._persistStep({ finish: false });
        if (!ok) return;
        this._stepIndex = Math.min(WIZARD_STEPS.length - 1, Number(this._stepIndex || 0) + 1);
    }

    _previousStep() {
        this._stepError = '';
        this._stepIndex = Math.max(0, Number(this._stepIndex || 0) - 1);
    }

    async _skipIntegrations() {
        await this._nextStep();
    }

    async _skipTodoStep() {
        this._todoStepSkipped = true;
        await this._nextStep();
    }

    async _finishSetup() {
        const ok = await this._persistStep({ finish: true });
        if (!ok) return;
        this._stepIndex = WIZARD_STEPS.length - 1;
    }

    _cancelSetup() {
        if (!this.card?._forceSetupWizard) return;
        const snapshot = this._initialConfigSnapshot;
        if (this._editMode && snapshot && typeof this.card?._applyConfigImmediate === 'function') {
            this.card._sharedConfig = { ...snapshot };
            this.card._applyConfigImmediate(snapshot, { useDefaults: false });
        }
        this.card._forceSetupWizard = false;
        this.card._screen = 'settings';
        this.card.requestUpdate?.();
    }

    _addPerson() {
        this._draft.people = Array.isArray(this._draft.people) ? this._draft.people : [];
        this._draft.people.push({ id: '', name: '', color: DEFAULT_PEOPLE_COLOURS[0], header_row: 1 });
        this.requestUpdate();
    }

    _addCalendarRow() {
        this._draft.calendars = Array.isArray(this._draft.calendars) ? this._draft.calendars : [];
        const firstPersonId = this._draft.people?.[0]?.id || '';
        this._draft.calendars.push({ entity: '', person_id: firstPersonId, role: '' });
        this.requestUpdate();
    }

    _calendarEntityOptions() {
        const states = this.card?._hass?.states || {};
        const selectedIds = new Set(
            (Array.isArray(this._draft?.calendars) ? this._draft.calendars : [])
                .map((entry) => String(entry?.entity || '').trim())
                .filter(Boolean)
        );
        const options = Object.keys(states)
            .filter((id) => this._isGoogleCalendarEntity(id))
            .sort()
            .map((id) => ({
                id,
                label: String(states[id]?.attributes?.friendly_name || id),
            }));
        for (const entityId of selectedIds) {
            if (!entityId.startsWith('calendar.')) continue;
            if (!states[entityId]) continue;
            if (options.some((item) => item.id === entityId)) continue;
            options.unshift({
                id: entityId,
                label: String(states[entityId]?.attributes?.friendly_name || entityId),
            });
        }
        return options;
    }

    _personCalendarEntity(personId) {
        const pid = String(personId || '').trim();
        const calendars = Array.isArray(this._draft?.calendars) ? this._draft.calendars : [];
        const found = calendars.find((c) => String(c?.person_id || '').trim() === pid);
        return found ? String(found.entity || '').trim() : '';
    }

    _setPersonCalendarEntity(personId, entityId) {
        const pid = String(personId || '').trim();
        const eid = String(entityId || '').trim();
        const current = Array.isArray(this._draft?.calendars) ? this._draft.calendars : [];
        const next = current.filter((c) => String(c?.person_id || '').trim() !== pid);
        if (eid) next.push({ entity: eid, person_id: pid });
        this._draft.calendars = next;
        this._calendarStepSkipped = false;
        this.requestUpdate();
    }

    _todoEntityOptions() {
        const states = this.card?._hass?.states || {};
        const selectedIds = new Set(
            (Array.isArray(this._draft?.todos) ? this._draft.todos : [])
                .map((entry) => String(entry?.entity || '').trim())
                .filter(Boolean)
        );
        const options = Object.keys(states)
            .filter((id) => this._isTodoistEntity(id))
            .sort()
            .map((id) => ({
                id,
                label: String(states[id]?.attributes?.friendly_name || id),
            }));
        for (const entityId of selectedIds) {
            if (!entityId.startsWith('todo.')) continue;
            if (!states[entityId]) continue;
            if (options.some((item) => item.id === entityId)) continue;
            options.unshift({
                id: entityId,
                label: String(states[entityId]?.attributes?.friendly_name || entityId),
            });
        }
        return options;
    }

    _entitySignals(entityId) {
        const id = String(entityId || '').trim();
        if (!id) return '';
        const hass = this.card?._hass || {};
        const state = hass.states?.[id];
        const reg = hass.entities?.[id] || {};
        return [
            id,
            reg.platform,
            reg.integration,
            reg.original_name,
            reg.icon,
            state?.attributes?.friendly_name,
            state?.attributes?.attribution,
            state?.attributes?.source,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
    }

    _isGoogleCalendarEntity(entityId) {
        const id = String(entityId || '').trim();
        if (!id.startsWith('calendar.')) return false;
        const haystack = this._entitySignals(id);
        return /(^|[^a-z0-9])(google|gmail)([^a-z0-9]|$)/.test(haystack);
    }

    _isTodoistEntity(entityId) {
        const id = String(entityId || '').trim();
        if (!id.startsWith('todo.')) return false;
        const haystack = this._entitySignals(id);
        return /(^|[^a-z0-9])todoist([^a-z0-9]|$)/.test(haystack);
    }

    _personTodoEntity(personId) {
        const pid = String(personId || '').trim();
        const todos = Array.isArray(this._draft?.todos) ? this._draft.todos : [];
        const found = todos.find((t) => String(t?.person_id || '').trim() === pid);
        return found ? String(found.entity || '').trim() : '';
    }

    _setPersonTodoEntity(personId, entityId) {
        const pid = String(personId || '').trim();
        const eid = String(entityId || '').trim();
        const current = Array.isArray(this._draft?.todos) ? this._draft.todos : [];
        const next = current.filter((t) => String(t?.person_id || '').trim() !== pid);
        if (eid) next.push({ entity: eid, person_id: pid });
        this._draft.todos = next;
        this._todoStepSkipped = false;
        this.requestUpdate();
    }

    async _skipCalendarsStep() {
        this._calendarStepSkipped = true;
        await this._nextStep();
    }

    _addTodoRow() {
        this._draft.todos = Array.isArray(this._draft.todos) ? this._draft.todos : [];
        const firstPersonId = this._draft.people?.[0]?.id || '';
        this._draft.todos.push({ entity: '', name: '', person_id: firstPersonId });
        this.requestUpdate();
    }

    _addDetectedCalendar(entityId) {
        const value = String(entityId || '').trim();
        if (!value) return;
        this._draft.calendars = Array.isArray(this._draft.calendars) ? this._draft.calendars : [];
        if (this._draft.calendars.some((c) => c?.entity === value)) return;
        const firstPersonId = this._draft.people?.[0]?.id || '';
        this._draft.calendars.push({ entity: value, person_id: firstPersonId, role: '' });
        this.requestUpdate();
    }

    _addDetectedTodo(entityId) {
        const value = String(entityId || '').trim();
        if (!value) return;
        this._draft.todos = Array.isArray(this._draft.todos) ? this._draft.todos : [];
        if (this._draft.todos.some((t) => t?.entity === value)) return;
        const firstPersonId = this._draft.people?.[0]?.id || '';
        this._draft.todos.push({ entity: value, name: '', person_id: firstPersonId });
        this.requestUpdate();
    }

    render() {
        const card = this.card;
        if (!card) return html``;

        const isAdmin = Boolean(card.hass?.user?.is_admin);
        if (!isAdmin) {
            return html`<div class="wrap scroll setup">
                <div class="panel">
                    <div class="h">Setup required</div>
                    <div class="note">Ask an admin to finish setup.</div>
                </div>
            </div>`;
        }

        const draft = this._draft;
        if (!draft) return html``;

        const people = Array.isArray(draft.people) ? draft.people : [];
        const calendars = Array.isArray(draft.calendars) ? draft.calendars : [];
        const todos = Array.isArray(draft.todos) ? draft.todos : [];
        const calendarOptions = this._calendarEntityOptions();
        const hasCalendarEntities = calendarOptions.length > 0;
        const todoOptions = this._todoEntityOptions();
        const hasTodoEntities = todoOptions.length > 0;
        const stepIndex = Number(this._stepIndex || 0);
        const isLastStep = stepIndex === WIZARD_STEPS.length - 1;
        const canCancel = Boolean(card._forceSetupWizard);
        const peopleColourOptions = this._peopleColourOptions(people);

        return html`
            <div class="wrap scroll setup">
                <div class="panel">
                    <div class="h">
                        <div>First-run setup wizard</div>
                        <button class="btn" @click=${() => card._openHelp()}>Help</button>
                    </div>

                    <div class="stepList">
                        ${WIZARD_STEPS.map(
                            (label, idx) => html`<div class="stepChip ${idx === stepIndex
                                    ? 'active'
                                    : ''}">
                                ${idx + 1}. ${label}
                            </div>`
                        )}
                    </div>

                    ${stepIndex === 0
                        ? html`
                              <div class="section">
                                  <div style="font-weight:700">Step 1: Add people</div>
                                  <div class="note">
                                      What's their name?
                                  </div>
                                  ${people.map(
                                      (p, idx) => html`
                                          <div class="row people">
                                              <input
                                                  placeholder="What's their name?"
                                                  .value=${p.name || ''}
                                                  @input=${(e) => {
                                                      p.name = e.target.value;
                                                      if (!String(p.color || '').trim()) {
                                                          p.color =
                                                              peopleColourOptions[0]?.color ||
                                                              DEFAULT_PEOPLE_COLOURS[0];
                                                      }
                                                      this.requestUpdate();
                                                  }}
                                              />
                                              <select
                                                  .value=${String(p.color || '').trim() ||
                                                  peopleColourOptions[0]?.color ||
                                                  DEFAULT_PEOPLE_COLOURS[0]}
                                                  @change=${(e) => {
                                                      const next = peopleColourOptions.find(
                                                          (item) => item.color === e.target.value
                                                      );
                                                      p.color = next?.color || e.target.value;
                                                      p.text_color = next?.text || '';
                                                      this.requestUpdate();
                                                  }}
                                              >
                                                  ${peopleColourOptions.map(
                                                      (item) =>
                                                          html`<option value=${item.color}>
                                                              ${item.name}
                                                          </option>`
                                                  )}
                                              </select>
                                              <button
                                                  class="btn sm"
                                                  @click=${() => {
                                                      people.splice(idx, 1);
                                                      this.requestUpdate();
                                                  }}
                                              >
                                                  Remove
                                              </button>
                                          </div>
                                      `
                                  )}
                                  <div class="row small">
                                      <button class="btn" @click=${this._addPerson}>Add person</button>
                                  </div>
                              </div>
                          `
                        : html``}

                    ${stepIndex === 1
                        ? html`
                              <div class="section">
                                  <div style="font-weight:700">Step 2: Add calendar sources (optional)</div>
                                  ${hasCalendarEntities
                                      ? html`
                                            <div class="note">
                                                Select one Google Calendar entity per person.
                                            </div>
                                            ${people.map(
                                                (p) => html`
                                                    <div class="row small">
                                                        <div>${p.name || p.id}</div>
                                                        <select
                                                            .value=${this._personCalendarEntity(p.id)}
                                                            @change=${(e) =>
                                                                this._setPersonCalendarEntity(p.id, e.target.value)}
                                                        >
                                                            <option value="">Select calendar</option>
                                                            ${calendarOptions.map(
                                                                (item) =>
                                                                    html`<option value=${item.id}>
                                                                        ${item.label}
                                                                    </option>`
                                                            )}
                                                        </select>
                                                    </div>
                                                `
                                            )}
                                        `
                                      : html`
                                            <div class="note">
                                                No Google Calendar entities were found. Set up Google Calendar in
                                                Home Assistant, then return to this step.
                                            </div>
                                        `}
                              </div>
                          `
                        : html``}

                    ${stepIndex === 2
                        ? html`
                              <div class="section">
                                  <div style="font-weight:700">Step 3: Integrations guidance</div>
                                  <div class="note">
                                      Google Calendar prerequisite: install the Home Assistant integration first.
                                      Docs: https://www.home-assistant.io/integrations/google/
                                  </div>
                                  <div class="note">
                                      Todoist prerequisite: install Todoist integration and create todo lists.
                                      Docs: https://www.home-assistant.io/integrations/todoist/
                                  </div>
                                  ${hasTodoEntities
                                      ? html`
                                            <div class="note" style="margin-top:12px">
                                                Select one Todoist todo list per person.
                                            </div>
                                            ${people.map(
                                                (p) => html`
                                                    <div class="row small">
                                                        <div>${p.name || p.id}</div>
                                                        <select
                                                            .value=${this._personTodoEntity(p.id)}
                                                            @change=${(e) =>
                                                                this._setPersonTodoEntity(p.id, e.target.value)}
                                                        >
                                                            <option value="">Select todo list</option>
                                                            ${todoOptions.map(
                                                                (item) =>
                                                                    html`<option value=${item.id}>
                                                                        ${item.label}
                                                                    </option>`
                                                            )}
                                                        </select>
                                                    </div>
                                                `
                                            )}
                                        `
                                      : html`
                                            <div class="note" style="margin-top:12px">
                                                No Todoist todo entities were found. Set up Todoist in Home
                                                Assistant, then return.
                                            </div>
                                        `}
                              </div>
                          `
                        : html``}

                    ${stepIndex === 3
                        ? html`
                              <div class="section">
                                  <div style="font-weight:700">Step 4: Review + finish</div>
                                  <div class="note">
                                      Save this configuration to complete onboarding for schema version
                                      ${this._schemaVersion()}.
                                  </div>
                                  <div class="row">
                                      <div>People</div>
                                      <div>${people.length}</div>
                                  </div>
                                  <ul class="summaryList">
                                      ${people.map(
                                          (p) => html`<li>${p.name || '(Unnamed)'} (${p.id || 'pending id'})</li>`
                                      )}
                                  </ul>
                                  <div class="row">
                                      <div>Calendars</div>
                                      <div>${calendars.length}</div>
                                  </div>
                                  <ul class="summaryList">
                                      ${calendars.map(
                                          (c) => html`<li>${c.entity || '(unset)'} -> ${c.person_id || 'Unassigned'}</li>`
                                      )}
                                  </ul>
                                  <div class="row">
                                      <div>Todos</div>
                                      <div>${todos.length}</div>
                                  </div>
                                  <ul class="summaryList">
                                      ${todos.map(
                                          (t) => html`<li>${t.entity || '(unset)'} -> ${t.person_id || 'Unassigned'}</li>`
                                      )}
                                  </ul>
                                  <div class="row" style="margin-top:10px">
                                      <div>Config preview</div>
                                  </div>
                                  <textarea readonly .value=${card._buildYamlConfig(draft)}></textarea>
                              </div>
                          `
                        : html``}

                    ${this._stepError ? html`<div class="error">${this._stepError}</div>` : html``}
                    ${this._saveError ? html`<div class="error">${this._saveError}</div>` : html``}

                    <div class="row actions">
                        <button class="btn" ?disabled=${stepIndex === 0 || this._saving} @click=${this._previousStep}>
                            Back
                        </button>
                        ${canCancel
                            ? html`<button class="btn" ?disabled=${this._saving} @click=${this._cancelSetup}>
                                  Cancel
                              </button>`
                            : html``}
                        ${stepIndex === 1
                            ? html`<button class="btn" ?disabled=${this._saving} @click=${this._skipCalendarsStep}>
                                  Skip this step
                              </button>`
                            : html``}
                        ${stepIndex === 2
                            ? html`<button class="btn" ?disabled=${this._saving} @click=${this._skipTodoStep}>
                                  Skip this step
                              </button>`
                            : html``}
                        ${isLastStep
                            ? html`<button class="btn primary" ?disabled=${this._saving} @click=${this._finishSetup}>
                                  ${this._saving ? 'Saving...' : 'Save and finish'}
                              </button>`
                            : html`<button class="btn primary" ?disabled=${this._saving} @click=${this._nextStep}>
                                  ${this._saving ? 'Saving...' : 'Save and continue'}
                              </button>`}
                    </div>

                    <div class="note">
                        Setup progress is saved using Home Assistant storage when available, with local
                        device fallback.
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-setup-view', FbSetupView);
