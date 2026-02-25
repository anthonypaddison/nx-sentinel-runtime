/* nx-displaygrid - food/menu helpers (V2)
 * SPDX-License-Identifier: MIT
 */

const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_FOOD_UNITS = ['grams', 'oz', 'kg', 'breasts', 'legs', 'ml', 'l', 'items'];

function makeId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function parseLines(text) {
    return String(text || '')
        .split(/\n|,/g)
        .map((item) => item.trim())
        .filter(Boolean);
}

function normaliseUnits(units) {
    const list = Array.isArray(units) ? units : [];
    const unique = [];
    list.forEach((unit) => {
        const value = String(unit || '').trim();
        if (!value) return;
        if (!unique.includes(value)) unique.push(value);
    });
    return unique;
}

function parseNumeric(value, fallback = 1) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
}

function trimNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '1';
    if (Math.abs(n - Math.round(n)) < 0.0001) return String(Math.round(n));
    return String(Math.round(n * 100) / 100);
}

function parseIngredientText(text, defaultUnit = '') {
    const raw = String(text || '').trim();
    if (!raw) return null;

    const leading = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/.exec(raw);
    if (leading) {
        return {
            id: makeId('food_ing'),
            name: String(leading[3] || '').trim(),
            qty: parseNumeric(leading[1], 1),
            unit: String(leading[2] || defaultUnit || '').trim(),
        };
    }

    const trailing = /^(.+?)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/.exec(raw);
    if (trailing) {
        return {
            id: makeId('food_ing'),
            name: String(trailing[1] || '').trim(),
            qty: parseNumeric(trailing[2], 1),
            unit: String(trailing[3] || defaultUnit || '').trim(),
        };
    }

    const countSuffix = /^(.+?)\s+x(\d+(?:\.\d+)?)$/i.exec(raw);
    if (countSuffix) {
        return {
            id: makeId('food_ing'),
            name: String(countSuffix[1] || '').trim(),
            qty: parseNumeric(countSuffix[2], 1),
            unit: String(defaultUnit || '').trim(),
        };
    }

    return {
        id: makeId('food_ing'),
        name: raw,
        qty: 1,
        unit: String(defaultUnit || '').trim(),
    };
}

function normaliseIngredient(item, defaultUnit = '') {
    if (!item) return null;
    if (typeof item === 'string') return parseIngredientText(item, defaultUnit);
    if (typeof item !== 'object') return null;
    const textName = String(item.name || item.item || item.summary || '').trim();
    if (!textName) return null;
    return {
        id: String(item.id || makeId('food_ing')),
        name: textName,
        qty: parseNumeric(item.qty ?? item.quantity ?? 1, 1),
        unit: String(item.unit || defaultUnit || '').trim(),
    };
}

function normaliseSteps(value) {
    if (Array.isArray(value)) {
        return value.map((step) => String(step || '').trim()).filter(Boolean);
    }
    return parseLines(value);
}

function normaliseRecipe(recipe) {
    if (!recipe || typeof recipe !== 'object') return null;
    const name = String(recipe.name || '').trim();
    if (!name) return null;
    const ingredients = (
        Array.isArray(recipe.ingredients)
            ? recipe.ingredients
            : Array.isArray(recipe.items)
            ? recipe.items
            : parseLines(recipe.itemsText || recipe.items || '')
    )
        .map((ingredient) => normaliseIngredient(ingredient))
        .filter(Boolean);
    const steps = normaliseSteps(recipe.steps || recipe.instructions || recipe.instructionsText || '');
    const reviews = (Array.isArray(recipe.reviews) ? recipe.reviews : [])
        .map((review) => {
            if (!review || typeof review !== 'object') return null;
            const userId = String(review.userId || review.user_id || '').trim();
            const rating = Math.min(5, Math.max(1, Math.round(Number(review.rating || 0))));
            if (!userId || !Number.isFinite(rating) || rating < 1) return null;
            return {
                userId,
                rating,
                comment: String(review.comment || '').trim(),
                updatedAt: Number(review.updatedAt || Date.now()),
            };
        })
        .filter(Boolean);

    return {
        id: String(recipe.id || makeId('food_recipe')),
        name,
        ingredients,
        steps,
        note: String(recipe.note || '').trim(),
        reviews,
    };
}

