/* nx-displaygrid - config YAML serialization
 * SPDX-License-Identifier: MIT
 */
import { DEFAULT_CARD_CONFIG } from '../nx-displaygrid.defaults.js';
import { yamlString } from './yaml.util.js';

export function serializeNxDisplaygridCardConfig(
    cfg,
    { includeBackgroundTheme = false, includeHomeControls = false, includeAdminPin = false } = {}
) {
    const draft = cfg || {};
    const lines = [];
    const push = (line) => lines.push(line);

    push(`type: custom:nx-displaygrid`);
    if (draft.title) push(`title: ${yamlString(draft.title)}`);
    if (draft.debug !== undefined) push(`debug: ${draft.debug ? 'true' : 'false'}`);
    push(`days_to_show: ${DEFAULT_CARD_CONFIG.days_to_show}`);
    if (draft.day_start_hour !== undefined) push(`day_start_hour: ${draft.day_start_hour}`);
    if (draft.day_end_hour !== undefined) push(`day_end_hour: ${draft.day_end_hour}`);
    if (draft.slot_minutes !== undefined) push(`slot_minutes: ${draft.slot_minutes}`);
    if (draft.px_per_hour !== undefined) push(`px_per_hour: ${draft.px_per_hour}`);
    if (draft.refresh_interval_ms !== undefined)
        push(`refresh_interval_ms: ${draft.refresh_interval_ms}`);
    if (includeBackgroundTheme && draft.background_theme) {
        push(`background_theme: ${yamlString(draft.background_theme)}`);
    }

    const people = Array.isArray(draft.people) ? draft.people : [];
    if (people.length) {
        push(`people:`);
        for (const p of people) {
            push(`  - id: ${yamlString(p.id)}`);
            if (p.name) push(`    name: ${yamlString(p.name)}`);
            if (p.color) push(`    color: ${yamlString(p.color)}`);
            if (p.text_color) push(`    text_color: ${yamlString(p.text_color)}`);
            if (p.role) push(`    role: ${yamlString(p.role)}`);
            if (p.header_row) push(`    header_row: ${p.header_row}`);
        }
    }

    const peopleDisplay = Array.isArray(draft.people_display) ? draft.people_display : [];
    if (peopleDisplay.length) {
        push(`people_display:`);
        for (const id of peopleDisplay) {
            push(`  - ${yamlString(id)}`);
        }
    }

    // Admin PIN is sensitive and should not be copied into exported YAML by default.
    if (includeAdminPin && draft.admin_pin !== undefined) {
        push(`admin_pin: ${yamlString(draft.admin_pin)}`);
    }

    const calendars = Array.isArray(draft.calendars) ? draft.calendars : [];
    if (calendars.length) {
        push(`calendars:`);
        for (const c of calendars) {
            push(`  - entity: ${yamlString(c.entity)}`);
            if (c.person_id) push(`    person_id: ${yamlString(c.person_id)}`);
            if (c.role) push(`    role: ${yamlString(c.role)}`);
        }
    }

    const todos = Array.isArray(draft.todos) ? draft.todos : [];
    if (todos.length) {
        push(`todos:`);
        for (const t of todos) {
            push(`  - entity: ${yamlString(t.entity)}`);
            if (t.name) push(`    name: ${yamlString(t.name)}`);
            if (t.person_id) push(`    person_id: ${yamlString(t.person_id)}`);
        }
    }

    if (draft.shopping?.entity) {
        push(`shopping:`);
        push(`  entity: ${yamlString(draft.shopping.entity)}`);
        if (draft.shopping.name) push(`  name: ${yamlString(draft.shopping.name)}`);
    }

    if (includeHomeControls) {
        const homeControls = Array.isArray(draft.home_controls) ? draft.home_controls : [];
        if (homeControls.length) {
            push(`home_controls:`);
            for (const eid of homeControls) {
                push(`  - ${yamlString(eid)}`);
            }
        }
    }

    return lines.join('\n');
}
