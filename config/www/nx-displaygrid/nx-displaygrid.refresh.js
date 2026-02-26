/* nx-displaygrid - refresh helpers
 * SPDX-License-Identifier: MIT
 */
import { addDays, startOfDay, endOfDay, debugLog } from './nx-displaygrid.util.js';
import { getDeviceKind } from './util/prefs.util.js';
import { idbGet, idbSet, idbDelete } from './util/idb.util.js';
import {
    makeScopedKey,
    makeLegacyScopedKey,
    migrateScopedStoreKey,
    readJsonLocal,
    writeJsonLocal,
    removeLocalKey,
} from './util/scoped-storage.util.js';

export function applyRefresh(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _staleThresholdMs() {
            const refreshMs = this._refreshIntervalMs ?? 300_000;
            return Math.max(refreshMs * 2, 120_000);
        },

        _cacheMaxAgeMsValue() {
            const raw = Number(this._cacheMaxAgeMs ?? 0);
            return Number.isFinite(raw) && raw > 0 ? raw : 0;
        },

        _isCacheTooOld(lastSuccessTs) {
            const maxAge = this._cacheMaxAgeMsValue();
            if (!maxAge || !lastSuccessTs) return false;
            return Date.now() - lastSuccessTs > maxAge;
        },

        _dataCacheKey() {
            const userId = this._hass?.user?.id || 'unknown';
            return makeScopedKey('nx-displaygrid:data', userId);
        },

        _legacyDataCacheKey(userId = this._hass?.user?.id || 'unknown', device = getDeviceKind()) {
            return makeLegacyScopedKey('nx-displaygrid:data', userId, device);
        },

        async _migrateDataCacheStorage() {
            if (this._dataCacheStorageMigrated) return;
            this._dataCacheStorageMigrated = true;
            const key = this._dataCacheKey();
            const legacyKey = this._legacyDataCacheKey();
            await migrateScopedStoreKey({
                key,
                legacyKey,
                idbStore: 'cache',
                idbGetFn: idbGet,
                idbSetFn: idbSet,
            });
        },

        _loadLocalDataCache(key) {
            return readJsonLocal(key, null);
        },

        _saveLocalDataCache(key, data) {
            writeJsonLocal(key, data || {});
        },

        async _clearDataCache() {
            const key = this._dataCacheKey();
            removeLocalKey(key);
            await idbDelete('cache', key);
            this._dataCache = null;
            this._dataCacheLoaded = false;
        },

        _hydrateCalendarCache(eventsByEntity) {
            const next = { ...(eventsByEntity || {}) };
            for (const [entityId, items] of Object.entries(next)) {
                if (!Array.isArray(items)) continue;
                next[entityId] = items.map((event) => {
                    const start = event?._start;
                    const end = event?._end;
                    return {
                        ...event,
                        _start:
                            typeof start === 'string'
                                ? new Date(start)
                                : start instanceof Date
                                ? start
                                : start,
                        _end:
                            typeof end === 'string'
                                ? new Date(end)
                                : end instanceof Date
                                ? end
                                : end,
                    };
                });
            }
            return next;
        },

        async _loadDataCache() {
            if (this._dataCacheLoaded || !this._hass) return;
            this._dataCacheLoaded = true;
            await this._migrateDataCacheStorage();
            const key = this._dataCacheKey();
            const cached = (await idbGet('cache', key)) || this._loadLocalDataCache(key);
            if (!cached || typeof cached !== 'object') return;
            this._dataCache = cached;

            const now = Date.now();
            const staleThreshold = this._staleThresholdMs();

            if (cached.calendars?.eventsByEntity) {
                this._eventsByEntity = this._hydrateCalendarCache(
                    cached.calendars.eventsByEntity
                );
                this._calendarEventsMerged = this._mergeCalendarEvents(this._eventsByEntity);
                this._eventsVersion += 1;
                this._calendarLastSuccessTs = cached.calendars.lastSuccessTs || 0;
                this._calendarStale =
                    this._hasCalendarCache() &&
                    now - (this._calendarLastSuccessTs || 0) > staleThreshold;
                this._calendarError = false;
                if (this._isCacheTooOld(this._calendarLastSuccessTs)) {
                    this._calendarForceNext = true;
                }
            }
            if (cached.todos?.itemsByEntity) {
                this._todoItems = cached.todos.itemsByEntity;
                this._todoLoaded = true;
                this._todoVersion += 1;
                this._todoLastSuccessTs = cached.todos.lastSuccessTs || 0;
                this._todoStale =
                    this._hasTodoCache() &&
                    now - (this._todoLastSuccessTs || 0) > staleThreshold;
                this._todoError = false;
            }
            if (cached.shopping?.items) {
                this._shoppingItems = cached.shopping.items;
                this._shoppingLoaded = true;
                this._shoppingVersion += 1;
                this._shoppingLastSuccessTs = cached.shopping.lastSuccessTs || 0;
                this._shoppingStale =
                    this._hasShoppingCache() &&
                    now - (this._shoppingLastSuccessTs || 0) > staleThreshold;
                this._shoppingError = false;
            }
            this._checkIdbFailure?.();
            this.requestUpdate();
        },

        async _saveDataCache(patch) {
            const key = this._dataCacheKey();
            const now = Date.now();
            const next = {
                ...(this._dataCache || {}),
                ...(patch || {}),
                meta: { ...(this._dataCache?.meta || {}), updatedAt: now },
            };
            this._dataCache = next;
            await idbSet('cache', key, next);
            this._saveLocalDataCache(key, next);
        },

        _queueRefresh({ forceCalendars = false, reason = '' } = {}) {
            if (forceCalendars) this._calendarForceNext = true;
            if (this._refreshInFlight) {
                this._refreshPending = true;
                if (reason) this._refreshReasonPending = reason;
                return;
            }
            if (this._refreshQueued) return;
            if (reason) this._refreshReasonPending = reason;
            this._refreshQueued = true;
            Promise.resolve().then(() => {
                this._refreshQueued = false;
                this._refreshAll();
            });
        },

        _scheduleCalendarRetry() {
            this._scheduleRetryTimer({
                timerProp: '_calendarRetryTimer',
                retryMsProp: '_calendarRetryMs',
                capMs: this._refreshIntervalMs ?? 300_000,
                queueArgs: { forceCalendars: true, reason: 'retry' },
            });
        },

        _clearCalendarRetry() {
            this._clearRetryTimer({
                timerProp: '_calendarRetryTimer',
                retryMsProp: '_calendarRetryMs',
            });
        },

        _scheduleTodoRetry() {
            this._scheduleRetryTimer({
                timerProp: '_todoRetryTimer',
                retryMsProp: '_todoRetryMs',
                capMs: Math.max(this._refreshIntervalMs ?? 300_000, 120_000),
                retryingProp: '_todoRetrying',
                queueArgs: { reason: 'retry' },
            });
        },

        _clearTodoRetry() {
            this._clearRetryTimer({
                timerProp: '_todoRetryTimer',
                retryMsProp: '_todoRetryMs',
                retryingProp: '_todoRetrying',
            });
        },

        _scheduleShoppingRetry() {
            this._scheduleRetryTimer({
                timerProp: '_shoppingRetryTimer',
                retryMsProp: '_shoppingRetryMs',
                capMs: Math.max(this._refreshIntervalMs ?? 300_000, 120_000),
                retryingProp: '_shoppingRetrying',
                queueArgs: { reason: 'retry' },
            });
        },

        _clearShoppingRetry() {
            this._clearRetryTimer({
                timerProp: '_shoppingRetryTimer',
                retryMsProp: '_shoppingRetryMs',
                retryingProp: '_shoppingRetrying',
            });
        },

        _scheduleRetryTimer({ timerProp, retryMsProp, capMs, retryingProp = '', queueArgs = {} }) {
            if (!timerProp || !retryMsProp) return;
            if (this[timerProp]) return;
            const refreshMs = this._refreshIntervalMs ?? 300_000;
            const base = Math.min(30_000, refreshMs);
            const cap = Number.isFinite(capMs) ? capMs : refreshMs;
            const current = Number(this[retryMsProp]) || 0;
            const next = current ? Math.min(current * 2, cap) : base;
            this[retryMsProp] = next;
            if (retryingProp) this[retryingProp] = true;
            this[timerProp] = setTimeout(() => {
                this[timerProp] = null;
                this._queueRefresh(queueArgs);
            }, next);
        },

        _clearRetryTimer({ timerProp, retryMsProp, retryingProp = '' }) {
            if (!timerProp || !retryMsProp) return;
            if (this[timerProp]) {
                clearTimeout(this[timerProp]);
                this[timerProp] = null;
            }
            this[retryMsProp] = 0;
            if (retryingProp) this[retryingProp] = false;
        },

        _visibleCalendarEntities() {
            const calendars = Array.isArray(this._config?.calendars) ? this._config.calendars : [];
            const calendarIds = calendars.map((c) => c.entity).filter(Boolean);
            const visibilityEnabled = Boolean(this._calendarVisibilityEnabled);
            const hasSet = this._calendarVisibleSet && this._calendarVisibleSet.size > 0;
            const visibleSet =
                visibilityEnabled && hasSet ? this._calendarVisibleSet : new Set(calendarIds);
            return calendars
                .filter(
                    (c) =>
                        visibleSet.has(c.entity) &&
                        this._isPersonAllowed(this._personIdForConfig(c, c.entity))
                )
                .map((c) => c.entity)
                .filter(Boolean);
        },

        _hasCalendarCache(eventsByEntity = this._eventsByEntity) {
            const entityIds = this._visibleCalendarEntities();
            if (!entityIds.length) return false;
            return entityIds.some((entityId) => Array.isArray(eventsByEntity?.[entityId]));
        },

        _hasTodoCache(itemsByEntity = this._todoItems) {
            const entries = Object.values(itemsByEntity || {});
            return entries.some((items) => Array.isArray(items) && items.length);
        },

        _hasShoppingCache(items = this._shoppingItems) {
            return Array.isArray(items) && items.length > 0;
        },

        _hashSummary(value) {
            let hash = 0;
            for (let i = 0; i < value.length; i++) {
                hash = (hash * 31 + value.charCodeAt(i)) | 0;
            }
            return `h${(hash >>> 0).toString(36)}`;
        },

        _calendarEventKey(entityId, event, idx) {
            // Event ids can collide or be missing across calendars; a per-entity key keeps layout stable.
            const originalId = event?.uid || event?.id || event?.event_id || '';
            const start = event?._start ? event._start.toISOString() : '';
            const summaryHash = event?.summary ? this._hashSummary(event.summary) : '';
            const fallback = originalId || start || summaryHash || String(idx);
            return `${entityId}::${fallback}`;
        },

        _mergeCalendarEvents(eventsByEntity) {
            const merged = [];
            const entries = Object.entries(eventsByEntity || {});
            const seenKeys = new Set();
            for (const [entityId, items] of entries) {
                if (!Array.isArray(items)) continue;
                items.forEach((event, idx) => {
                    const key = event?._fbKey || this._calendarEventKey(entityId, event, idx);
                    if (seenKeys.has(key)) {
                        this._logCalendarState('key-collision', { entityId, key });
                    } else {
                        seenKeys.add(key);
                    }
                    merged.push({
                        ...event,
                        _fbEntityId: entityId,
                        _fbKey: key,
                    });
                });
            }
            return merged;
        },

        _mergedEventsForDay(day, entityIds) {
            const items = Array.isArray(this._calendarEventsMerged)
                ? this._calendarEventsMerged
                : [];
            if (!items.length || !entityIds?.size) return [];
            const dayStart = startOfDay(day);
            const dayEnd = addDays(dayStart, 1);
            return items.filter((e) => {
                if (!entityIds.has(e._fbEntityId)) return false;
                if (!e?._start || !e?._end) return false;
                const start = e._start.getTime();
                const end = e._end.getTime();
                return start < dayEnd.getTime() && end > dayStart.getTime();
            });
        },

        _calendarDebugEnabled() {
            try {
                return localStorage.getItem('FB_DEBUG_CALENDAR') === '1';
            } catch (error) {
                return false;
            }
        },

        _logCalendarState(state, detail = {}) {
            debugLog(this._calendarDebugEnabled(), 'calendar state', state, detail);
        },

        _withTimeout(promise, ms = 10_000) {
            let timer = null;
            const timeout = new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('timeout')), ms);
            });
            return Promise.race([promise, timeout]).finally(() => {
                if (timer) clearTimeout(timer);
            });
        },

        _sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        },

        _ensureArray(value, label) {
            if (Array.isArray(value)) return value.filter(Boolean);
            if (value === null || value === undefined) return [];
            debugLog(this._debug, 'Unexpected payload', { label, type: typeof value });
            return null;
        },

        async _refreshCalendarsWithEntityUpdate() {
            if (!this._hass) return;
            const entityIds = this._visibleCalendarEntities();
            if (entityIds.length) {
                try {
                    await this._withTimeout(
                        this._hass.callService('homeassistant', 'update_entity', {
                            entity_id: entityIds,
                        }),
                        10_000
                    );
                } catch {
                    // Proceed to fetch even if the update times out or fails.
                }
            }
            await this._sleep(750);
            await this._refreshCalendarRange({ force: true });
        },

        async _refreshAll() {
            if (!this._hass || !this._config) return;
            if (this._refreshInFlight) {
                this._refreshPending = true;
                return;
            }
            this._refreshInFlight = true;
            const forceCalendars =
                Boolean(this._calendarForceNext) ||
                this._isCacheTooOld(this._calendarLastSuccessTs);
            const forceTodos = this._isCacheTooOld(this._todoLastSuccessTs);
            const forceShopping = this._isCacheTooOld(this._shoppingLastSuccessTs);
            const pendingReason = this._refreshReasonPending;
            this._refreshReasonPending = '';
            const reason =
                pendingReason ||
                (forceCalendars || forceTodos || forceShopping
                    ? 'cache-max-age'
                    : 'interval');
            this._lastRefreshReason = reason;
            this._lastRefreshTs = Date.now();
            debugLog(this._debug, 'refreshAll start', {
                reason,
                forceCalendars,
                forceTodos,
                forceShopping,
            });
            this.requestUpdate();
            try {
                await Promise.all([
                    this._refreshCalendarRange({ force: forceCalendars }),
                    this._refreshTodos({ force: forceTodos }),
                    this._refreshShopping({ force: forceShopping }),
                ]);
            } finally {
                debugLog(this._debug, 'refreshAll end', {
                    calendar: {
                        stale: this._calendarStale,
                        error: this._calendarError,
                        lastSuccessTs: this._calendarLastSuccessTs || 0,
                    },
                    todos: {
                        stale: this._todoStale,
                        error: this._todoError,
                        lastSuccessTs: this._todoLastSuccessTs || 0,
                    },
                    shopping: {
                        stale: this._shoppingStale,
                        error: this._shoppingError,
                        lastSuccessTs: this._shoppingLastSuccessTs || 0,
                    },
                });
                this._tickV2AdaptivePresentation?.();
                this._refreshInFlight = false;
                if (this._refreshPending) {
                    this._refreshPending = false;
                    this._queueRefresh();
                }
            }
        },

        async _forceRefreshAll() {
            if (!this._hass || !this._config) return;
            this._refreshReasonPending = 'manual';
            this._lastRefreshReason = 'manual';
            this._lastRefreshTs = Date.now();
            debugLog(this._debug, 'forceRefreshAll');
            this.requestUpdate();
            await Promise.all([
                this._refreshCalendarRange({ force: true }),
                this._refreshTodos({ force: true }),
                this._refreshShopping({ force: true }),
            ]);
        },

        async _refreshCalendarRange({ force = false } = {}) {
            const calendars = Array.isArray(this._config?.calendars) ? this._config.calendars : [];
            if (!calendars.length) {
                this._calendarStale = false;
                this._calendarError = false;
                this.requestUpdate();
                return;
            }
            if (this._calendarFetchInFlight) return this._calendarFetchPromise || undefined;

            const hassStates = this._hass?.states || {};
            const calendarsToFetch = calendars.filter((c) => hassStates?.[c.entity]);
            const missingCalendars = calendars.filter((c) => !hassStates?.[c.entity]);
            if (!calendarsToFetch.length) {
                for (const c of missingCalendars) {
                    const key = `calendar-missing:${c.entity}`;
                    if (this._shouldNotifyError(key, 120_000)) {
                        this._showErrorToast('Calendar missing', c.entity);
                    }
                }
                this._calendarStale = false;
                this._calendarError = false;
                this.requestUpdate();
                return;
            }

            const effectiveForce = Boolean(force || this._calendarForceNext);
            this._calendarForceNext = false;

            const { start, end } = this._currentCalendarRange();
            debugLog(this._debug, 'refreshCalendars', {
                force: effectiveForce,
                range: { start, end },
                entities: calendarsToFetch.map((c) => c.entity),
            });
            // Guard against slow responses overwriting merged calendar state.
            const requestId = (this._calendarRequestSeq || 0) + 1;
            this._calendarRequestSeq = requestId;
            const eventsVersionAtStart = this._eventsVersion || 0;
            // Track loading vs stale/error separately to avoid retry prompts with usable cache.
            this._logCalendarState('loading', {
                hasCache: this._hasCalendarCache(),
                force: effectiveForce,
            });
            this._calendarFetchInFlight = true;
            this._calendarStale = false;
            this._calendarError = false;
            this.requestUpdate();

            const fetchPromise = (async () => {
                let hadFailure = false;
                let hadSuccess = false;
                const previous = this._eventsByEntity || {};
                const next = { ...previous };

                const results = await Promise.allSettled(
                    calendarsToFetch.map(async (c) => {
                        const entityId = c.entity;
                        this._logCalendarState('request-start', { entityId, requestId });
                        try {
                            const items = await this._calendarService.fetchEvents(
                                this._hass,
                                entityId,
                                start,
                                end,
                                { force: effectiveForce }
                            );
                            this._logCalendarState('request-end', {
                                entityId,
                                requestId,
                                count: items?.length ?? 0,
                            });
                            return [entityId, items];
                        } catch (error) {
                            this._logCalendarState('request-error', {
                                entityId,
                                requestId,
                                message: error?.message || String(error),
                            });
                            throw error;
                        }
                    })
                );

                for (const result of results) {
                    if (result.status === 'fulfilled') {
                        const [entityId, items] = result.value;
                        next[entityId] = Array.isArray(items)
                            ? items.map((event, idx) => ({
                                  ...event,
                                  _fbEntityId: entityId,
                                  _fbKey: this._calendarEventKey(entityId, event, idx),
                              }))
                            : [];
                        hadSuccess = true;
                    } else {
                        hadFailure = true;
                    }
                }

                if (hadSuccess) {
                    if (requestId !== this._calendarRequestSeq) {
                        this._logCalendarState('request-stale', { requestId });
                        return;
                    }
                    if (eventsVersionAtStart !== this._eventsVersion) {
                        this._logCalendarState('version-mismatch', {
                            requestId,
                            eventsVersionAtStart,
                            eventsVersion: this._eventsVersion,
                        });
                        this._queueRefresh();
                        return;
                    }
                    this._eventsByEntity = next;
                    this._calendarEventsMerged = this._mergeCalendarEvents(next);
                    this._eventsVersion += 1;
                    this._calendarLastSuccessTs = Date.now();
                    void this._saveDataCache({
                        calendars: {
                            eventsByEntity: this._eventsByEntity,
                            lastSuccessTs: this._calendarLastSuccessTs,
                        },
                    });
                    this._logCalendarState('merged', {
                        requestId,
                        count: this._calendarEventsMerged.length,
                    });
                }

                if (hadFailure) {
                    const hasCache = this._hasCalendarCache(next);
                    const staleThreshold = this._staleThresholdMs();
                    const now = Date.now();
                    this._calendarStale =
                        hasCache && now - (this._calendarLastSuccessTs || 0) > staleThreshold;
                    this._calendarError = !hasCache;
                    if (hasCache) this._logCalendarState('cache-used', { hasCache });
                    this._logCalendarState('error', { hasCache });
                    this._scheduleCalendarRetry();
                } else {
                    this._calendarStale = false;
                    this._calendarError = false;
                    this._clearCalendarRetry();
                    if (hadSuccess) this._logCalendarState('success', { force: effectiveForce });
                }
            })();

            this._calendarFetchPromise = fetchPromise;
            try {
                await fetchPromise;
            } catch {
                const hasCache = this._hasCalendarCache();
                const staleThreshold = this._staleThresholdMs();
                const now = Date.now();
                this._calendarStale =
                    hasCache && now - (this._calendarLastSuccessTs || 0) > staleThreshold;
                this._calendarError = !hasCache;
                if (hasCache) this._logCalendarState('cache-used', { hasCache });
                this._logCalendarState('error', { hasCache });
                this._scheduleCalendarRetry();
            } finally {
                this._calendarFetchInFlight = false;
                this._calendarFetchPromise = null;
                this.requestUpdate();
            }
        },

        async _refreshTodos({ force = false } = {}) {
            const todos = Array.isArray(this._config?.todos) ? this._config.todos : [];
            if (!todos.length) {
                this._todoStale = false;
                this._todoError = false;
                this._clearTodoRetry?.();
                debugLog(this._debug, 'refreshTodos skipped', { reason: 'no-todos' });
                return;
            }
            if (!this._supportsService?.('todo', 'get_items')) {
                this._todoStale = false;
                this._todoError = true;
                this._todoLoaded = true;
                this._clearTodoRetry?.();
                debugLog(this._debug, 'refreshTodos skipped', {
                    reason: 'todo-service-missing',
                    services: Object.keys(this._hass?.services?.todo || {}),
                });
                return;
            }
            debugLog(this._debug, 'refreshTodos', {
                force,
                entities: todos.map((t) => t.entity).filter(Boolean),
            });
            const requestId = (this._todoRequestSeq || 0) + 1;
            this._todoRequestSeq = requestId;
            const versionAtStart = this._todoVersion || 0;
            const previous = this._todoItems || {};
            const next = { ...previous };
            let hadSuccess = false;
            let hadFailure = false;
            for (const t of todos) {
                if (!t?.entity) continue;
                if (!this._hass?.states?.[t.entity]) {
                    if (this._todoErrorEntities.has(t.entity)) {
                        this._todoErrorEntities.delete(t.entity);
                    }
                    continue;
                }
                try {
                    const items = await this._todoService.fetchItems(this._hass, t.entity, {
                        force,
                    });
                    const safeItems = this._ensureArray(items, 'todo-items');
                    if (!safeItems) throw new Error('Invalid todo payload');
                    next[t.entity] = safeItems;
                    this._logMissingTodoIds?.(t.entity, items);
                    if (this._todoErrorEntities.has(t.entity)) {
                        this._todoErrorEntities.delete(t.entity);
                    }
                    hadSuccess = true;
                } catch (error) {
                    hadFailure = true;
                    debugLog(this._debug, 'refreshTodos error', {
                        entityId: t.entity,
                        message: error?.message || String(error),
                    });
                    if (!this._todoErrorEntities.has(t.entity)) {
                        this._reportError?.('Refresh chores', error);
                        this._todoErrorEntities.add(t.entity);
                    }
                }
            }
            if (requestId !== this._todoRequestSeq) return;
            if (versionAtStart !== this._todoVersion) {
                this._queueRefresh();
                return;
            }
            if (hadSuccess) {
                this._todoItems = next;
                this._todoLoaded = true;
                this._todoVersion += 1;
                if (!hadFailure) this._todoLastSuccessTs = Date.now();
                void this._saveDataCache({
                    todos: {
                        itemsByEntity: this._todoItems,
                        lastSuccessTs: this._todoLastSuccessTs || 0,
                    },
                });
            }

            const hasCache = this._hasTodoCache(next);
            const staleThreshold = this._staleThresholdMs();
            const now = Date.now();
            if (hadFailure) {
                this._todoStale =
                    hasCache && now - (this._todoLastSuccessTs || 0) > staleThreshold;
                this._todoError = !hasCache;
                this._scheduleTodoRetry();
            } else {
                this._todoStale = false;
                this._todoError = false;
                this._clearTodoRetry();
            }
        },

        async _refreshTodoEntity(entityId, { force = false } = {}) {
            if (!entityId) return;
            if (!this._hass?.states?.[entityId]) return;
            const requestId = (this._todoRequestSeq || 0) + 1;
            this._todoRequestSeq = requestId;
            const versionAtStart = this._todoVersion || 0;
            try {
                const items = await this._todoService.fetchItems(this._hass, entityId, {
                    force,
                });
                const safeItems = this._ensureArray(items, 'todo-items');
                if (!safeItems) throw new Error('Invalid todo payload');
                if (requestId !== this._todoRequestSeq) return;
                if (versionAtStart !== this._todoVersion) {
                    this._queueRefresh();
                    return;
                }
                this._todoItems = { ...(this._todoItems || {}), [entityId]: safeItems };
                this._todoLoaded = true;
                this._logMissingTodoIds?.(entityId, items);
                this._todoVersion += 1;
                this._todoLastSuccessTs = Date.now();
                void this._saveDataCache({
                    todos: {
                        itemsByEntity: this._todoItems,
                        lastSuccessTs: this._todoLastSuccessTs,
                    },
                });
                this._todoStale = false;
                this._todoError = false;
                this._clearTodoRetry();
                if (this._todoErrorEntities.has(entityId)) {
                    this._todoErrorEntities.delete(entityId);
                }
            } catch (error) {
                if (!this._todoErrorEntities.has(entityId)) {
                    this._reportError?.('Refresh chores', error);
                    this._todoErrorEntities.add(entityId);
                }
                const hasCache = this._hasTodoCache();
                const staleThreshold = this._staleThresholdMs();
                const now = Date.now();
                this._todoStale =
                    hasCache && now - (this._todoLastSuccessTs || 0) > staleThreshold;
                this._todoError = !hasCache;
                this._scheduleTodoRetry();
            }
        },

        async _refreshShopping({ force = false } = {}) {
            const shopping = this._config?.shopping;
            if (!shopping) {
                this._shoppingStale = false;
                this._shoppingError = false;
                this._clearShoppingRetry?.();
                debugLog(this._debug, 'refreshShopping skipped', { reason: 'no-shopping-config' });
                return;
            }
            const shoppingEntity = shopping?.entity || '';
            if (!this._supportsService?.('todo', 'get_items')) {
                this._shoppingStale = false;
                this._shoppingError = true;
                this._shoppingLoaded = true;
                this._clearShoppingRetry?.();
                debugLog(this._debug, 'refreshShopping skipped', {
                    reason: 'todo-service-missing',
                    services: Object.keys(this._hass?.services?.todo || {}),
                });
                return;
            }
            if (shoppingEntity && !this._hass?.states?.[shoppingEntity]) {
                this._shoppingStale = false;
                this._shoppingError = true;
                this._shoppingLoaded = true;
                this._clearShoppingRetry?.();
                debugLog(this._debug, 'refreshShopping skipped', {
                    reason: 'shopping-entity-missing',
                    shoppingEntity,
                });
                return;
            }
            debugLog(this._debug, 'refreshShopping', { force, entityId: shoppingEntity });
            if (!this._shoppingFirstAttemptTs) this._shoppingFirstAttemptTs = Date.now();
            if (!force) {
                const holdUntil = this._shoppingRefreshHoldUntil || 0;
                const now = Date.now();
                if (now < holdUntil) {
                    if (!this._shoppingRefreshTimer) {
                        const delay = Math.max(0, holdUntil - now);
                        this._shoppingRefreshTimer = setTimeout(() => {
                            this._shoppingRefreshTimer = null;
                            this._refreshShopping();
                        }, delay);
                    }
                    return;
                }
            }
            const requestId = (this._shoppingRequestSeq || 0) + 1;
            this._shoppingRequestSeq = requestId;
            const versionAtStart = this._shoppingVersion || 0;
            try {
                const items = await this._shoppingService.fetchItems(this._hass, shopping, {
                    force,
                });
                const safeItems = this._ensureArray(items, 'shopping-items');
                if (!safeItems) throw new Error('Invalid shopping payload');
                if (requestId !== this._shoppingRequestSeq) return;
                if (versionAtStart !== this._shoppingVersion) {
                    this._queueRefresh();
                    return;
                }
                this._shoppingItems = safeItems;
                this._shoppingLoaded = true;
                this._shoppingVersion += 1;
                this._shoppingLastSuccessTs = Date.now();
                void this._saveDataCache({
                    shopping: {
                        items: this._shoppingItems,
                        lastSuccessTs: this._shoppingLastSuccessTs,
                    },
                });
                this._shoppingStale = false;
                this._shoppingError = false;
                this._clearShoppingRetry();
            } catch (error) {
                debugLog(this._debug, 'refreshShopping error', {
                    entityId: shoppingEntity,
                    message: error?.message || String(error),
                });
                const now = Date.now();
                const quietUntil = this._shoppingFirstAttemptTs + 10_000;
                if (!this._shoppingLoaded && now < quietUntil) return;
                if (this._shouldNotifyError('shopping-refresh')) {
                    this._reportError?.('Refresh shopping', error);
                }
                const hasCache = this._hasShoppingCache();
                const staleThreshold = this._staleThresholdMs();
                this._shoppingStale =
                    hasCache && now - (this._shoppingLastSuccessTs || 0) > staleThreshold;
                this._shoppingError = !hasCache;
                this._scheduleShoppingRetry();
            }
        },

        _currentCalendarRange() {
            const today = startOfDay(new Date());
            const screen = this._screen || 'schedule';
            const mainMode = this._mainMode || 'schedule';

            if (screen === 'important') {
                const tomorrow = addDays(today, 1);
                return { start: startOfDay(today), end: endOfDay(tomorrow) };
            }

            if (screen !== 'schedule') {
                const day = addDays(today, this._dayOffset || 0);
                return { start: startOfDay(day), end: endOfDay(day) };
            }

            if (mainMode === 'month') {
                const base = this._selectedMonthDay();
                const start = new Date(base.getFullYear(), base.getMonth(), 1);
                const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
                return { start: startOfDay(start), end: endOfDay(end) };
            }

            if (mainMode === 'schedule') {
                const base = startOfDay(this._selectedDay());
                const end = addDays(base, (this._scheduleDays || 5) - 1);
                return { start: startOfDay(base), end: endOfDay(end) };
            }

            const day = this._selectedDay();
            return { start: startOfDay(day), end: endOfDay(day) };
        },

        _selectedDay() {
            const today = startOfDay(new Date());
            return addDays(today, this._dayOffset || 0);
        },

        _selectedMonthDay() {
            const base = startOfDay(new Date());
            const d = new Date(base.getFullYear(), base.getMonth() + (this._monthOffset || 0), 1);
            return d;
        },

        _eventsForEntityOnDay(entityId, day) {
            const items = this._eventsByEntity?.[entityId] || [];
            const dayStart = startOfDay(day);
            const dayEnd = addDays(dayStart, 1);
            const dayStartMs = dayStart.getTime();
            const dayEndMs = dayEnd.getTime();

            return items.filter((e) => {
                if (!e?._start || !e?._end) return false;
                const start = e._start.getTime();
                const end = e._end.getTime();
                return start < dayEndMs && end > dayStartMs;
            });
        },
    });
}