function normaliseNamedBundle(bundle, fallbackPrefix) {
    if (!bundle || typeof bundle !== 'object') return null;
    const name = String(bundle.name || '').trim();
    if (!name) return null;
    const rawItems = Array.isArray(bundle.items) ? bundle.items : parseLines(bundle.items || '');
    const items = rawItems.map((item) => String(item || '').trim()).filter(Boolean);
    return {
        id: String(bundle.id || makeId(fallbackPrefix)),
        name,
        items,
        note: String(bundle.note || '').trim(),
    };
}

function normaliseInventoryItem(item, zone) {
    if (!item || typeof item !== 'object') return null;
    const name = String(item.name || '').trim();
    if (!name) return null;
    return {
        id: String(item.id || makeId(`food_${zone}`)),
        name,
        qty: String(item.qty || '').trim(),
        inStock: item.inStock !== false,
    };
}

function ingredientToShoppingText(ingredient) {
    const parsed = normaliseIngredient(ingredient);
    if (!parsed) return '';
    const qty = trimNumber(parsed.qty || 1);
    const unit = String(parsed.unit || '').trim();
    if (unit) return `${parsed.name} ${qty} ${unit}`.trim();
    if (Number(parsed.qty || 1) <= 1) return parsed.name;
    return `${parsed.name} x${qty}`.trim();
}

