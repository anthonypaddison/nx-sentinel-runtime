/* nx-displaygrid - intent/ambient helpers (V2)
 * SPDX-License-Identifier: MIT
 */

import { parseTodoDueInfo, startOfDay, todoItemText } from './nx-displaygrid.util.js';

function hourBucket(date = new Date()) {
    const h = date.getHours();
    if (h < 6) return 'night';
    if (h < 12) return 'morning';
    if (h < 17) return 'day';
    if (h < 22) return 'evening';
    return 'night';
}

function normaliseStringList(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || '').trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
}

function isTodoImportant(item) {
    if (!item || typeof item !== 'object') return false;
    if (item.important === true || item.starred === true) return true;
    const priority = Number(item.priority || 0);
    if (Number.isFinite(priority) && priority > 0) return true;
    const labels = normaliseStringList(item.labels || item.tags || item.label_names).map((label) =>
        label.toLowerCase()
    );
    if (labels.some((label) => ['important', 'urgent', 'high'].includes(label))) return true;
    const text = todoItemText(item, '').toLowerCase();
    return text.includes('[!]') || text.includes('important');
}

function normaliseCollection(value, fallback = {}) {
    const source = value && typeof value === 'object' ? value : {};
    const label = String(source.label || fallback.label || '').trim();
    if (!label) return null;
    const domains = Array.isArray(source.domains)
        ? source.domains.map((domain) => String(domain || '').trim().toLowerCase()).filter(Boolean)
        : [];
    const nameContains = Array.isArray(source.name_contains)
        ? source.name_contains.map((part) => String(part || '').trim().toLowerCase()).filter(Boolean)
        : [];
    const explicitEntities = Array.isArray(source.entities)
        ? source.entities.map((entityId) => String(entityId || '').trim()).filter(Boolean)
        : Array.isArray(source.entity_ids)
        ? source.entity_ids.map((entityId) => String(entityId || '').trim()).filter(Boolean)
        : [];
    return {
        id: String(source.id || fallback.id || label.toLowerCase().replace(/\s+/g, '_')),
        label,
        icon: String(source.icon || fallback.icon || 'mdi:toggle-switch-outline'),
        domains,
        nameContains,
        explicitEntities,
    };
}

