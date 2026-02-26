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
            const qtyRaw = Number(item.qty || 1);
            const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.round(qtyRaw * 100) / 100 : 1;
            const qtyLabel = Number.isInteger(qty) ? String(qty) : String(qty);
            const unit = String(item.unit || '').trim() || 'x';
            return `${qtyLabel}${unit} ${name}`.trim();
        })
        .filter(Boolean);
    if (!list.length) return 'No ingredients';
    if (list.length <= max) return list.join(', ');
    return `${list.slice(0, max).join(', ')} +${list.length - max}`;
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
        _menuWeekOffset: { state: true },
        _savedListName: { state: true },
        _savedListItems: { state: true },
        _recipeId: { state: true },
        _recipeName: { state: true },
        _recipeIngredients: { state: true },
        _recipeSteps: { state: true },
        _recipeIngredientName: { state: true },
        _recipeIngredientQty: { state: true },
        _recipeIngredientUnit: { state: true },
        _recipeStepText: { state: true },
        _favouritesMode: { state: true },
        _menuSearch: { state: true },
        _shoppingModal: { state: true },
        _reviewComments: { state: true },
        _recipeSaveError: { state: true },
        _recipePendingIngredient: { state: true },
        _recipePendingStep: { state: true },
    };

    constructor() {
        super();
        this._tab = 'menu';
        this._menuWeekOffset = 0;
        this._savedListName = '';
        this._savedListItems = '';
        this._recipeId = '';
        this._recipeName = '';
        this._recipeIngredients = [];
        this._recipeSteps = [];
        this._recipeIngredientName = '';
        this._recipeIngredientQty = '1';
        this._recipeIngredientUnit = '';
        this._recipeStepText = '';
        this._favouritesMode = 'shopping';
        this._menuSearch = {};
        this._shoppingModal = null;
        this._reviewComments = {};
        this._recipeSaveError = '';
        this._recipePendingIngredient = false;
        this._recipePendingStep = false;
        this._recipeDraftHydrated = false;
    }

    connectedCallback() {
        super.connectedCallback();
        this._recipeDraftHydrated = false;
    }

    updated(changedProps) {
        if (!this.card) return;
        if (changedProps.has('card')) this._recipeDraftHydrated = false;
        if (!this._recipeDraftHydrated) {
            this._hydrateRecipeDraft(this.card);
        }
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
            grid-template-columns:
                minmax(120px, 150px)
                minmax(190px, 1fr)
                minmax(140px, 0.9fr)
                minmax(220px, auto);
            align-items: start;
        }
        .menuActions {
            display: grid;
            grid-template-columns: repeat(2, minmax(104px, 1fr));
            gap: 8px;
        }
        .menuActions .btn {
            width: 100%;
            white-space: normal;
            line-height: 1.15;
            min-height: 44px;
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
        .weekNav {
            display: grid;
            grid-template-columns: auto auto minmax(0, 1fr) auto;
            gap: 8px;
            align-items: center;
        }
        .weekLabel {
            font-weight: 700;
            font-size: 13px;
            color: var(--fb-text);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .stars {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .favouriteToggle {
            display: inline-flex;
            gap: 6px;
            padding: 4px;
            background: var(--fb-surface);
            border: 1px solid var(--fb-grid);
            border-radius: 999px;
        }
        .favouriteToggle .btn {
            --fb-btn-border-width: 0;
            --fb-btn-bg: transparent;
            --fb-btn-radius: 999px;
            --fb-btn-padding: 5px 10px;
            --fb-btn-min-height: 30px;
        }
        .favouriteToggle .btn.active {
            --fb-btn-bg: var(--fb-surface-2);
            font-weight: 700;
        }
        .shoppingFavList {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .shoppingFavRow {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .shoppingFavItem {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface-2);
            border-radius: 10px;
            padding: 4px 10px;
            cursor: pointer;
            text-align: left;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: var(--fb-text);
            flex: 1;
            min-width: 0;
        }
        .shoppingFavText {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .shoppingFavPlus {
            border: none;
            padding: 0;
            font-size: 24px;
            line-height: 1;
            background: transparent;
            color: var(--success);
            font-weight: 700;
            flex: 0 0 auto;
        }
        .shoppingFavStar {
            border: none;
            background: transparent;
            border-radius: 10px;
            width: 32px;
            height: 32px;
            display: grid;
            place-items: center;
            cursor: pointer;
            color: var(--fb-muted);
            flex: 0 0 auto;
            padding: 0;
            line-height: 1;
            box-sizing: border-box;
            font-size: 0;
        }
        .shoppingFavStar.active {
            color: var(--warning);
        }
        .shoppingFavStar ha-icon {
            width: 24px;
            height: 24px;
            display: block;
            margin: 0 auto;
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
        .ingredientDraft {
            display: grid;
            gap: 8px;
            grid-template-columns: minmax(0, 1fr) 96px 140px auto;
            align-items: center;
        }
        .stepDraft {
            display: grid;
            gap: 8px;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
        }
        .recipeList {
            display: grid;
            gap: 8px;
        }
        .stepLine {
            display: grid;
            gap: 8px;
            grid-template-columns: auto minmax(0, 1fr) auto;
            align-items: start;
        }
        .stepActions {
            display: inline-flex;
            gap: 6px;
            flex-wrap: wrap;
            justify-content: flex-end;
        }
        .stepIndex {
            color: var(--fb-muted);
            font-size: 12px;
            padding-top: 2px;
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
        .input.invalid {
            border-color: var(--urgent);
            box-shadow: 0 0 0 2px color-mix(in srgb, var(--urgent) 16%, transparent);
        }
        .errorText {
            color: var(--urgent);
            font-size: 13px;
            font-weight: 700;
        }
        @media (max-width: 1100px) {
            .grid2 {
                grid-template-columns: 1fr;
            }
            .row.menuRow {
                grid-template-columns: minmax(120px, 150px) minmax(0, 1fr);
            }
            .row.menuRow > .input {
                grid-column: 2;
            }
            .row.menuRow > .menuActions {
                grid-column: 2;
            }
            .menuActions {
                grid-template-columns: repeat(2, minmax(120px, 1fr));
            }
            .ingredientDraft {
                grid-template-columns: 1fr;
            }
        }
        @media (max-width: 720px) {
            .row.menuRow {
                grid-template-columns: 1fr;
            }
            .row.menuRow > .input,
            .row.menuRow > .menuActions {
                grid-column: auto;
            }
            .menuActions {
                grid-template-columns: 1fr;
            }
            .ingredientDraft {
                grid-template-columns: 1fr;
            }
        }
        `,
    ];

    _resetRecipeDraft() {
        this._recipeId = '';
        this._recipeName = '';
        this._recipeIngredients = [];
        this._recipeSteps = [];
        this._recipeIngredientName = '';
        this._recipeIngredientQty = '1';
        this._recipeIngredientUnit = '';
        this._recipeStepText = '';
        this._recipeSaveError = '';
        this._recipePendingIngredient = false;
        this._recipePendingStep = false;
        this._persistRecipeDraft();
    }

    _recipeDraftPayload() {
        return {
            recipeId: String(this._recipeId || '').trim(),
            recipeName: String(this._recipeName || '').trim(),
            recipeIngredients: Array.isArray(this._recipeIngredients)
                ? this._recipeIngredients
                : [],
            recipeSteps: Array.isArray(this._recipeSteps) ? this._recipeSteps : [],
            recipeIngredientName: String(this._recipeIngredientName || '').trim(),
            recipeIngredientQty: String(this._recipeIngredientQty || '1').trim() || '1',
            recipeIngredientUnit: String(this._recipeIngredientUnit || '').trim(),
            recipeStepText: String(this._recipeStepText || '').trim(),
        };
    }

    _persistRecipeDraft(card = this.card) {
        if (!card) return;
        card._foodSaveRecipeDraft?.(this._recipeDraftPayload());
    }

    _hydrateRecipeDraft(card = this.card) {
        if (!card || this._recipeDraftHydrated) return;
        const draft = card._foodLoadRecipeDraft?.();
        if (draft && typeof draft === 'object') {
            this._recipeId = String(draft.recipeId || '').trim();
            this._recipeName = String(draft.recipeName || '').trim();
            this._recipeIngredients = Array.isArray(draft.recipeIngredients)
                ? draft.recipeIngredients
                : [];
            this._recipeSteps = Array.isArray(draft.recipeSteps) ? draft.recipeSteps : [];
            this._recipeIngredientName = String(draft.recipeIngredientName || '').trim();
            this._recipeIngredientQty = String(draft.recipeIngredientQty || '1').trim() || '1';
            this._recipeIngredientUnit = String(draft.recipeIngredientUnit || '').trim();
            this._recipeStepText = String(draft.recipeStepText || '').trim();
        }
        this._recipeDraftHydrated = true;
    }

    _openRecipeEditor(recipe) {
        if (!recipe) {
            this._resetRecipeDraft();
            return;
        }
        this._recipeId = recipe.id || '';
        this._recipeName = recipe.name || '';
        this._recipeIngredients = (Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
            .map((ingredient, idx) => ({
                id: String(ingredient?.id || `ingredient_${idx}`),
                name: String(ingredient?.name || '').trim(),
                qty: Number(ingredient?.qty || 1),
                unit: String(ingredient?.unit || '').trim(),
            }))
            .filter((ingredient) => ingredient.name);
        this._recipeSteps = (Array.isArray(recipe.steps) ? recipe.steps : [])
            .map((step) => String(step || '').trim())
            .filter(Boolean);
        this._recipeIngredientName = '';
        this._recipeIngredientQty = '1';
        this._recipeIngredientUnit = '';
        this._recipeStepText = '';
        this._recipeSaveError = '';
        this._recipePendingIngredient = false;
        this._recipePendingStep = false;
        this._persistRecipeDraft();
    }

    _addRecipeIngredient() {
        const names = String(this._recipeIngredientName || '')
            .split(/\n|,/g)
            .map((part) => part.trim())
            .filter(Boolean);
        if (!names.length) return;
        const qty = Number(this._recipeIngredientQty || 1);
        const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
        const unit = String(this._recipeIngredientUnit || '').trim();
        this._recipeIngredients = [
            ...(Array.isArray(this._recipeIngredients) ? this._recipeIngredients : []),
            ...names.map((name, idx) => ({
                id: `food_ing_${Date.now().toString(36)}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
                name,
                qty: safeQty,
                unit,
            })),
        ];
        this._recipeIngredientName = '';
        this._recipeIngredientQty = '1';
        this._recipeIngredientUnit = '';
        this._recipeSaveError = '';
        this._recipePendingIngredient = false;
        this._persistRecipeDraft();
    }

    _removeRecipeIngredient(index) {
        const idx = Number(index);
        if (!Number.isInteger(idx) || idx < 0) return;
        const list = Array.isArray(this._recipeIngredients) ? this._recipeIngredients : [];
        this._recipeIngredients = list.filter((_, i) => i !== idx);
        this._persistRecipeDraft();
    }

    _addRecipeStep() {
        const lines = String(this._recipeStepText || '')
            .split('\n')
            .map((step) => step.trim())
            .filter(Boolean);
        if (!lines.length) return;
        this._recipeSteps = [...(Array.isArray(this._recipeSteps) ? this._recipeSteps : []), ...lines];
        this._recipeStepText = '';
        this._recipeSaveError = '';
        this._recipePendingStep = false;
        this._persistRecipeDraft();
    }

    _removeRecipeStep(index) {
        const idx = Number(index);
        if (!Number.isInteger(idx) || idx < 0) return;
        const list = Array.isArray(this._recipeSteps) ? this._recipeSteps : [];
        this._recipeSteps = list.filter((_, i) => i !== idx);
        this._persistRecipeDraft();
    }

    _updateRecipeStep(index, value) {
        const idx = Number(index);
        if (!Number.isInteger(idx) || idx < 0) return;
        const list = Array.isArray(this._recipeSteps) ? this._recipeSteps : [];
        if (idx >= list.length) return;
        const next = [...list];
        next[idx] = String(value || '');
        this._recipeSteps = next;
        this._recipeSaveError = '';
        this._persistRecipeDraft();
    }

    _moveRecipeStep(index, delta) {
        const idx = Number(index);
        const shift = Number(delta);
        if (!Number.isInteger(idx) || !Number.isInteger(shift) || shift === 0) return;
        const list = Array.isArray(this._recipeSteps) ? this._recipeSteps : [];
        const target = idx + shift;
        if (idx < 0 || idx >= list.length || target < 0 || target >= list.length) return;
        const next = [...list];
        const [step] = next.splice(idx, 1);
        next.splice(target, 0, step);
        this._recipeSteps = next;
        this._recipeSaveError = '';
        this._persistRecipeDraft();
    }

    async _submitRecipe(card) {
        const name = String(this._recipeName || '').trim();
        const pendingIngredient = Boolean(String(this._recipeIngredientName || '').trim());
        const pendingStep = Boolean(String(this._recipeStepText || '').trim());
        this._recipePendingIngredient = pendingIngredient;
        this._recipePendingStep = pendingStep;
        if (!name) {
            this._recipeSaveError = 'Recipe name is required.';
            return;
        }
        if (pendingIngredient || pendingStep) {
            this._recipeSaveError = 'Use + to add pending ingredient/step before saving.';
            return;
        }
        const ingredients = (Array.isArray(this._recipeIngredients) ? this._recipeIngredients : [])
            .map((ingredient) => ({
                id: String(ingredient?.id || ''),
                name: String(ingredient?.name || '').trim(),
                qty: Number(ingredient?.qty || 1),
                unit: String(ingredient?.unit || '').trim(),
            }))
            .filter((ingredient) => ingredient.name);
        if (!ingredients.length) {
            this._recipeSaveError = 'Add at least one ingredient before saving.';
            this._recipePendingIngredient = true;
            return;
        }
        const steps = (Array.isArray(this._recipeSteps) ? this._recipeSteps : [])
            .map((step) => String(step || '').trim())
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
                ingredients,
                steps,
            });
        }
        this._recipeSaveError = '';
        this._recipePendingIngredient = false;
        this._recipePendingStep = false;
        this._resetRecipeDraft();
    }

    _formatWeekLabel(date) {
        const d = date instanceof Date ? date : new Date(date || Date.now());
        return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    }

    _editFavouriteItem(card, entry) {
        if (!entry) return;
        const currentName = String(entry.name || '').trim();
        if (!currentName) return;
        const nameInput = window.prompt('Edit favourite item', currentName);
        if (nameInput === null) return;
        const nextName = String(nameInput || '').trim();
        if (!nextName) return;
        const qtyInput = window.prompt(
            'Quantity to add by default',
            String(Number(entry.qty || 1) || 1)
        );
        if (qtyInput === null) return;
        const qtyRaw = Number(qtyInput);
        const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
        card._editShoppingFavourite?.(currentName, { nextName, qty });
    }

    async _beginCooking(card, day, weekKey = '') {
        const started = await card._foodBeginCooking?.(day, weekKey);
        if (started) this._tab = 'cooking';
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

    _applyMenuSearch(card, day, value, meals, weekKey = '', searchKey = '') {
        const text = String(value || '').trim();
        const key = String(searchKey || day);
        this._menuSearch = {
            ...(this._menuSearch || {}),
            [key]: text,
        };
        if (!text) {
            card._foodSetMenuDay?.(day, { mealId: '' }, weekKey);
            return;
        }
        const exact = (Array.isArray(meals) ? meals : []).find((meal) => {
            if (!meal) return false;
            if (String(meal.id || '') === text) return true;
            return String(meal.name || '').trim().toLowerCase() === text.toLowerCase();
        });
        if (exact?.id) {
            card._foodSetMenuDay?.(day, { mealId: exact.id }, weekKey);
        }
    }

    _renderMenuTab(card, food) {
        const meals = Array.isArray(food?.recipes) ? food.recipes : [];
        const weekInfo = card._foodWeekInfo?.(this._menuWeekOffset) || {};
        const weekKey = String(weekInfo.weekKey || '');
        const weekDays = Array.isArray(weekInfo.days) ? weekInfo.days : [];
        const menu = Array.isArray(card._foodWeekMenu?.(weekKey))
            ? card._foodWeekMenu(weekKey)
            : Array.isArray(food?.menu)
            ? food.menu
            : [];
        const weekStart = weekInfo.start instanceof Date ? weekInfo.start : null;
        const weekEnd = weekInfo.end instanceof Date ? weekInfo.end : null;
        const weekLabel =
            weekStart && weekEnd
                ? `${this._formatWeekLabel(weekStart)} - ${this._formatWeekLabel(weekEnd)}`
                : 'This week';
        const mealListId = 'food-meal-options';
        return html`
            <div class="panel fb-card">
                <div class="fb-card-header">Meal Plan</div>
                <div class="panelBody">
                    <div class="weekNav">
                        <button
                            class="btn sm ghost"
                            title="Previous week"
                            @click=${() => (this._menuWeekOffset = Number(this._menuWeekOffset || 0) - 1)}
                        >
                            <
                        </button>
                        <button
                            class="btn sm ghost"
                            @click=${() => (this._menuWeekOffset = 0)}
                        >
                            Today
                        </button>
                        <div class="weekLabel">${weekLabel}</div>
                        <button
                            class="btn sm ghost"
                            title="Next week"
                            @click=${() => (this._menuWeekOffset = Number(this._menuWeekOffset || 0) + 1)}
                        >
                            >
                        </button>
                    </div>
                    <div class="sectionHint">
                        Search meals, assign them by date, and choose exactly which ingredients are
                        added to shopping.
                    </div>
                    <datalist id=${mealListId}>
                        ${meals.map((meal) => html`<option value=${meal.name}></option>`)}
                    </datalist>
                    <div class="stack">
                        ${menu.map((entry) => {
                            const dayMeta = weekDays.find((day) => Number(day.day) === Number(entry.day));
                            const selectedMeal = meals.find((meal) => meal.id === entry.mealId) || null;
                            const selectedName = selectedMeal?.name || '';
                            const searchKey = `${weekKey || 'week'}:${entry.day}`;
                            const inputValue = this._menuSearch?.[searchKey] ?? selectedName;
                            const ingredients = selectedMeal?.ingredients || [];
                            return html`
                                <div class="row menuRow">
                                    <div>
                                        <div class="dayLabel">
                                            ${dayMeta?.label || entry.label}
                                            ${dayMeta?.date
                                                ? html`<span class="mutedSmall">
                                                      (${this._formatWeekLabel(dayMeta.date)})
                                                  </span>`
                                                : html``}
                                        </div>
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
                                                    [searchKey]: e.target.value,
                                                })}
                                            @change=${(e) =>
                                                this._applyMenuSearch(
                                                    card,
                                                    entry.day,
                                                    e.target.value,
                                                    meals,
                                                    weekKey,
                                                    searchKey
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
                                            }, weekKey)}
                                    />
                                    <div class="menuActions">
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
                                        <button
                                            class="btn"
                                            ?disabled=${!selectedMeal}
                                            @click=${() => this._beginCooking(card, entry.day, weekKey)}
                                        >
                                            Begin cooking
                                        </button>
                                    </div>
                                </div>
                            `;
                        })}
                    </div>
                </div>
            </div>
        `;
    }

    _renderRecipesTab(card, food) {
        const recipes = Array.isArray(food?.recipes) ? food.recipes : [];
        const units = card._foodUnitOptions?.() || [];
        const ingredientDraft = Array.isArray(this._recipeIngredients) ? this._recipeIngredients : [];
        const stepDraft = Array.isArray(this._recipeSteps) ? this._recipeSteps : [];
        return html`
            <div class="grid2">
                <div class="panel fb-card">
                    <div class="fb-card-header">${this._recipeId ? 'Edit Recipe' : 'New Recipe'}</div>
                    <div class="panelBody">
                        <div class="sectionHint">
                            Build recipes with itemized ingredients and steps. Ingredient quantity
                            defaults to 1 and quantity type is optional.
                        </div>
                        <input
                            class="input ${this._recipeSaveError && !String(this._recipeName || '').trim()
                                ? 'invalid'
                                : ''}"
                            placeholder="Recipe name"
                            .value=${this._recipeName}
                            @input=${(e) => {
                                this._recipeName = e.target.value;
                                this._recipeSaveError = '';
                                this._persistRecipeDraft(card);
                            }}
                        />
                        <div class="subTitle">Ingredients</div>
                        <div class="ingredientDraft">
                            <input
                                class="input ${this._recipePendingIngredient ? 'invalid' : ''}"
                                placeholder="Ingredient name"
                                .value=${this._recipeIngredientName}
                                @input=${(e) => {
                                    this._recipeIngredientName = e.target.value;
                                    this._recipePendingIngredient = false;
                                    this._recipeSaveError = '';
                                    this._persistRecipeDraft(card);
                                }}
                            />
                            <input
                                class="input"
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder="Qty"
                                .value=${this._recipeIngredientQty}
                                @input=${(e) => {
                                    this._recipeIngredientQty = e.target.value;
                                    this._recipeSaveError = '';
                                    this._persistRecipeDraft(card);
                                }}
                            />
                            <select
                                class="input"
                                .value=${this._recipeIngredientUnit || ''}
                                @change=${(e) => {
                                    this._recipeIngredientUnit = e.target.value;
                                    this._recipeSaveError = '';
                                    this._persistRecipeDraft(card);
                                }}
                            >
                                <option value="">x (default)</option>
                                ${units.map(
                                    (unit) => html`<option value=${unit}>${unit}</option>`
                                )}
                            </select>
                            <button class="btn" @click=${this._addRecipeIngredient}>+</button>
                        </div>
                        <div class="mutedSmall">
                            Units available: ${units.length ? units.join(', ') : 'None configured'}
                        </div>
                        <div class="recipeList">
                            ${ingredientDraft.length
                                ? ingredientDraft.map(
                                      (ingredient, idx) => html`
                                          <div class="ingredientRow">
                                              <div class="mutedSmall">
                                                  ${ingredientSummary([ingredient], 1)}
                                              </div>
                                              <button
                                                  class="btn sm ghost"
                                                  @click=${() => this._removeRecipeIngredient(idx)}
                                              >
                                                  Remove
                                              </button>
                                          </div>
                                      `
                                  )
                                : html`<div class="mutedSmall">No ingredients added yet.</div>`}
                        </div>
                        <div class="subTitle">Steps</div>
                        <div class="stepDraft">
                            <input
                                class="input ${this._recipePendingStep ? 'invalid' : ''}"
                                placeholder="Add a cooking step"
                                .value=${this._recipeStepText}
                                @input=${(e) => {
                                    this._recipeStepText = e.target.value;
                                    this._recipePendingStep = false;
                                    this._recipeSaveError = '';
                                    this._persistRecipeDraft(card);
                                }}
                            />
                            <button class="btn" @click=${this._addRecipeStep}>+</button>
                        </div>
                        <div class="recipeList">
                            ${stepDraft.length
                                ? stepDraft.map(
                                      (step, idx) => html`
                                          <div class="stepLine">
                                              <div class="stepIndex">${idx + 1}.</div>
                                              <input
                                                  class="input"
                                                  .value=${String(step || '')}
                                                  @input=${(e) =>
                                                      this._updateRecipeStep(
                                                          idx,
                                                          e.target.value
                                                      )}
                                              />
                                              <div class="stepActions">
                                                  <button
                                                      class="btn sm ghost"
                                                      ?disabled=${idx === 0}
                                                      @click=${() =>
                                                          this._moveRecipeStep(idx, -1)}
                                                  >
                                                      Up
                                                  </button>
                                                  <button
                                                      class="btn sm ghost"
                                                      ?disabled=${idx >= stepDraft.length - 1}
                                                      @click=${() =>
                                                          this._moveRecipeStep(idx, 1)}
                                                  >
                                                      Down
                                                  </button>
                                                  <button
                                                      class="btn sm ghost"
                                                      @click=${() =>
                                                          this._removeRecipeStep(idx)}
                                                  >
                                                      Remove
                                                  </button>
                                              </div>
                                          </div>
                                      `
                                  )
                                : html`<div class="mutedSmall">No steps added yet.</div>`}
                        </div>
                        ${this._recipeSaveError
                            ? html`<div class="errorText">${this._recipeSaveError}</div>`
                            : html``}
                        <div class="bundleHead">
                            <button
                                class="btn"
                                ?disabled=${!String(this._recipeName || '').trim()}
                                @click=${() => this._submitRecipe(card)}
                            >
                                ${this._recipeId ? 'Save recipe' : 'Add recipe'}
                            </button>
                            <button class="btn ghost" @click=${this._resetRecipeDraft}>
                                Clear draft
                            </button>
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
                                                  Edit recipe
                                              </button>
                                              <button
                                                  class="btn sm ghost"
                                                  @click=${() => this._tab = 'menu'}
                                              >
                                                  Plan in week
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

    _renderSavedListsPanel(card, food) {
        return html`
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
        `;
    }

    _renderFavouritesTab(card, food) {
        const recipes = Array.isArray(food?.recipes) ? food.recipes : [];
        const favouriteMeals = recipes
            .map((recipe) => ({
                recipe,
                rating: Number(card._foodRecipeAverageRating?.(recipe) || 0),
            }))
            .filter((entry) => entry.rating >= 3)
            .sort((a, b) => b.rating - a.rating || String(a.recipe?.name || '').localeCompare(String(b.recipe?.name || '')));
        const shoppingFavourites = Array.isArray(card?._shoppingFavouriteEntries?.())
            ? card._shoppingFavouriteEntries()
            : [];
        const shoppingCommon = Array.isArray(card?._shoppingCommon)
            ? Array.from(
                  new Set(card._shoppingCommon.map((item) => String(item || '').trim()).filter(Boolean))
              )
            : [];
        const shoppingFavouriteKeys = new Set(
            shoppingFavourites.map((item) => String(item?.name || '').trim().toLowerCase())
        );
        const shoppingFavouriteQty = new Map(
            shoppingFavourites.map((item) => [
                String(item?.name || '').trim().toLowerCase(),
                Number(item?.qty || 1) || 1,
            ])
        );
        const shoppingItems = [];
        const seenShopping = new Set();
        for (const item of [
            ...shoppingFavourites.map((entry) => entry?.name),
            ...shoppingCommon,
        ]) {
            const text = String(item || '').trim();
            if (!text) continue;
            const key = text.toLowerCase();
            if (seenShopping.has(key)) continue;
            seenShopping.add(key);
            shoppingItems.push(text);
        }
        const mode = this._favouritesMode === 'shopping' ? 'shopping' : 'meals';
        return html`
            <div class="panel fb-card">
                <div class="fb-card-header">Favourites</div>
                <div class="panelBody">
                    <div class="bundleHead">
                        <div class="favouriteToggle" role="tablist" aria-label="Favourite types">
                            <button
                                class="btn ${mode === 'meals' ? 'active' : ''}"
                                @click=${() => (this._favouritesMode = 'meals')}
                            >
                                Favourite meals
                            </button>
                            <button
                                class="btn ${mode === 'shopping' ? 'active' : ''}"
                                @click=${() => (this._favouritesMode = 'shopping')}
                            >
                                Favourite shopping
                            </button>
                        </div>
                    </div>

                    ${mode === 'meals'
                        ? html`
                              <div class="sectionHint">
                                  Meals with average rating 3 stars or higher.
                              </div>
                              ${favouriteMeals.length
                                  ? html`<div class="stack">
                                        ${favouriteMeals.map(
                                            ({ recipe, rating }) => html`
                                                <div class="bundleCard">
                                                    <div class="bundleHead">
                                                        <div class="bundleName">
                                                            ${recipe.name}
                                                        </div>
                                                        <div class="mutedSmall">${rating}/5</div>
                                                    </div>
                                                    <div class="bundleHead">
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
                                                            @click=${() => {
                                                                this._openRecipeEditor(recipe);
                                                                this._tab = 'recipes';
                                                            }}
                                                        >
                                                            Open recipe
                                                        </button>
                                                    </div>
                                                </div>
                                            `
                                        )}
                                    </div>`
                                  : html`<div class="muted">No favourite meals yet.</div>`}
                          `
                        : html`
                              <div class="sectionHint">
                                  Starred and common quick-add shopping items.
                              </div>
                              ${shoppingItems.length
                                  ? html`<div class="shoppingFavList">
                                        ${shoppingItems.map((item) => {
                                            const isFavourite = shoppingFavouriteKeys.has(
                                                String(item || '').trim().toLowerCase()
                                            );
                                            const qty = shoppingFavouriteQty.get(
                                                String(item || '').trim().toLowerCase()
                                            ) || 1;
                                            return html`
                                                <div class="shoppingFavRow">
                                                    <div
                                                        class="btn shoppingFavItem"
                                                        role="button"
                                                        tabindex="0"
                                                        @click=${() =>
                                                            card._addShoppingItem?.(
                                                                card._formatShoppingText?.(
                                                                    item,
                                                                    qty,
                                                                    ''
                                                                ) || item
                                                            )}
                                                        @keydown=${(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                card._addShoppingItem?.(
                                                                    card._formatShoppingText?.(
                                                                        item,
                                                                        qty,
                                                                        ''
                                                                    ) || item
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <span class="shoppingFavText">
                                                            ${item}
                                                            <span class="mutedSmall">x${qty}</span>
                                                        </span>
                                                        <span class="shoppingFavPlus" aria-hidden="true">+</span>
                                                        ${isFavourite
                                                            ? html`<button
                                                                  class="btn icon ghost shoppingFavStar"
                                                                  title="Edit favourite"
                                                                  @click=${(e) => {
                                                                      e.stopPropagation();
                                                                      this._editFavouriteItem(card, {
                                                                          name: item,
                                                                          qty,
                                                                      });
                                                                  }}
                                                              >
                                                                  <ha-icon
                                                                      icon="mdi:pencil-outline"
                                                                  ></ha-icon>
                                                              </button>`
                                                            : html``}
                                                        <button
                                                            class="btn icon ghost shoppingFavStar ${isFavourite
                                                                ? 'active'
                                                                : ''}"
                                                            title=${isFavourite ? 'Unstar' : 'Star'}
                                                            @click=${(e) => {
                                                                e.stopPropagation();
                                                                card._toggleShoppingFavourite?.(item, {
                                                                    qty,
                                                                });
                                                            }}
                                                        >
                                                            <ha-icon
                                                                icon=${isFavourite
                                                                    ? 'mdi:star'
                                                                    : 'mdi:star-outline'}
                                                            ></ha-icon>
                                                        </button>
                                                    </div>
                                                </div>
                                            `
                                        })}
                                    </div>`
                                  : html`<div class="muted">No favourite shopping items yet.</div>`}
                          `}
                </div>
            </div>
        `;
    }

    _renderCookingTab(card, food) {
        const cooking = food?.cooking && typeof food.cooking === 'object' ? food.cooking : {};
        if (cooking.active !== true || !cooking.mealId) {
            return html`
                <div class="panel fb-card">
                    <div class="fb-card-header">Cooking</div>
                    <div class="panelBody">
                        <div class="muted">Start cooking from the Meals tab to see steps here.</div>
                    </div>
                </div>
            `;
        }
        const recipes = Array.isArray(food?.recipes) ? food.recipes : [];
        const recipe = recipes.find((entry) => entry.id === cooking.mealId) || null;
        const steps = Array.isArray(recipe?.steps) ? recipe.steps : [];
        const checks = Array.isArray(cooking.stepChecks) ? cooking.stepChecks : [];
        const weekdayLabels = card._foodWeekdayLabels?.() || [];
        const dayLabel =
            Number.isInteger(Number(cooking.day)) && weekdayLabels[Number(cooking.day)]
                ? weekdayLabels[Number(cooking.day)]
                : 'Today';
        return html`
            <div class="panel fb-card">
                <div class="fb-card-header">Cooking</div>
                <div class="panelBody">
                    <div class="bundleHead">
                        <div>
                            <div style="font-weight:700">${recipe?.name || 'Recipe'}</div>
                            <div class="mutedSmall">${dayLabel}</div>
                        </div>
                        <button
                            class="btn"
                            @click=${async () => {
                                await card._foodFinishCooking?.();
                                this._tab = 'menu';
                            }}
                        >
                            Finish cooking
                        </button>
                    </div>
                    ${steps.length
                        ? html`<div class="recipeList">
                              ${steps.map(
                                  (step, idx) => html`
                                      <label class="checkRow">
                                          <input
                                              type="checkbox"
                                              .checked=${checks[idx] === true}
                                              @change=${(e) =>
                                                  card._foodToggleCookingStep?.(
                                                      idx,
                                                      e.target.checked
                                                  )}
                                          />
                                          <span>${idx + 1}. ${step}</span>
                                      </label>
                                  `
                              )}
                          </div>`
                        : html`<div class="muted">No steps saved for this recipe.</div>`}
                </div>
            </div>
        `;
    }

    _renderShoppingTab(card, food) {
        return html`
            <div class="stack">
                ${this._renderSavedListsPanel(card, food)}
                <fb-shopping-view
                    .card=${card}
                    .renderKey=${this.renderKey}
                    .hideFavourites=${true}
                ></fb-shopping-view>
            </div>
        `;
    }

    render() {
        const card = this.card;
        if (!card) return html``;
        const food = card._foodData?.() || {
            menu: [],
            savedLists: [],
            recipes: [],
            units: [],
            cooking: { active: false, day: null, mealId: '', stepChecks: [] },
        };
        const cookingActive = food?.cooking?.active === true;
        if (this._tab === 'cooking' && !cookingActive) this._tab = 'menu';

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
                        <button
                            class="btn ${this._tab === 'favourites' ? 'active' : ''}"
                            @click=${() => (this._tab = 'favourites')}
                        >
                            Favourites
                        </button>
                        ${cookingActive
                            ? html`<button
                                  class="btn ${this._tab === 'cooking' ? 'active' : ''}"
                                  @click=${() => (this._tab = 'cooking')}
                              >
                                  Cooking
                              </button>`
                            : html``}
                    </div>
                    <div class="content">
                        ${this._tab === 'recipes'
                            ? this._renderRecipesTab(card, food)
                            : this._tab === 'cooking'
                            ? this._renderCookingTab(card, food)
                            : this._tab === 'favourites'
                            ? this._renderFavouritesTab(card, food)
                            : this._tab === 'shopping'
                            ? this._renderShoppingTab(card, food)
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
