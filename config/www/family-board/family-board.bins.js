/* Family Board - bin helpers
 * SPDX-License-Identifier: MIT
 */
import { addDays, startOfDay } from './family-board.util.js';

export function applyBins(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _binIndicators() {
            const today = startOfDay(new Date());
            const tomorrow = addDays(today, 1);
            const todayBins = this._binsDueOn(today);
            const tomorrowBins = this._binsDueOn(tomorrow);
            return { today: todayBins, tomorrow: tomorrowBins };
        },

        _binsDueOn(date) {
            const bins = Array.isArray(this._config?.bins) ? this._config.bins : [];
            const schedule = this._config?.bin_schedule || {};
            const mode = schedule.mode || 'simple';
            const activeBins = bins.filter((b) => b && b.enabled !== false);
            if (!activeBins.length) return [];
            const day = startOfDay(date);

            if (mode === 'rotation') {
                const rotation = schedule.rotation || {};
                const weekday = Number(rotation.weekday);
                if (!Number.isFinite(weekday)) return [];
                const anchor = rotation.anchor_date ? new Date(rotation.anchor_date) : null;
                if (!anchor || Number.isNaN(anchor.getTime())) return [];
                const weeks = Array.isArray(rotation.weeks) ? rotation.weeks : [];
                if (!weeks.length) return [];
                if (day.getDay() !== weekday) return [];
                const anchorStart = startOfDay(anchor);
                const diffMs = day.getTime() - anchorStart.getTime();
                const weeksDiff = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
                if (weeksDiff < 0) return [];
                const index = weeksDiff % weeks.length;
                const binsForWeek = Array.isArray(weeks[index]?.bins)
                    ? weeks[index].bins
                    : [];
                const allowed = new Set(binsForWeek);
                return activeBins.filter((b) => allowed.has(b.id));
            }

            const simple = schedule.simple || {};
            return activeBins.filter((bin) => {
                const cfg = simple?.[bin.id] || {};
                const weekday = Number(cfg.weekday);
                const every = Number(cfg.every) || 1;
                if (!Number.isFinite(weekday)) return false;
                if (!cfg.anchor_date) return false;
                const anchor = new Date(cfg.anchor_date);
                if (Number.isNaN(anchor.getTime())) return false;
                if (day.getDay() !== weekday) return false;
                const anchorStart = startOfDay(anchor);
                const diffMs = day.getTime() - anchorStart.getTime();
                const weeksDiff = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
                if (weeksDiff < 0) return false;
                return weeksDiff % every === 0;
            });
        },
    });
}
