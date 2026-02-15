/* Family Board - chores view
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
import '../components/fb-loading.js';
const { LitElement, html, css, repeat } = getHaLit();

import { sharedViewStyles, sharedCardStyles } from './shared.styles.js';
import {
    formatWeekdayShortDayMonthShort,
    parseTodoDueInfo,
    todoItemText,
} from '../family-board.util.js';
import { renderActionButtons } from './action-buttons.js';
export class FbChoresView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
        _activePersonId: { state: true },
    };

    static styles = [
        sharedViewStyles,
        sharedCardStyles,
        css`
        .grid {
            display: grid;
            gap: 12px;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        }
        .personToggles {
            display: inline-flex;
            gap: 6px;
            align-items: center;
            padding: 4px;
            border-radius: 999px;
            background: var(--fb-surface-2);
            border: 1px solid var(--fb-border);
            margin-bottom: 10px;
        }
        .personToggle {
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
        .personToggle.active {
            background: var(--fb-surface);
            box-shadow: var(--shadow-sm);
            font-weight: 700;
        }
        .card {
            overflow: hidden;
        }
        .h {
            --fb-card-header-padding: 6px 8px;
            font-size: 14px;
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
        .dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
        }
        .items {
            padding: 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .item {
            display: flex;
            align-items: center;
            gap: 10px;
            border: 1px solid var(--fb-grid);
            border-radius: 12px;
            padding: 8px 10px;
            background: var(--fb-surface-2);
        }
        .itemTitle {
            font-weight: 700;
        }
        .itemMeta {
            color: var(--fb-muted);
            font-size: 12px;
            margin-top: 2px;
        }
        .item.completed {
            background: var(--fb-surface);
            opacity: 0.6;
        }
        .item.completed .itemTitle {
            text-decoration: line-through;
        }
        .actions {
            margin-left: auto;
            display: inline-flex;
            gap: 0;
            padding-left: 0;
        }
        .actionBtn {
            --fb-btn-bg: transparent;
            --fb-btn-border-width: 0;
            color: var(--fb-muted);
        }
        .deleteBtn {
            color: var(--urgent);
        }
        .editBtn {
            color: var(--info);
        }
        .completeBtn {
            color: var(--success);
        }
        .empty {
            padding: 12px;
            color: var(--fb-muted);
            font-size: 14px;
        }
        `,
    ];

    _itemKey(item, idx) {
        return item?.uid || item?.id || item?.summary || item?.name || String(idx);
    }

    render() {
        const card = this.card;
        if (!card) return html``;

        const repeatItems =
            repeat ||
            ((items, keyFn, templateFn) =>
                (items || []).map((item, idx) => templateFn(item, idx)));

        const todos = Array.isArray(card._config?.todos) ? card._config.todos : [];
        if (!todos.length) {
            return html`<div class="wrap scroll">
                <div class="empty">
                    No chores configured yet.
                    <button
                        class="btn sm"
                        style="margin-left:8px"
                        @click=${() => card._openHelp()}
                    >
                        ⓘ
                    </button>
                </div>
            </div>`;
        }

        if (!card._supportsService?.('todo', 'get_items')) {
            return html`<div class="wrap scroll">
                <div class="empty">
                    Todo services are unavailable. Check that the Todo integration is set up.
                </div>
            </div>`;
        }

        const isTodoLoading = !card._todoLoaded;
        const todoConfigs = todos.filter((t) =>
            card._isPersonAllowed(card._personIdForConfig(t, t.entity))
        );
        const optionMap = new Map();
        for (const t of todoConfigs) {
            const personId = card._personIdForConfig?.(t, t.entity);
            if (!personId) continue;
            if (optionMap.has(personId)) continue;
            const person = card._peopleById?.get(personId);
            optionMap.set(personId, {
                id: personId,
                name: person?.name || t.name || personId,
            });
        }
        const options = [...optionMap.values()];
        const activeId = options.some((o) => o.id === this._activePersonId)
            ? this._activePersonId
            : options[0]?.id || '';
        const visibleTodos = activeId
            ? todoConfigs.filter(
                  (t) => card._personIdForConfig?.(t, t.entity) === activeId
              )
            : todoConfigs;

        return html`
            <div class="wrap scroll">
                ${options.length
                    ? html`<div class="personToggles" role="group" aria-label="People">
                          ${options.map(
                              (opt) => html`
                                  <button
                                      class="personToggle ${activeId === opt.id ? 'active' : ''}"
                                      @click=${() => {
                                          this._activePersonId = opt.id;
                                      }}
                                  >
                                      ${opt.name}
                                  </button>
                              `
                          )}
                      </div>`
                    : html``}
                <div class="grid">
                    ${visibleTodos
                        .map((t) => {
                        const person =
                            card._peopleById?.get(t.person_id || t.personId || t.person) || null;
                        const items = card._todoItems?.[t.entity] || [];
                        const label = person?.name || t.name || t.entity;
                        const colour = person?.color || t.color || card._neutralColor();
                        const canClear = card._supportsService?.('todo', 'remove_completed_items');
                        return html`
                            <div class="card fb-card">
                                <div class="h fb-card-header">
                                    <span class="dot" style="background:${colour}"></span>
                                    <span>${label}</span>
                                    <span style="margin-left:auto" class="muted"
                                        >${items.length}</span
                                    >
                                    <button
                                        class="btn sm icon"
                                        title="Add chore"
                                        @click=${() =>
                                            card._openTodoAddForPerson(
                                                card._personIdForConfig(t, t.entity),
                                                t.entity
                                            )}
                                    >
                                        +
                                    </button>
                                    ${canClear
                                        ? html`<button
                                              class="btn sm"
                                              @click=${() => card._clearCompletedTodos(t.entity)}
                                          >
                                              Clear completed
                                          </button>`
                                        : html``}
                                </div>
                                <div class="items">
                                    ${isTodoLoading
                                        ? html`<fb-loading label="Loading chores..."></fb-loading>`
                                        : items.length
                                        ? repeatItems(
                                              items,
                                              (it, idx) => this._itemKey(it, idx),
                                              (it, idx) => {
                                              const isDone =
                                                  ['completed', 'done'].includes(
                                                      String(it.status || '').toLowerCase()
                                                  ) || Boolean(it.completed);
                                              return html`
                                                  <div
                                                      class="item ${isDone ? 'completed' : ''}"
                                                      data-key=${this._itemKey(it, idx)}
                                                  >
                                                      <div>
                                                          <div class="itemTitle">
                                                              ${todoItemText(it, '(Todo)')}
                                                          </div>
                                                          ${(() => {
                                                              const desc =
                                                                  it.description ||
                                                                  it.notes ||
                                                                  it.note ||
                                                                  it.body;
                                                              if (!desc) return html``;
                                                              return html`<div class="itemMeta">${desc}</div>`;
                                                          })()}
                                                          ${(() => {
                                                              const dueInfo = parseTodoDueInfo(
                                                                  it.due ||
                                                                      it.due_date ||
                                                                      it.due_datetime
                                                              );
                                                              if (!dueInfo?.date)
                                                                  return html``;
                                                              return html`<div class="itemMeta">
                                                                  Due:
                                                                  ${formatWeekdayShortDayMonthShort(
                                                                      dueInfo.date
                                                                  )}
                                                              </div>`;
                                                          })()}
                                                      </div>
                                                      ${renderActionButtons(
                                                          [
                                                              {
                                                                  className:
                                                                      'btn sm icon touch actionBtn deleteBtn',
                                                                  title: 'Delete',
                                                                  icon: 'mdi:close',
                                                                  onClick: () =>
                                                                      card._deleteTodoItem(
                                                                          t.entity,
                                                                          it
                                                                      ),
                                                              },
                                                              {
                                                                  className:
                                                                      'btn sm icon touch actionBtn editBtn',
                                                                  title: 'Edit',
                                                                  icon: 'mdi:pencil',
                                                                  onClick: () =>
                                                                      card._editTodoItem(
                                                                          t.entity,
                                                                          it
                                                                      ),
                                                              },
                                                              {
                                                                  className:
                                                                      'btn sm icon touch actionBtn completeBtn',
                                                                  title: isDone
                                                                      ? 'Mark as incomplete'
                                                                      : 'Mark as complete',
                                                                  icon: 'mdi:check',
                                                                  onClick: () =>
                                                                      card._toggleTodoItem(
                                                                          t.entity,
                                                                          it,
                                                                          !isDone
                                                                      ),
                                                              },
                                                          ],
                                                          { wrapperClass: 'actions' }
                                                      )}
                                                  </div>
                                              `;
                                          }
                                          )
                                        : html`<div class="empty">No chores.</div>`}
                                </div>
                            </div>
                        `;
                    })}
                </div>
            </div>
        `;
    }
}

customElements.define('fb-chores-view', FbChoresView);
