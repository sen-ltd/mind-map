/**
 * tree.test.js - Tests for tree.js data structure operations
 * Run with: node --test tests/tree.test.js
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createNode,
  resetIdCounter,
  addChild,
  addSibling,
  removeNode,
  updateText,
  toggleCollapse,
  findNode,
  traverseDFS,
  countNodes,
  getDepth,
} from '../src/tree.js';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function buildTree() {
  resetIdCounter(1);
  const root = createNode('Root');       // id=1
  const a = createNode('A', root.id);   // id=2
  const b = createNode('B', root.id);   // id=3
  root.children.push(a, b);
  const a1 = createNode('A1', a.id);    // id=4
  const a2 = createNode('A2', a.id);    // id=5
  a.children.push(a1, a2);
  const a1x = createNode('A1x', a1.id); // id=6
  a1.children.push(a1x);
  return root;
}

// ─────────────────────────────────────────────────────────────
// createNode
// ─────────────────────────────────────────────────────────────

describe('createNode', () => {
  beforeEach(() => resetIdCounter(1));

  it('creates node with text and auto id', () => {
    const n = createNode('Hello');
    assert.equal(n.text, 'Hello');
    assert.ok(n.id, 'id should be set');
    assert.deepEqual(n.children, []);
    assert.equal(n.collapsed, false);
    assert.equal(n.parentId, null);
  });

  it('creates node with parentId', () => {
    const n = createNode('Child', '42');
    assert.equal(n.parentId, '42');
  });

  it('assigns unique sequential ids', () => {
    const n1 = createNode('a');
    const n2 = createNode('b');
    assert.notEqual(n1.id, n2.id);
  });

  it('defaults text to "New Node"', () => {
    const n = createNode();
    assert.equal(n.text, 'New Node');
  });
});

// ─────────────────────────────────────────────────────────────
// addChild
// ─────────────────────────────────────────────────────────────

describe('addChild', () => {
  it('adds a child to the specified parent', () => {
    const root = buildTree();
    const oldCount = countNodes(root);
    const newTree = addChild(root, root.id, 'NewChild');
    assert.equal(countNodes(newTree), oldCount + 1);
    assert.equal(newTree.children.length, 3); // was 2
    const last = newTree.children[newTree.children.length - 1];
    assert.equal(last.text, 'NewChild');
  });

  it('is immutable (original tree unchanged)', () => {
    const root = buildTree();
    const before = countNodes(root);
    addChild(root, root.id, 'X');
    assert.equal(countNodes(root), before);
  });

  it('adds child to nested parent', () => {
    const root = buildTree();
    const childA = root.children[0]; // A (id=2)
    const newTree = addChild(root, childA.id, 'ANew');
    const aInNew = newTree.children[0];
    assert.equal(aInNew.children.length, 3); // was 2
  });

  it('uses default text when none provided', () => {
    const root = buildTree();
    const newTree = addChild(root, root.id);
    const last = newTree.children[newTree.children.length - 1];
    assert.equal(last.text, 'New Node');
  });
});

// ─────────────────────────────────────────────────────────────
// addSibling
// ─────────────────────────────────────────────────────────────

describe('addSibling', () => {
  it('adds a sibling after the specified node', () => {
    const root = buildTree(); // root -> [A, B]
    const aId = root.children[0].id;
    const newTree = addSibling(root, aId, 'A_sibling');
    assert.equal(newTree.children.length, 3);
    assert.equal(newTree.children[1].text, 'A_sibling');
  });

  it('is immutable', () => {
    const root = buildTree();
    const before = root.children.length;
    addSibling(root, root.children[0].id, 'X');
    assert.equal(root.children.length, before);
  });

  it('adds sibling after last child', () => {
    const root = buildTree();
    const bId = root.children[1].id; // B is last
    const newTree = addSibling(root, bId, 'C');
    assert.equal(newTree.children.length, 3);
    assert.equal(newTree.children[2].text, 'C');
  });

  it('does not modify root when called on root', () => {
    const root = buildTree();
    const newTree = addSibling(root, root.id, 'Ignored');
    assert.equal(newTree.children.length, root.children.length);
  });
});

// ─────────────────────────────────────────────────────────────
// removeNode
// ─────────────────────────────────────────────────────────────

describe('removeNode', () => {
  it('removes a leaf node', () => {
    const root = buildTree();
    const a1x = root.children[0].children[0].children[0]; // A1x
    const newTree = removeNode(root, a1x.id);
    assert.equal(countNodes(newTree), countNodes(root) - 1);
  });

  it('removes a subtree', () => {
    const root = buildTree();
    const a = root.children[0]; // A has A1(A1x), A2
    const oldCount = countNodes(root);
    const aSubtreeCount = countNodes(a);
    const newTree = removeNode(root, a.id);
    assert.equal(countNodes(newTree), oldCount - aSubtreeCount);
  });

  it('is immutable', () => {
    const root = buildTree();
    const before = countNodes(root);
    removeNode(root, root.children[0].id);
    assert.equal(countNodes(root), before);
  });

  it('returns null when removing root', () => {
    const root = buildTree();
    const result = removeNode(root, root.id);
    assert.equal(result, null);
  });
});

// ─────────────────────────────────────────────────────────────
// updateText
// ─────────────────────────────────────────────────────────────

describe('updateText', () => {
  it('updates text of root', () => {
    const root = buildTree();
    const newTree = updateText(root, root.id, 'NewRoot');
    assert.equal(newTree.text, 'NewRoot');
  });

  it('updates text of deep node', () => {
    const root = buildTree();
    const a1x = root.children[0].children[0].children[0];
    const newTree = updateText(root, a1x.id, 'Updated');
    const found = findNode(newTree, a1x.id);
    assert.equal(found.node.text, 'Updated');
  });

  it('is immutable', () => {
    const root = buildTree();
    updateText(root, root.id, 'Changed');
    assert.equal(root.text, 'Root');
  });
});

// ─────────────────────────────────────────────────────────────
// toggleCollapse
// ─────────────────────────────────────────────────────────────

describe('toggleCollapse', () => {
  it('toggles collapsed from false to true', () => {
    const root = buildTree();
    const newTree = toggleCollapse(root, root.id);
    assert.equal(newTree.collapsed, true);
  });

  it('toggles collapsed from true to false', () => {
    const root = buildTree();
    const t1 = toggleCollapse(root, root.id);
    const t2 = toggleCollapse(t1, t1.id);
    assert.equal(t2.collapsed, false);
  });

  it('is immutable', () => {
    const root = buildTree();
    toggleCollapse(root, root.id);
    assert.equal(root.collapsed, false);
  });
});

// ─────────────────────────────────────────────────────────────
// findNode
// ─────────────────────────────────────────────────────────────

describe('findNode', () => {
  it('finds root with no parent', () => {
    const root = buildTree();
    const result = findNode(root, root.id);
    assert.ok(result);
    assert.equal(result.node.id, root.id);
    assert.equal(result.parent, null);
    assert.equal(result.index, -1);
  });

  it('finds direct child with correct parent and index', () => {
    const root = buildTree();
    const a = root.children[0];
    const result = findNode(root, a.id);
    assert.ok(result);
    assert.equal(result.parent.id, root.id);
    assert.equal(result.index, 0);
  });

  it('finds deeply nested node', () => {
    const root = buildTree();
    const a1x = root.children[0].children[0].children[0];
    const result = findNode(root, a1x.id);
    assert.ok(result);
    assert.equal(result.node.id, a1x.id);
    assert.equal(result.parent.id, root.children[0].children[0].id);
  });

  it('returns null for non-existent id', () => {
    const root = buildTree();
    const result = findNode(root, 'nonexistent');
    assert.equal(result, null);
  });
});

// ─────────────────────────────────────────────────────────────
// traverseDFS
// ─────────────────────────────────────────────────────────────

describe('traverseDFS', () => {
  it('visits all nodes', () => {
    const root = buildTree();
    const visited = [];
    traverseDFS(root, (n) => visited.push(n.id));
    assert.equal(visited.length, countNodes(root));
  });

  it('visits root first', () => {
    const root = buildTree();
    const visited = [];
    traverseDFS(root, (n) => visited.push(n.id));
    assert.equal(visited[0], root.id);
  });

  it('visits in DFS order (parent before children)', () => {
    const root = buildTree();
    const visited = [];
    traverseDFS(root, (n) => visited.push(n.text));
    // Root should appear before A, A before A1, A1 before A1x
    assert.ok(visited.indexOf('Root') < visited.indexOf('A'));
    assert.ok(visited.indexOf('A') < visited.indexOf('A1'));
    assert.ok(visited.indexOf('A1') < visited.indexOf('A1x'));
  });
});

// ─────────────────────────────────────────────────────────────
// countNodes
// ─────────────────────────────────────────────────────────────

describe('countNodes', () => {
  it('counts single node', () => {
    resetIdCounter(1);
    const n = createNode('solo');
    assert.equal(countNodes(n), 1);
  });

  it('counts all nodes in tree', () => {
    const root = buildTree(); // Root, A, B, A1, A2, A1x = 6
    assert.equal(countNodes(root), 6);
  });
});

// ─────────────────────────────────────────────────────────────
// getDepth
// ─────────────────────────────────────────────────────────────

describe('getDepth', () => {
  it('returns 0 for single node', () => {
    resetIdCounter(1);
    const n = createNode('solo');
    assert.equal(getDepth(n), 0);
  });

  it('returns correct depth for tree', () => {
    const root = buildTree(); // depth: Root(0) -> A(1) -> A1(2) -> A1x(3)
    assert.equal(getDepth(root), 3);
  });

  it('returns 1 for root with leaf children only', () => {
    resetIdCounter(100);
    const root = createNode('R');
    root.children.push(createNode('C1', root.id), createNode('C2', root.id));
    assert.equal(getDepth(root), 1);
  });
});
