/* nx-displaygrid - source validation helpers
 * SPDX-License-Identifier: MIT
 */

export function configHasPeople(config) {
    return Array.isArray(config?.people) && config.people.length > 0;
}

export function configHasSources(config) {
    const calendars = Array.isArray(config?.calendars) ? config.calendars : [];
    const todos = Array.isArray(config?.todos) ? config.todos : [];
    const hasShopping = Boolean(config?.shopping?.entity);
    return calendars.length > 0 || todos.length > 0 || hasShopping;
}

export function configHasSourceData(config) {
    if (!config || typeof config !== 'object') return false;
    return configHasPeople(config) || configHasSources(config);
}
