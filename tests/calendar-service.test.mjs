import test from 'node:test';
import assert from 'node:assert/strict';
import { CalendarService } from '../config/www/nx-displaygrid/services/calendar.service.js';

test('CalendarService normalizes all-day events with non-increasing end', () => {
    const service = new CalendarService();
    const event = service._normaliseEvent({
        summary: 'All day test',
        start: { date: '2026-02-15' },
        end: { date: '2026-02-15' },
    });

    assert.ok(event);
    assert.equal(event.all_day, true);
    assert.equal(event._start.toISOString().slice(0, 10), '2026-02-15');
    assert.equal(event._end.toISOString().slice(0, 10), '2026-02-16');
});

test('CalendarService normalizes timed events with non-increasing end to +1 minute', () => {
    const service = new CalendarService();
    const event = service._normaliseEvent({
        summary: 'Timed test',
        start: '2026-02-15T10:00:00Z',
        end: '2026-02-15T10:00:00Z',
    });

    assert.ok(event);
    assert.equal(event.all_day, false);
    assert.equal(event._start.toISOString(), '2026-02-15T10:00:00.000Z');
    assert.equal(event._end.toISOString(), '2026-02-15T10:01:00.000Z');
});

test('CalendarService fills default summary when missing', () => {
    const service = new CalendarService();
    const event = service._normaliseEvent({
        start: '2026-02-15T10:00:00Z',
        end: '2026-02-15T10:30:00Z',
    });

    assert.ok(event);
    assert.equal(event.summary, '(No title)');
});

