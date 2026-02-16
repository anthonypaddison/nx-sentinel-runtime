/* nx-displaygrid - entrypoint (no bundler)
 * SPDX-License-Identifier: MIT
 *
 * IMPORTANT:
 * Home Assistant loads custom card resources very early. If we import Lit-based
 * modules immediately, they can run before Lovelace is ready.
 *
 * Solution:
 * Wait for Lovelace's custom element to be defined, then import the card modules.
 */

(async () => {
    // Wait for Lovelace to be ready (this is the key fix).
    await customElements.whenDefined('ha-panel-lovelace');

    // Now it's safe to import modules that depend on HA's Lit runtime.
    await import('./nx-displaygrid-card.js');
})();
