import test from 'node:test';
import assert from 'node:assert/strict';

import { applyAdaptive } from '../config/www/nx-displaygrid/nx-displaygrid.adaptive.js';
import { applyNavigation } from '../config/www/nx-displaygrid/nx-displaygrid.navigation.js';

function withFakeNow(now, fn) {
    const previousNow = Date.now;
    Date.now = () => now;
    try {
        return fn();
    } finally {
        Date.now = previousNow;
    }
}

test('manual nav blocks forced adaptive auto-screen until adaptive idle timeout', () => {
    class TestCard {}
    applyNavigation(TestCard);
    applyAdaptive(TestCard);

    const card = new TestCard();
    card._config = {
        adaptive_v2: {
            auto_screen: true,
            auto_screen_idle_seconds: 180,
        },
    };
    card._screen = 'schedule';
    card._debug = false;
    card._savePrefs = () => {};
    card._queueRefresh = () => {};
    card.requestUpdate = () => {};
    card._v2AuditRecord = () => {};
    card._v2FeatureEnabled = (flag) => flag === 'adaptive_layout';
    card._v2RecommendedScreen = () => 'schedule';

    withFakeNow(1_000_000, () => {
        card._onNav({ detail: { target: 'shopping' } });
    });

    assert.equal(card._screen, 'shopping');
    assert.equal(card._lastManualNavTs, 1_000_000);
    assert.equal(card._manualNavAdaptiveLockUntilTs, 1_005_000);

    withFakeNow(1_001_000, () => {
        card._maybeApplyV2AdaptiveScreen({ force: true });
    });
    assert.equal(card._screen, 'shopping');

    withFakeNow(1_006_000, () => {
        card._maybeApplyV2AdaptiveScreen({ force: true });
    });
    assert.equal(card._screen, 'shopping');

    withFakeNow(1_181_000, () => {
        card._maybeApplyV2AdaptiveScreen({ force: true });
    });
    assert.equal(card._screen, 'schedule');
});

test('date navigation also applies adaptive lock to avoid screen jumps', () => {
    class TestCard {}
    applyNavigation(TestCard);
    applyAdaptive(TestCard);

    const card = new TestCard();
    card._config = {
        adaptive_v2: {
            auto_screen: true,
            auto_screen_idle_seconds: 180,
        },
    };
    card._screen = 'schedule';
    card._mainMode = 'schedule';
    card._dayOffset = 0;
    card._debug = false;
    card._savePrefs = () => {};
    card._queueRefresh = () => {};
    card.requestUpdate = () => {};
    card._v2AuditRecord = () => {};
    card._v2FeatureEnabled = (flag) => flag === 'adaptive_layout';
    card._v2RecommendedScreen = () => 'family';

    withFakeNow(2_000_000, () => {
        card._onDateNav({ detail: { delta: 1 } });
    });

    assert.equal(card._dayOffset, 1);
    assert.equal(card._lastManualNavTs, 2_000_000);
    assert.equal(card._manualNavAdaptiveLockUntilTs, 2_005_000);

    withFakeNow(2_001_000, () => {
        card._maybeApplyV2AdaptiveScreen({ force: true });
    });
    assert.equal(card._screen, 'schedule');
});
