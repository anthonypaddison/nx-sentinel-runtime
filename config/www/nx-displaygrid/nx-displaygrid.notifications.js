/* nx-displaygrid - notification helpers
 * SPDX-License-Identifier: MIT
 */
export function applyNotifications(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _v2NotificationPolicy() {
            const cfg = this._config?.notifications_v2;
            const base = cfg && typeof cfg === 'object' ? cfg : {};
            return {
                enabled: base.enabled === true,
                notifyService: String(base.notify_service || '').trim(),
                minSeverity: String(base.min_severity || 'warn').trim() || 'warn',
                suppressWhenVisible: base.suppress_when_visible === true,
            };
        },

        _v2SeverityRank(level) {
            const map = { info: 1, warn: 2, critical: 3 };
            return map[String(level || '').toLowerCase()] || 0;
        },

        _v2VisibleScreenForAction(action = '') {
            const label = String(action || '').toLowerCase();
            if (label.includes('shopping')) return 'shopping';
            if (label.includes('chore') || label.includes('todo')) return 'chores';
            if (label.includes('event') || label.includes('calendar')) return 'schedule';
            if (label.includes('home control')) return 'home';
            return '';
        },

        _v2NotificationSeverityForError(action = '', info = {}) {
            const category = String(info?.category || '').toLowerCase();
            const actionText = String(action || '').toLowerCase();
            if (category.includes('auth')) return 'critical';
            if (category.includes('missing')) return 'warn';
            if (category.includes('timeout') || category.includes('network')) return 'warn';
            if (actionText.includes('reset') || actionText.includes('persist')) return 'critical';
            return 'warn';
        },

        async _v2SendPhoneNotification({
            title = 'nx-displaygrid',
            message = '',
            severity = 'warn',
            reason = '',
            action = '',
            visibleScreen = '',
            context = {},
        } = {}) {
            if (!this._v2FeatureEnabled?.('notification_policy')) return false;
            const policy = this._v2NotificationPolicy?.();
            if (!policy?.enabled || !policy.notifyService) return false;

            const currentScreen = this._screen || '';
            if (policy.suppressWhenVisible && visibleScreen && visibleScreen === currentScreen) {
                return false;
            }

            if (
                this._v2SeverityRank?.(severity) <
                this._v2SeverityRank?.(policy.minSeverity || 'warn')
            ) {
                return false;
            }

            const presence = this._v2PresenceState?.();
            if (presence?.uncertain && this._v2SeverityRank?.(severity) < this._v2SeverityRank?.('critical')) {
                return false;
            }

            const [domain, service] = String(policy.notifyService).split('.');
            if (!domain || !service || !this._hass) return false;
            const lines = [String(message || '').trim()].filter(Boolean);
            if (reason) lines.push(`Reason: ${reason}`);
            lines.push(`Screen: ${currentScreen || 'unknown'}`);
            if (context && typeof context === 'object') {
                if (context.category) lines.push(`Category: ${context.category}`);
                if (context.lastRefreshReason) lines.push(`Refresh: ${context.lastRefreshReason}`);
                if (presence?.confidence?.available) {
                    lines.push(
                        `Presence confidence: ${presence.confidence.value}%${
                            presence.uncertain ? ' (uncertain)' : ''
                        }`
                    );
                }
                if (context.calendarState || context.todoState || context.shoppingState) {
                    lines.push(
                        `State: C=${context.calendarState || 'ok'} T=${context.todoState || 'ok'} S=${
                            context.shoppingState || 'ok'
                        }`
                    );
                }
            }
            try {
                await this._hass.callService(domain, service, {
                    title,
                    message: lines.join('\n'),
                    data: {
                        severity,
                        source: 'nx-displaygrid',
                        action: action || '',
                        reason: reason || '',
                    },
                });
                return true;
            } catch {
                return false;
            }
        },

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
            const severity = this._v2NotificationSeverityForError?.(action, info) || 'warn';
            const visibleScreen = this._v2VisibleScreenForAction?.(action) || '';
            const calendarState = this._calendarError
                ? 'error'
                : this._calendarStale
                ? 'stale'
                : 'ok';
            const todoState = this._todoError ? 'error' : this._todoStale ? 'stale' : 'ok';
            const shoppingState = this._shoppingError
                ? 'error'
                : this._shoppingStale
                ? 'stale'
                : 'ok';
            this._v2SendPhoneNotification?.({
                title: 'nx-displaygrid alert',
                message,
                severity,
                reason: info.userDetail,
                action,
                visibleScreen,
                context: {
                    category: info.category,
                    lastRefreshReason: this._lastRefreshReason || '',
                    calendarState,
                    todoState,
                    shoppingState,
                },
            }).catch(() => {});
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
