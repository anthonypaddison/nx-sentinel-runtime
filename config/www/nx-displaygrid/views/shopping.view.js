/* nx-displaygrid - shopping view
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
import '../components/fb-loading.js';
const { LitElement, html, css, repeat } = getHaLit();

import { sharedViewStyles, sharedCardStyles } from './shared.styles.js';
import { renderActionButtons } from './action-buttons.js';
export class FbShoppingView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
    };

    _addCommonItem(item) {
        if (!item) return;
        this.card?._addShoppingItem(item);
    }

    static styles = [
        sharedViewStyles,
        sharedCardStyles,
        css`
        .layout {
            display: grid;
            gap: 14px;
            grid-template-columns: minmax(0, 1.5fr) minmax(0, 0.5fr);
            height: 100%;
            min-height: 0;
            align-items: stretch;
        }
        .card {
            overflow: hidden;
            display: flex;
            flex-direction: column;
            min-height: 0;
            height: 100%;
        }
        .h {
            --fb-card-header-padding: 10px 12px;
            justify-content: space-between;
        }
        .headerMeta {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .headerBtn {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface-2);
            border-radius: 10px;
            padding: 4px 10px;
            font-size: 12px;
            cursor: pointer;
            color: var(--fb-text);
            min-height: 0;
        }
        .headerIconBtn {
            border: none;
            background: transparent;
            border-radius: 10px;
            width: 32px;
            height: 32px;
            display: grid;
            place-items: center;
            cursor: pointer;
            padding: 0;
            color: var(--fb-muted);
        }
        .headerIconBtn ha-icon {
            width: 22px;
            height: 22px;
            font-size: 22px;
        }
        .headerIconBtn.addAll {
            color: var(--success);
        }
        .headerIconBtn.clearAll {
            color: var(--urgent);
        }
        .headerBtn:disabled {
            opacity: 0.5;
            cursor: default;
        }
        .h.commonHeader {
            cursor: pointer;
        }
        .inputRow {
            display: flex;
            gap: 8px;
            padding: 10px 12px;
            border-bottom: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            align-items: center;
        }
        .inputRow input {
            flex: 1 1 auto;
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            padding: 6px 10px;
            font-size: 14px;
            background: var(--fb-surface);
            color: var(--fb-text);
        }
        .inputAddBtn {
            border: none;
            background: transparent;
            border-radius: 10px;
            padding: 0;
            cursor: pointer;
            width: 32px;
            height: 32px;
            color: var(--success);
            display: grid;
            place-items: center;
        }
        .inputAddBtn ha-icon {
            width: 22px;
            height: 22px;
            font-size: 22px;
        }
        .items {
            padding: 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            overflow: hidden;
            min-height: 0;
            flex: 1 1 auto;
        }
        .item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4px;
            border: 1px solid var(--fb-grid);
            border-radius: 12px;
            padding: 1px 6px;
            transition: opacity 0.3s ease;
        }
        .item.pendingRemove {
            opacity: 0.6;
        }
        .item.removing {
            opacity: 0;
        }
        .itemTitle {
            font-weight: 700;
            font-size: 14px;
        }
        .itemTitle.completed {
            text-decoration: line-through;
            color: var(--fb-muted);
        }
        .actions {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding-left: 8px;
        }
        .itemMain {
            display: flex;
            align-items: center;
            gap: 4px;
            min-width: 0;
            flex: 1;
        }
        .itemLabel {
            display: flex;
            align-items: center;
            gap: 6px;
            min-width: 0;
            flex: 1;
        }
        .itemName {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .qty {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border: 1px solid var(--fb-grid);
            border-radius: 999px;
            padding: 0 4px;
            background: var(--fb-surface-2);
            flex: 0 0 auto;
        }
        .qtyBtn {
            border: 0;
            background: transparent;
            cursor: pointer;
            width: 28px;
            height: 28px;
            border-radius: 999px;
            display: grid;
            place-items: center;
            font-weight: 700;
            color: var(--fb-text);
            font-size: 18px;
            line-height: 1;
        }
        .qtyValue {
            min-width: 18px;
            text-align: center;
            font-variant-numeric: tabular-nums;
        }
        .empty {
            padding: 12px;
            color: var(--fb-muted);
            font-size: 14px;
        }
        .iconBtn {
            border: 0;
            background: transparent;
            border-radius: 10px;
            padding: 4px;
            width: var(--fb-touch);
            height: var(--fb-touch);
            display: grid;
            place-items: center;
            cursor: pointer;
            color: var(--fb-muted);
        }
        .iconBtn ha-icon,
        .starBtn ha-icon {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            font-size: 20px;
        }
        .itemStar ha-icon {
            width: 28px;
            height: 28px;
            font-size: 28px;
        }
        .starBtn ha-svg-icon,
        .starBtn ha-svg-icon svg {
            width: 24px;
            height: 24px;
            display: block;
            margin: 0 auto;
        }
        .iconBtn.active {
            color: var(--fb-accent);
        }
        .completeBtn {
            color: var(--success);
        }
        .deleteBtn {
            color: var(--urgent);
        }
        .editBtn {
            color: var(--info);
        }
        .commonList {
            padding: 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            overflow: hidden;
            min-height: 0;
            flex: 1 1 auto;
        }
        .commonRow {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .commonItem {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface-2);
            border-radius: 10px;
            padding: 4px 10px;
            cursor: pointer;
            text-align: left;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: var(--fb-text);
            flex: 1;
            min-width: 0;
        }
        .commonText {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .commonPlus {
            border: none;
            padding: 0;
            font-size: 24px;
            line-height: 1;
            background: transparent;
            color: var(--success);
            font-weight: 700;
            flex: 0 0 auto;
        }
        .commonActions {
            display: inline-flex;
            gap: 4px;
            align-items: center;
        }
        .starBtn {
            border: none;
            background: transparent;
            border-radius: 10px;
            width: 32px;
            height: 32px;
            display: grid;
            place-items: center;
            cursor: pointer;
            color: var(--fb-muted);
            flex: 0 0 auto;
            padding: 0;
            line-height: 1;
            box-sizing: border-box;
            font-size: 0;
        }
        .starBtn.active {
            color: var(--warning);
            border-color: transparent;
        }
        @media (max-width: 900px) {
            .layout {
                grid-template-columns: 1fr;
            }
        }
        `,
    ];

    render() {
        const card = this.card;
        if (!card) return html``;

        const repeatItems =
            repeat ||
            ((items, keyFn, templateFn) =>
                (items || []).map((item, idx) => templateFn(item, idx)));

        const itemKey = (it, idx) =>
            it?.uid ||
            it?.id ||
            it?._fbKey ||
            it?.name ||
            it?.summary ||
            it?.item ||
            String(idx);

        const items = card._shoppingItems || [];
        const isLoading = !card._shoppingLoaded;
        const name = card._config?.shopping?.name || 'Shopping list';
        const shoppingEntity = card._config?.shopping?.entity || '';
        const hasTodoService = Boolean(card._supportsService?.('todo', 'get_items'));
        const favourites = Array.isArray(card._shoppingFavourites)
            ? card._shoppingFavourites
            : [];
        const common = Array.isArray(card._shoppingCommon) ? card._shoppingCommon : [];
        const favList = favourites.map((item) => String(item));
        const favKeys = new Set(
            [...favourites, ...common].map((item) => String(item).toLowerCase())
        );
        const commonList = [];
        const seen = new Set();
        for (const item of [...favList, ...common]) {
            const key = String(item).toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            commonList.push(String(item));
        }

        if (!shoppingEntity) {
            return html`<div class="wrap hidden">
                <div class="empty">No shopping list configured yet.</div>
            </div>`;
        }

        if (!hasTodoService) {
            return html`<div class="wrap hidden">
                <div class="empty">
                    Todo services are unavailable. Check that the Todo integration is set up.
                </div>
            </div>`;
        }

        if (shoppingEntity && !card._hass?.states?.[shoppingEntity]) {
            return html`<div class="wrap hidden">
                <div class="empty">Shopping list entity not found: ${shoppingEntity}</div>
            </div>`;
        }

        return html`
            <div class="wrap hidden">
                <div class="layout">
                    <div class="card fb-card">
                        <div class="h fb-card-header">
                            <span>${name}</span>
                            <span class="headerMeta">
                                <span class="muted">
                                    ${card._shoppingQuantityCount
                                        ? card._shoppingQuantityCount(items)
                                        : items.length}
                                </span>
                                ${items.length
                                    ? html`<button
                                          class="btn icon ghost headerIconBtn clearAll"
                                          title="Clear shopping list"
                                          @click=${() => {
                                              const ok = window.confirm(
                                                  'Are you sure you want to clear the current shopping list?'
                                              );
                                              if (ok) card._clearShoppingList?.();
                                          }}
                                      >
                                          <ha-icon icon="mdi:close-box-multiple"></ha-icon>
                                      </button>`
                                    : html``}
                            </span>
                        </div>
                        <div class="inputRow">
                            <input
                                id="shopInput"
                                placeholder="Add item"
                                @keydown=${(e) => {
                                    if (e.key !== 'Enter') return;
                                    const text = e.target.value?.trim();
                                    if (!text) return;
                                    card._addShoppingItem(text);
                                    e.target.value = '';
                                }}
                            />
                            <button
                                class="btn icon ghost inputAddBtn"
                                @click=${() => {
                                    const input = this.renderRoot.querySelector('#shopInput');
                                    const text = input?.value?.trim();
                                    if (!text) return;
                                    card._addShoppingItem(text);
                                    input.value = '';
                                }}
                            >
                                <ha-icon icon="mdi:plus"></ha-icon>
                            </button>
                        </div>
                        <div class="items">
                            ${isLoading
                                ? html`<fb-loading label="Loading shopping list..."></fb-loading>`
                                : items.length
                                ? repeatItems(
                                      items,
                                      itemKey,
                                      (it) => {
                                      const rawName = card._shoppingItemText
                                          ? card._shoppingItemText(it) || '(Item)'
                                          : it.name ?? it.summary ?? it.item ?? '(Item)';
                                      const parsed = card._parseShoppingText
                                          ? card._parseShoppingText(rawName)
                                          : { base: rawName, qty: 1 };
                                      const itemName = parsed.base || rawName;
                                      const qty = parsed.qty || 1;
                                      const fav = favKeys.has(
                                          String(itemName).toLowerCase()
                                      );
                                      const isDone = ['completed', 'done'].includes(
                                          String(it.status || '').toLowerCase()
                                      );
                                      const pendingRemove = Boolean(it._fbPendingRemove);
                                      const removing = Boolean(it._fbRemoving);
                                      return html`
                                          <div
                                              class="item ${pendingRemove ? 'pendingRemove' : ''} ${removing ? 'removing' : ''}"
                                          >
                                              <div class="itemMain">
                                                  <div class="itemLabel">
                                                      <div
                                                          class="itemTitle ${isDone ? 'completed' : ''} itemName"
                                                      >
                                                          ${itemName}
                                                      </div>
                                                  </div>
                                                  <div class="qty">
                                                      <button
                                                          class="btn ghost qtyBtn"
                                                          title="Decrease"
                                                          @click=${() =>
                                                              card._adjustShoppingQuantity(it, -1)}
                                                      >
                                                          -
                                                      </button>
                                                      <span class="qtyValue">${qty}</span>
                                                      <button
                                                          class="btn ghost qtyBtn"
                                                          title="Increase"
                                                          @click=${() =>
                                                              card._adjustShoppingQuantity(it, 1)}
                                                      >
                                                          +
                                                      </button>
                                                  </div>
                                              </div>
                                              ${renderActionButtons(
                                                  [
                                                      {
                                                          className: `btn icon ghost iconBtn itemStar ${fav ? 'active' : ''}`,
                                                          title: fav ? 'Unfavourite' : 'Favourite',
                                                          icon: fav
                                                              ? 'mdi:star'
                                                              : 'mdi:star-outline',
                                                          onClick: (e) => {
                                                              e.stopPropagation();
                                                              card._toggleShoppingFavourite(
                                                                  itemName
                                                              );
                                                          },
                                                      },
                                                      {
                                                          className: 'btn icon ghost iconBtn deleteBtn',
                                                          title: 'Delete',
                                                          icon: 'mdi:close-thick',
                                                          onClick: () =>
                                                              card._deleteShoppingItem(it),
                                                      },
                                                      {
                                                          className: 'btn icon ghost iconBtn editBtn',
                                                          title: 'Edit',
                                                          icon: 'mdi:pencil',
                                                          onClick: () =>
                                                              card._editShoppingItem(it),
                                                      },
                                                      {
                                                          className: 'btn icon ghost iconBtn completeBtn',
                                                          title: isDone
                                                              ? 'Mark as incomplete'
                                                              : 'Mark as complete',
                                                          icon: 'mdi:check-bold',
                                                          onClick: () =>
                                                              card._toggleShoppingItem(it, !isDone),
                                                      },
                                                  ],
                                                  { wrapperClass: 'actions' }
                                              )}
                                          </div>
                                      `;
                                  }
                                  )
                                : html`<div class="muted">
                                      No items.
                                      <button
                                          class="btn sm ghost"
                                          style="margin-left:8px"
                                          @click=${() => card._openHelp()}
                                      >
                                          ⓘ
                                      </button>
                                  </div>`}
                        </div>
                    </div>

                    <div class="card fb-card">
                        <div class="h commonHeader fb-card-header">
                            <span>Favourites</span>
                            <span class="headerMeta">
                                <span class="muted">${commonList.length}</span>
                                ${commonList.length
                                    ? html`<button
                                              class="btn icon ghost headerIconBtn addAll"
                                              title="Add all favourites"
                                              @click=${() => {
                                                  const ok = window.confirm(
                                                      'Are you sure you want to add all favourites to the current shopping list?'
                                                  );
                                                  if (ok) card._addShoppingFavourites?.();
                                              }}
                                          >
                                              <ha-icon icon="mdi:plus-box-multiple"></ha-icon>
                                          </button>
                                          <button
                                              class="btn icon ghost headerIconBtn clearAll"
                                              title="Clear all favourites"
                                              @click=${() => {
                                                  const ok = window.confirm(
                                                      'Are you sure you want to clear all favourites?'
                                                  );
                                                  if (ok) card._clearShoppingFavourites?.();
                                              }}
                                          >
                                              <ha-icon icon="mdi:close-box-multiple"></ha-icon>
                                          </button>`
                                    : html``}
                            </span>
                        </div>
                        <div class="commonList">
                            ${commonList.length
                                ? commonList.map((item) => {
                                      const key = String(item).toLowerCase();
                                      const fav = favKeys.has(key);
                                          return html`
                                          <div class="commonRow">
                                              <div
                                                  class="btn commonItem"
                                                  role="button"
                                                  tabindex="0"
                                                  @click=${() => this._addCommonItem(item)}
                                                  @keydown=${(e) => {
                                                      if (e.key === 'Enter' || e.key === ' ') {
                                                          e.preventDefault();
                                                          this._addCommonItem(item);
                                                      }
                                                  }}
                                              >
                                                  <span class="commonText">${item}</span>
                                                  <span class="commonPlus" aria-hidden="true">+</span>
                                                  <button
                                                      class="btn icon ghost starBtn active"
                                                      title="Unfavourite"
                                                      @click=${(e) => {
                                                          e.stopPropagation();
                                                          card._toggleShoppingFavourite(item);
                                                      }}
                                                  >
                                                      <ha-icon icon="mdi:star"></ha-icon>
                                                  </button>
                                              </div>
                                          </div>
                                      `;
                                  })
                                : html`<div class="muted">No common items yet.</div>`}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-shopping-view', FbShoppingView);
