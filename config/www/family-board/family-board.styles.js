/* Family Board - styles and tokens
 * SPDX-License-Identifier: MIT
 */

import { getHaLit } from './ha-lit.js';

export function fbStyles() {
    const { css } = getHaLit();

    return css`
        :host {
            font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
            font-size: 16px;

            --pastel-mint: #b9fbc0;
            --pastel-aqua: #98f5e1;
            --pastel-cyan: #8eecf5;
            --pastel-sky: #90dbf4;
            --pastel-bluegrey: #a3c4f3;
            --pastel-lilac: #e39b5f;
            --pastel-rose: #ffcfd2;
            --pastel-vanilla: #fbf8cc;

            --palette-mint: var(--pastel-mint);
            --palette-aqua: var(--pastel-aqua);
            --palette-cyan: var(--pastel-cyan);
            --palette-sky: var(--pastel-sky);
            --palette-bluegrey: var(--pastel-bluegrey);
            --palette-lilac: var(--pastel-lilac);
            --palette-rose: var(--pastel-rose);
            --palette-vanilla: var(--pastel-vanilla);

            --fb-accent-teal: var(--family);
            --bg: var(--fb-accent-teal);
            --surface: #ffffff;
            --surface-2: #f4fbfa;
            --surface-3: #edf7f6;
            --border: #e6e1db;
            --text: #1f2937;
            --text-2: #6b7280;
            --text-3: #94a3b8;

            --success: #36b37e;
            --family: #00ced1;
            --warning: #f4b400;
            --urgent: #ec407a;
            --info: #42a5f5;
            --highlight: #f1ecff;
            --highlight-soft: #efeaff;
            --highlight-text: #6b5aa6;

            --radius-sm: 8px;
            --radius-md: 12px;
            --radius-lg: 16px;
            --shadow-sm: 0 8px 18px rgba(15, 23, 42, 0.12);
            --shadow-md: 0 14px 28px rgba(15, 23, 42, 0.12);
            --shadow-lg: 0 18px 36px rgba(15, 23, 42, 0.22);
            --overlay: rgba(15, 23, 42, 0.35);
            --text-on-accent: #1f2933;

            --fb-bg: var(--bg);
            --fb-surface: var(--surface);
            --fb-surface-2: var(--surface-2);
            --fb-surface-3: var(--surface-3);
            --fb-text: var(--text);
            --fb-muted: var(--text-2);
            --fb-accent: var(--pastel-lilac);
            --fb-grid: var(--border);
            --fb-today: var(--highlight-soft);
            --fb-weekend: color-mix(in srgb, var(--border) 35%, transparent);
            --fb-pill-text: var(--text);
            --fb-print-text: var(--text);
            --fb-radius: var(--radius-md);
            --fb-shadow: var(--shadow-md);
            --fb-border: var(--border);
            --fb-touch: 56px;
            --fb-gutter: 10px;

            --fb-icon: var(--text);

            --utility-bar-background: var(--pastel-lilac);
            --app-header-background-color: var(--pastel-lilac);

            display: block;
            width: 100%;
            max-width: 100vw;
            height: 100%;
            max-height: 100%;
            min-height: 0;
            overflow: hidden;
            box-sizing: border-box;
        }

        .app {
            height: 100%;
            width: 100%;
            max-width: 100%;
            display: grid;
            grid-template-columns: var(--fb-sidebar-width, 260px) 1fr;
            background: var(--fb-bg);
            color: var(--fb-text);
            min-height: 0;
            overflow: hidden;
        }

        .sidebar {
            background: var(--fb-surface);
            border-right: 0;
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            min-height: 0;
            width: var(--fb-sidebar-width, 260px);
            box-sizing: border-box;
        }

        .brand {
            font-weight: 700;
            font-size: 17px;
            padding: 8px 10px;
            border-radius: 12px;
            background: var(--fb-accent);
        }

        .nav {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 6px;
        }

        .navbtn {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            width: 100%;
            border: 0;
            background: transparent;
            padding: 12px 14px;
            border-radius: 14px;
            cursor: pointer;
            text-align: left;
            color: var(--fb-text);
            font-size: 16px;
        }

        .navbtn:hover {
            background: var(--fb-surface);
        }

        .navbtn.active {
            background: var(--fb-accent);
        }

        .navmeta {
            font-size: 14px;
            color: var(--fb-muted);
        }

        .main {
            display: grid;
            grid-template-rows: auto 1fr;
            min-width: 0;
            min-height: 0;
        }

        .topbar {
            background: var(--fb-bg);
            border-bottom: 0;
            padding: 10px 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            min-height: 0;
        }

        .toprow {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .title {
            font-size: 28px;
            font-weight: 800;
        }

        .subtabs {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .pill {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface-2);
            padding: 7px 12px;
            border-radius: 999px;
            cursor: pointer;
            font-size: 14px;
        }

        .pill.active {
            background: var(--fb-accent);
            border-color: transparent;
        }

        .summaryRow {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .summaryBadge {
            display: flex;
            align-items: center;
            gap: 8px;
            border: 1px solid var(--fb-grid);
            border-radius: 999px;
            padding: 8px 12px;
            background: var(--fb-surface-3);
            font-size: 14px;
            min-height: 40px;
        }

        .dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            display: inline-block;
        }

        .content {
            position: relative;
            min-width: 0;
            min-height: 0;
            overflow: hidden;
            background: var(--fb-bg);
            max-width: 100%;
        }

        .fab {
            position: absolute;
            right: 18px;
            bottom: 18px;
            width: 56px;
            height: 56px;
            border-radius: 999px;
            border: 0;
            cursor: pointer;
            background: var(--fb-accent);
            color: var(--fb-print-text);
            font-size: 26px;
            line-height: 0;
            box-shadow: var(--fb-shadow);
        }

        .fab:active {
            transform: translateY(1px);
        }

        @media (max-width: 900px) {
            .app {
                grid-template-columns: 1fr;
            }
            .sidebar {
                display: none;
            }
            .topbar {
                padding: 10px;
            }
        }
    `;
}
