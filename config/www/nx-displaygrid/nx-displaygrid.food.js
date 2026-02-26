/* nx-displaygrid - food/menu helpers (V2)
 * SPDX-License-Identifier: MIT
 */

const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_FOOD_UNITS = ['quantity', 'grams', 'oz', 'kg', 'breasts', 'legs', 'ml', 'l'];

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

function dateKey(value) {
    const d = value instanceof Date ? value : new Date(value || Date.now());
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function mondayStart(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const weekday = d.getDay();
    const delta = weekday === 0 ? -6 : 1 - weekday;
    d.setDate(d.getDate() + delta);
    return d;
}

function weekDates(weekStartDate) {
    const start = mondayStart(weekStartDate);
    return Array.from({ length: 7 }, (_, day) => {
        const date = new Date(start);
        date.setDate(start.getDate() + day);
        return {
            day,
            date,
            dateKey: dateKey(date),
            label: WEEKDAY_LABELS[day] || `Day ${day + 1}`,
        };
    });
}

function normaliseMenuWeekRows(rows = [], weekStartDate = new Date()) {
    const source = Array.isArray(rows) ? rows : [];
    const dates = weekDates(weekStartDate);
    return dates.map((meta) => {
        const row = source.find((entry) => Number(entry?.day) === Number(meta.day)) || {};
        return {
            day: meta.day,
            date: meta.date,
            dateKey: meta.dateKey,
            label: meta.label,
            mealId: String(row.mealId || ''),
            note: String(row.note || ''),
        };
    });
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

function normaliseCookingState(value, recipes = []) {
    const source = value && typeof value === 'object' ? value : {};
    const active = source.active === true;
    const mealId = String(source.mealId || '').trim();
    const recipe = recipes.find((entry) => entry.id === mealId) || null;
    if (!active || !mealId || !recipe) {
        return {
            active: false,
            day: null,
            mealId: '',
            startedAt: 0,
            stepChecks: [],
        };
    }
    const dayValue = Number(source.day);
    const day = Number.isInteger(dayValue) && dayValue >= 0 && dayValue <= 6 ? dayValue : null;
    const startedAt = Number(source.startedAt);
    const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
    const checks = Array.isArray(source.stepChecks) ? source.stepChecks : [];
    const stepChecks = steps.map((_, idx) => checks[idx] === true);
    return {
        active: true,
        day,
        mealId,
        startedAt: Number.isFinite(startedAt) && startedAt > 0 ? startedAt : Date.now(),
        stepChecks,
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

        _foodWeekInfo(offset = 0) {
            const safeOffset = Number.isFinite(Number(offset)) ? Math.trunc(Number(offset)) : 0;
            const start = mondayStart(new Date());
            start.setDate(start.getDate() + safeOffset * 7);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return {
                offset: safeOffset,
                start,
                end,
                weekKey: dateKey(start),
                days: weekDates(start),
            };
        },

        _foodWeekMenu(weekKey = '') {
            const food = this._foodData?.() || {};
            const key = String(weekKey || food.currentWeekKey || '').trim();
            if (!key) return Array.isArray(food.menu) ? food.menu : [];
            const week = food.menuWeeks?.[key];
            if (Array.isArray(week) && week.length) return week;
            if (key === food.currentWeekKey) return Array.isArray(food.menu) ? food.menu : [];
            const parsed = new Date(`${key}T00:00:00`);
            if (Number.isNaN(parsed.getTime())) return [];
            return normaliseMenuWeekRows([], parsed);
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
            const currentWeek = mondayStart(new Date());
            const currentWeekKey = dateKey(currentWeek);
            const menuWeeksRaw =
                data.menu_weeks && typeof data.menu_weeks === 'object' ? data.menu_weeks : {};
            const menuWeeks = {};
            Object.entries(menuWeeksRaw).forEach(([week, rows]) => {
                const parsedWeek = new Date(`${week}T00:00:00`);
                if (Number.isNaN(parsedWeek.getTime())) return;
                menuWeeks[week] = normaliseMenuWeekRows(rows, parsedWeek).map((row) => ({
                    day: row.day,
                    mealId: row.mealId,
                    note: row.note,
                }));
            });
            if (!menuWeeks[currentWeekKey] && rawMenu.length) {
                menuWeeks[currentWeekKey] = normaliseMenuWeekRows(rawMenu, currentWeek).map(
                    (row) => ({
                        day: row.day,
                        mealId: row.mealId,
                        note: row.note,
                    })
                );
            }
            const menu = normaliseMenuWeekRows(
                menuWeeks[currentWeekKey] || rawMenu,
                currentWeek
            );
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
            const cooking = normaliseCookingState(data.cooking, recipes);

            return {
                menu,
                menuWeeks,
                currentWeekKey,
                inventory: { pantry, fridge },
                savedLists,
                recipes,
                meals: recipes,
                units: normaliseUnits(Array.isArray(data.units) ? data.units : []),
                cooking,
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

        async _foodSetMenuDay(day, patch = {}, weekKey = '') {
            const idx = Number(day);
            if (!Number.isInteger(idx) || idx < 0 || idx > 6) return;
            const food = this._foodData();
            const key =
                String(weekKey || '').trim() ||
                String(food.currentWeekKey || dateKey(mondayStart(new Date()))).trim();
            const parsedWeek = new Date(`${key}T00:00:00`);
            const baseWeek = normaliseMenuWeekRows(
                Array.isArray(food.menuWeeks?.[key]) ? food.menuWeeks[key] : key === food.currentWeekKey ? food.menu : [],
                Number.isNaN(parsedWeek.getTime()) ? new Date() : parsedWeek
            );
            const nextWeek = baseWeek.map((entry) =>
                entry.day === idx ? { ...entry, ...patch, day: idx } : entry
            );
            const nextMenuWeeks = {
                ...(food.menuWeeks || {}),
                [key]: nextWeek.map((entry) => ({
                    day: entry.day,
                    mealId: String(entry.mealId || ''),
                    note: String(entry.note || ''),
                })),
            };
            const payload = {
                menu_weeks: nextMenuWeeks,
            };
            if (key === food.currentWeekKey) {
                payload.menu = nextWeek.map((entry) => ({
                    day: entry.day,
                    mealId: String(entry.mealId || ''),
                    note: String(entry.note || ''),
                }));
            }
            await this._updateFoodData(payload);
        },

        _foodRecipeById(recipeId) {
            const food = this._foodData();
            return (food.recipes || []).find((recipe) => recipe.id === recipeId) || null;
        },

        _foodRecipeIngredients(recipe) {
            const safe = normaliseRecipe(recipe);
            return Array.isArray(safe?.ingredients) ? safe.ingredients : [];
        },

        _foodMenuMeal(day, weekKey = '') {
            const idx = Number(day);
            const food = this._foodData();
            const menu = this._foodWeekMenu?.(weekKey) || food.menu || [];
            const menuEntry = menu.find((entry) => entry.day === idx);
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

        async _foodAddMeal({ name, itemsText, instructionsText = '', ingredients = [], steps = [] }) {
            const mealName = String(name || '').trim();
            if (!mealName) return;
            const rawIngredients = Array.isArray(ingredients) && ingredients.length
                ? ingredients
                : parseLines(itemsText);
            if (!rawIngredients.length) return;
            const recipe = normaliseRecipe({
                id: makeId('food_recipe'),
                name: mealName,
                ingredients: rawIngredients,
                instructions: Array.isArray(steps) && steps.length ? steps : instructionsText,
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
            const currentCooking =
                food.cooking && typeof food.cooking === 'object' ? food.cooking : null;
            const nextCooking =
                currentCooking?.mealId === mealId
                    ? { active: false, day: null, mealId: '', startedAt: 0, stepChecks: [] }
                    : currentCooking;
            await this._updateFoodData({
                recipes: nextMeals,
                meals: nextMeals,
                menu: nextMenu,
                cooking: nextCooking,
            });
        },

        async _foodBeginCooking(day, weekKey = '') {
            const idx = Number(day);
            if (!Number.isInteger(idx) || idx < 0 || idx > 6) return false;
            const food = this._foodData();
            const menu = this._foodWeekMenu?.(weekKey) || food.menu || [];
            const entry = menu.find((row) => row.day === idx);
            const mealId = String(entry?.mealId || '').trim();
            if (!mealId) return false;
            const meal = this._foodRecipeById(mealId);
            if (!meal) return false;
            const steps = Array.isArray(meal.steps) ? meal.steps : [];
            await this._updateFoodData({
                cooking: {
                    active: true,
                    day: idx,
                    mealId,
                    startedAt: Date.now(),
                    stepChecks: steps.map(() => false),
                },
            });
            return true;
        },

        async _foodToggleCookingStep(stepIndex, checked) {
            const idx = Number(stepIndex);
            if (!Number.isInteger(idx) || idx < 0) return;
            const food = this._foodData();
            const cooking = food.cooking && typeof food.cooking === 'object' ? food.cooking : null;
            if (!cooking?.active || !cooking.mealId) return;
            const meal = this._foodRecipeById(cooking.mealId);
            const steps = Array.isArray(meal?.steps) ? meal.steps : [];
            if (idx >= steps.length) return;
            const checks = Array.isArray(cooking.stepChecks)
                ? cooking.stepChecks.slice(0, steps.length)
                : steps.map(() => false);
            while (checks.length < steps.length) checks.push(false);
            checks[idx] = checked === true;
            await this._updateFoodData({
                cooking: {
                    ...cooking,
                    active: true,
                    mealId: cooking.mealId,
                    stepChecks: checks,
                },
            });
        },

        async _foodFinishCooking() {
            await this._updateFoodData({
                cooking: {
                    active: false,
                    day: null,
                    mealId: '',
                    startedAt: 0,
                    stepChecks: [],
                },
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

        async _foodAddMenuDayMealToShopping(day, weekKey = '') {
            const idx = Number(day);
            const menu = this._foodWeekMenu?.(weekKey) || this._foodData()?.menu || [];
            const entry = menu.find((row) => row.day === idx);
            if (!entry?.mealId) return;
            await this._foodAddMealToShopping(entry.mealId);
        },
    });
}
