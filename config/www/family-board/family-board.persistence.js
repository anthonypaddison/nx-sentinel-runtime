/* Family Board - persistence helpers
 * SPDX-License-Identifier: MIT
 */
import { debugLog } from './family-board.util.js';
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
            const merged = { ...base, ...override };
            if (override.people) merged.people = override.people;
            if (override.calendars) merged.calendars = override.calendars;
            if (override.todos) merged.todos = override.todos;
            if (override.shopping)
                merged.shopping = { ...(base.shopping || {}), ...override.shopping };
            if (override.home_controls) merged.home_controls = override.home_controls;
            if (override.title !== undefined) merged.title = override.title;
            if (override.admin_pin !== undefined) merged.admin_pin = override.admin_pin;
            return merged;
        },

        async _callWsGet() {
            try {
                const result = await this._hass.callWS({ type: 'family_board/config/get' });
                return result?.config || null;
            } catch {
                return null;
            }
        },

        _localConfigKey() {
            const userId = this._hass?.user?.id || 'unknown';
            const device = getDeviceKind();
            return `family-board:config:${userId}:${device}`;
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
            try {
                await this._hass.callWS({ type: 'family_board/config/set', config });
                return true;
            } catch {
                return false;
            }
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
    });
}