export function applyFood(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _foodWeekdayLabels() {
            return WEEKDAY_LABELS.slice();
        },

        _foodUnitOptions() {
            const food = this._foodData?.() || {};
            const configured = Array.isArray(food.units) ? food.units : [];
            return normaliseUnits([...DEFAULT_FOOD_UNITS, ...configured]);
        },

        _foodData() {
            const raw = this._config?.food_v2;
            const data = raw && typeof raw === 'object' ? raw : {};
            const rawMenu = Array.isArray(data.menu) ? data.menu : [];
            const menu = Array.from({ length: 7 }, (_, idx) => {
                const source = rawMenu.find((entry) => Number(entry?.day) === idx) || {};
                return {
                    day: idx,
                    label: WEEKDAY_LABELS[idx] || `Day ${idx + 1}`,
                    mealId: String(source.mealId || ''),
                    note: String(source.note || ''),
                };
            });
            const inventory = data.inventory && typeof data.inventory === 'object' ? data.inventory : {};
            const pantry = (Array.isArray(inventory.pantry) ? inventory.pantry : [])
                .map((item) => normaliseInventoryItem(item, 'pantry'))
                .filter(Boolean);
            const fridge = (Array.isArray(inventory.fridge) ? inventory.fridge : [])
                .map((item) => normaliseInventoryItem(item, 'fridge'))
                .filter(Boolean);
            const savedLists = (Array.isArray(data.savedLists) ? data.savedLists : [])
                .map((bundle) => normaliseNamedBundle(bundle, 'food_list'))
                .filter(Boolean);

            const recipesRaw = Array.isArray(data.recipes) ? data.recipes : [];
            const legacyMealsRaw = Array.isArray(data.meals) ? data.meals : [];
            const recipes = [
                ...recipesRaw.map((recipe) => normaliseRecipe(recipe)).filter(Boolean),
                ...legacyMealsRaw
                    .map((meal) => {
                        const normalised = normaliseNamedBundle(meal, 'food_recipe');
                        if (!normalised) return null;
                        return normaliseRecipe({
                            ...normalised,
                            ingredients: normalised.items,
                            steps: meal.steps || meal.instructions || meal.note || '',
                            reviews: meal.reviews || [],
                        });
                    })
                    .filter(Boolean),
            ].reduce((acc, recipe) => {
                if (!recipe) return acc;
                if (acc.some((entry) => entry.id === recipe.id)) return acc;
                acc.push(recipe);
                return acc;
            }, []);

            return {
                menu,
                inventory: { pantry, fridge },
                savedLists,
                recipes,
                meals: recipes,
                units: normaliseUnits(Array.isArray(data.units) ? data.units : []),
            };
        },

        async _updateFoodData(nextFood) {
            const current = this._config?.food_v2;
            const base = current && typeof current === 'object' ? current : {};
            await this._updateConfigPartial({
                food_v2: { ...base, ...(nextFood || {}) },
            });
        },

        async _foodSetUnits(units) {
            const nextUnits = normaliseUnits(units);
            await this._updateFoodData({ units: nextUnits });
        },

        async _foodSetMenuDay(day, patch = {}) {
            const idx = Number(day);
            if (!Number.isInteger(idx) || idx < 0 || idx > 6) return;
            const food = this._foodData();
            const nextMenu = food.menu.map((entry) =>
                entry.day === idx ? { ...entry, ...patch, day: idx } : entry
            );
            await this._updateFoodData({ menu: nextMenu });
        },

        _foodRecipeById(recipeId) {
            const food = this._foodData();
            return (food.recipes || []).find((recipe) => recipe.id === recipeId) || null;
        },

        _foodRecipeIngredients(recipe) {
            const safe = normaliseRecipe(recipe);
            return Array.isArray(safe?.ingredients) ? safe.ingredients : [];
        },

        _foodMenuMeal(day) {
            const idx = Number(day);
            const food = this._foodData();
            const menuEntry = food.menu.find((entry) => entry.day === idx);
            if (!menuEntry?.mealId) return null;
            return food.recipes.find((recipe) => recipe.id === menuEntry.mealId) || null;
        },

        async _foodAddInventoryItem(zone, { name, qty = '' } = {}) {
            const bucket = zone === 'fridge' ? 'fridge' : 'pantry';
            const itemName = String(name || '').trim();
            if (!itemName) return;
            const food = this._foodData();
            const current = Array.isArray(food.inventory?.[bucket]) ? food.inventory[bucket] : [];
            const next = [
                {
                    id: makeId(`food_${bucket}`),
                    name: itemName,
                    qty: String(qty || '').trim(),
                    inStock: true,
                },
                ...current,
            ];
            await this._updateFoodData({
                inventory: {
                    ...food.inventory,
                    [bucket]: next,
                },
            });
        },

        async _foodToggleInventoryItem(zone, itemId) {
            const bucket = zone === 'fridge' ? 'fridge' : 'pantry';
            if (!itemId) return;
            const food = this._foodData();
            const current = Array.isArray(food.inventory?.[bucket]) ? food.inventory[bucket] : [];
            const next = current.map((item) =>
                item.id === itemId ? { ...item, inStock: !item.inStock } : item
            );
            await this._updateFoodData({
                inventory: {
                    ...food.inventory,
                    [bucket]: next,
                },
            });
        },

        async _foodRemoveInventoryItem(zone, itemId) {
            const bucket = zone === 'fridge' ? 'fridge' : 'pantry';
            if (!itemId) return;
            const food = this._foodData();
            const current = Array.isArray(food.inventory?.[bucket]) ? food.inventory[bucket] : [];
            const next = current.filter((item) => item.id !== itemId);
            await this._updateFoodData({
                inventory: {
                    ...food.inventory,
                    [bucket]: next,
                },
            });
        },

        async _foodAddSavedList({ name, itemsText }) {
            const listName = String(name || '').trim();
            if (!listName) return;
            const items = parseLines(itemsText);
            if (!items.length) return;
            const food = this._foodData();
            const next = [
                {
                    id: makeId('food_list'),
                    name: listName,
                    items,
                    note: '',
                },
                ...food.savedLists,
            ];
            await this._updateFoodData({ savedLists: next });
        },

        async _foodRemoveSavedList(listId) {
            if (!listId) return;
            const food = this._foodData();
            await this._updateFoodData({
                savedLists: food.savedLists.filter((list) => list.id !== listId),
            });
        },

        async _foodAddMeal({ name, itemsText, instructionsText = '' }) {
            const mealName = String(name || '').trim();
            if (!mealName) return;
            const rawIngredients = parseLines(itemsText);
            if (!rawIngredients.length) return;
            const recipe = normaliseRecipe({
                id: makeId('food_recipe'),
                name: mealName,
                ingredients: rawIngredients,
                instructions: instructionsText,
                note: '',
                reviews: [],
            });
            if (!recipe) return;
            const food = this._foodData();
            await this._updateFoodData({ recipes: [recipe, ...food.recipes] });
        },

        async _foodUpdateMeal(recipeId, patch = {}) {
            if (!recipeId) return;
            const food = this._foodData();
            const next = food.recipes.map((recipe) => {
                if (recipe.id !== recipeId) return recipe;
                const merged = {
                    ...recipe,
                    ...patch,
                };
                const normalised = normaliseRecipe(merged);
                return normalised || recipe;
            });
            await this._updateFoodData({ recipes: next });
        },

        async _foodRemoveMeal(mealId) {
            if (!mealId) return;
            const food = this._foodData();
            const nextMeals = food.recipes.filter((meal) => meal.id !== mealId);
            const nextMenu = food.menu.map((entry) =>
                entry.mealId === mealId ? { ...entry, mealId: '' } : entry
            );
            await this._updateFoodData({
                recipes: nextMeals,
                meals: nextMeals,
                menu: nextMenu,
            });
        },

        _foodRecipeAverageRating(recipe) {
            const reviews = Array.isArray(recipe?.reviews) ? recipe.reviews : [];
            if (!reviews.length) return 0;
            const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
            return Math.round((total / reviews.length) * 10) / 10;
        },

        _foodRecipeUserReview(recipe) {
            const userId = String(this._hass?.user?.id || '').trim();
            if (!userId) return null;
            const reviews = Array.isArray(recipe?.reviews) ? recipe.reviews : [];
            return reviews.find((review) => String(review.userId || '').trim() === userId) || null;
        },

        async _foodSetRecipeReview(recipeId, { rating, comment = '' } = {}) {
            if (!recipeId) return;
            const userId = String(this._hass?.user?.id || '').trim();
            if (!userId) return;
            const safeRating = Math.min(5, Math.max(1, Math.round(Number(rating || 0))));
            if (!safeRating) return;
            const food = this._foodData();
            const next = food.recipes.map((recipe) => {
                if (recipe.id !== recipeId) return recipe;
                const current = Array.isArray(recipe.reviews) ? recipe.reviews : [];
                const rest = current.filter(
                    (review) => String(review.userId || '').trim() !== userId
                );
                return {
                    ...recipe,
                    reviews: [
                        {
                            userId,
                            rating: safeRating,
                            comment: String(comment || '').trim(),
                            updatedAt: Date.now(),
                        },
                        ...rest,
                    ],
                };
            });
            await this._updateFoodData({ recipes: next });
        },

        _foodIngredientShoppingText(ingredient) {
            return ingredientToShoppingText(ingredient);
        },

        _foodMealShoppingItems(mealId) {
            const meal = this._foodRecipeById(mealId);
            if (!meal) return [];
            return this._foodRecipeIngredients(meal);
        },

        async _foodAddItemsToShopping(items, label = 'Items') {
            const shoppingEntity = this._config?.shopping?.entity || '';
            if (!shoppingEntity) {
                this._showToast?.('Shopping not configured', 'Set a shopping entity in Settings first');
                return;
            }
            const list = (Array.isArray(items) ? items : [])
                .map((item) =>
                    typeof item === 'object' ? ingredientToShoppingText(item) : String(item || '').trim()
                )
                .map((item) => String(item || '').trim())
                .filter(Boolean);
            if (!list.length) return;
            for (const item of list) {
                await this._addShoppingItem(item);
            }
            this._showToast?.('Added to shopping', `${list.length} ${label.toLowerCase()}`);
        },

        async _foodAddSavedListToShopping(listId) {
            const food = this._foodData();
            const list = food.savedLists.find((entry) => entry.id === listId);
            if (!list) return;
            await this._foodAddItemsToShopping(list.items, list.name || 'Saved list');
        },

        async _foodAddMealToShopping(mealId) {
            const meal = this._foodRecipeById(mealId);
            if (!meal) return;
            await this._foodAddItemsToShopping(meal.ingredients || [], meal.name || 'Meal');
        },

        async _foodAddIngredientToShopping(ingredient) {
            if (!ingredient) return;
            await this._foodAddItemsToShopping([ingredient], 'Ingredient');
        },

        async _foodAddMenuDayMealToShopping(day) {
            const idx = Number(day);
            const food = this._foodData();
            const entry = food.menu.find((row) => row.day === idx);
            if (!entry?.mealId) return;
            await this._foodAddMealToShopping(entry.mealId);
        },
    });
}
