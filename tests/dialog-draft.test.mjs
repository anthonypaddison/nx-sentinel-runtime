import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createDialogDraftState,
    shouldHydrateDraftField,
} from '../config/www/nx-displaygrid/util/dialog-draft.util.js';

test('createDialogDraftState resets edit fields for next hydration pass', () => {
    const draft = createDialogDraftState();
    assert.equal(draft.emoji, undefined);
    assert.equal(draft.textValue, undefined);
    assert.equal(draft.todoDueValue, undefined);
    assert.equal(draft.todoRepeatValue, undefined);
    assert.equal(draft.todoEntityValue, '');
});

test('shouldHydrateDraftField only hydrates undefined values', () => {
    assert.equal(shouldHydrateDraftField(undefined), true);
    assert.equal(shouldHydrateDraftField(''), false);
    assert.equal(shouldHydrateDraftField('value'), false);
});
