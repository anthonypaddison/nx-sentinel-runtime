/* nx-displaygrid - food/menu helpers (V2)
 * SPDX-License-Identifier: MIT
 */

const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function makeId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function parseItemsText(text) {
    return String(text || '')
        .split(/\n|,/g)
        .map((item) => item.trim())
        .filter(Boolean);
}

function normaliseNamedBundle(bundle, fallbackPrefix) {
    if (!bundle || typeof bundle !== 'object') return null;
    const name = String(bundle.name || '').trim();
    if (!name) return null;
    const rawItems = Array.isArray(bundle.items) ? bundle.items : parseItemsText(bundle.items || '');
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

export function applyFood(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _foodWeekdayLabels() {
            return WEEKDAY_LABELS.slice();
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
            const meals = (Array.isArray(data.meals) ? data.meals : [])
                .map((bundle) => normaliseNamedBundle(bundle, 'food_meal'))
                .filter(Boolean);
            return {
                menu,
                inventory: { pantry, fridge },
                savedLists,
                meals,
            };
        },

        async _updateFoodData(nextFood) {
            const current = this._config?.food_v2;
            const base = current && typeof current === 'object' ? current : {};
            await this._updateConfigPartial({
                food_v2: { ...base, ...(nextFood || {}) },
            });
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
            const items = parseItemsText(itemsText);
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

        async _foodAddMeal({ name, itemsText }) {
            const mealName = String(name || '').trim();
            if (!mealName) return;
            const items = parseItemsText(itemsText);
            if (!items.length) return;
            const food = this._foodData();
            const next = [
                {
                    id: makeId('food_meal'),
                    name: mealName,
                    items,
                    note: '',
                },
                ...food.meals,
            ];
            await this._updateFoodData({ meals: next });
        },

        async _foodRemoveMeal(mealId) {
            if (!mealId) return;
            const food = this._foodData();
            const nextMeals = food.meals.filter((meal) => meal.id !== mealId);
            const nextMenu = food.menu.map((entry) =>
                entry.mealId === mealId ? { ...entry, mealId: '' } : entry
            );
            await this._updateFoodData({
                meals: nextMeals,
                menu: nextMenu,
            });
        },

        async _foodAddItemsToShopping(items, label = 'Items') {
            const shoppingEntity = this._config?.shopping?.entity || '';
            if (!shoppingEntity) {
                this._showToast?.('Shopping not configured', 'Set a shopping entity in Settings first');
                return;
            }
            const list = (Array.isArray(items) ? items : [])
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
            const food = this._foodData();
            const meal = food.meals.find((entry) => entry.id === mealId);
            if (!meal) return;
            await this._foodAddItemsToShopping(meal.items, meal.name || 'Meal');
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
