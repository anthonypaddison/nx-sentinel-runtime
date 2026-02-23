/* nx-displaygrid - admin dashboard view (V2)
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { sharedViewStyles, sharedCardStyles } from './shared.styles.js';

function stateLabel(error, stale) {
    if (error) return 'Error';
    if (stale) return 'Stale';
    return 'OK';
}

export class FbAdminView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
    };

    static styles = [
        sharedViewStyles,
        sharedCardStyles,
        css`
        .canvas {
            height: 100%;
            overflow: auto;
            padding: var(--fb-gutter);
            display: grid;
            gap: 12px;
            align-content: start;
        }
        .hero {
            border: 1px solid var(--fb-border);
            border-radius: 14px;
            background: color-mix(in srgb, var(--info) 8%, var(--fb-surface));
            padding: 14px;
        }
        .heroTitle {
            font-size: 22px;
            font-weight: 800;
        }
        .heroSub {
            color: var(--fb-muted);
            font-size: 14px;
            margin-top: 4px;
        }
        .grid {
            display: grid;
            gap: 12px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .panelBody {
            padding: 12px;
            display: grid;
            gap: 10px;
        }
        .row {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 8px;
            align-items: center;
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            background: var(--fb-surface-2);
            padding: 8px 10px;
        }
        .label {
            font-weight: 700;
        }
        .value {
            color: var(--fb-muted);
            font-size: 13px;
        }
        .badge {
            border-radius: 999px;
            border: 1px solid var(--fb-border);
            padding: 4px 8px;
            font-size: 12px;
            font-weight: 700;
            background: var(--fb-surface);
        }
        .badge.ok {
            color: var(--success);
        }
        .badge.warn {
            color: var(--warning);
        }
        .badge.err {
            color: var(--urgent);
        }
        .actions {
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }
        .btnTile {
            min-height: 64px;
            text-align: left;
            border-radius: 12px;
        }
        @media (max-width: 1000px) {
            .grid {
                grid-template-columns: 1fr;
            }
        }
        `,
    ];

    render() {
        const card = this.card;
        if (!card) return html``;
        const isAdmin = card._hasAdminAccess?.();
        if (!isAdmin) {
            return html`<div class="canvas"><div class="fb-card padded">Admin access required.</div></div>`;
        }
        const rows = [
            {
                label: 'Calendars',
                state: stateLabel(card._calendarError, card._calendarStale),
                last: card._calendarLastSuccessTs,
            },
            {
                label: 'Todos',
                state: stateLabel(card._todoError, card._todoStale),
                last: card._todoLastSuccessTs,
            },
            {
                label: 'Shopping',
                state: stateLabel(card._shoppingError, card._shoppingStale),
                last: card._shoppingLastSuccessTs,
            },
            {
                label: 'Refresh pipeline',
                state: card._refreshInFlight ? 'Running' : card._refreshPending ? 'Pending' : 'Idle',
                last: card._lastRefreshTs,
            },
        ];
        const backup = card._v2BackupStatus?.() || {};

        const badgeClass = (state) => {
            const s = String(state || '').toLowerCase();
            if (s === 'ok' || s === 'idle') return 'badge ok';
            if (s.includes('error')) return 'badge err';
            return 'badge warn';
        };

        return html`
            <div class="canvas">
                <div class="hero">
                    <div class="heroTitle">Admin Dashboard</div>
                    <div class="heroSub">
                        Operations and control surface: system health, refresh status, cache tools,
                        and recovery shortcuts.
                    </div>
                </div>

                <div class="grid">
                    <div class="fb-card">
                        <div class="fb-card-header">System Health</div>
                        <div class="panelBody">
                            ${rows.map(
                                (row) => html`
                                    <div class="row">
                                        <div>
                                            <div class="label">${row.label}</div>
                                            <div class="value">
                                                Last success/refresh:
                                                ${row.last
                                                    ? new Date(row.last).toLocaleString()
                                                    : 'Never'}
                                            </div>
                                        </div>
                                        <div class=${badgeClass(row.state)}>${row.state}</div>
                                    </div>
                                `
                            )}
                            <div class="row">
                                <div>
                                    <div class="label">IndexedDB cache</div>
                                    <div class="value">
                                        ${card._idbFailed
                                            ? card._idbError || 'Unavailable'
                                            : 'Available'}
                                    </div>
                                </div>
                                <div class=${card._idbFailed ? 'badge err' : 'badge ok'}>
                                    ${card._idbFailed ? 'Error' : 'OK'}
                                </div>
                            </div>
                            <div class="row">
                                <div>
                                    <div class="label">Backups</div>
                                    <div class="value">
                                        ${backup.ts
                                            ? `Last successful backup: ${new Date(backup.ts).toLocaleString()}`
                                            : backup.detail || 'Not configured'}
                                    </div>
                                </div>
                                <div class=${badgeClass(backup.status || 'Unknown')}>
                                    ${backup.status || 'Unknown'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="fb-card">
                        <div class="fb-card-header">Operations & Recovery</div>
                        <div class="panelBody">
                            <div class="actions">
                                <button
                                    class="btn btnTile"
                                    @click=${() => card._v2SnapshotNow?.()}
                                >
                                    <div class="label">Snapshot now</div>
                                    <div class="value">
                                        ${backup.configured
                                            ? 'Run configured backup/snapshot service'
                                            : 'Auto-detect backup service or configure one in Settings'}
                                    </div>
                                </button>
                                <button
                                    class="btn btnTile"
                                    @click=${() => card._onSyncCalendars?.()}
                                >
                                    <div class="label">Sync now</div>
                                    <div class="value">Force refresh calendars/todos/shopping</div>
                                </button>
                                <button
                                    class="btn btnTile"
                                    @click=${() => card._clearDataCacheAndRefresh?.()}
                                >
                                    <div class="label">Clear data cache</div>
                                    <div class="value">Remove local cached data and refresh</div>
                                </button>
                                <button
                                    class="btn btnTile"
                                    @click=${() => card._clearConfigCacheAndReload?.()}
                                >
                                    <div class="label">Clear config cache</div>
                                    <div class="value">Reload cached shared config</div>
                                </button>
                                <button
                                    class="btn btnTile"
                                    @click=${() => card._clearPrefsCache?.()}
                                >
                                    <div class="label">Clear prefs cache</div>
                                    <div class="value">Reset cached local prefs (keeps config)</div>
                                </button>
                                <button
                                    class="btn btnTile"
                                    @click=${() => card._onNav?.({ detail: { target: 'settings' } })}
                                >
                                    <div class="label">Open Settings</div>
                                    <div class="value">Admin configuration and advanced tools</div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-admin-view', FbAdminView);
