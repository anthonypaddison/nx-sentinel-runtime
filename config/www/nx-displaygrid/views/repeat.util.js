/* nx-displaygrid - Lit repeat fallback helper
 * SPDX-License-Identifier: MIT
 */

export function repeatOrMap(repeatDirective, items, keyFn, templateFn) {
    const renderWithRepeat =
        typeof repeatDirective === 'function'
            ? repeatDirective
            : (list, _keyFn, renderFn) => (list || []).map((item, idx) => renderFn(item, idx));
    return renderWithRepeat(items || [], keyFn, templateFn);
}
