/* nx-displaygrid - custom card
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from './ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { fbStyles } from './nx-displaygrid.styles.js';
import { debugLog, pad2, formatDayTitle } from './nx-displaygrid.util.js';
import {
    loadPrefs,
    loadPrefsAsync,
    savePrefs,
    clearPrefs,
    getDeviceKind,
} from './util/prefs.util.js';
import { idbFailureState } from './util/idb.util.js';
import { DEFAULT_COMMON_ITEMS } from './nx-displaygrid.defaults.js';
import { applyPersistence } from './nx-displaygrid.persistence.js';
import { applyRefresh } from './nx-displaygrid.refresh.js';
import { applyActions } from './nx-displaygrid.actions.js';
import { applyNavigation } from './nx-displaygrid.navigation.js';
import { applyNotifications } from './nx-displaygrid.notifications.js';
import { applySelectors } from './nx-displaygrid.selectors.js';
import { applyConfigHelpers } from './nx-displaygrid.config.js';
import { applyDialogs } from './nx-displaygrid.dialogs.js';
import { applyOptimistic } from './nx-displaygrid.optimistic.js';
import { applyShopping } from './nx-displaygrid.shopping.js';
import { applyTodoRepeat } from './nx-displaygrid.todo-repeat.js';
import { applyPrefs } from './nx-displaygrid.prefs.js';
import { applySetup } from './nx-displaygrid.setup.js';
import { applyAdmin } from './nx-displaygrid.admin.js';
import { applyToggles } from './nx-displaygrid.toggles.js';
import { applyCounts } from './nx-displaygrid.counts.js';
import { applyLabels } from './nx-displaygrid.labels.js';
import { applyVisibility } from './nx-displaygrid.visibility.js';
import { applyBins } from './nx-displaygrid.bins.js';
import { applySchedule } from './nx-displaygrid.schedule.js';
import { applyServices } from './nx-displaygrid.services.js';
import { applyHandlers } from './nx-displaygrid.handlers.js';
import { applyValidation } from './nx-displaygrid.validation.js';
import { applyTodoHelpers } from './nx-displaygrid.todo.js';

import { CALENDAR_FEATURES } from './services/calendar.service.js';

import './components/fb-sidebar.js';
import './components/fb-topbar.js';
import './components/fb-dialogs.js';
import './components/fb-manage-sources.js';
import './components/fb-event-dialog.js';
import './components/fb-all-day-dialog.js';
import './ui/help.dialog.js';
import './ui/editor-guide.dialog.js';
import './views/home.view.js';
import './views/chores.view.js';
import './views/shopping.view.js';
import './views/settings.view.js';
import './views/setup.view.js';
import './views/important.view.js';
import { renderMainView } from './views/main.view.js';

class FamilyBoardCard extends LitElement {
    static properties = {
        hass: { attribute: false },
        _config: { state: true },
        _screen: { state: true },
        _mainMode: { state: true },
        _dayOffset: { state: true },
        _monthOffset: { state: true },
        _eventsVersion: { state: true },
        _dialogOpen: { state: true },
        _dialogMode: { state: true },
        _dialogTitle: { state: true },
        _dialogItem: { state: true },
        _dialogEntity: { state: true },
        _dialogStartValue: { state: true },
        _dialogEndValue: { state: true },
        _sourcesOpen: { state: true },
        _eventDialogOpen: { state: true },
        _eventDialogEntity: { state: true },
        _eventDialogEvent: { state: true },
        _allDayDialogOpen: { state: true },
        _allDayDialogDay: { state: true },
        _allDayDialogEvents: { state: true },
        _allDayDialogTitle: { state: true },
        _helpOpen: { state: true },
        _editorGuideOpen: { state: true },
        _sidebarCollapsed: { state: true },
        _toastMessage: { state: true },
        _toastDetail: { state: true },
        _syncingCalendars: { state: true },
        _calendarStale: { state: true },
        _calendarError: { state: true },
        _calendarFetchInFlight: { state: true },
    };

    static async getConfigElement() {
        await import('./editors/nx-displaygrid-editor.js');
        return document.createElement('nx-displaygrid-editor');
    }

    static getStubConfig() {
        return {
            type: 'custom:nx-displaygrid',
            title: 'nx-displaygrid',
            days_to_show: 5,
            day_start_hour: 6,
            day_end_hour: 24,
            slot_minutes: 30,
            px_per_hour: 120,
            refresh_interval_ms: 300000,
        };
    }

    static styles = [
        fbStyles(),
        css`
            :host {
                display: block;
                height: var(--fb-viewport-height, 100%);
                width: 100%;
                min-width: 0;
                max-width: 100%;
                max-height: var(--fb-viewport-height, 100%);
                min-height: 0;
                overflow: hidden;
                align-self: stretch;
                justify-self: stretch;
            }
            :host,
            :host * {
                box-sizing: border-box;
            }
            .app {
                height: 100%;
                width: 100%;
                min-width: 100%;
                display: grid;
                grid-template-columns: var(--fb-sidebar-width, 260px) 1fr;
                column-gap: var(--fb-gutter);
                background: var(--fb-bg);
                color: var(--fb-text);
                overflow: hidden;
                min-height: 0;
            }
            .sidebar {
                background: var(--fb-surface);
                padding: 0;
                display: flex;
                flex-direction: column;
                gap: 10px;
                height: 100%;
                min-height: 0;
            }
            .main {
                display: grid;
                grid-template-rows: auto 1fr;
                padding-right: var(--fb-gutter);
                min-width: 0;
                min-height: 0;
                background: var(--fb-bg);
                overflow: hidden;
                position: relative;
            }
            .content {
                position: relative;
                min-width: 0;
                min-height: 0;
                overflow: hidden;
                background: var(--fb-bg);
            }
            .toast {
                position: absolute;
                right: var(--fb-gutter);
                top: var(--fb-gutter);
                bottom: auto;
                background: var(--fb-surface);
                color: var(--fb-text);
                border: 1px solid var(--fb-border);
                border-radius: 10px;
                padding: 8px 12px;
                box-shadow: var(--fb-shadow);
                font-size: 14px;
                z-index: 20;
            }
            .toastDetail {
                color: var(--fb-muted);
                font-size: 14px;
                margin-top: 2px;
            }
            @media (max-width: 900px) {
                .app {
                    grid-template-columns: 1fr;
                }
                .sidebar {
                    display: none;
                }
            }
        `,
    ];

    constructor() {
        super();
        this._screen = 'schedule';
        this._mainMode = 'schedule';
        this._dayOffset = 0;
        this._monthOffset = 0;
        this._eventsVersion = 0;
        this._calendarVisibleSet = new Set();
        this._todoVisibleSet = new Set();
        this._personFilterSet = new Set();
        this._eventsByEntity = {};
        this._todoItems = {};
        this._todoRenderTick = 0;
        this._todoStatusRetryTimers = new Map();
        this._todoLoaded = false;
        this._todoLastSuccessTs = 0;
        this._todoRetryTimer = null;
        this._todoRetryMs = 0;
        this._todoRetrying = false;
        this._todoRequestSeq = 0;
        this._todoVersion = 0;
        this._todoStale = false;
        this._todoError = false;
        this._shoppingItems = [];
        this._dialogOpen = false;
        this._dialogMode = '';
        this._dialogTitle = '';
        this._dialogItem = null;
        this._dialogEntity = '';
        this._dialogStartValue = '';
        this._dialogEndValue = '';
        this._sourcesOpen = false;
        this._eventDialogOpen = false;
        this._eventDialogEntity = '';
        this._eventDialogEvent = null;
        this._allDayDialogOpen = false;
        this._allDayDialogDay = null;
        this._allDayDialogEvents = [];
        this._allDayDialogTitle = '';
        this._helpOpen = false;
        this._editorGuideOpen = false;
        this._refreshIntervalMs = 300_000;
        this._refreshInFlight = false;
        this._refreshPending = false;
        this._refreshReasonPending = '';
        this._lastRefreshReason = '';
        this._lastRefreshTs = 0;
        this._prefsLoaded = false;
        this._prefsHydrated = false;
        this._dataCache = null;
        this._dataCacheLoaded = false;
        this._idbFailed = false;
        this._idbError = '';
        this._useMobileView = false;
        this._scheduleDays = 5;
        this._shoppingCommon = [];
        this._shoppingFavourites = [];
        this._shoppingRemoveTimers = new Map();
        this._shoppingLoaded = false;
        this._shoppingFirstAttemptTs = 0;
        this._shoppingLastSuccessTs = 0;
        this._shoppingRetryTimer = null;
        this._shoppingRetryMs = 0;
        this._shoppingRetrying = false;
        this._shoppingRequestSeq = 0;
        this._shoppingVersion = 0;
        this._shoppingStale = false;
        this._shoppingError = false;
        this._cacheMaxAgeMs = 0;
        this._defaultEventMinutes = 30;
        this._storageLoaded = false;
        this._storageLoadPromise = null;
        this._storedConfig = null;
        this._sharedConfig = null;
        this._yamlConfig = null;
        this._persistMode = 'none';
        this._toastMessage = '';
        this._toastDetail = '';
        this._syncingCalendars = false;
        this._calendarStale = false;
        this._calendarError = false;
        this._calendarFetchInFlight = false;
        this._calendarLastSuccessTs = 0;
        this._calendarRetryTimer = null;
        this._calendarRetryMs = 0;
        this._calendarForceNext = false;
        this._calendarFetchPromise = null;
        this._calendarRequestSeq = 0;
        this._calendarEventsMerged = [];
        this._errorToastTs = new Map();
        this._todoErrorEntities = new Set();
        this._sanityChecked = false;
        this._startupChecked = false;
        this._resizeHandler = null;
        this._calendarVisibilityEnabled = false;
        this._deviceDayStartHour = null;
        this._deviceDayEndHour = null;
        this._devicePxPerHour = null;
        this._deviceRefreshMs = null;
        this._deviceCacheMaxAgeMs = null;
        this._deviceBackgroundTheme = null;
        this._deviceDebug = null;
        this._devicePeopleDisplay = null;
        this._adminUnlocked = false;
        this._defaultView = 'schedule';
        this._initialViewSet = false;
        this._baselineTopbarHeight = null;
        this._clockTimer = null;
        this._configVersion = 0;
        this._prefsVersion = 0;
    }

    setConfig(config) {
        if (!config) throw new Error('nx-displaygrid: missing config');
        this._yamlConfig = config;
        this._debug = Boolean(config.debug);
        debugLog(this._debug, 'setConfig received', config);
        if (!this._hass) {
            this._resolveConfig({ refresh: true });
            return;
        }
        if (this._storageLoaded) {
            this._resolveConfig({ refresh: true });
            return;
        }
        this._loadStoredConfig();
    }

    getCardSize() {
        return 6;
    }

    connectedCallback() {
        super.connectedCallback();
        this._resetRefreshTimer();
        if (!this._clockTimer) {
            this._clockTimer = setInterval(() => {
                this.requestUpdate();
            }, 60_000);
        }
        this._queueRefresh({ reason: this._lastRefreshTs ? 'resume' : 'startup' });
        this._updateViewportHeight();
        setTimeout(() => this._updateViewportHeight(), 0);
        if (!this._resizeHandler) {
            this._resizeHandler = () => this._updateViewportHeight();
            window.addEventListener('resize', this._resizeHandler);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._refreshTimer) {
            clearInterval(this._refreshTimer);
            this._refreshTimer = null;
        }
        if (this._clockTimer) {
            clearInterval(this._clockTimer);
            this._clockTimer = null;
        }
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
        if (this._clearCalendarRetry) {
            this._clearCalendarRetry();
        } else if (this._calendarRetryTimer) {
            clearTimeout(this._calendarRetryTimer);
            this._calendarRetryTimer = null;
        }
        if (this._todoRetryTimer) {
            clearTimeout(this._todoRetryTimer);
            this._todoRetryTimer = null;
        }
        if (this._shoppingRetryTimer) {
            clearTimeout(this._shoppingRetryTimer);
            this._shoppingRetryTimer = null;
        }
        if (this._shoppingRefreshTimer) {
            clearTimeout(this._shoppingRefreshTimer);
            this._shoppingRefreshTimer = null;
        }
        if (this._shoppingRemoveTimers) {
            for (const timer of this._shoppingRemoveTimers.values()) {
                clearTimeout(timer);
            }
            this._shoppingRemoveTimers.clear();
        }
    }

    _updateViewportHeight() {
        if (!this.isConnected) return;
        const rect = this.getBoundingClientRect();
        const top = Number.isFinite(rect.top) ? rect.top : 0;
        const rectHeight = Number.isFinite(rect.height) ? rect.height : 0;
        const height =
            rectHeight > 0 ? rectHeight : Math.max(0, window.innerHeight - top);
        this.style.setProperty('--fb-viewport-height', `${height}px`);
        this._updateTopbarHeight();
    }

    _updateTopbarHeight() {
        if (!this.renderRoot) return;
        const topbar = this.renderRoot.querySelector('.topbar');
        if (!topbar) return;
        const height = topbar.getBoundingClientRect().height;
        if (!Number.isFinite(height)) return;
        const screen = this._screen || 'schedule';
        if (this._baselineTopbarHeight === null && screen === 'schedule') {
            this._baselineTopbarHeight = height;
        }
        const applied = this._baselineTopbarHeight ?? height;
        this.style.setProperty('--fb-topbar-height', `${applied}px`);
    }

    _resetRefreshTimer() {
        if (this._refreshTimer) {
            clearInterval(this._refreshTimer);
            this._refreshTimer = null;
        }
        const base = this._refreshIntervalMs ?? 300_000;
        const maxAge = Number(this._cacheMaxAgeMs ?? 0);
        const interval =
            Number.isFinite(maxAge) && maxAge > 0 ? Math.min(base, maxAge) : base;
        const safeInterval = Math.max(10_000, interval);
        this._refreshTimer = setInterval(
            () => this._queueRefresh({ reason: 'interval' }),
            safeInterval
        );
    }

    set hass(hass) {
        this._hass = hass;
        debugLog(this._debug, 'hass set', {
            userId: hass?.user?.id || '',
            isAdmin: Boolean(hass?.user?.is_admin),
        });
        this._loadPrefs();
        this._loadPrefsAsync();
        this._loadStoredConfig();
        this._loadDataCache?.();
        this._queueRefresh({ reason: 'startup' });
    }

    get hass() {
        return this._hass;
    }

    updated() {
        this._updateTopbarHeight();
    }

    _applyPrefs(prefs, { allowInitialView = true } = {}) {
        const nextPrefs = prefs && typeof prefs === 'object' ? prefs : {};
        debugLog(this._debug, 'applyPrefs', {
            allowInitialView,
            keys: Object.keys(nextPrefs || {}),
        });
        const filters = Array.isArray(nextPrefs.personFilters) ? nextPrefs.personFilters : [];
        this._personFilterSet = new Set(filters.map((id) => this._normalisePersonId(id)));
        this._useMobileView =
            nextPrefs.useMobileView !== undefined
                ? nextPrefs.useMobileView
                : getDeviceKind() === 'mobile';
        this._sidebarCollapsed = Boolean(nextPrefs.sidebarCollapsed);
        this._adminUnlocked = Boolean(nextPrefs.adminUnlocked);
        this._defaultView = nextPrefs.defaultView || 'schedule';
        this._lastView = nextPrefs.lastView || '';
        if (Number.isFinite(nextPrefs.dayStartHour))
            this._deviceDayStartHour = nextPrefs.dayStartHour;
        if (Number.isFinite(nextPrefs.dayEndHour)) this._deviceDayEndHour = nextPrefs.dayEndHour;
        if (Number.isFinite(nextPrefs.pxPerHour)) this._devicePxPerHour = nextPrefs.pxPerHour;
        if (Number.isFinite(nextPrefs.refreshIntervalMs))
            this._deviceRefreshMs = nextPrefs.refreshIntervalMs;
        if (Number.isFinite(nextPrefs.cacheMaxAgeMs))
            this._deviceCacheMaxAgeMs = nextPrefs.cacheMaxAgeMs;
        if (typeof nextPrefs.backgroundTheme === 'string')
            this._deviceBackgroundTheme = nextPrefs.backgroundTheme;
        if (typeof nextPrefs.debug === 'boolean') this._deviceDebug = nextPrefs.debug;
        if (Array.isArray(nextPrefs.peopleDisplay))
            this._devicePeopleDisplay = nextPrefs.peopleDisplay;
        if (nextPrefs.slotMinutes === 30 || nextPrefs.slotMinutes === 60) {
            this._slotMinutes = nextPrefs.slotMinutes;
        }
        if (Number.isFinite(nextPrefs.defaultEventMinutes)) {
            this._defaultEventMinutes = Math.max(5, Number(nextPrefs.defaultEventMinutes));
        }
        if (Array.isArray(nextPrefs.shoppingCommon) && nextPrefs.shoppingCommon.length) {
            this._shoppingCommon = nextPrefs.shoppingCommon;
        } else {
            this._shoppingCommon = DEFAULT_COMMON_ITEMS.slice();
        }
        this._shoppingFavourites = Array.isArray(nextPrefs.shoppingFavourites)
            ? nextPrefs.shoppingFavourites
            : [];

        if (allowInitialView && !this._initialViewSet) {
            const allowedViews = ['schedule', 'important', 'chores', 'shopping', 'home', 'settings'];
            const view = allowedViews.includes(this._lastView)
                ? this._lastView
                : allowedViews.includes(this._defaultView)
                ? this._defaultView
                : 'schedule';
            this._screen = view;
            this._initialViewSet = true;
        }
    }

    _loadPrefs() {
        if (this._prefsLoaded) return;
        const userId = this._hass?.user?.id;
        if (!userId) return;
        debugLog(this._debug, 'loadPrefs', { userId });
        const prefs = loadPrefs(userId);
        this._applyPrefs(prefs, { allowInitialView: true });
        this._prefsLoaded = true;
    }

    async _loadPrefsAsync() {
        if (this._prefsHydrated) return;
        const userId = this._hass?.user?.id;
        if (!userId) return;
        debugLog(this._debug, 'loadPrefsAsync start', { userId });
        const prefs = await loadPrefsAsync(userId);
        if (prefs && Object.keys(prefs).length) {
            this._applyPrefs(prefs, { allowInitialView: !this._initialViewSet });
            savePrefs(userId, prefs);
            this._prefsLoaded = true;
            this.requestUpdate();
        }
        debugLog(this._debug, 'loadPrefsAsync end', {
            hasPrefs: Boolean(prefs && Object.keys(prefs).length),
        });
        this._checkIdbFailure();
        this._prefsHydrated = true;
    }

    async _clearPrefsCache() {
        const userId = this._hass?.user?.id;
        if (!userId) return;
        await clearPrefs(userId);
        this._prefsLoaded = false;
        this._prefsHydrated = false;
        this._loadPrefs();
        this._loadPrefsAsync();
        this._showToast('Prefs cache cleared');
    }

    async _clearConfigCacheAndReload() {
        await this._clearConfigCache?.();
        this._storedConfig = null;
        this._storageLoaded = false;
        this._storageLoadPromise = null;
        await this._refreshStoredConfig?.();
        this._showToast('Config cache cleared');
    }

    async _clearDataCacheAndRefresh() {
        await this._clearDataCache?.();
        this._showToast('Data cache cleared');
        this._queueRefresh({ reason: 'manual' });
    }

    _checkIdbFailure() {
        const state = idbFailureState();
        if (!state) return;
        this._idbFailed = true;
        this._idbError = state.message || 'IndexedDB unavailable';
        if (this._shouldNotifyError?.('idb-failed', 120_000)) {
            this._showErrorToast('Cache fallback', this._idbError);
        }
    }

    render() {
        if (!this._config) return html``;

        const screen = this._screen || 'schedule';
        const mainMode = this._mainMode || 'schedule';
        const isAdmin = this._hasAdminAccess();
        const hasPin = Boolean(this._config?.admin_pin);
        const showSettings = isAdmin || hasPin;
        const needsSetup = this._onboardingRequired?.(this._config) ?? true;
        const personFilterSig = Array.from(this._personFilterSet || []).sort().join(',');
        const shoppingFavSig = Array.isArray(this._shoppingFavourites)
            ? this._shoppingFavourites.join('|')
            : '';
        const shoppingCommonSig = Array.isArray(this._shoppingCommon)
            ? this._shoppingCommon.join('|')
            : '';
        const shoppingItemsSig = Array.isArray(this._shoppingItems)
            ? this._shoppingItems.map((item) => this._shoppingItemText(item)).join('|')
            : '';
        const shoppingCount = this._shoppingQuantityCount(this._shoppingItems || []);
        const binIndicators = this._binIndicators();
        const todoItemsSig = Object.entries(this._todoItems || {})
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([entityId, items]) => {
                if (!Array.isArray(items)) return `${entityId}:`;
                const itemsSig = items
                    .map((it) => {
                        const key =
                            it?.uid || it?.id || it?.summary || it?.name || it?.item || '';
                        const status = String(it?.status || '');
                        const completed = it?.completed ? '1' : '0';
                        return `${key}:${status}:${completed}`;
                    })
                    .join(',');
                return `${entityId}:${itemsSig}`;
            })
            .join('|');

        const sidebarWidth = '76px';
        const settingsRenderKey = `${this._configVersion || 0}|${this._prefsVersion || 0}`;

        return html`
            <div class="app" style="--fb-sidebar-width:${sidebarWidth}">
                <div class="sidebar">
                    <fb-sidebar
                        .active=${screen}
                        .counts=${this._sidebarCounts()}
                        .isAdmin=${showSettings}
                        .collapsed=${true}
                        @fb-nav=${this._onNav}
                    ></fb-sidebar>
                </div>

                <div class="main">
                    ${this._toastMessage
                        ? html`<div class="toast">
                              <div>${this._toastMessage}</div>
                              ${this._toastDetail
                                  ? html`<div class="toastDetail">${this._toastDetail}</div>`
                                  : html``}
                          </div>`
                        : html``}
                    <div class="topbar">
                        <fb-topbar
                            .title=${this._config.title || 'nx-displaygrid'}
                            .screen=${screen}
                            .mainMode=${mainMode}
                            .summary=${this._summaryCounts()}
                            .shoppingCount=${shoppingCount}
                            .binIndicators=${binIndicators}
                            .dateLabel=${this._dateLabel()}
                            .dateValue=${this._selectedDayValue()}
                            .activeFilters=${Array.from(this._personFilterSet || [])}
                            .isAdmin=${isAdmin}
                            .syncing=${this._syncingCalendars || this._calendarFetchInFlight}
                            .calendarStale=${this._calendarStale}
                            .calendarError=${this._calendarError}
                            .calendarInFlight=${this._calendarFetchInFlight}
                            .todoRetrying=${this._todoRetrying}
                            .todoStale=${this._todoStale}
                            .todoError=${this._todoError}
                            .shoppingRetrying=${this._shoppingRetrying}
                            .shoppingStale=${this._shoppingStale}
                            .shoppingError=${this._shoppingError}
                            .idbFailed=${this._idbFailed}
                            .idbError=${this._idbError}
                            @fb-main-mode=${this._onMainMode}
                            @fb-date-nav=${this._onDateNav}
                            @fb-date-today=${this._onToday}
                            @fb-date-set=${this._onDateSet}
                            @fb-sync-calendars=${this._onSyncCalendars}
                            @fb-calendar-try-again=${this._onCalendarTryAgain}
                            @fb-person-toggle=${this._onPersonToggle}
                            @fb-open-sources=${() => this._openManageSources()}
                            @fb-add=${this._onFab}
                        ></fb-topbar>
                    </div>

                    <div class="content">
                        ${needsSetup
                            ? html`<fb-setup-view .card=${this}></fb-setup-view>`
                            : screen === 'schedule'
                            ? renderMainView(this)
                            : screen === 'important'
                            ? html`<fb-important-view
                                  .card=${this}
                                  .renderKey=${`${personFilterSig}|${this._eventsVersion}|${todoItemsSig}`}
                              ></fb-important-view>`
                            : screen === 'chores'
                            ? html`<fb-chores-view
                                  .card=${this}
                                  .renderKey=${`${personFilterSig}|${todoItemsSig}|${this._todoRenderTick}`}
                              ></fb-chores-view>`
                            : screen === 'shopping'
                            ? html`<fb-shopping-view
                                  .card=${this}
                                  .renderKey=${`${shoppingFavSig}|${shoppingCommonSig}|${shoppingItemsSig}`}
                              ></fb-shopping-view>`
                            : screen === 'settings'
                            ? html`<fb-settings-view
                                  .card=${this}
                                  .renderKey=${settingsRenderKey}
                              ></fb-settings-view>`
                            : html`<fb-home-view .card=${this}></fb-home-view>`}

                        <fb-dialogs
                            .card=${this}
                            .open=${this._dialogOpen}
                            .mode=${this._dialogMode}
                            .title=${this._dialogTitle}
                            .entityId=${this._dialogEntity}
                            .item=${this._dialogItem}
                            .startValue=${this._dialogStartValue}
                            .endValue=${this._dialogEndValue}
                            .calendars=${this._config?.calendars || []}
                            .todos=${this._config?.todos || []}
                            .shopping=${this._config?.shopping || {}}
                            .canAddHomeControl=${Boolean(this._hass?.user?.is_admin)}
                            @fb-dialog-mode=${this._onDialogModeChange}
                            @fb-dialog-close=${this._onDialogClose}
                            @fb-add-calendar=${this._onAddCalendar}
                            @fb-add-todo=${this._onAddTodo}
                            @fb-add-shopping=${this._onAddShopping}
                            @fb-add-home-control=${this._onAddHomeControl}
                            @fb-edit-todo=${this._onEditTodo}
                            @fb-edit-shopping=${this._onEditShopping}
                        ></fb-dialogs>

                        <fb-manage-sources
                            .open=${this._sourcesOpen}
                            .config=${this._storedConfig || this._sharedConfig || this._config}
                            .hass=${this._hass}
                            @fb-sources-save=${this._onSourcesSave}
                            @fb-sources-close=${this._onSourcesClose}
                            @fb-open-editor=${this._openEditor}
                        ></fb-manage-sources>

                        <fb-event-dialog
                            .open=${this._eventDialogOpen}
                            .event=${this._eventDialogEvent}
                            .entityId=${this._eventDialogEntity}
                            .supportsUpdate=${this._calendarSupports(
                                this._eventDialogEntity,
                                CALENDAR_FEATURES.UPDATE
                            )}
                            .supportsDelete=${this._calendarSupports(
                                this._eventDialogEntity,
                                CALENDAR_FEATURES.DELETE
                            )}
                            .supportsCreate=${this._calendarSupports(
                                this._eventDialogEntity,
                                CALENDAR_FEATURES.CREATE
                            )}
                            @fb-event-close=${this._onEventDialogClose}
                            @fb-event-update=${this._onEventUpdate}
                            @fb-event-delete=${this._onEventDelete}
                        ></fb-event-dialog>

                        <fb-all-day-dialog
                            .open=${this._allDayDialogOpen}
                            .day=${this._allDayDialogDay}
                            .events=${this._allDayDialogEvents}
                            .title=${this._allDayDialogTitle}
                            .card=${this}
                            @fb-all-day-close=${this._onAllDayDialogClose}
                        ></fb-all-day-dialog>

                        <fb-help-dialog
                            .open=${this._helpOpen}
                            @fb-help-close=${this._onHelpClose}
                        ></fb-help-dialog>
                        <fb-editor-guide-dialog
                            .open=${this._editorGuideOpen}
                            .card=${this}
                            @fb-editor-guide-close=${this._onEditorGuideClose}
                            @fb-editor-guide-open=${this._onOpenEditor}
                        ></fb-editor-guide-dialog>
                    </div>
                </div>
            </div>
        `;
    }

    _onDialogModeChange = (ev) => {
        const mode = ev?.detail?.mode;
        if (!mode) return;
        if (mode === 'home-control' && !this._hass?.user?.is_admin) {
            this._showToast('Admin only');
            return;
        }
        this._setAddDialogMode(mode);
    };

    _onFab = () => {
        this._closeAllDialogs();
        this._dialogOpen = true;
        const screen = this._screen || 'schedule';
        this._openAddDialogForScreen(screen === 'settings' ? 'schedule' : screen);
    };

    _setHomeEntityState(entityId, on) {
        if (!entityId || !this._hass) return;
        const domain = entityId.split('.')[0];
        const service = on ? 'turn_on' : 'turn_off';
        if (['switch', 'light', 'input_boolean'].includes(domain)) {
            this._hass.callService(domain, service, { entity_id: entityId });
            return;
        }
        if (this._supportsService('homeassistant', service)) {
            this._hass.callService('homeassistant', service, { entity_id: entityId });
            return;
        }
        this._hass.callService('homeassistant', 'toggle', { entity_id: entityId });
    }
}

applyPersistence(FamilyBoardCard);
applyRefresh(FamilyBoardCard);
applyActions(FamilyBoardCard);
applyNavigation(FamilyBoardCard);
applyNotifications(FamilyBoardCard);
applySelectors(FamilyBoardCard);
applyConfigHelpers(FamilyBoardCard);
applyDialogs(FamilyBoardCard);
applyOptimistic(FamilyBoardCard);
applyShopping(FamilyBoardCard);
applyTodoHelpers(FamilyBoardCard);
applyTodoRepeat(FamilyBoardCard);
applyPrefs(FamilyBoardCard);
applySetup(FamilyBoardCard);
applyAdmin(FamilyBoardCard);
applyToggles(FamilyBoardCard);
applyCounts(FamilyBoardCard);
applyLabels(FamilyBoardCard);
applyVisibility(FamilyBoardCard);
applyBins(FamilyBoardCard);
applySchedule(FamilyBoardCard);
applyServices(FamilyBoardCard);
applyHandlers(FamilyBoardCard);
applyValidation(FamilyBoardCard);
customElements.define('nx-displaygrid', FamilyBoardCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: 'nx-displaygrid',
    name: 'nx-displaygrid',
    description: 'Family calendar, chores, and shopping dashboard',
});
