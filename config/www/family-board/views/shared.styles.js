/* Family Board - shared view styles
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';

const { css } = getHaLit();

export const sharedViewStyles = css`
    :host {
        display: block;
        height: 100%;
        min-height: 0;
    }
    .wrap {
        height: 100%;
        padding: var(--fb-gutter);
        min-height: 0;
        box-sizing: border-box;
    }
    .wrap.scroll {
        overflow: auto;
    }
    .wrap.hidden {
        overflow: hidden;
    }
    .muted {
        color: var(--fb-muted);
        font-size: 14px;
    }
    .btn {
        border: var(--fb-btn-border-width, 1px) solid
            var(--fb-btn-border, var(--fb-grid));
        background: var(--fb-btn-bg, var(--fb-surface));
        border-radius: var(--fb-btn-radius, 10px);
        padding: var(--fb-btn-padding, 6px 10px);
        font-size: var(--fb-btn-font-size, 14px);
        cursor: pointer;
        color: var(--fb-btn-color, var(--fb-text));
        min-height: var(--fb-btn-min-height, auto);
        min-width: var(--fb-btn-min-width, auto);
    }
    .btn:disabled {
        opacity: 0.6;
        cursor: default;
    }
    .btn.sm {
        --fb-btn-padding: 4px 8px;
        --fb-btn-font-size: 12px;
        --fb-btn-min-height: 28px;
        --fb-btn-min-width: 28px;
    }
    .btn.lg {
        --fb-btn-padding: 10px 12px;
        --fb-btn-font-size: 16px;
        --fb-btn-min-height: 40px;
        --fb-btn-min-width: 40px;
    }
    .btn.icon {
        --fb-btn-bg: var(--fb-surface-2);
        --fb-btn-padding: 0;
        --fb-btn-min-height: 32px;
        --fb-btn-min-width: 32px;
        width: var(--fb-btn-min-width, 32px);
        height: var(--fb-btn-min-height, 32px);
        display: grid;
        place-items: center;
    }
    .btn.touch {
        --fb-btn-min-height: var(--fb-touch);
        --fb-btn-min-width: var(--fb-touch);
    }
    .btn.ghost {
        --fb-btn-bg: transparent;
        --fb-btn-border-width: 0;
    }
    .btn.primary {
        --fb-btn-bg: var(--fb-accent);
        --fb-btn-border: transparent;
        --fb-btn-border-width: 0;
    }
    .btn.secondary {
        --fb-btn-bg: transparent;
    }
`;

export const sharedCardStyles = css`
    .fb-card {
        border: var(--fb-card-border, 1px solid var(--fb-grid));
        background: var(--fb-card-bg, var(--fb-surface));
        border-radius: var(--fb-card-radius, 14px);
        box-shadow: var(--fb-card-shadow, none);
    }
    .fb-card.padded {
        padding: var(--fb-card-padding, 10px 12px);
    }
    .fb-card-header {
        padding: var(--fb-card-header-padding, 10px 12px);
        font-weight: 700;
        border-bottom: 1px solid var(--fb-grid);
        display: flex;
        align-items: center;
        gap: 8px;
    }
`;
