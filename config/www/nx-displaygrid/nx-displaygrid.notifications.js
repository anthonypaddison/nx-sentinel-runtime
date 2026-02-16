/* nx-displaygrid - notification helpers
 * SPDX-License-Identifier: MIT
 */
export function applyNotifications(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _categorizeError(error, categoryOverride = '') {
            const message = String(error?.message || error || '').trim();
            const lower = message.toLowerCase();
            const category = categoryOverride || (() => {
                if (!message) return 'Unknown error';
                if (lower.includes('timeout') || lower.includes('timed out'))
                    return 'Network timeout';
                if (lower.includes('network') || lower.includes('failed to fetch'))
                    return 'Network error';
                if (lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('401') || lower.includes('403'))
                    return 'Auth required';
                if (lower.includes('not found') || lower.includes('missing'))
                    return 'Missing entity';
                if (lower.includes('service'))
                    return 'Integration error';
                return 'Unexpected error';
            })();

            const userDetail = category;
            const debugDetail = message || category;
            return { category, userDetail, debugDetail };
        },

        _showToast(message, detail = '') {
            this._toastMessage = message;
            this._toastDetail = detail;
            clearTimeout(this._toastTimer);
            this._toastTimer = setTimeout(() => {
                this._toastMessage = '';
                this._toastDetail = '';
                this.requestUpdate();
            }, 2000);
        },

        _showErrorToast(action, detail = '') {
            const message = action ? `${action} failed` : 'Action failed';
            this._showToast(message, detail);
        },

        _reportError(action, error, { category } = {}) {
            const message = action ? `${action} failed` : 'Action failed';
            const info = this._categorizeError(error, category);
            const isAdminDebug = Boolean(this._debug) && Boolean(this._hasAdminAccess?.());
            const detail = isAdminDebug ? `${info.category}: ${info.debugDetail}` : info.userDetail;
            this._showToast(message, detail);
        },

        _isMissingTodoItemError(error) {
            const msg = String(error?.message || error || '').toLowerCase();
            return msg.includes('unable to find to-do list item');
        },

        _shouldNotifyError(key, intervalMs = 30_000) {
            if (!key) return false;
            const now = Date.now();
            const last = this._errorToastTs?.get(key) || 0;
            if (now - last < intervalMs) return false;
            if (this._errorToastTs) this._errorToastTs.set(key, now);
            return true;
        },
    });
}
