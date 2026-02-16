/* nx-displaygrid - service helpers
 * SPDX-License-Identifier: MIT
 */
export function applyServices(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _calendarSupports(entityId, feature) {
            if (!entityId || !this._hass) return false;
            const st = this._hass.states?.[entityId];
            const supported = st?.attributes?.supported_features ?? 0;
            return (supported & feature) !== 0;
        },

        _supportsService(domain, service) {
            return Boolean(this._hass?.services?.[domain]?.[service]);
        },
    });
}
