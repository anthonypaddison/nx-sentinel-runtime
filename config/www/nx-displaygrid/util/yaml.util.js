/* nx-displaygrid - YAML helpers
 * SPDX-License-Identifier: MIT
 */

export function yamlString(value) {
    return `'${String(value ?? '').replace(/'/g, "''")}'`;
}
