/* nx-displaygrid - intent/ambient helpers (V2)
 * SPDX-License-Identifier: MIT
 */

import { startOfDay } from './nx-displaygrid.util.js';

function hourBucket(date = new Date()) {
    const h = date.getHours();
    if (h < 6) return 'night';
    if (h < 12) return 'morning';
    if (h < 17) return 'day';
    if (h < 22) return 'evening';
    return 'night';
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
    });
}
