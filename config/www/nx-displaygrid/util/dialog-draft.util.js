/* nx-displaygrid - dialog draft helpers
 * SPDX-License-Identifier: MIT
 */

export function createDialogDraftState() {
    return {
        emoji: undefined,
        textValue: undefined,
        todoDueValue: undefined,
        todoRepeatValue: undefined,
        todoEntityValue: '',
    };
}

export function shouldHydrateDraftField(value) {
    return value === undefined;
}
