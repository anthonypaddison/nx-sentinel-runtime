/* Family Board - setup discovery helpers
 * SPDX-License-Identifier: MIT
 */

const DEFAULT_COLOURS = [
    '#36B37E',
    '#7E57C2',
    '#F4B400',
    '#EC407A',
    '#42A5F5',
    '#00A3BF',
    '#FF7043',
    '#8D6E63',
];

function normaliseName(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/calendar|todo|list|task/gi, '')
        .replace(/[_\-.]/g, ' ')
        .trim();
}

function titleCase(name) {
    return name
        .split(' ')
        .filter(Boolean)
        .map((s) => s[0].toUpperCase() + s.slice(1))
        .join(' ');
}

export function discoverEntities(hass) {
    const states = hass?.states || {};
    const calendars = [];
    const todos = [];

    Object.keys(states).forEach((entityId) => {
        if (entityId.startsWith('calendar.')) calendars.push(entityId);
        if (entityId.startsWith('todo.')) todos.push(entityId);
    });

    return { calendars, todos };
}

function isShoppingCandidate(name, entityId) {
    const haystack = `${name || ''} ${entityId || ''}`.toLowerCase();
    return (
        haystack.includes('shopping') ||
        haystack.includes('grocery') ||
        haystack.includes('groceries')
    );
}

export function suggestShoppingEntity(hass) {
    const states = hass?.states || {};
    const todos = Object.keys(states).filter((entityId) => entityId.startsWith('todo.'));
    if (!todos.length) return null;

    const withNames = todos.map((entityId) => {
        const name = states?.[entityId]?.attributes?.friendly_name || entityId.replace('todo.', '');
        return { entityId, name };
    });

    const preferred = withNames.find((entry) =>
        isShoppingCandidate(entry.name, entry.entityId)
    );
    if (preferred) {
        return { entity: preferred.entityId, name: titleCase(preferred.name) };
    }

    if (withNames.length === 1) {
        return { entity: withNames[0].entityId, name: titleCase(withNames[0].name) };
    }

    return null;
}

export function suggestSetup(hass) {
    const { calendars, todos } = discoverEntities(hass);
    const peopleMap = new Map();
    const calendarEntries = [];
    const todoEntries = [];

    const pickPerson = (label) => {
        const key = normaliseName(label) || 'person';
        if (!peopleMap.has(key)) {
            peopleMap.set(key, {
                id: key.replace(/\s+/g, '_'),
                name: titleCase(key),
                color: DEFAULT_COLOURS[peopleMap.size % DEFAULT_COLOURS.length],
                header_row: peopleMap.size < 4 ? 1 : 2,
            });
        }
        return peopleMap.get(key);
    };

    calendars.forEach((entityId) => {
        const name =
            hass?.states?.[entityId]?.attributes?.friendly_name ||
            entityId.replace('calendar.', '');
        const person = pickPerson(name);
        const role = /family/i.test(name) ? 'family' : /routine/i.test(name) ? 'routine' : '';
        calendarEntries.push({
            entity: entityId,
            person_id: person.id,
            role,
        });
    });

    const shoppingSuggestion = suggestShoppingEntity(hass);

    todos
        .filter((entityId) => entityId !== shoppingSuggestion?.entity)
        .forEach((entityId) => {
        const name =
            hass?.states?.[entityId]?.attributes?.friendly_name ||
            entityId.replace('todo.', '');
        const person = pickPerson(name);
        todoEntries.push({
            entity: entityId,
            name: titleCase(name),
            person_id: person.id,
        });
    });

    const people = Array.from(peopleMap.values());
    const shopping = shoppingSuggestion;

    return { people, calendars: calendarEntries, todos: todoEntries, shopping };
}
