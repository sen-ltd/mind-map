/**
 * layout.js - Auto-layout algorithm for mind map tree
 *
 * Produces a left-to-right tree layout:
 *   - Root at x=0, y=auto-centered
 *   - Each level: x = level * horizontalSpacing
 *   - Leaf nodes stacked vertically with verticalSpacing
 *   - Parent y = vertical center of its children
 */

const DEFAULT_OPTIONS = {
  horizontalSpacing: 200,
  verticalSpacing: 50,
  nodeWidth: 140,
  nodeHeight: 36,
};

/**
 * Assign x/y positions to every node in the tree.
 * Returns a new tree with { x, y } added to each node.
 * Collapsed subtrees collapse to zero height.
 *
 * @param {object} root
 * @param {object} [options]
 * @returns {object}
 */
export function layoutTree(root, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let leafY = 0;

  function computeLayout(node, level) {
    const x = level * opts.horizontalSpacing;
    const visibleChildren =
      !node.collapsed && node.children.length > 0 ? node.children : [];

    if (visibleChildren.length === 0) {
      const y = leafY;
      leafY += opts.nodeHeight + opts.verticalSpacing;
      return { ...node, x, y };
    }

    const laidOutChildren = visibleChildren.map((child) =>
      computeLayout(child, level + 1)
    );

    const firstY = laidOutChildren[0].y;
    const lastY = laidOutChildren[laidOutChildren.length - 1].y;
    const y = (firstY + lastY) / 2;

    // Re-attach all children (including hidden ones under collapsed)
    const allChildren = node.children.map((child) => {
      const found = laidOutChildren.find((c) => c.id === child.id);
      return found || child;
    });

    return { ...node, x, y, children: allChildren };
  }

  return computeLayout(root, 0);
}

/**
 * Get bounding box of all laid-out nodes.
 * @param {object} root - tree with x/y positions
 * @returns {{ minX: number, minY: number, maxX: number, maxY: number }}
 */
export function getBoundingBox(root) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  function visit(node) {
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    for (const child of node.children) {
      visit(child);
    }
  }

  visit(root);
  return { minX, minY, maxX, maxY };
}

/**
 * Get SVG path d attribute for a bezier curve connecting parent to child.
 * @param {{ x: number, y: number }} parent
 * @param {{ x: number, y: number }} child
 * @param {{ nodeWidth?: number, nodeHeight?: number }} [options]
 * @returns {string}
 */
export function getConnectionPath(parent, child, options = {}) {
  const nodeWidth = options.nodeWidth ?? DEFAULT_OPTIONS.nodeWidth;
  const nodeHeight = options.nodeHeight ?? DEFAULT_OPTIONS.nodeHeight;

  const x1 = parent.x + nodeWidth;
  const y1 = parent.y + nodeHeight / 2;
  const x2 = child.x;
  const y2 = child.y + nodeHeight / 2;
  const mx = (x1 + x2) / 2;

  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}
