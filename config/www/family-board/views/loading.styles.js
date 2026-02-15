/* Family Board - shared loading styles
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { css } = getHaLit();

export const loadingStyles = css`
    .loadingState {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--fb-muted);
        font-size: 14px;
        padding: 6px 2px;
    }
    .spinner {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid color-mix(in srgb, var(--fb-muted) 30%, transparent);
        border-top-color: var(--fb-muted);
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;
