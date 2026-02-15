/* Family Board - action helpers
 * SPDX-License-Identifier: MIT
 */
import { fireEvent, pad2 } from './family-board.util.js';

export function applyActions(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _openMoreInfo(entityId) {
            if (!entityId) return;
            fireEvent(this, 'hass-more-info', { entityId });
        },

        _setAddDialogMode(mode) {
            this._dialogMode = mode;
            this._dialogItem = null;
            this._dialogEntity = '';
            this._dialogStartValue = '';
            this._dialogEndValue = '';
            if (mode === 'home-control') {
                this._dialogTitle = 'Add home control';
            } else if (mode === 'todo') {
                this._dialogTitle = 'Add chore';
            } else if (mode === 'shopping') {
                this._dialogTitle = 'Add shopping item';
            } else {
                this._dialogTitle = 'Add event';
                const start = new Date();
                const minutes = Number(this._defaultEventMinutes || 30);
                const end = new Date(start.getTime() + minutes * 60 * 1000);
                this._dialogStartValue = this._toLocalDateTimeValue(start);
                this._dialogEndValue = this._toLocalDateTimeValue(end);
            }
        },

        _openAddDialogForScreen(screen) {
            if (screen === 'home') {
                if (!this._hass?.user?.is_admin) {
                    this._showToast('Admin only');
                    return;
                }
                this._setAddDialogMode('home-control');
                return;
            }
            if (screen === 'chores') {
                this._setAddDialogMode('todo');
                return;
            }
            if (screen === 'shopping') {
                this._setAddDialogMode('shopping');
                return;
            }
            this._setAddDialogMode('calendar');
        },

        _toLocalDateTimeValue(date) {
            const d = new Date(date);
            if (Number.isNaN(d.getTime())) return '';
            return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
                d.getHours()
            )}:${pad2(d.getMinutes())}`;
        },

        _openAddEventAt(date) {
            if (!date) return;
            const start = new Date(date);
            if (Number.isNaN(start.getTime())) return;
            const minutes = Number(this._defaultEventMinutes || 30);
            const end = new Date(start.getTime() + minutes * 60 * 1000);
            this._closeAllDialogs();
            this._dialogOpen = true;
            this._dialogMode = 'calendar';
            this._dialogTitle = 'Add event';
            this._dialogItem = null;
            this._dialogEntity = '';
            this._dialogStartValue = this._toLocalDateTimeValue(start);
            this._dialogEndValue = this._toLocalDateTimeValue(end);
        },

        _openTodoAddForEntity(entityId) {
            this._closeAllDialogs();
            this._dialogOpen = true;
            this._dialogMode = 'todo';
            this._dialogTitle = 'Add chore';
            this._dialogItem = null;
            this._dialogEntity = entityId || '';
        },

        _openTodoAddForPerson(personId, fallbackEntityId) {
            const todos = Array.isArray(this._config?.todos) ? this._config.todos : [];
            const target = this._normalisePersonId(personId);
            let entityId = fallbackEntityId || '';
            if (target) {
                const match = todos.find((t) => {
                    const mappedId = this._normalisePersonId(this._personIdForConfig(t, t.entity));
                    return mappedId && mappedId === target;
                });
                if (match?.entity) entityId = match.entity;
            }
            this._openTodoAddForEntity(entityId);
        },

        async _openManageSources() {
            if (!this._hasAdminAccess()) return;
            this._closeAllDialogs();
            await this._refreshStoredConfig();
            this._sourcesOpen = true;
        },

        _openEventDialog(entityId, event) {
            if (!entityId || !event) return;
            this._closeAllDialogs();
            this._eventDialogEntity = entityId;
            this._eventDialogEvent = event;
            this._eventDialogOpen = true;
        },

        _openAllDayDialog(day, events, title = '') {
            if (!day || !Array.isArray(events)) return;
            this._closeAllDialogs();
            this._allDayDialogDay = day;
            this._allDayDialogEvents = events;
            this._allDayDialogTitle = title || '';
            this._allDayDialogOpen = true;
        },

        _openEditor() {
            this._closeAllDialogs();
            this._onOpenEditor();
            this._editorGuideOpen = true;
            this.requestUpdate();
        },

        _openHelp() {
            this._closeAllDialogs();
            this._helpOpen = true;
            this.requestUpdate();
        },
    });
}
