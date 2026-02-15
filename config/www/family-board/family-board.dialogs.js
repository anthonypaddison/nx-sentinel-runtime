/* Family Board - dialog helpers
 * SPDX-License-Identifier: MIT
 */
import { fireEvent } from './family-board.util.js';

export function applyDialogs(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _closeAllDialogs() {
            if (this._dialogOpen) this._clearDialogState();
            if (this._eventDialogOpen) this._onEventDialogClose();
            if (this._allDayDialogOpen) this._onAllDayDialogClose();
            this._sourcesOpen = false;
            this._helpOpen = false;
            this._editorGuideOpen = false;
        },

        _clearDialogState() {
            this._dialogOpen = false;
            this._dialogMode = '';
            this._dialogTitle = '';
            this._dialogItem = null;
            this._dialogEntity = '';
            this._dialogStartValue = '';
            this._dialogEndValue = '';
        },

        _onDialogClose() {
            if (!this._dialogOpen) return;
            this._clearDialogState();
        },

        _onSourcesClose() {
            this._sourcesOpen = false;
        },

        _onHelpClose() {
            this._helpOpen = false;
        },

        _onEditorGuideClose() {
            this._editorGuideOpen = false;
        },

        _onOpenEditor() {
            if (!this._hasAdminAccess()) return;
            fireEvent(this, 'll-edit-card', { card: this });
        },

        _onEventDialogClose() {
            this._eventDialogOpen = false;
            this._eventDialogEntity = '';
            this._eventDialogEvent = null;
        },

        _onAllDayDialogClose() {
            this._allDayDialogOpen = false;
            this._allDayDialogDay = null;
            this._allDayDialogEvents = [];
            this._allDayDialogTitle = '';
        },
    });
}
