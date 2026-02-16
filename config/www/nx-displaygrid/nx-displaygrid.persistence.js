/* nx-displaygrid - persistence helpers
 * SPDX-License-Identifier: MIT
 */
import { debugLog } from './nx-displaygrid.util.js';
import { getDeviceKind } from './util/prefs.util.js';
import { idbGet, idbSet, idbDelete } from './util/idb.util.js';

export function applyPersistence(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _resolveConfig({ refresh = true } = {}) {
            if (!this._yamlConfig) return;
            const stored = this._storedConfig;
            const resolved = stored ? this._mergeConfig(this._yamlConfig, stored) : this._yamlConfig;
            this._sharedConfig = resolved;
            debugLog(this._debug, 'resolveConfig precedence', {
                hasStored: Boolean(stored),
                persist: this._persistMode || 'none',
            });
            this._applyConfigImmediate(resolved, { useDefaults: true, refresh });
        },

        async _loadStoredConfig() {
            if (this._storageLoaded || !this._hass) return this._storageLoadPromise;
            if (this._storageLoadPromise) return this._storageLoadPromise;
            this._storageLoadPromise = (async () => {
                const stored = await this._getStoredConfig({ skipWs: true });
                this._storageLoaded = true;
                if (stored) {
                    this._storedConfig = stored;
                    debugLog(this._debug, 'storedConfig loaded', {
                        mode: this._persistMode || 'none',
                    });
                } else {
                    this._storedConfig = null;
                    debugLog(this._debug, 'storedConfig missing', {
                        mode: this._persistMode || 'none',
                    });
                }
                this._resolveConfig({ refresh: true });
                this._refreshStoredConfig();
                return stored;
            })();
            return this._storageLoadPromise;
        },

        async _refreshStoredConfig() {
            if (!this._hass) return;
            const ws = await this._callWsGet();
            if (this._configHasData(ws)) {
                this._persistMode = 'ws';
                this._storedConfig = ws;
                this._storageLoaded = true;
                this._saveIdbConfig(ws);
                this._saveLocalConfig(ws);
                this._resolveConfig({ refresh: true });
                return;
            }
            const local = this._loadLocalConfig();
            if (this._configHasData(local)) {
                this._persistMode = 'local';
                this._storedConfig = local;
                this._storageLoaded = true;
                this._saveIdbConfig(local);
                this._resolveConfig({ refresh: true });
            }
        },

        async _getStoredConfig({ skipWs = false } = {}) {
            if (!skipWs) {
                const ws = await this._callWsGet();
                if (this._configHasData(ws)) {
                    this._persistMode = 'ws';
                    return ws;
                }
            }
            const idb = await this._loadIdbConfig();
            const local = this._loadLocalConfig();
            if (this._configHasData(idb)) {
                this._persistMode = 'idb';
                return idb;
            }
            if (this._configHasData(local)) {
                this._persistMode = 'local';
                return local;
            }
            if (!skipWs) {
                const wsFallback = await this._callWsGet();
                if (wsFallback) {
                    this._persistMode = 'ws';
                    return wsFallback;
                }
            }
            this._persistMode = 'none';
            return null;
        },

        _mergeConfig(base, override) {
            const source = override && typeof override === 'object' ? override : {};
            const merged = { ...base, ...source };
            const hasOwn = (key) => Object.prototype.hasOwnProperty.call(source, key);
            if (hasOwn('people') && source.people !== null && source.people !== undefined) {
                merged.people = source.people;
            }
            if (
                hasOwn('calendars') &&
                source.calendars !== null &&
                source.calendars !== undefined
            ) {
                merged.calendars = source.calendars;
            }
            if (hasOwn('todos') && source.todos !== null && source.todos !== undefined) {
                merged.todos = source.todos;
            }
            if (hasOwn('shopping') && source.shopping !== null && source.shopping !== undefined) {
                merged.shopping = { ...(base.shopping || {}), ...source.shopping };
            }
            if (
                hasOwn('home_controls') &&
                source.home_controls !== null &&
                source.home_controls !== undefined
            ) {
                merged.home_controls = source.home_controls;
            }
            if (source.title !== undefined) merged.title = source.title;
            if (source.admin_pin !== undefined) merged.admin_pin = source.admin_pin;
            return merged;
        },

        async _callWsGet() {
            const types = ['family_board/config/get', 'nx_displaygrid/config/get'];
            for (const type of types) {
                try {
                    const result = await this._hass.callWS({ type });
                    return result?.config || null;
                } catch {
                    // Try the next known namespace.
                }
            }
            return null;
        },

        _localConfigKey() {
            const userId = this._hass?.user?.id || 'unknown';
            const device = getDeviceKind();
            return `nx-displaygrid:config:${userId}:${device}`;
        },

        _configHasData(config) {
            if (!config || typeof config !== 'object') return false;
            if (Object.keys(config).length === 0) return false;
            return true;
        },

        _loadLocalConfig() {
            try {
                const raw = localStorage.getItem(this._localConfigKey());
                return raw ? JSON.parse(raw) : null;
            } catch {
                return null;
            }
        },

        async _persistConfig(config) {
            const ok = await this._callWsSet(config);
            if (ok) {
                this._persistMode = 'ws';
                this._saveIdbConfig(config);
                this._saveLocalConfig(config);
                this._storedConfig = config;
                this._sharedConfig = config;
                this._storageLoaded = true;
                debugLog(this._debug, 'persistConfig', { mode: 'ws' });
                return { ok: true, mode: 'ws' };
            }
            this._persistMode = 'local';
            this._saveIdbConfig(config);
            this._saveLocalConfig(config);
            this._storedConfig = config;
            this._sharedConfig = config;
            this._storageLoaded = true;
            debugLog(this._debug, 'persistConfig', { mode: 'local' });
            return { ok: true, mode: 'local' };
        },

        async _callWsSet(config) {
            const types = ['family_board/config/set', 'nx_displaygrid/config/set'];
            for (const type of types) {
                try {
                    await this._hass.callWS({ type, config });
                    return true;
                } catch {
                    // Try the next known namespace.
                }
            }
            return false;
        },

        _saveLocalConfig(config) {
            try {
                localStorage.setItem(this._localConfigKey(), JSON.stringify(config || {}));
            } catch {
                // Ignore storage errors.
            }
        },

        async _clearConfigCache() {
            const key = this._localConfigKey();
            try {
                localStorage.removeItem(key);
            } catch {
                // Ignore storage errors.
            }
            await idbDelete('config', key);
        },

        async _saveIdbConfig(config) {
            const key = this._localConfigKey();
            await idbSet('config', key, config || {});
        },

        async _loadIdbConfig() {
            const key = this._localConfigKey();
            const stored = await idbGet('config', key);
            return stored && typeof stored === 'object' ? stored : null;
        },

        async _resetAll(userId, device) {
            const resolvedUserId = userId || this._hass?.user?.id || 'unknown';
            const resolvedDevice = device || getDeviceKind();
            const configKey = `nx-displaygrid:config:${resolvedUserId}:${resolvedDevice}`;
            const prefsKey = `nx-displaygrid:prefs:${resolvedUserId}:${resolvedDevice}`;
            const dataKey = `nx-displaygrid:data:${resolvedUserId}:${resolvedDevice}`;
            const emptyConfig = {
                people: [],
                calendars: [],
                todos: [],
                onboardingComplete: false,
                schemaVersion: Number(this._onboardingSchemaVersion?.() || 1),
            };
            let wsOk = false;

            try {
                localStorage.removeItem(configKey);
            } catch {
                // Ignore storage errors.
            }
            try {
                localStorage.removeItem(prefsKey);
            } catch {
                // Ignore storage errors.
            }
            try {
                localStorage.removeItem(dataKey);
            } catch {
                // Ignore storage errors.
            }
            await Promise.all([
                idbDelete('config', configKey),
                idbDelete('prefs', prefsKey),
                idbDelete('cache', dataKey),
            ]);

            wsOk = await this._callWsSet(emptyConfig);
            if (!wsOk) {
                await this._saveIdbConfig(emptyConfig);
                this._saveLocalConfig(emptyConfig);
            }

            this._storedConfig = emptyConfig;
            this._storageLoaded = true;
            this._storageLoadPromise = null;
            this._persistMode = wsOk ? 'ws' : 'local';
            this._sharedConfig = this._yamlConfig
                ? this._mergeConfig(this._yamlConfig, emptyConfig)
                : emptyConfig;

            this._prefsLoaded = false;
            this._prefsHydrated = false;
            this._personFilterSet = new Set();
            this._adminUnlocked = false;
            this._deviceDayStartHour = null;
            this._deviceDayEndHour = null;
            this._devicePxPerHour = null;
            this._deviceRefreshMs = null;
            this._deviceCacheMaxAgeMs = null;
            this._deviceBackgroundTheme = null;
            this._deviceDebug = null;
            this._devicePeopleDisplay = null;

            this._eventsByEntity = {};
            this._calendarEventsMerged = [];
            this._eventsVersion = (this._eventsVersion || 0) + 1;
            this._todoItems = {};
            this._todoVersion = (this._todoVersion || 0) + 1;
            this._shoppingItems = [];
            this._shoppingVersion = (this._shoppingVersion || 0) + 1;
            this._dataCache = null;
            this._dataCacheLoaded = false;

            this._applyConfigImmediate(this._sharedConfig, { useDefaults: false, refresh: false });
            this._screen = 'schedule';
            this._mainMode = 'schedule';
            this.requestUpdate();

            if (wsOk) {
                this._showToast('Dashboard reset');
            } else {
                this._showToast('Dashboard reset', 'Backend unavailable; saved on this device');
            }
            return { ok: true, wsOk, keys: { configKey, prefsKey, dataKey } };
        },
    });
}
