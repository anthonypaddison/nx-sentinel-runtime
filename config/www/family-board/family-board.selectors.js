/* Family Board - selector helpers
 * SPDX-License-Identifier: MIT
 */
import { NEUTRAL_COLOUR } from './util/colour.util.js';

export function applySelectors(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _personForEntity(entityId) {
            return this._personByEntity?.get(entityId) || null;
        },

        _personIdFromName(name) {
            if (!name) return '';
            const target = this._normalisePersonId(name);
            if (!target) return '';
            for (const person of this._peopleById?.values?.() || []) {
                const pid = this._normalisePersonId(person?.id);
                const pname = this._normalisePersonId(person?.name);
                if (pid && pid === target) return person.id;
                if (pname && pname === target) return person.id;
            }
            return '';
        },

        _personIdForConfig(entry, entityId) {
            const person = entityId ? this._personForEntity(entityId) : null;
            const direct =
                person?.id || entry?.person_id || entry?.personId || entry?.person || '';
            if (direct) return direct;
            if (entityId && entityId.startsWith('todo.')) {
                const nameMatch = this._personIdFromName(entry?.name);
                if (nameMatch) return nameMatch;
                const tail = entityId.slice('todo.'.length);
                const tailMatch = this._personIdFromName(tail);
                if (tailMatch) return tailMatch;
            }
            return entityId || '';
        },

        _isPersonAllowed(personId) {
            if (!this._personFilterSet || this._personFilterSet.size === 0) return true;
            const key = this._normalisePersonId(personId);
            if (!key) return true;
            return this._personFilterSet.has(key);
        },

        _neutralColor() {
            return NEUTRAL_COLOUR;
        },

        _normalisePersonId(personId) {
            if (personId === null || personId === undefined) return '';
            return String(personId).trim().toLowerCase();
        },
    });
}
