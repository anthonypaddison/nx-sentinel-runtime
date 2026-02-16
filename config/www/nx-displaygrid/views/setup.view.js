/* nx-displaygrid - setup wizard
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { sharedViewStyles } from './shared.styles.js';
import { slugifyId } from '../nx-displaygrid.util.js';

const WIZARD_STEPS = ['People', 'Calendars', 'Integrations', 'Review'];

export class FbSetupView extends LitElement {
    static properties = {
        card: { type: Object },
        _draft: { state: true },
        _ready: { state: true },
        _saving: { state: true },
        _saveError: { state: true },
        _stepIndex: { state: true },
        _stepError: { state: true },
        _detectedCalendar: { state: true },
        _detectedTodo: { state: true },
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
        const clone = (list) => (Array.isArray(list) ? list.map((item) => ({ ...item })) : []);
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
            this._draft.people.push({ id: '', name: '', color: '', header_row: 1 });
        }
        this._stepIndex = 0;
        this._stepError = '';
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

    _uniquePersonId(baseId, people, currentIndex) {
        let candidate = slugifyId(baseId);
        if (!candidate) candidate = `person_${currentIndex + 1}`;
        const seen = new Set(
            people
                .map((p, idx) => (idx === currentIndex ? '' : String(p?.id || '').trim()))
                .filter(Boolean)
        );
        if (!seen.has(candidate)) return candidate;
        let i = 2;
        while (seen.has(`${candidate}_${i}`)) i += 1;
        return `${candidate}_${i}`;
    }

    _normalisePeople(people) {
        return people.map((person, idx) => {
            const name = String(person?.name || '').trim();
            const idSeed = String(person?.id || '').trim() || name;
            const id = this._uniquePersonId(idSeed, people, idx);
            return {
                ...(person || {}),
                name,
                id,
                header_row: Number(person?.header_row) === 2 ? 2 : 1,
            };
        });
    }

    _validateStep(stepIndex, draft) {
        const people = Array.isArray(draft.people) ? draft.people : [];
        if (stepIndex === 0) {
            const names = people.map((p) => String(p?.name || '').trim());
            const nonEmpty = names.filter(Boolean);
            if (!nonEmpty.length) return 'Add at least one person name to continue.';
            if (names.some((name) => !name)) return 'Each person row needs a name or should be removed.';
            return '';
        }

        if (stepIndex === 1) {
            const calendars = Array.isArray(draft.calendars) ? draft.calendars : [];
            for (const c of calendars) {
                const entity = String(c?.entity || '').trim();
                if (!entity) return 'Calendar rows need an entity id or should be removed.';
                if (!entity.startsWith('calendar.')) {
                    return `Calendar entity must start with calendar.: ${entity}`;
                }
            }
            return '';
        }

        if (stepIndex === 2) {
            const todos = Array.isArray(draft.todos) ? draft.todos : [];
            for (const t of todos) {
                const entity = String(t?.entity || '').trim();
                if (!entity) return 'Todo rows need an entity id or should be removed.';
                if (!entity.startsWith('todo.')) {
                    return `Todo entity must start with todo.: ${entity}`;
                }
            }
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

    async _finishSetup() {
        const ok = await this._persistStep({ finish: true });
        if (!ok) return;
        this._stepIndex = WIZARD_STEPS.length - 1;
    }

    _addPerson() {
        this._draft.people = Array.isArray(this._draft.people) ? this._draft.people : [];
        this._draft.people.push({ id: '', name: '', color: '', header_row: 1 });
        this.requestUpdate();
    }

    _addCalendarRow() {
        this._draft.calendars = Array.isArray(this._draft.calendars) ? this._draft.calendars : [];
        const firstPersonId = this._draft.people?.[0]?.id || '';
        this._draft.calendars.push({ entity: '', person_id: firstPersonId, role: '' });
        this.requestUpdate();
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
        const stateIds = Object.keys(card?._hass?.states || {});
        const calendarEntities = stateIds.filter((id) => id.startsWith('calendar.')).sort();
        const todoEntities = stateIds.filter((id) => id.startsWith('todo.')).sort();
        const stepIndex = Number(this._stepIndex || 0);
        const isLastStep = stepIndex === WIZARD_STEPS.length - 1;

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
                                      Add at least one person. Names are required and IDs are auto-generated.
                                  </div>
                                  ${people.map(
                                      (p, idx) => html`
                                          <div class="row people">
                                              <input
                                                  placeholder="Name"
                                                  .value=${p.name || ''}
                                                  @input=${(e) => {
                                                      p.name = e.target.value;
                                                      if (!String(p.id || '').trim()) {
                                                          p.id = slugifyId(e.target.value);
                                                      }
                                                  }}
                                              />
                                              <input
                                                  placeholder="id"
                                                  .value=${p.id || ''}
                                                  @input=${(e) => (p.id = e.target.value)}
                                              />
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
                                  <div class="note">
                                      Add calendar entity IDs (for example, calendar.family). You can skip this
                                      and configure only people.
                                  </div>
                                  ${calendars.map(
                                      (c, idx) => html`
                                          <div class="row">
                                              <input
                                                  list="setup-calendar-entities"
                                                  placeholder="calendar.entity_id"
                                                  .value=${c.entity || ''}
                                                  @input=${(e) => (c.entity = e.target.value)}
                                              />
                                              <select
                                                  .value=${c.person_id || ''}
                                                  @change=${(e) => (c.person_id = e.target.value)}
                                              >
                                                  <option value="">Unassigned</option>
                                                  ${people.map(
                                                      (p) => html`<option value=${p.id}>${p.name || p.id}</option>`
                                                  )}
                                              </select>
                                              <select
                                                  .value=${c.role || ''}
                                                  @change=${(e) => (c.role = e.target.value)}
                                              >
                                                  <option value="">Role</option>
                                                  <option value="family">Family</option>
                                                  <option value="routine">Routine</option>
                                              </select>
                                              <button
                                                  class="btn sm"
                                                  @click=${() => {
                                                      calendars.splice(idx, 1);
                                                      this.requestUpdate();
                                                  }}
                                              >
                                                  Delete
                                              </button>
                                          </div>
                                      `
                                  )}
                                  <datalist id="setup-calendar-entities">
                                      ${calendarEntities.map((id) => html`<option value=${id}></option>`)}
                                  </datalist>
                                  <div class="row small">
                                      <button class="btn" @click=${this._addCalendarRow}>Add calendar</button>
                                  </div>
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

                                  <div class="note" style="margin-top:12px">
                                      Detected calendar entities: ${calendarEntities.length}
                                  </div>
                                  <div class="row small">
                                      <select
                                          .value=${this._detectedCalendar || ''}
                                          @change=${(e) => (this._detectedCalendar = e.target.value)}
                                      >
                                          <option value="">Select detected calendar</option>
                                          ${calendarEntities.map((id) => html`<option value=${id}>${id}</option>`)}
                                      </select>
                                      <button
                                          class="btn"
                                          @click=${() => this._addDetectedCalendar(this._detectedCalendar)}
                                      >
                                          Add detected calendar
                                      </button>
                                  </div>

                                  <div class="note" style="margin-top:12px">
                                      Detected todo entities: ${todoEntities.length}
                                  </div>
                                  <div class="row small">
                                      <select
                                          .value=${this._detectedTodo || ''}
                                          @change=${(e) => (this._detectedTodo = e.target.value)}
                                      >
                                          <option value="">Select detected todo</option>
                                          ${todoEntities.map((id) => html`<option value=${id}>${id}</option>`)}
                                      </select>
                                      <button
                                          class="btn"
                                          @click=${() => this._addDetectedTodo(this._detectedTodo)}
                                      >
                                          Add detected todo
                                      </button>
                                  </div>

                                  <div style="font-weight:700;margin-top:10px">Selected todos</div>
                                  ${todos.map(
                                      (t, idx) => html`
                                          <div class="row">
                                              <input
                                                  list="setup-todo-entities"
                                                  placeholder="todo.entity_id"
                                                  .value=${t.entity || ''}
                                                  @input=${(e) => (t.entity = e.target.value)}
                                              />
                                              <input
                                                  placeholder="Name (optional)"
                                                  .value=${t.name || ''}
                                                  @input=${(e) => (t.name = e.target.value)}
                                              />
                                              <select
                                                  .value=${t.person_id || ''}
                                                  @change=${(e) => (t.person_id = e.target.value)}
                                              >
                                                  <option value="">Unassigned</option>
                                                  ${people.map(
                                                      (p) => html`<option value=${p.id}>${p.name || p.id}</option>`
                                                  )}
                                              </select>
                                              <button
                                                  class="btn sm"
                                                  @click=${() => {
                                                      todos.splice(idx, 1);
                                                      this.requestUpdate();
                                                  }}
                                              >
                                                  Delete
                                              </button>
                                          </div>
                                      `
                                  )}
                                  <datalist id="setup-todo-entities">
                                      ${todoEntities.map((id) => html`<option value=${id}></option>`)}
                                  </datalist>
                                  <div class="row small">
                                      <button class="btn" @click=${this._addTodoRow}>Add todo manually</button>
                                  </div>
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
                        ${stepIndex === 2
                            ? html`<button class="btn" ?disabled=${this._saving} @click=${this._skipIntegrations}>
                                  Skip step
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
