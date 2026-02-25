/* nx-displaygrid - food view (V2)
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { sharedViewStyles, sharedCardStyles } from './shared.styles.js';

function ingredientSummary(items, max = 4) {
    const list = (Array.isArray(items) ? items : [])
        .map((item) => {
            if (!item) return '';
            const name = String(item.name || '').trim();
            if (!name) return '';
            const qty = Number(item.qty || 1);
            const unit = String(item.unit || '').trim();
            if (qty > 1 && unit) return `${name} ${qty} ${unit}`;
            if (qty > 1) return `${name} x${qty}`;
            if (unit) return `${name} ${unit}`;
            return name;
        })
        .filter(Boolean);
    if (!list.length) return 'No ingredients';
    if (list.length <= max) return list.join(', ');
    return `${list.slice(0, max).join(', ')} +${list.length - max}`;
}

function linesToText(lines) {
    return (Array.isArray(lines) ? lines : []).map((line) => String(line || '').trim()).filter(Boolean).join('\n');
}

function parseIngredientLines(text, unitFallback = '') {
    return String(text || '')
        .split(/\n|,/g)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const leading = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/.exec(line);
            if (leading) {
                return {
                    name: String(leading[3] || '').trim(),
                    qty: Number(leading[1] || 1),
                    unit: String(leading[2] || '').trim() || unitFallback,
                };
            }
            const trailing = /^(.+?)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/.exec(line);
            if (trailing) {
                return {
                    name: String(trailing[1] || '').trim(),
                    qty: Number(trailing[2] || 1),
                    unit: String(trailing[3] || '').trim() || unitFallback,
                };
            }
            const count = /^(.+?)\s+x(\d+(?:\.\d+)?)$/i.exec(line);
            if (count) {
                return {
                    name: String(count[1] || '').trim(),
                    qty: Number(count[2] || 1),
                    unit: unitFallback,
                };
            }
            return {
                name: line,
                qty: 1,
                unit: unitFallback,
            };
        })
        .filter((item) => item.name);
}

function clampRating(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.min(5, Math.max(0, Math.round(n)));
}

export class FbFoodView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
        _tab: { state: true },
        _savedListName: { state: true },
        _savedListItems: { state: true },
        _recipeId: { state: true },
        _recipeName: { state: true },
        _recipeIngredients: { state: true },
        _recipeSteps: { state: true },
        _menuSearch: { state: true },
        _pantryName: { state: true },
        _pantryQty: { state: true },
        _fridgeName: { state: true },
        _fridgeQty: { state: true },
        _shoppingModal: { state: true },
        _reviewComments: { state: true },
    };

    constructor() {
        super();
        this._tab = 'menu';
        this._savedListName = '';
        this._savedListItems = '';
        this._recipeId = '';
        this._recipeName = '';
        this._recipeIngredients = '';
        this._recipeSteps = '';
        this._menuSearch = {};
        this._pantryName = '';
        this._pantryQty = '';
        this._fridgeName = '';
        this._fridgeQty = '';
        this._shoppingModal = null;
        this._reviewComments = {};
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
            grid-template-columns: minmax(120px, 150px) minmax(190px, 1fr) minmax(0, 1fr) auto;
            align-items: start;
        }
        .dayLabel {
            font-weight: 700;
        }
        .mutedSmall {
            color: var(--fb-muted);
            font-size: 12px;
        }
        .input,
        select,
        textarea {
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
            min-height: 92px;
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
            flex-wrap: wrap;
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
        .searchInputWrap {
            display: grid;
            gap: 6px;
        }
        .stars {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .starBtn {
            --fb-btn-padding: 0;
            --fb-btn-min-height: 24px;
            --fb-btn-min-width: 24px;
            --fb-btn-border-width: 0;
            --fb-btn-bg: transparent;
            color: var(--warning);
            font-size: 20px;
            line-height: 1;
        }
        .ingredientRow {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 8px;
            align-items: center;
        }
        .reviewInput {
            min-height: 34px;
        }
        .modalBackdrop {
            position: fixed;
            inset: 0;
            background: var(--overlay);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 14px;
        }
        .modal {
            width: min(640px, 100%);
            max-height: min(86vh, 760px);
            overflow: auto;
            border-radius: 12px;
            border: 1px solid var(--fb-border);
            background: var(--fb-surface);
            box-shadow: var(--fb-shadow);
            padding: 12px;
            display: grid;
            gap: 10px;
        }
        .modalHead {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-weight: 700;
        }
        .checkRow {
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            padding: 8px 10px;
            background: var(--fb-surface-2);
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            gap: 8px;
            align-items: center;
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

    _resetRecipeDraft() {
        this._recipeId = '';
        this._recipeName = '';
        this._recipeIngredients = '';
        this._recipeSteps = '';
    }

    _openRecipeEditor(recipe) {
        if (!recipe) {
            this._resetRecipeDraft();
            return;
        }
        this._recipeId = recipe.id || '';
        this._recipeName = recipe.name || '';
        this._recipeIngredients = linesToText(
            (recipe.ingredients || []).map((ingredient) => {
                const name = String(ingredient.name || '').trim();
                if (!name) return '';
                const qty = Number(ingredient.qty || 1);
                const unit = String(ingredient.unit || '').trim();
                if (qty > 1 && unit) return `${qty} ${unit} ${name}`;
                if (qty > 1) return `${qty} ${name}`;
                if (unit) return `${unit} ${name}`;
                return name;
            })
        );
        this._recipeSteps = linesToText(recipe.steps || []);
    }

    async _submitRecipe(card) {
        const name = String(this._recipeName || '').trim();
        if (!name) return;
        const ingredients = parseIngredientLines(this._recipeIngredients || '');
        if (!ingredients.length) return;
        const steps = String(this._recipeSteps || '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);

        if (this._recipeId) {
            await card._foodUpdateMeal?.(this._recipeId, {
                id: this._recipeId,
                name,
                ingredients,
                steps,
            });
        } else {
            await card._foodAddMeal?.({
                name,
                itemsText: this._recipeIngredients,
                instructionsText: this._recipeSteps,
            });
        }
        this._resetRecipeDraft();
    }

    _openShoppingModal(title, items) {
        const list = (Array.isArray(items) ? items : [])
            .map((item, index) => ({
                id: String(item.id || `line_${index}`),
                name: String(item.name || '').trim(),
                qty: Number(item.qty || 1),
                unit: String(item.unit || '').trim(),
                selected: true,
            }))
            .filter((item) => item.name);
        if (!list.length) return;
        this._shoppingModal = {
            title: String(title || 'Add to shopping'),
            items: list,
        };
    }

    _closeShoppingModal() {
        this._shoppingModal = null;
    }

    async _confirmShoppingModal(card) {
        const modal = this._shoppingModal;
        if (!modal) return;
        const selected = (modal.items || []).filter((item) => item.selected);
        if (selected.length) {
            await card._foodAddItemsToShopping?.(selected, modal.title || 'Meal');
        }
        this._closeShoppingModal();
    }

    async _submitSavedList(card) {
        await card._foodAddSavedList?.({
            name: this._savedListName,
            itemsText: this._savedListItems,
        });
        this._savedListName = '';
        this._savedListItems = '';
    }

    async _submitInventory(card, zone) {
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

    _renderRatingStars(card, recipe) {
        const avg = card._foodRecipeAverageRating?.(recipe) || 0;
        const review = card._foodRecipeUserReview?.(recipe);
        const myRating = clampRating(review?.rating || 0);
        return html`
            <div class="stack" style="gap:6px">
                <div class="mutedSmall">Rating: ${avg ? `${avg}/5` : 'No ratings yet'}</div>
                <div class="stars">
                    ${[1, 2, 3, 4, 5].map(
                        (value) => html`
                            <button
                                class="btn starBtn"
                                title="Rate ${value} star${value === 1 ? '' : 's'}"
                                @click=${async () => {
                                    const comment = this._reviewComments[recipe.id] || review?.comment || '';
                                    await card._foodSetRecipeReview?.(recipe.id, {
                                        rating: value,
                                        comment,
                                    });
                                }}
                            >
                                ${myRating >= value ? '★' : '☆'}
                            </button>
                        `
                    )}
                </div>
                <input
                    class="input reviewInput"
                    placeholder="Optional review note"
                    .value=${this._reviewComments[recipe.id] ?? review?.comment ?? ''}
                    @input=${(e) => {
                        this._reviewComments = {
                            ...(this._reviewComments || {}),
                            [recipe.id]: e.target.value,
                        };
                    }}
                    @change=${async () => {
                        const rating = clampRating(review?.rating || 0);
                        if (!rating) return;
                        await card._foodSetRecipeReview?.(recipe.id, {
                            rating,
                            comment: this._reviewComments[recipe.id] || '',
                        });
                    }}
                />
            </div>
        `;
    }

    _applyMenuSearch(card, day, value, meals) {
        const text = String(value || '').trim();
        this._menuSearch = {
            ...(this._menuSearch || {}),
            [day]: text,
        };
        if (!text) {
            card._foodSetMenuDay?.(day, { mealId: '' });
            return;
        }
        const exact = (Array.isArray(meals) ? meals : []).find((meal) => {
            if (!meal) return false;
            if (String(meal.id || '') === text) return true;
            return String(meal.name || '').trim().toLowerCase() === text.toLowerCase();
        });
        if (exact?.id) {
            card._foodSetMenuDay?.(day, { mealId: exact.id });
        }
    }

    _renderMenuTab(card, food) {
        const meals = Array.isArray(food?.recipes) ? food.recipes : [];
        const menu = Array.isArray(food?.menu) ? food.menu : [];
        const mealListId = 'food-meal-options';
        return html`
            <div class="grid2">
                <div class="panel fb-card">
                    <div class="fb-card-header">Meal Plan (This Week)</div>
                    <div class="panelBody">
                        <div class="sectionHint">
                            Search meals, assign them to weekdays, and choose exactly which ingredients
                            are added to shopping.
                        </div>
                        <datalist id=${mealListId}>
                            ${meals.map((meal) => html`<option value=${meal.name}></option>`)}
                        </datalist>
                        <div class="stack">
                            ${menu.map((entry) => {
                                const selectedMeal = meals.find((meal) => meal.id === entry.mealId) || null;
                                const selectedName = selectedMeal?.name || '';
                                const inputValue = this._menuSearch?.[entry.day] ?? selectedName;
                                const ingredients = selectedMeal?.ingredients || [];
                                return html`
                                    <div class="row menuRow">
                                        <div>
                                            <div class="dayLabel">${entry.label}</div>
                                            <div class="mutedSmall">
                                                ${selectedMeal
                                                    ? `${ingredients.length} ingredient${ingredients.length === 1 ? '' : 's'}`
                                                    : 'No meal selected'}
                                            </div>
                                        </div>
                                        <div class="searchInputWrap">
                                            <input
                                                class="input"
                                                list=${mealListId}
                                                placeholder="Search meal"
                                                .value=${inputValue}
                                                @input=${(e) =>
                                                    (this._menuSearch = {
                                                        ...(this._menuSearch || {}),
                                                        [entry.day]: e.target.value,
                                                    })}
                                                @change=${(e) =>
                                                    this._applyMenuSearch(
                                                        card,
                                                        entry.day,
                                                        e.target.value,
                                                        meals
                                                    )}
                                            />
                                        </div>
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
                                            ?disabled=${!selectedMeal}
                                            @click=${() =>
                                                this._openShoppingModal(
                                                    selectedMeal?.name || 'Meal',
                                                    ingredients
                                                )}
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
                    <div class="fb-card-header">Saved Shopping Lists</div>
                    <div class="panelBody">
                        <div class="sectionHint">
                            Save reusable shopping bundles and add them to the list in one tap.
                        </div>
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
                                    @click=${() => this._submitSavedList(card)}
                                >
                                    Save list
                                </button>
                            </div>
                            ${(food.savedLists || []).length
                                ? (food.savedLists || []).map(
                                      (list) => html`
                                          <div class="bundleCard">
                                              <div class="bundleHead">
                                                  <div class="bundleName">${list.name}</div>
                                                  <button
                                                      class="btn sm"
                                                      @click=${() => card._foodAddSavedListToShopping?.(list.id)}
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
                                              <div class="mutedSmall">${(list.items || []).join(', ')}</div>
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

    _renderRecipesTab(card, food) {
        const recipes = Array.isArray(food?.recipes) ? food.recipes : [];
        const units = card._foodUnitOptions?.() || [];
        return html`
            <div class="grid2">
                <div class="panel fb-card">
                    <div class="fb-card-header">${this._recipeId ? 'Edit Recipe' : 'New Recipe'}</div>
                    <div class="panelBody">
                        <div class="sectionHint">
                            Add ingredients and instruction steps. If a line has no quantity, it defaults
                            to 1.
                        </div>
                        <input
                            class="input"
                            placeholder="Recipe name"
                            .value=${this._recipeName}
                            @input=${(e) => (this._recipeName = e.target.value)}
                        />
                        <textarea
                            placeholder="Ingredients (one per line, e.g. 2 kg chicken breast)"
                            .value=${this._recipeIngredients}
                            @input=${(e) => (this._recipeIngredients = e.target.value)}
                        ></textarea>
                        <div class="mutedSmall">Units available: ${units.join(', ') || 'items'}</div>
                        <textarea
                            placeholder="Instructions (one step per line)"
                            .value=${this._recipeSteps}
                            @input=${(e) => (this._recipeSteps = e.target.value)}
                        ></textarea>
                        <div class="bundleHead">
                            <button
                                class="btn"
                                ?disabled=${!String(this._recipeName || '').trim()}
                                @click=${() => this._submitRecipe(card)}
                            >
                                ${this._recipeId ? 'Save recipe' : 'Add recipe'}
                            </button>
                            ${this._recipeId
                                ? html`<button class="btn ghost" @click=${this._resetRecipeDraft}>Cancel</button>`
                                : html``}
                        </div>
                    </div>
                </div>

                <div class="panel fb-card">
                    <div class="fb-card-header">Recipes</div>
                    <div class="panelBody">
                        ${recipes.length
                            ? recipes.map(
                                  (recipe) => html`
                                      <div class="bundleCard">
                                          <div class="bundleHead">
                                              <div class="bundleName">${recipe.name}</div>
                                              <button
                                                  class="btn sm"
                                                  @click=${() =>
                                                      this._openShoppingModal(
                                                          recipe.name || 'Recipe',
                                                          recipe.ingredients || []
                                                      )}
                                              >
                                                  Add meal to shopping
                                              </button>
                                              <button
                                                  class="btn sm ghost"
                                                  @click=${() => this._openRecipeEditor(recipe)}
                                              >
                                                  Edit
                                              </button>
                                              <button
                                                  class="btn sm ghost"
                                                  @click=${() => card._foodRemoveMeal?.(recipe.id)}
                                              >
                                                  Delete
                                              </button>
                                          </div>
                                          <div class="mutedSmall">
                                              Ingredients: ${ingredientSummary(recipe.ingredients, 8)}
                                          </div>
                                          <div class="stack">
                                              ${(recipe.ingredients || []).map(
                                                  (ingredient) => html`
                                                      <div class="ingredientRow">
                                                          <div class="mutedSmall">
                                                              ${ingredientSummary([ingredient], 1)}
                                                          </div>
                                                          <button
                                                              class="btn sm ghost"
                                                              @click=${() =>
                                                                  card._foodAddIngredientToShopping?.(
                                                                      ingredient
                                                                  )}
                                                          >
                                                              + Shopping
                                                          </button>
                                                      </div>
                                                  `
                                              )}
                                          </div>
                                          <div class="mutedSmall">
                                              Steps: ${(recipe.steps || []).length
                                                  ? (recipe.steps || []).join(' | ')
                                                  : 'No instructions yet'}
                                          </div>
                                          ${this._renderRatingStars(card, recipe)}
                                      </div>
                                  `
                              )
                            : html`<div class="muted">No recipes yet.</div>`}
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
                                isFridge ? (this._fridgeName = e.target.value) : (this._pantryName = e.target.value)}
                            @keydown=${(e) => {
                                if (e.key !== 'Enter') return;
                                this._submitInventory(card, zone);
                            }}
                        />
                        <input
                            class="input"
                            placeholder="Qty"
                            .value=${qtyValue}
                            @input=${(e) =>
                                isFridge ? (this._fridgeQty = e.target.value) : (this._pantryQty = e.target.value)}
                            @keydown=${(e) => {
                                if (e.key !== 'Enter') return;
                                this._submitInventory(card, zone);
                            }}
                            style="max-width:92px"
                        />
                        <button class="btn" @click=${() => this._submitInventory(card, zone)}>Add</button>
                    </div>
                    ${items.length
                        ? html`<div class="stack">
                              ${items.map(
                                  (item) => html`
                                      <div class="invItem">
                                          <input
                                              type="checkbox"
                                              .checked=${item.inStock !== false}
                                              @change=${() => card._foodToggleInventoryItem?.(zone, item.id)}
                                          />
                                          <div class="invName ${item.inStock === false ? 'out' : ''}">
                                              ${item.name}
                                          </div>
                                          <div class="invQty">${item.qty || '—'}</div>
                                          <button
                                              class="btn sm ghost"
                                              @click=${() => card._foodRemoveInventoryItem?.(zone, item.id)}
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

    _renderShoppingTab(card) {
        return html`<fb-shopping-view .card=${card} .renderKey=${this.renderKey}></fb-shopping-view>`;
    }

    render() {
        const card = this.card;
        if (!card) return html``;
        const food = card._foodData?.() || {
            menu: [],
            inventory: { pantry: [], fridge: [] },
            savedLists: [],
            recipes: [],
            units: [],
        };

        return html`
            <div class="wrap hidden">
                <div class="layout">
                    <div class="tabs" role="tablist" aria-label="Food sections">
                        <button class="btn ${this._tab === 'menu' ? 'active' : ''}" @click=${() => (this._tab = 'menu')}>
                            Meals
                        </button>
                        <button
                            class="btn ${this._tab === 'recipes' ? 'active' : ''}"
                            @click=${() => (this._tab = 'recipes')}
                        >
                            Recipes
                        </button>
                        <button
                            class="btn ${this._tab === 'shopping' ? 'active' : ''}"
                            @click=${() => (this._tab = 'shopping')}
                        >
                            Shopping List
                        </button>
                        <button class="btn ${this._tab === 'house' ? 'active' : ''}" @click=${() => (this._tab = 'house')}>
                            In the house
                        </button>
                    </div>
                    <div class="content">
                        ${this._tab === 'house'
                            ? this._renderHouseTab(card, food)
                            : this._tab === 'recipes'
                            ? this._renderRecipesTab(card, food)
                            : this._tab === 'shopping'
                            ? this._renderShoppingTab(card)
                            : this._renderMenuTab(card, food)}
                    </div>
                </div>

                ${this._shoppingModal
                    ? html`
                          <div
                              class="modalBackdrop"
                              @click=${(e) => e.target === e.currentTarget && this._closeShoppingModal()}
                          >
                              <div class="modal">
                                  <div class="modalHead">
                                      <div>Add to shopping: ${this._shoppingModal.title}</div>
                                      <button class="btn" @click=${this._closeShoppingModal}>Close</button>
                                  </div>
                                  ${(this._shoppingModal.items || []).map(
                                      (item, idx) => html`
                                          <label class="checkRow">
                                              <input
                                                  type="checkbox"
                                                  .checked=${item.selected !== false}
                                                  @change=${(e) => {
                                                      const items = [...(this._shoppingModal.items || [])];
                                                      items[idx] = {
                                                          ...items[idx],
                                                          selected: e.target.checked,
                                                      };
                                                      this._shoppingModal = {
                                                          ...this._shoppingModal,
                                                          items,
                                                      };
                                                  }}
                                              />
                                              <span>${ingredientSummary([item], 1)}</span>
                                          </label>
                                      `
                                  )}
                                  <div class="bundleHead">
                                      <button class="btn" @click=${() => this._confirmShoppingModal(card)}>
                                          Add selected
                                      </button>
                                      <button class="btn ghost" @click=${this._closeShoppingModal}>
                                          Cancel
                                      </button>
                                  </div>
                              </div>
                          </div>
                      `
                    : html``}
            </div>
        `;
    }
}

customElements.define('fb-food-view', FbFoodView);
