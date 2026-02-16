/* nx-displaygrid - admin helpers
 * SPDX-License-Identifier: MIT
 */
export function applyAdmin(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _hasAdminAccess() {
            return Boolean(this._hass?.user?.is_admin || this._adminUnlocked);
        },

        _tryAdminUnlock(pin) {
            const configured = String(this._config?.admin_pin || '');
            if (!configured) {
                this._showToast('No admin PIN set');
                return false;
            }
            if (String(pin || '') === configured) {
                this._adminUnlocked = true;
                this._savePrefs();
                this._showToast('Admin access unlocked');
                this.requestUpdate();
                return true;
            }
            this._showErrorToast('Invalid PIN');
            return false;
        },

        _lockAdminAccess() {
            this._adminUnlocked = false;
            this._savePrefs();
            this._showToast('Admin access locked');
            this.requestUpdate();
        },

        async _setAdminPin(pin) {
            const trimmed = String(pin || '').trim();
            await this._updateConfigPartial({ admin_pin: trimmed || '' });
        },
    });
}