export function applyIntent(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _v2HouseModeState() {
            const entityId = this._config?.intent_v2?.house_mode_entity || '';
            const stateObj = entityId ? this._hass?.states?.[entityId] : null;
            const state = String(stateObj?.state || '').toLowerCase();
            const label = stateObj?.attributes?.friendly_name || entityId || '';
            return {
                entityId,
                state,
                label,
                available: Boolean(stateObj),
            };
        },

        _v2CurrentEventsNowCount() {
            const events = Array.isArray(this._calendarEventsMerged) ? this._calendarEventsMerged : [];
            const visible = new Set(this._visibleCalendarEntities?.() || []);
            const now = Date.now();
            return events.filter((e) => {
                if (!e?._start || !e?._end) return false;
                if (visible.size && !visible.has(e._fbEntityId)) return false;
                return e._start.getTime() <= now && e._end.getTime() > now;
            }).length;
        },

        _v2TodoDueTodayCount() {
            const todos = Array.isArray(this._config?.todos) ? this._config.todos : [];
            return todos.reduce((sum, t) => {
                if (!this._isPersonAllowed(this._personIdForConfig(t, t.entity))) return sum;
                return sum + this._dueTodayOrNoDueCount(this._todoItems?.[t.entity] || []);
            }, 0);
        },

        _v2IntentActions() {
            const bucket = hourBucket(new Date());
            const houseMode = this._v2HouseModeState();
            const shoppingCount = this._shoppingQuantityCount(this._shoppingItems || []);
            const choresDue = this._v2TodoDueTodayCount();
            const eventsNow = this._v2CurrentEventsNowCount();
            const lastRefreshAgeMin = this._lastRefreshTs
                ? Math.round((Date.now() - this._lastRefreshTs) / 60000)
                : null;
            const recentlyStale = Boolean(
                this._calendarStale || this._todoStale || this._shoppingStale || this._calendarError
            );

            const actions = [];

            if (recentlyStale || lastRefreshAgeMin === null || lastRefreshAgeMin > 15) {
                actions.push({
                    id: 'sync',
                    title: 'Sync now',
                    subtitle: recentlyStale ? 'Data is stale or failed' : 'Refresh household data',
                    icon: 'mdi:sync',
                    tone: 'warn',
                    run: () => this._onSyncCalendars?.(),
                });
            }

            if (bucket === 'morning') {
                actions.push({
                    id: 'today',
                    title: 'Today plan',
                    subtitle: `${choresDue} chores · ${shoppingCount} shopping`,
                    icon: 'mdi:weather-sunset-up',
                    tone: 'primary',
                    run: () => this._onNav?.({ detail: { target: 'important' } }),
                });
            }

            if (bucket === 'evening' || bucket === 'night') {
                actions.push({
                    id: 'wind-down',
                    title: 'Wind down',
                    subtitle: `${eventsNow} current events · ${choresDue} chores left`,
                    icon: 'mdi:weather-night',
                    tone: 'calm',
                    run: () => this._onNav?.({ detail: { target: 'home' } }),
                });
            }

            if (shoppingCount > 0) {
                actions.push({
                    id: 'shopping',
                    title: 'Shopping',
                    subtitle: `${shoppingCount} items waiting`,
                    icon: 'mdi:cart-outline',
                    tone: 'primary',
                    run: () => this._onNav?.({ detail: { target: 'shopping' } }),
                });
            } else if (this._v2FeatureEnabled?.('food_view')) {
                actions.push({
                    id: 'plan-meals',
                    title: 'Plan meals',
                    subtitle: 'Open Food menu and saved lists',
                    icon: 'mdi:silverware-fork-knife',
                    tone: 'calm',
                    run: () => this._onNav?.({ detail: { target: 'food' } }),
                });
            }

            if (choresDue > 0) {
                actions.push({
                    id: 'chores',
                    title: 'Chores',
                    subtitle: `${choresDue} due / no due date`,
                    icon: 'mdi:check-circle-outline',
                    tone: 'warn',
                    run: () => this._onNav?.({ detail: { target: 'chores' } }),
                });
            }

            actions.push({
                id: 'add-shopping',
                title: 'Add shopping item',
                subtitle: 'Quick capture',
                icon: 'mdi:plus-circle-outline',
                tone: 'neutral',
                run: () => {
                    this._closeAllDialogs?.();
                    this._dialogOpen = true;
                    this._setAddDialogMode?.('shopping');
                    this.requestUpdate?.();
                },
            });

            if (houseMode.available) {
                actions.push({
                    id: 'house-mode',
                    title: 'House mode',
                    subtitle: `${houseMode.label || houseMode.entityId}: ${houseMode.state || 'unknown'}`,
                    icon: 'mdi:home-switch',
                    tone: 'neutral',
                    run: () => this._openMoreInfo?.(houseMode.entityId),
                });
            }

            return actions.slice(0, 6);
        },

        _v2AmbientSummary() {
            const today = startOfDay(new Date());
            const shoppingCount = this._shoppingQuantityCount(this._shoppingItems || []);
            const choresDue = this._v2TodoDueTodayCount();
            const eventsNow = this._v2CurrentEventsNowCount();
            const nextEvents = (Array.isArray(this._calendarEventsMerged) ? this._calendarEventsMerged : [])
                .filter((e) => e?._start && e?._end && e._end > new Date())
                .sort((a, b) => a._start - b._start)
                .slice(0, 5)
                .map((e) => ({
                    title: e.summary || '(Event)',
                    start: e._start,
                    end: e._end,
                    allDay: Boolean(e.all_day),
                    entityId: e._fbEntityId || '',
                    event: e,
                }));
            return {
                date: today,
                shoppingCount,
                choresDue,
                eventsNow,
                nextEvents,
                houseMode: this._v2HouseModeState(),
                binIndicators: this._binIndicators?.() || { today: [], tomorrow: [] },
                lastRefreshTs: this._lastRefreshTs || 0,
            };
        },

        _v2ImportantTodoCountdowns(limit = 8) {
            const todos = Array.isArray(this._config?.todos) ? this._config.todos : [];
            const now = startOfDay(new Date());
            const msPerDay = 24 * 60 * 60 * 1000;
            const rows = [];
            for (const todoCfg of todos) {
                if (!this._isPersonAllowed(this._personIdForConfig(todoCfg, todoCfg.entity))) continue;
                const person = this._personForEntity?.(todoCfg.entity);
                const personName = person?.name || todoCfg?.name || '';
                const items = Array.isArray(this._todoItems?.[todoCfg.entity])
                    ? this._todoItems[todoCfg.entity]
                    : [];
                for (const item of items) {
                    const status = String(item?.status || '').toLowerCase();
                    if (status === 'completed' || status === 'done' || item?.completed) continue;
                    if (!isTodoImportant(item)) continue;
                    const dueInfo = parseTodoDueInfo(item?.due || item?.due_date || item?.due_datetime);
                    if (!dueInfo?.date) continue;
                    const dueDate = startOfDay(dueInfo.date);
                    if (Number.isNaN(dueDate.getTime())) continue;
                    const daysUntil = Math.round((dueDate.getTime() - now.getTime()) / msPerDay);
                    rows.push({
                        entityId: todoCfg.entity || '',
                        item,
                        personName,
                        title: todoItemText(item, '(Todo)'),
                        dueDate,
                        daysUntil,
                    });
                }
            }
            rows.sort((a, b) => {
                const scoreA = a.daysUntil < 0 ? a.daysUntil - 1000 : a.daysUntil;
                const scoreB = b.daysUntil < 0 ? b.daysUntil - 1000 : b.daysUntil;
                return scoreA - scoreB;
            });
            return rows.slice(0, Math.max(1, Number(limit || 8)));
        },

        _v2FamilyHomeControlCollections() {
            const controls = Array.isArray(this._config?.home_controls) ? this._config.home_controls : [];
            const eligible = controls.filter((entityId) => this._isHomeControlEntityEligible?.(entityId));
            const configured = Array.isArray(this._familyDashboardConfig?.()?.home_control_collections)
                ? this._familyDashboardConfig().home_control_collections
                : [];
            const defaults = [
                {
                    id: 'heating',
                    label: 'Heating',
                    icon: 'mdi:radiator',
                    domains: ['climate', 'switch', 'input_boolean'],
                    name_contains: ['heat', 'heating', 'boiler', 'radiator', 'thermostat'],
                },
                {
                    id: 'lighting',
                    label: 'Lighting',
                    icon: 'mdi:lightbulb-group',
                    domains: ['light', 'switch'],
                    name_contains: ['light', 'lamp'],
                },
            ];
            const sourceCollections = configured.length ? configured : defaults;
            return sourceCollections
                .map((entry, index) => normaliseCollection(entry, defaults[index] || {}))
                .filter(Boolean)
                .map((collection) => {
                    const explicit = Array.isArray(collection.explicitEntities)
                        ? collection.explicitEntities
                        : [];
                    const items = explicit.length
                        ? eligible.filter((entityId) => explicit.includes(entityId))
                        : eligible.filter((entityId) => {
                              const domain = String(entityId || '')
                                  .split('.')[0]
                                  .toLowerCase();
                              const slug = String(entityId || '').toLowerCase();
                              const domainMatch = collection.domains.length
                                  ? collection.domains.includes(domain)
                                  : true;
                              const textMatch = collection.nameContains.length
                                  ? collection.nameContains.some((part) => slug.includes(part))
                                  : false;
                              return domainMatch || textMatch;
                          });
                    return {
                        ...collection,
                        entities: items,
                    };
                });
        },
    });
}
