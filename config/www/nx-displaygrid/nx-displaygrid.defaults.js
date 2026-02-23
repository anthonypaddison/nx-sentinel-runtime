/* nx-displaygrid - defaults
 * SPDX-License-Identifier: MIT
 */
export const DEFAULT_COMMON_ITEMS = [
    'Milk',
    'Bread',
    'Butter',
    'Eggs',
    'Cheese',
    'Apples',
    'Bananas',
    'Chicken',
    'Rice',
    'Pasta',
    'Cereal',
    'Yogurt',
    'Ham',
    'Carrots',
    'Potatoes',
    'Tomatoes',
    'Cucumbers',
    'Chocolate',
    'Crisps',
    'Toilet roll',
];

export const DEFAULT_CARD_CONFIG = Object.freeze({
    days_to_show: 5,
    day_start_hour: 6,
    day_end_hour: 24,
    slot_minutes: 30,
    px_per_hour: 120,
    refresh_interval_ms: 300000,
});
