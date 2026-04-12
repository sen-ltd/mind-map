/**
 * tree.js - Immutable tree data structure and operations for mind map
 */

let _nextId = 1;

/** Reset ID counter (for tests) */
export function resetIdCounter(val = 1) {
  _nextId = val;
}

/**
 * Create a new node.
 * @param {string} text
 * @param {string|null} parentId
 * @returns {object}
 */
export function createNode(text = 'New Node', parentId = null) {
  return {
    id: String(_nextId++),
    text,
    parentId,
    children: [],
    collapsed: false,
  };
}

/**
 * Deep-clone a node tree.
 * @param {object} node
 * @returns {object}
 */
function clone(node) {
  return {
    ...node,
    children: node.children.map(clone),
  };
}

/**
 * Add a child node to a parent node identified by parentId.
 * Returns a new tree (immutable).
 * @param {object} root
 * @param {string} parentId
 * @param {string} text
 * @returns {object}
 */
export function addChild(root, parentId, text = 'New Node') {
  const newNode = createNode(text, parentId);
  return _mapTree(clone(root), (node) => {
    if (node.id === parentId) {
      return { ...node, children: [...node.children, newNode] };
    }
    return node;
  });
}

/**
 * Add a sibling node after the node identified by nodeId.
 * Returns a new tree (immutable).
 * @param {object} root
 * @param {string} nodeId
 * @param {string} text
 * @returns {object}
 */
export function addSibling(root, nodeId, text = 'New Node') {
  if (root.id === nodeId) {
    // Root has no sibling in a standard mind map; just return unchanged
    return clone(root);
  }
  const newNode = createNode(text, null);
  return _mapTree(clone(root), (node) => {
    const idx = node.children.findIndex((c) => c.id === nodeId);
    if (idx !== -1) {
      newNode.parentId = node.id;
      const children = [...node.children];
      children.splice(idx + 1, 0, newNode);
      return { ...node, children };
    }
    return node;
  });
}

/**
 * Remove a node and its subtree.
 * Returns a new tree (immutable). If nodeId === root.id, returns null.
 * @param {object} root
 * @param {string} nodeId
 * @returns {object|null}
 */
export function removeNode(root, nodeId) {
  if (root.id === nodeId) return null;
  return _mapTree(clone(root), (node) => {
    const filtered = node.children.filter((c) => c.id !== nodeId);
    if (filtered.length !== node.children.length) {
      return { ...node, children: filtered };
    }
    return node;
  });
}

/**
 * Update text of a node.
 * Returns a new tree (immutable).
 * @param {object} root
 * @param {string} nodeId
 * @param {string} text
 * @returns {object}
 */
export function updateText(root, nodeId, text) {
  return _mapTree(clone(root), (node) => {
    if (node.id === nodeId) {
      return { ...node, text };
    }
    return node;
  });
}

/**
 * Toggle collapsed state of a node.
 * Returns a new tree (immutable).
 * @param {object} root
 * @param {string} nodeId
 * @returns {object}
 */
export function toggleCollapse(root, nodeId) {
  return _mapTree(clone(root), (node) => {
    if (node.id === nodeId) {
      return { ...node, collapsed: !node.collapsed };
    }
    return node;
  });
}

/**
 * Find a node by id.
 * @param {object} root
 * @param {string} nodeId
 * @returns {{ node: object, parent: object|null, index: number }|null}
 */
export function findNode(root, nodeId) {
  return _find(root, nodeId, null, -1);
}

function _find(node, nodeId, parent, index) {
  if (node.id === nodeId) {
    return { node, parent, index };
  }
  for (let i = 0; i < node.children.length; i++) {
    const result = _find(node.children[i], nodeId, node, i);
    if (result) return result;
  }
  return null;
}

/**
 * Traverse tree depth-first, calling callback(node) for every node.
 * @param {object} root
 * @param {Function} callback
 */
export function traverseDFS(root, callback) {
  callback(root);
  for (const child of root.children) {
    traverseDFS(child, callback);
  }
}

/**
 * Count total number of nodes.
 * @param {object} root
 * @returns {number}
 */
export function countNodes(root) {
  let count = 0;
  traverseDFS(root, () => count++);
  return count;
}

/**
 * Get the maximum depth of the tree (root = depth 0).
 * @param {object} root
 * @returns {number}
 */
export function getDepth(root) {
  if (root.children.length === 0) return 0;
  return 1 + Math.max(...root.children.map(getDepth));
}

/**
 * Internal: map over every node in the tree.
 * @param {object} node
 * @param {Function} fn
 * @returns {object}
 */
function _mapTree(node, fn) {
  const mapped = fn(node);
  return {
    ...mapped,
    children: mapped.children.map((child) => _mapTree(child, fn)),
  };
}
