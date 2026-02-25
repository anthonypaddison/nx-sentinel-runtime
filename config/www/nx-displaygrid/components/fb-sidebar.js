/* nx-displaygrid - sidebar component
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();
import { sharedViewStyles } from '../views/shared.styles.js';

export class FbSidebar extends LitElement {
    static properties = {
        active: { type: String },
        counts: { type: Object }, // { schedule, chores, shopping }
        isAdmin: { type: Boolean },
        collapsed: { type: Boolean },
        extraScreens: { type: Array },
        familyMode: { type: Boolean },
        showAdd: { type: Boolean },
        _visiblePrimaryCount: { state: true },
        _overflowMenuOpen: { state: true },
    };

    static styles = [
        sharedViewStyles,
        css`
        :host {
            display: block;
            background: var(--fb-surface);
            height: 100%;
            --fb-btn-bg: transparent;
            --fb-btn-border-width: 0;
            --fb-btn-padding: 12px 14px;
            --fb-btn-radius: 0;
            --fb-btn-min-height: var(--fb-touch);
        }

        .rail {
            display: flex;
            flex-direction: column;
            gap: 16px;
            height: 100%;
            padding-top: 0;
            position: relative;
        }

        .nav {
            display: flex;
            flex-direction: column;
            gap: 0;
            width: 100%;
            flex: 1;
            min-height: 0;
            overflow: hidden;
            padding-top: max(
                0px,
                calc(var(--fb-topbar-height, 0px) + (var(--fb-gutter) * 2) + 24px - 64px)
            );
        }

        .navbtn {
            width: 100%;
            display: grid;
            grid-template-columns: 28px 1fr auto;
            align-items: center;
            gap: 10px;
            color: var(--fb-text);
            text-align: left;
            position: relative;
            transition: box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease;
        }

        .navbtn:hover {
            --fb-btn-bg: color-mix(in srgb, var(--fb-bg) 60%, transparent);
        }

        .navbtn.active {
            --fb-btn-bg: var(--fb-accent-teal);
            --fb-btn-color: #ffffff;
            font-weight: 700;
        }

        .navbtn.active .navicon {
            color: #ffffff;
        }
        .navbtn.active .navmeta {
            color: #ffffff;
            background: color-mix(in srgb, #ffffff 20%, transparent);
        }
        .navicon {
            width: 28px;
            height: 28px;
            display: grid;
            place-items: center;
            color: var(--fb-text);
        }

        .navlabel {
            font-size: 16px;
            line-height: 1.2;
        }

        .navmeta {
            font-size: 14px;
            color: var(--fb-muted);
            background: color-mix(in srgb, var(--fb-bg) 50%, transparent);
            border: 0;
            border-radius: 999px;
            padding: 2px 8px;
            min-width: 28px;
            text-align: center;
        }

        .brand {
            font-weight: 800;
            font-size: 20px;
            height: 64px;
            padding: 0 14px;
            border-radius: 0;
            background: var(--fb-surface);
            border: 0;
            width: 100%;
            box-sizing: border-box;
            display: flex;
            align-items: center;
        }

        .bottomDock {
            display: grid;
            gap: 0;
            width: 100%;
            margin-top: auto;
            padding-bottom: 8px;
        }

        .menuWrap {
            position: relative;
        }

        .overflowMenu {
            position: absolute;
            right: 6px;
            bottom: calc(100% + 8px);
            min-width: 200px;
            max-width: 260px;
            max-height: min(60vh, 420px);
            overflow: auto;
            background: var(--fb-surface);
            border: 1px solid var(--fb-border);
            border-radius: 12px;
            box-shadow: var(--fb-shadow);
            padding: 6px;
            z-index: 20;
            display: grid;
            gap: 4px;
        }

        .overflowItem {
            width: 100%;
            display: grid;
            grid-template-columns: 20px 1fr auto;
            align-items: center;
            gap: 8px;
            text-align: left;
            color: var(--fb-text);
            --fb-btn-color: var(--fb-text);
            --fb-btn-bg: transparent;
            --fb-btn-border-width: 0;
            --fb-btn-radius: 8px;
            --fb-btn-padding: 8px 10px;
            --fb-btn-min-height: 38px;
        }

        .overflowItem.active {
            --fb-btn-bg: color-mix(in srgb, var(--fb-accent-teal) 18%, var(--fb-surface));
            color: var(--fb-text);
            font-weight: 700;
        }

        .overflowIcon {
            display: grid;
            place-items: center;
            color: var(--fb-muted);
        }

        .overflowIcon ha-icon {
            color: inherit;
        }

        .overflowItem.active .overflowIcon {
            color: var(--fb-accent-teal);
        }

        .overflowLabel {
            min-width: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 14px;
            line-height: 1.2;
        }

        .overflowMeta {
            font-size: 12px;
            color: var(--fb-muted);
            background: color-mix(in srgb, var(--fb-bg) 50%, transparent);
            border-radius: 999px;
            padding: 2px 7px;
            min-width: 22px;
            text-align: center;
        }

        .rail.collapsed .navbtn {
            grid-template-columns: 1fr;
            padding: 12px 0;
            justify-items: center;
        }

        .rail.collapsed .overflowMenu {
            left: calc(100% + 8px);
            right: auto;
        }

        .rail.collapsed .navlabel,
        .rail.collapsed .navmeta {
            display: none;
        }

        .rail.collapsed .brand {
            visibility: hidden;
        }
    `,
    ];

    constructor() {
        super();
        this._visiblePrimaryCount = null;
        this._overflowMenuOpen = false;
        this._overflowMeasureQueued = false;
        this._onDocumentPointerDown = (ev) => this._handleDocumentPointerDown(ev);
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('pointerdown', this._onDocumentPointerDown, true);
    }

    disconnectedCallback() {
        document.removeEventListener('pointerdown', this._onDocumentPointerDown, true);
        this._overflowResizeObserver?.disconnect?.();
        this._overflowResizeObserver = null;
        super.disconnectedCallback();
    }

    firstUpdated() {
        if (typeof ResizeObserver !== 'undefined') {
            this._overflowResizeObserver = new ResizeObserver(() => this._scheduleOverflowMeasure());
            this._overflowResizeObserver.observe(this);
            const nav = this.renderRoot?.querySelector?.('.nav');
            if (nav) this._overflowResizeObserver.observe(nav);
        }
        this._scheduleOverflowMeasure();
    }

    updated() {
        this._scheduleOverflowMeasure();
    }

    _primaryItems() {
        const extraScreens = Array.isArray(this.extraScreens) ? this.extraScreens : [];
        if (this.familyMode) {
            const base = [
                { key: 'schedule', label: 'Calendar', icon: 'mdi:calendar-multiselect' },
                { key: 'chores', label: 'Chores', icon: 'mdi:check-circle-outline' },
                { key: 'food', label: 'Food', icon: 'mdi:silverware-fork-knife' },
                { key: 'family', label: 'Family Dashboard', icon: 'mdi:home-heart' },
                { key: 'ambient', label: 'Ambient', icon: 'mdi:tablet-dashboard' },
            ];
            const seen = new Set(base.map((entry) => entry.key));
            const adminExtras = extraScreens.filter((entry) => {
                const key = entry?.key;
                if (!key || seen.has(key)) return false;
                return key === 'admin' || key === 'audit';
            });
            return [
                ...base,
                ...adminExtras.map((s) => ({
                    key: s?.key,
                    label: s?.label || s?.key || 'View',
                    icon: s?.icon || 'mdi:view-grid-outline',
                })),
            ];
        }
        return [
            { key: 'schedule', label: 'Schedule', icon: 'mdi:calendar-multiselect' },
            { key: 'important', label: 'Important', icon: 'mdi:alert-circle-outline' },
            { key: 'chores', label: 'Chores', icon: 'mdi:check-circle-outline' },
            { key: 'shopping', label: 'Shopping', icon: 'mdi:cart-outline' },
            ...extraScreens.map((s) => ({
                key: s?.key,
                label: s?.label || s?.key || 'View',
                icon: s?.icon || 'mdi:view-grid-outline',
            })),
            { key: 'home', label: 'Home', icon: 'mdi:home-automation' },
        ].filter((item) => item.key);
    }

    _scheduleOverflowMeasure() {
        if (this._overflowMeasureQueued) return;
        this._overflowMeasureQueued = true;
        requestAnimationFrame(() => {
            this._overflowMeasureQueued = false;
            this._measureOverflowLayout();
        });
    }

    _measureOverflowLayout() {
        const nav = this.renderRoot?.querySelector?.('.nav');
        if (!nav) return;
        const totalPrimary = this._primaryItems().length;
        if (!totalPrimary) {
            if (this._visiblePrimaryCount !== 0) this._visiblePrimaryCount = 0;
            if (this._overflowMenuOpen) this._overflowMenuOpen = false;
            return;
        }

        const sampleBtn = this.renderRoot?.querySelector?.('.navbtn');
        const sampleHeight = Number(sampleBtn?.offsetHeight || 0);
        if (!sampleHeight) return;

        const style = getComputedStyle(nav);
        const padTop = Number.parseFloat(style.paddingTop || '0') || 0;
        const padBottom = Number.parseFloat(style.paddingBottom || '0') || 0;
        const available = Math.max(0, nav.clientHeight - padTop - padBottom);
        const nextVisible = Math.max(
            0,
            Math.min(totalPrimary, Math.floor(available / Math.max(sampleHeight, 1)))
        );

        if (this._visiblePrimaryCount !== nextVisible) {
            this._visiblePrimaryCount = nextVisible;
        }
        if (nextVisible >= totalPrimary && this._overflowMenuOpen) {
            this._overflowMenuOpen = false;
        }
    }

    _toggleOverflowMenu() {
        this._overflowMenuOpen = !this._overflowMenuOpen;
    }

    _handleDocumentPointerDown(ev) {
        if (!this._overflowMenuOpen) return;
        const path = typeof ev?.composedPath === 'function' ? ev.composedPath() : [];
        if (Array.isArray(path) && path.includes(this)) return;
        this._overflowMenuOpen = false;
    }

    _click(target) {
        this._overflowMenuOpen = false;
        this.dispatchEvent(
            new CustomEvent('fb-nav', {
                detail: { target },
                bubbles: true,
                composed: true,
            })
        );
    }

    _add() {
        this._overflowMenuOpen = false;
        this.dispatchEvent(
            new CustomEvent('fb-add', {
                bubbles: true,
                composed: true,
            })
        );
    }

    render() {
        const active = this.active || 'schedule';
        const counts = this.counts || {};
        const meta = (k) => (counts?.[k] ? counts[k] : null);
        const isAdmin = Boolean(this.isAdmin);
        const collapsed = true;
        const primaryItems = this._primaryItems();
        const measuredVisible =
            Number.isFinite(this._visiblePrimaryCount) && this._visiblePrimaryCount !== null
                ? this._visiblePrimaryCount
                : primaryItems.length;
        const visibleCount = Math.max(0, Math.min(primaryItems.length, measuredVisible));
        let visiblePrimary = primaryItems.slice(0, visibleCount);
        let visibleKeys = new Set(visiblePrimary.map((entry) => entry.key));
        const activePrimary = primaryItems.find((entry) => entry.key === active) || null;
        if (activePrimary && !visibleKeys.has(activePrimary.key) && visiblePrimary.length) {
            visiblePrimary = [...visiblePrimary.slice(0, -1), activePrimary];
            visibleKeys = new Set(visiblePrimary.map((entry) => entry.key));
        }
        const hiddenPrimary = primaryItems.filter((entry) => !visibleKeys.has(entry.key));
        const hasOverflow = hiddenPrimary.length > 0;
        const overflowButtonActive = hiddenPrimary.some((entry) => entry.key === active);

        const item = (entry, { extraClass = '' } = {}) => html`
            <button
                class="btn navbtn ${extraClass} ${active === entry.key ? 'active' : ''}"
                @click=${() => this._click(entry.key)}
                title=${entry.label || entry.key}
                aria-label=${entry.label || entry.key}
            >
                <span class="navicon">
                    <ha-icon icon=${entry.icon}></ha-icon>
                </span>
                <span class="navlabel">${entry.label}</span>
                ${meta(entry.key) ? html`<span class="navmeta">${meta(entry.key)}</span>` : html``}
            </button>
        `;

        return html`
            <div class="rail ${collapsed ? 'collapsed' : ''}">
                <div class="brand">${collapsed ? 'FB' : 'nx-displaygrid'}</div>
                <div class="nav">
                    ${visiblePrimary.map((entry) => item(entry))}
                </div>
                <div class="bottomDock">
                    ${this.showAdd !== false
                        ? html`<button
                              class="btn navbtn"
                              @click=${this._add}
                              title="Add"
                              aria-label="Add"
                          >
                              <span class="navicon">
                                  <ha-icon icon="mdi:plus"></ha-icon>
                              </span>
                              <span class="navlabel">Add</span>
                          </button>`
                        : html``}
                    ${hasOverflow
                        ? html`<div class="menuWrap">
                              <button
                                  class="btn navbtn ${overflowButtonActive ? 'active' : ''}"
                                  @click=${this._toggleOverflowMenu}
                                  title="More menu items"
                                  aria-label="More menu items"
                                  aria-expanded=${this._overflowMenuOpen ? 'true' : 'false'}
                              >
                                  <span class="navicon">
                                      <ha-icon icon="mdi:menu"></ha-icon>
                                  </span>
                                  <span class="navlabel">More</span>
                              </button>
                              ${this._overflowMenuOpen
                                  ? html`<div class="overflowMenu">
                                        ${hiddenPrimary.map(
                                            (entry) => html`<button
                                                class="btn overflowItem ${active === entry.key
                                                    ? 'active'
                                                    : ''}"
                                                @click=${() => this._click(entry.key)}
                                            >
                                                <span class="overflowIcon">
                                                    <ha-icon icon=${entry.icon}></ha-icon>
                                                </span>
                                                <span class="overflowLabel">${entry.label}</span>
                                                ${meta(entry.key)
                                                    ? html`<span class="overflowMeta"
                                                          >${meta(entry.key)}</span
                                                      >`
                                                    : html``}
                                            </button>`
                                        )}
                                    </div>`
                                  : html``}
                          </div>`
                        : html``}
                    ${isAdmin
                        ? item(
                              { key: 'settings', label: 'Settings', icon: 'mdi:cog-outline' },
                              { extraClass: 'settings' }
                          )
                        : html``}
                </div>
            </div>
        `;
    }
}

customElements.define('fb-sidebar', FbSidebar);
