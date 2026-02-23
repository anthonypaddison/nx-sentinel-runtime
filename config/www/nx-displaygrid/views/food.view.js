/* nx-displaygrid - food view (V2)
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { sharedViewStyles, sharedCardStyles } from './shared.styles.js';

function itemsPreview(items, max = 4) {
    const list = (Array.isArray(items) ? items : []).map((item) => String(item || '').trim()).filter(Boolean);
    if (!list.length) return 'No items';
    if (list.length <= max) return list.join(', ');
    return `${list.slice(0, max).join(', ')} +${list.length - max}`;
}

export class FbFoodView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
        _tab: { state: true },
        _savedListName: { state: true },
        _savedListItems: { state: true },
        _mealName: { state: true },
        _mealItems: { state: true },
        _pantryName: { state: true },
        _pantryQty: { state: true },
        _fridgeName: { state: true },
        _fridgeQty: { state: true },
    };

    constructor() {
        super();
        this._tab = 'menu';
        this._savedListName = '';
        this._savedListItems = '';
        this._mealName = '';
        this._mealItems = '';
        this._pantryName = '';
        this._pantryQty = '';
        this._fridgeName = '';
        this._fridgeQty = '';
    }

    static styles = [
        sharedViewStyles,
        sharedCardStyles,
        css`
        .layout {
            display: grid;
            grid-template-rows: auto 1fr;
            gap: 12px;
            height: 100%;
            min-height: 0;
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
        .content {
            overflow: auto;
            display: grid;
            gap: 12px;
            align-content: start;
            min-height: 0;
        }
        .grid2 {
            display: grid;
            gap: 12px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .panel {
            overflow: hidden;
        }
        .panelBody {
            padding: 10px 12px;
            display: grid;
            gap: 10px;
        }
        .stack {
            display: grid;
            gap: 8px;
        }
        .row {
            display: grid;
            gap: 8px;
            grid-template-columns: minmax(110px, 140px) minmax(0, 1fr) auto;
            align-items: center;
        }
        .row.compact {
            grid-template-columns: minmax(0, 1fr) auto auto;
        }
        .row.menuRow {
            grid-template-columns: minmax(120px, 160px) minmax(170px, 220px) minmax(0, 1fr) auto;
            align-items: start;
        }
        .dayLabel {
            font-weight: 700;
        }
        .mutedSmall {
            color: var(--fb-muted);
            font-size: 12px;
        }
        .input, select, textarea {
            border: 1px solid var(--fb-grid);
            border-radius: 8px;
            padding: 6px 8px;
            font-size: 14px;
            background: var(--fb-surface);
            color: var(--fb-text);
            min-height: 34px;
            width: 100%;
            box-sizing: border-box;
        }
        textarea {
            min-height: 70px;
            resize: vertical;
        }
        .bundleCard {
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            background: var(--fb-surface-2);
            padding: 8px 10px;
            display: grid;
            gap: 6px;
        }
        .bundleHead {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .bundleName {
            font-weight: 700;
            flex: 1;
            min-width: 0;
        }
        .invItem {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto auto;
            gap: 8px;
            align-items: center;
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            padding: 6px 8px;
            background: var(--fb-surface-2);
        }
        .invName.out {
            text-decoration: line-through;
            color: var(--fb-muted);
        }
        .invQty {
            color: var(--fb-muted);
            font-size: 12px;
            white-space: nowrap;
        }
        .sectionHint {
            color: var(--fb-muted);
            font-size: 13px;
            margin-top: -2px;
        }
        @media (max-width: 1100px) {
            .grid2 {
                grid-template-columns: 1fr;
            }
            .row.menuRow {
                grid-template-columns: 1fr;
            }
        }
        `,
    ];

    async _submitSavedList() {
        const card = this.card;
        if (!card) return;
        await card._foodAddSavedList?.({
            name: this._savedListName,
            itemsText: this._savedListItems,
        });
        this._savedListName = '';
        this._savedListItems = '';
    }

    async _submitMeal() {
        const card = this.card;
        if (!card) return;
        await card._foodAddMeal?.({
            name: this._mealName,
            itemsText: this._mealItems,
        });
        this._mealName = '';
        this._mealItems = '';
    }

    async _submitInventory(zone) {
        const card = this.card;
        if (!card) return;
        const isFridge = zone === 'fridge';
        const name = isFridge ? this._fridgeName : this._pantryName;
        const qty = isFridge ? this._fridgeQty : this._pantryQty;
        await card._foodAddInventoryItem?.(zone, { name, qty });
        if (isFridge) {
            this._fridgeName = '';
            this._fridgeQty = '';
        } else {
            this._pantryName = '';
            this._pantryQty = '';
        }
    }

    _renderMenuTab(card, food) {
        const meals = Array.isArray(food?.meals) ? food.meals : [];
        const menu = Array.isArray(food?.menu) ? food.menu : [];
        return html`
            <div class="grid2">
                <div class="panel fb-card">
                    <div class="fb-card-header">Menu (This Week)</div>
                    <div class="panelBody">
                        <div class="sectionHint">
                            Plan a simple weekly menu by weekday and add a meal's shopping items
                            directly to the Shopping view.
                        </div>
                        <div class="stack">
                            ${menu.map((entry) => {
                                const selectedMeal = meals.find((meal) => meal.id === entry.mealId) || null;
                                return html`
                                    <div class="row menuRow">
                                        <div>
                                            <div class="dayLabel">${entry.label}</div>
                                            <div class="mutedSmall">
                                                ${selectedMeal
                                                    ? `${selectedMeal.items.length} shopping item${selectedMeal.items.length === 1 ? '' : 's'}`
                                                    : 'No meal selected'}
                                            </div>
                                        </div>
                                        <select
                                            .value=${entry.mealId || ''}
                                            @change=${(e) =>
                                                card._foodSetMenuDay?.(entry.day, {
                                                    mealId: e.target.value || '',
                                                })}
                                        >
                                            <option value="">No meal</option>
                                            ${meals.map(
                                                (meal) => html`<option value=${meal.id}>${meal.name}</option>`
                                            )}
                                        </select>
                                        <input
                                            class="input"
                                            placeholder="Notes (optional)"
                                            .value=${entry.note || ''}
                                            @change=${(e) =>
                                                card._foodSetMenuDay?.(entry.day, {
                                                    note: e.target.value || '',
                                                })}
                                        />
                                        <button
                                            class="btn"
                                            ?disabled=${!entry.mealId}
                                            @click=${() => card._foodAddMenuDayMealToShopping?.(entry.day)}
                                        >
                                            Add to shopping
                                        </button>
                                    </div>
                                `;
                            })}
                        </div>
                    </div>
                </div>

                <div class="panel fb-card">
                    <div class="fb-card-header">Custom Meals</div>
                    <div class="panelBody">
                        <div class="sectionHint">
                            Each meal can store a reusable shopping list.
                        </div>
                        <div class="stack">
                            <input
                                class="input"
                                placeholder="Meal name"
                                .value=${this._mealName}
                                @input=${(e) => (this._mealName = e.target.value)}
                            />
                            <textarea
                                placeholder="Shopping items (comma or new line separated)"
                                .value=${this._mealItems}
                                @input=${(e) => (this._mealItems = e.target.value)}
                            ></textarea>
                            <div>
                                <button
                                    class="btn"
                                    ?disabled=${!String(this._mealName || '').trim()}
                                    @click=${() => this._submitMeal()}
                                >
                                    Save meal
                                </button>
                            </div>
                            ${meals.length
                                ? meals.map(
                                      (meal) => html`
                                          <div class="bundleCard">
                                              <div class="bundleHead">
                                                  <div class="bundleName">${meal.name}</div>
                                                  <button
                                                      class="btn sm"
                                                      @click=${() => card._foodAddMealToShopping?.(meal.id)}
                                                  >
                                                      Add to shopping
                                                  </button>
                                                  <button
                                                      class="btn sm ghost"
                                                      @click=${() => card._foodRemoveMeal?.(meal.id)}
                                                  >
                                                      Delete
                                                  </button>
                                              </div>
                                              <div class="mutedSmall">${itemsPreview(meal.items, 6)}</div>
                                          </div>
                                      `
                                  )
                                : html`<div class="muted">No meals saved yet.</div>`}
                        </div>
                    </div>
                </div>
            </div>

            <div class="panel fb-card">
                <div class="fb-card-header">Saved Shopping Lists</div>
                <div class="panelBody">
                    <div class="sectionHint">
                        Save reusable shopping bundles (e.g. school lunches, BBQ, cleaning run).
                    </div>
                    <div class="grid2">
                        <div class="stack">
                            <input
                                class="input"
                                placeholder="List name"
                                .value=${this._savedListName}
                                @input=${(e) => (this._savedListName = e.target.value)}
                            />
                            <textarea
                                placeholder="Items (comma or new line separated)"
                                .value=${this._savedListItems}
                                @input=${(e) => (this._savedListItems = e.target.value)}
                            ></textarea>
                            <div>
                                <button
                                    class="btn"
                                    ?disabled=${!String(this._savedListName || '').trim()}
                                    @click=${() => this._submitSavedList()}
                                >
                                    Save list
                                </button>
                            </div>
                        </div>
                        <div class="stack">
                            ${food.savedLists.length
                                ? food.savedLists.map(
                                      (list) => html`
                                          <div class="bundleCard">
                                              <div class="bundleHead">
                                                  <div class="bundleName">${list.name}</div>
                                                  <button
                                                      class="btn sm"
                                                      @click=${() =>
                                                          card._foodAddSavedListToShopping?.(list.id)}
                                                  >
                                                      Add to shopping
                                                  </button>
                                                  <button
                                                      class="btn sm ghost"
                                                      @click=${() => card._foodRemoveSavedList?.(list.id)}
                                                  >
                                                      Delete
                                                  </button>
                                              </div>
                                              <div class="mutedSmall">${itemsPreview(list.items, 8)}</div>
                                          </div>
                                      `
                                  )
                                : html`<div class="muted">No saved shopping lists yet.</div>`}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _renderInventoryColumn(card, title, zone, items) {
        const isFridge = zone === 'fridge';
        const nameValue = isFridge ? this._fridgeName : this._pantryName;
        const qtyValue = isFridge ? this._fridgeQty : this._pantryQty;
        return html`
            <div class="panel fb-card">
                <div class="fb-card-header">${title}</div>
                <div class="panelBody">
                    <div class="row compact">
                        <input
                            class="input"
                            placeholder="Item"
                            .value=${nameValue}
                            @input=${(e) =>
                                isFridge
                                    ? (this._fridgeName = e.target.value)
                                    : (this._pantryName = e.target.value)}
                            @keydown=${(e) => {
                                if (e.key !== 'Enter') return;
                                this._submitInventory(zone);
                            }}
                        />
                        <input
                            class="input"
                            placeholder="Qty"
                            .value=${qtyValue}
                            @input=${(e) =>
                                isFridge
                                    ? (this._fridgeQty = e.target.value)
                                    : (this._pantryQty = e.target.value)}
                            @keydown=${(e) => {
                                if (e.key !== 'Enter') return;
                                this._submitInventory(zone);
                            }}
                            style="max-width:92px"
                        />
                        <button class="btn" @click=${() => this._submitInventory(zone)}>Add</button>
                    </div>
                    ${items.length
                        ? html`<div class="stack">
                              ${items.map(
                                  (item) => html`
                                      <div class="invItem">
                                          <input
                                              type="checkbox"
                                              .checked=${item.inStock !== false}
                                              @change=${() =>
                                                  card._foodToggleInventoryItem?.(zone, item.id)}
                                          />
                                          <div class="invName ${item.inStock === false ? 'out' : ''}">
                                              ${item.name}
                                          </div>
                                          <div class="invQty">${item.qty || '—'}</div>
                                          <button
                                              class="btn sm ghost"
                                              @click=${() =>
                                                  card._foodRemoveInventoryItem?.(zone, item.id)}
                                          >
                                              Delete
                                          </button>
                                      </div>
                                  `
                              )}
                          </div>`
                        : html`<div class="muted">No items yet.</div>`}
                </div>
            </div>
        `;
    }

    _renderHouseTab(card, food) {
        const pantry = Array.isArray(food?.inventory?.pantry) ? food.inventory.pantry : [];
        const fridge = Array.isArray(food?.inventory?.fridge) ? food.inventory.fridge : [];
        return html`
            <div class="grid2">
                ${this._renderInventoryColumn(card, 'Pantry', 'pantry', pantry)}
                ${this._renderInventoryColumn(card, 'Fridge', 'fridge', fridge)}
            </div>
        `;
    }

    render() {
        const card = this.card;
        if (!card) return html``;
        const food = card._foodData?.() || {
            menu: [],
            inventory: { pantry: [], fridge: [] },
            savedLists: [],
            meals: [],
        };

        return html`
            <div class="wrap hidden">
                <div class="layout">
                    <div class="tabs" role="tablist" aria-label="Food sections">
                        <button
                            class="btn ${this._tab === 'menu' ? 'active' : ''}"
                            @click=${() => (this._tab = 'menu')}
                        >
                            Menu
                        </button>
                        <button
                            class="btn ${this._tab === 'house' ? 'active' : ''}"
                            @click=${() => (this._tab = 'house')}
                        >
                            In the house
                        </button>
                    </div>
                    <div class="content">
                        ${this._tab === 'house'
                            ? this._renderHouseTab(card, food)
                            : this._renderMenuTab(card, food)}
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-food-view', FbFoodView);
