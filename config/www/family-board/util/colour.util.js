/* Family Board - colour helpers
 * SPDX-License-Identifier: MIT
 */

export const NEUTRAL_COLOUR = 'rgba(15, 23, 42, 0.12)';

export function getPersonColour(person) {
    return person?.color || NEUTRAL_COLOUR;
}

export function getReadableTextColour(colour) {
    const rgb = parseRgb(colour);
    if (!rgb) return '#1f2937';
    const [r, g, b] = rgb;
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance < 0.55 ? '#ffffff' : '#1f2937';
}

function parseRgb(colour) {
    if (!colour || typeof colour !== 'string') return null;
    const hex = colour.trim();
    if (hex.startsWith('#')) {
        const value = hex.slice(1);
        if (value.length === 3) {
            const r = parseInt(value[0] + value[0], 16);
            const g = parseInt(value[1] + value[1], 16);
            const b = parseInt(value[2] + value[2], 16);
            return [r, g, b];
        }
        if (value.length === 6) {
            const r = parseInt(value.slice(0, 2), 16);
            const g = parseInt(value.slice(2, 4), 16);
            const b = parseInt(value.slice(4, 6), 16);
            return [r, g, b];
        }
    }

    const match = colour.match(/rgba?\(([^)]+)\)/i);
    if (match) {
        const parts = match[1].split(',').map((v) => Number(v.trim()));
        if (parts.length >= 3 && parts.every((n) => !Number.isNaN(n))) {
            return parts.slice(0, 3);
        }
    }
    return null;
}
