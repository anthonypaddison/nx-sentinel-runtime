/* Family Board - visibility helpers
 * SPDX-License-Identifier: MIT
 */
export function applyVisibility(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _ensureVisibilitySets() {
            const calendars = Array.isArray(this._config?.calendars)
                ? this._config.calendars
                : [];
            const todos = Array.isArray(this._config?.todos) ? this._config.todos : [];

            const calendarIds = calendars.map((c) => c.entity);
            const todoIds = todos.map((t) => t.entity);

            if (!this._calendarVisibleSet || this._calendarVisibleSet.size === 0) {
                this._calendarVisibleSet = new Set(calendarIds);
            } else {
                this._calendarVisibleSet = new Set(
                    calendarIds.filter((id) => this._calendarVisibleSet.has(id))
                );
            }

            if (!this._todoVisibleSet || this._todoVisibleSet.size === 0) {
                this._todoVisibleSet = new Set(todoIds);
            } else {
                this._todoVisibleSet = new Set(
                    todoIds.filter((id) => this._todoVisibleSet.has(id))
                );
            }
        },

        _toggleCalendarVisible(entityId) {
            if (!this._calendarVisibleSet) this._calendarVisibleSet = new Set();
            if (this._calendarVisibleSet.has(entityId)) this._calendarVisibleSet.delete(entityId);
            else this._calendarVisibleSet.add(entityId);
            this._calendarVisibilityEnabled = true;
            this.requestUpdate();
        },

        _toggleTodoVisible(entityId) {
            if (!this._todoVisibleSet) this._todoVisibleSet = new Set();
            if (this._todoVisibleSet.has(entityId)) this._todoVisibleSet.delete(entityId);
            else this._todoVisibleSet.add(entityId);
            this.requestUpdate();
        },
    });
}
