/* nx-displaygrid - timed reminders (V2)
 * SPDX-License-Identifier: MIT
 */

function parseTimeToMinutes(value) {
    const text = String(value || '').trim();
    const match = /^(\d{1,2}):(\d{2})$/.exec(text);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
}

function startOfMinute(date) {
    const d = new Date(date);
    d.setSeconds(0, 0);
    return d;
}

function makeReminderId() {
    return `rem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function applyReminders(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _v2ReminderList() {
            const raw = Array.isArray(this._config?.reminders_v2) ? this._config.reminders_v2 : [];
            return raw
                .map((reminder) => {
                    if (!reminder || typeof reminder !== 'object') return null;
                    const time = String(reminder.time || '').trim();
                    const minuteOfDay = parseTimeToMinutes(time);
                    return {
                        id: String(reminder.id || makeReminderId()),
                        label: String(reminder.label || 'Reminder').trim() || 'Reminder',
                        message: String(reminder.message || '').trim(),
                        time,
                        minuteOfDay,
                        enabled: reminder.enabled !== false,
                        countdownMinutes: Math.max(
                            0,
                            Number.isFinite(Number(reminder.countdown_minutes))
                                ? Number(reminder.countdown_minutes)
                                : 10
                        ),
                        sound: reminder.sound !== false,
                        soundPattern: String(reminder.sound_pattern || 'double').trim() || 'double',
                        days: Array.isArray(reminder.days)
                            ? reminder.days
                                  .map((d) => Number(d))
                                  .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
                            : [],
                    };
                })
                .filter((r) => r && r.minuteOfDay !== null);
        },

        _v2ReminderOccurrenceKey(reminder, targetAt) {
            return `${reminder?.id || 'rem'}|${targetAt?.toISOString?.().slice(0, 16) || ''}`;
        },

        _v2CurrentReminderBanner(now = new Date()) {
            if (!this._v2FeatureEnabled?.('reminder_banners')) return null;
            const reminders = this._v2ReminderList?.() || [];
            if (!reminders.length) return null;
            const current = startOfMinute(now);
            const weekday = current.getDay();
            const minuteNow = current.getHours() * 60 + current.getMinutes();
            const candidates = [];

            for (const reminder of reminders) {
                if (!reminder.enabled) continue;
                if (Array.isArray(reminder.days) && reminder.days.length && !reminder.days.includes(weekday)) {
                    continue;
                }
                const target = new Date(current);
                target.setHours(0, 0, 0, 0);
                target.setMinutes(reminder.minuteOfDay);
                const targetMs = target.getTime();
                const nowMs = current.getTime();
                const diffMin = Math.round((targetMs - nowMs) / 60000);
                const countdownWindow = Math.max(0, Number(reminder.countdownMinutes || 0));
                const active = diffMin >= 0 ? diffMin <= countdownWindow : Math.abs(diffMin) <= 5;
                if (!active) continue;
                const occurrenceKey = this._v2ReminderOccurrenceKey(reminder, target);
                const dismissed = this._v2ReminderDismissed?.has?.(occurrenceKey);
                if (dismissed) continue;
                candidates.push({
                    reminder,
                    targetAt: target,
                    diffMin,
                    occurrenceKey,
                    phase: diffMin > 0 ? 'countdown' : diffMin === 0 ? 'due' : 'late',
                });
            }

            if (!candidates.length) return null;
            candidates.sort((a, b) => Math.abs(a.diffMin) - Math.abs(b.diffMin));
            return candidates[0];
        },

        _v2ReminderBannerText(banner) {
            if (!banner?.reminder) return '';
            const r = banner.reminder;
            const base = r.message || r.label;
            if (banner.phase === 'countdown') {
                return `${base} in ${banner.diffMin} min`;
            }
            if (banner.phase === 'due') {
                return `${base} now`;
            }
            return `${base} ${Math.abs(banner.diffMin)} min ago`;
        },

        _v2DismissReminderBanner(occurrenceKey) {
            if (!occurrenceKey) return;
            if (!this._v2ReminderDismissed) this._v2ReminderDismissed = new Set();
            this._v2ReminderDismissed.add(occurrenceKey);
            this._v2AuditRecord?.({
                type: 'reminder',
                component: 'reminders',
                severity: 'info',
                title: 'Reminder dismissed',
                reason: occurrenceKey,
            });
            this.requestUpdate();
        },

        _v2ReminderVisibleOnScreen(banner) {
            if (!banner?.reminder) return false;
            const screen = this._screen || 'schedule';
            const text = `${banner.reminder.label} ${banner.reminder.message || ''}`.toLowerCase();
            if (screen === 'shopping' && text.includes('shopping')) return true;
            if (screen === 'food' && (text.includes('meal') || text.includes('food'))) return true;
            if (screen === 'chores' && (text.includes('chore') || text.includes('todo'))) return true;
            return false;
        },

        _v2ShouldSuppressReminderBanner(banner) {
            if (!banner) return false;
            const enabled = this._config?.notifications_v2?.suppress_when_visible === true;
            if (!enabled) return false;
            return this._v2ReminderVisibleOnScreen?.(banner);
        },

        _v2EnsureAudioContext() {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            if (!this._v2AudioCtx) this._v2AudioCtx = new Ctx();
            return this._v2AudioCtx;
        },

        async _v2PlayReminderSound({ pattern = 'double' } = {}) {
            const ctx = this._v2EnsureAudioContext?.();
            if (!ctx) {
                this._showToast?.('Reminder sound unavailable', 'Browser audio context not supported');
                this._v2AuditRecord?.({
                    type: 'reminder',
                    component: 'reminders',
                    severity: 'warn',
                    title: 'Reminder sound unavailable',
                    reason: 'Browser audio context not supported',
                });
                return false;
            }
            if (ctx.state === 'suspended') {
                try {
                    await ctx.resume();
                } catch {
                    // continue best effort
                }
            }
            const now = ctx.currentTime;
            const tones =
                pattern === 'triple'
                    ? [0, 0.14, 0.28]
                    : pattern === 'long'
                    ? [0]
                    : [0, 0.18];
            for (const offset of tones) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = 880;
                gain.gain.setValueAtTime(0.0001, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.08, now + offset + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + (pattern === 'long' ? 0.3 : 0.1));
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + offset);
                osc.stop(now + offset + (pattern === 'long' ? 0.35 : 0.12));
            }
            this._v2AuditRecord?.({
                type: 'reminder',
                component: 'reminders',
                severity: 'info',
                title: 'Reminder sound played',
                reason: pattern,
            });
            return true;
        },

        _v2ReminderSoundOnce(banner) {
            if (!banner?.reminder?.sound) return;
            if (banner.phase === 'countdown') return;
            const soundKey = `${banner.occurrenceKey}|${banner.phase}`;
            if (this._v2ReminderSoundPlayedKey === soundKey) return;
            this._v2ReminderSoundPlayedKey = soundKey;
            this._v2PlayReminderSound({ pattern: banner.reminder.soundPattern || 'double' }).catch(
                () => {}
            );
        },

        _v2TickReminderBanner() {
            const banner = this._v2CurrentReminderBanner?.();
            if (!banner || this._v2ShouldSuppressReminderBanner?.(banner)) {
                this._activeReminderBanner = null;
                return;
            }
            this._activeReminderBanner = banner;
            this._v2ReminderSoundOnce?.(banner);
        },

        async _v2SaveReminderList(reminders) {
            const safe = (Array.isArray(reminders) ? reminders : []).map((r) => ({
                id: String(r.id || makeReminderId()),
                label: String(r.label || '').trim() || 'Reminder',
                message: String(r.message || '').trim(),
                time: String(r.time || '09:00'),
                enabled: r.enabled !== false,
                countdown_minutes: Math.max(0, Number(r.countdown_minutes ?? r.countdownMinutes ?? 10) || 0),
                sound: r.sound !== false,
                sound_pattern: String(r.sound_pattern || r.soundPattern || 'double'),
                days: Array.isArray(r.days) ? r.days : [],
            }));
            await this._updateConfigPartial?.({ reminders_v2: safe });
            this._v2TickReminderBanner?.();
        },
    });
}
