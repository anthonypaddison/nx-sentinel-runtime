/* nx-displaygrid - persistence helpers
 * SPDX-License-Identifier: MIT
 */
import { debugLog } from './nx-displaygrid.util.js';
import { getDeviceKind } from './util/prefs.util.js';
import { idbGet, idbSet, idbDelete, idbKeysByPrefix } from './util/idb.util.js';
import {
    makeScopedKey,
    makeLegacyScopedKey,
    migrateScopedStoreKey,
    readJsonLocal,
    writeJsonLocal,
    removeLocalKey,
    removeLocalKeysByPrefix as removeLocalKeysByPrefixValue,
} from './util/scoped-storage.util.js';
import { NX_DISPLAYGRID_WS } from './util/ws-protocol.util.js';

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
                this._wsConfigLoadInProgress = true;
                await this._migrateConfigStorage();
                const stored = await this._getStoredConfig();
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
                this._wsConfigLoadInProgress = false;
                return stored;
            })();
            return this._storageLoadPromise;
        },

        async _refreshStoredConfig() {
            if (!this._hass) return;
            await this._migrateConfigStorage();
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
            await this._migrateConfigStorage();
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
            let hadError = false;
            try {
                const result = await this._hass.callWS({ type: NX_DISPLAYGRID_WS.GET_CONFIG });
                return result?.config || null;
            } catch {
                hadError = true;
            }
            if (hadError) this._notifyWsConfigFallbackOnce();
            return null;
        },

        _notifyWsConfigFallbackOnce() {
            if (this._wsConfigFallbackNotified) return;
            if (!this._wsConfigLoadInProgress) return;
            this._wsConfigFallbackNotified = true;
            this._showToast?.('Running in local mode');
        },

        _localConfigKey() {
            const userId = this._hass?.user?.id || 'unknown';
            return makeScopedKey('nx-displaygrid:config', userId);
        },

        _legacyLocalConfigKey(
            userId = this._hass?.user?.id || 'unknown',
            device = getDeviceKind()
        ) {
            return makeLegacyScopedKey('nx-displaygrid:config', userId, device);
        },

        async _migrateConfigStorage() {
            if (this._configStorageMigrated) return;
            this._configStorageMigrated = true;
            const key = this._localConfigKey();
            const legacyKey = this._legacyLocalConfigKey();
            await migrateScopedStoreKey({
                key,
                legacyKey,
                idbStore: 'config',
                idbGetFn: idbGet,
                idbSetFn: idbSet,
            });
        },

        async _removeLocalKeysByPrefix(prefix) {
            removeLocalKeysByPrefixValue(prefix);
        },

        async _removeIdbKeysByPrefix(store, prefix) {
            const keys = await idbKeysByPrefix(store, prefix);
            if (!Array.isArray(keys) || !keys.length) return;
            await Promise.all(keys.map((key) => idbDelete(store, key)));
        },

        _configHasData(config) {
            if (!config || typeof config !== 'object') return false;
            if (Object.keys(config).length === 0) return false;
            return true;
        },

        _loadLocalConfig() {
            return readJsonLocal(this._localConfigKey(), null);
        },

        async _persistConfig(config) {
            const ok = await this._callWsSet(config);
            if (ok) {
                this._applyPersistedConfig(config, 'ws');
                debugLog(this._debug, 'persistConfig', { mode: 'ws' });
                return { ok: true, mode: 'ws' };
            }
            this._applyPersistedConfig(config, 'local');
            debugLog(this._debug, 'persistConfig', { mode: 'local' });
            return { ok: true, mode: 'local' };
        },

        _applyPersistedConfig(config, mode) {
            this._persistMode = mode;
            this._saveIdbConfig(config);
            this._saveLocalConfig(config);
            this._storedConfig = config;
            this._sharedConfig = config;
            this._storageLoaded = true;
        },

        async _callWsSet(config) {
            try {
                await this._hass.callWS({ type: NX_DISPLAYGRID_WS.SET_CONFIG, config });
                return true;
            } catch {
                // Fall back to local persistence.
            }
            return false;
        },

        _saveLocalConfig(config) {
            writeJsonLocal(this._localConfigKey(), config || {});
        },

        async _clearConfigCache() {
            const key = this._localConfigKey();
            removeLocalKey(key);
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
            const configKey = makeScopedKey('nx-displaygrid:config', resolvedUserId);
            const prefsKey = makeScopedKey('nx-displaygrid:prefs', resolvedUserId);
            const dataKey = makeScopedKey('nx-displaygrid:data', resolvedUserId);
            const legacyConfigKey = makeLegacyScopedKey(
                'nx-displaygrid:config',
                resolvedUserId,
                resolvedDevice
            );
            const legacyPrefsKey = makeLegacyScopedKey(
                'nx-displaygrid:prefs',
                resolvedUserId,
                resolvedDevice
            );
            const legacyDataKey = makeLegacyScopedKey(
                'nx-displaygrid:data',
                resolvedUserId,
                resolvedDevice
            );
            const emptyConfig = {
                people: [],
                calendars: [],
                todos: [],
                onboardingComplete: false,
                schemaVersion: Number(this._onboardingSchemaVersion?.() || 1),
            };
            let wsOk = false;

            removeLocalKey(configKey);
            removeLocalKey(prefsKey);
            removeLocalKey(dataKey);
            await Promise.all([
                this._removeLocalKeysByPrefix(`nx-displaygrid:config:${resolvedUserId}:`),
                this._removeLocalKeysByPrefix(`nx-displaygrid:prefs:${resolvedUserId}:`),
                this._removeLocalKeysByPrefix(`nx-displaygrid:data:${resolvedUserId}:`),
            ]);
            await Promise.all([
                idbDelete('config', configKey),
                idbDelete('prefs', prefsKey),
                idbDelete('cache', dataKey),
                idbDelete('config', legacyConfigKey),
                idbDelete('prefs', legacyPrefsKey),
                idbDelete('cache', legacyDataKey),
                this._removeIdbKeysByPrefix('config', `nx-displaygrid:config:${resolvedUserId}:`),
                this._removeIdbKeysByPrefix('prefs', `nx-displaygrid:prefs:${resolvedUserId}:`),
                this._removeIdbKeysByPrefix('cache', `nx-displaygrid:data:${resolvedUserId}:`),
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
