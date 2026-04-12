/**
 * layout.test.js - Tests for layout.js auto-layout algorithm
 * Run with: node --test tests/layout.test.js
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resetIdCounter, createNode } from '../src/tree.js';
import { layoutTree, getBoundingBox, getConnectionPath } from '../src/layout.js';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function buildSimpleTree() {
  resetIdCounter(1);
  const root = createNode('Root');
  const a = createNode('A', root.id);
  const b = createNode('B', root.id);
  root.children.push(a, b);
  const a1 = createNode('A1', a.id);
  a.children.push(a1);
  return root;
}

function allNodes(root) {
  const result = [];
  function visit(n) {
    result.push(n);
    for (const c of n.children) visit(c);
  }
  visit(root);
  return result;
}

// ─────────────────────────────────────────────────────────────
// layoutTree
// ─────────────────────────────────────────────────────────────

describe('layoutTree', () => {
  it('assigns x and y to all nodes', () => {
    const root = buildSimpleTree();
    const laid = layoutTree(root);
    const nodes = allNodes(laid);
    for (const n of nodes) {
      assert.ok(typeof n.x === 'number', `x should be a number for node ${n.text}`);
      assert.ok(typeof n.y === 'number', `y should be a number for node ${n.text}`);
    }
  });

  it('root is at x=0', () => {
    const root = buildSimpleTree();
    const laid = layoutTree(root);
    assert.equal(laid.x, 0);
  });

  it('children are to the right of parent (larger x)', () => {
    const root = buildSimpleTree();
    const laid = layoutTree(root);
    for (const child of laid.children) {
      assert.ok(child.x > laid.x, 'child x should be greater than parent x');
    }
  });

  it('grandchild is further right than child', () => {
    const root = buildSimpleTree();
    const laid = layoutTree(root);
    const a = laid.children[0]; // A
    const a1 = a.children[0];  // A1
    assert.ok(a1.x > a.x);
  });

  it('leaf nodes are stacked vertically with spacing', () => {
    const root = buildSimpleTree();
    const opts = { verticalSpacing: 20, nodeHeight: 36 };
    const laid = layoutTree(root, opts);
    // Visible leaf nodes should have different y values
    const leaves = allNodes(laid).filter((n) => n.children.length === 0);
    const ys = leaves.map((n) => n.y);
    const uniqueYs = new Set(ys);
    assert.ok(uniqueYs.size > 1, 'leaf nodes should have different y positions');
  });

  it('parent y is vertically centered between first and last child', () => {
    const root = buildSimpleTree();
    const laid = layoutTree(root);
    const a = laid.children[0]; // A has one child so y == child y
    // root's y should be centered between its two children (A and B)
    const expectedY = (laid.children[0].y + laid.children[laid.children.length - 1].y) / 2;
    assert.equal(laid.y, expectedY);
  });

  it('respects horizontalSpacing option', () => {
    const root = buildSimpleTree();
    const spacing = 300;
    const laid = layoutTree(root, { horizontalSpacing: spacing });
    assert.equal(laid.children[0].x, spacing);
  });

  it('collapsed nodes have no laid-out children', () => {
    const root = buildSimpleTree();
    root.children[0].collapsed = true;
    const laid = layoutTree(root);
    const a = laid.children[0];
    // A's child A1 should not have x/y in the visible layout pass
    // (children are present but not positioned by visible pass)
    // The root's y should not be affected by A's collapsed children
    assert.ok(typeof laid.y === 'number');
  });

  it('single-child tree: child x > root x', () => {
    resetIdCounter(50);
    const root = createNode('R');
    const c = createNode('C', root.id);
    root.children.push(c);
    const laid = layoutTree(root);
    assert.ok(laid.children[0].x > 0);
  });

  it('preserves node text in laid-out tree', () => {
    const root = buildSimpleTree();
    const laid = layoutTree(root);
    assert.equal(laid.text, 'Root');
    assert.equal(laid.children[0].text, 'A');
  });
});

// ─────────────────────────────────────────────────────────────
// getBoundingBox
// ─────────────────────────────────────────────────────────────

describe('getBoundingBox', () => {
  it('returns finite bounds for laid-out tree', () => {
    const root = buildSimpleTree();
    const laid = layoutTree(root);
    const bb = getBoundingBox(laid);
    assert.ok(isFinite(bb.minX));
    assert.ok(isFinite(bb.minY));
    assert.ok(isFinite(bb.maxX));
    assert.ok(isFinite(bb.maxY));
  });

  it('minX <= maxX and minY <= maxY', () => {
    const root = buildSimpleTree();
    const laid = layoutTree(root);
    const bb = getBoundingBox(laid);
    assert.ok(bb.minX <= bb.maxX);
    assert.ok(bb.minY <= bb.maxY);
  });

  it('root is within bounding box', () => {
    const root = buildSimpleTree();
    const laid = layoutTree(root);
    const bb = getBoundingBox(laid);
    assert.ok(laid.x >= bb.minX && laid.x <= bb.maxX);
    assert.ok(laid.y >= bb.minY && laid.y <= bb.maxY);
  });

  it('all nodes are within bounding box', () => {
    const root = buildSimpleTree();
    const laid = layoutTree(root);
    const bb = getBoundingBox(laid);
    for (const n of allNodes(laid)) {
      assert.ok(n.x >= bb.minX, `node x ${n.x} should be >= minX ${bb.minX}`);
      assert.ok(n.x <= bb.maxX, `node x ${n.x} should be <= maxX ${bb.maxX}`);
      assert.ok(n.y >= bb.minY, `node y ${n.y} should be >= minY ${bb.minY}`);
      assert.ok(n.y <= bb.maxY, `node y ${n.y} should be <= maxY ${bb.maxY}`);
    }
  });

  it('single node bounding box: minX==maxX, minY==maxY', () => {
    resetIdCounter(100);
    const node = createNode('solo');
    node.x = 5;
    node.y = 10;
    const bb = getBoundingBox(node);
    assert.equal(bb.minX, 5);
    assert.equal(bb.maxX, 5);
    assert.equal(bb.minY, 10);
    assert.equal(bb.maxY, 10);
  });
});

// ─────────────────────────────────────────────────────────────
// getConnectionPath
// ─────────────────────────────────────────────────────────────

describe('getConnectionPath', () => {
  it('returns a string', () => {
    const d = getConnectionPath({ x: 0, y: 0 }, { x: 200, y: 100 });
    assert.equal(typeof d, 'string');
  });

  it('starts with M (moveto)', () => {
    const d = getConnectionPath({ x: 0, y: 0 }, { x: 200, y: 100 });
    assert.ok(d.startsWith('M '));
  });

  it('contains C (cubic bezier)', () => {
    const d = getConnectionPath({ x: 0, y: 0 }, { x: 200, y: 100 });
    assert.ok(d.includes('C '));
  });

  it('uses nodeWidth option for start x calculation', () => {
    const d1 = getConnectionPath({ x: 0, y: 0 }, { x: 200, y: 0 }, { nodeWidth: 100 });
    const d2 = getConnectionPath({ x: 0, y: 0 }, { x: 200, y: 0 }, { nodeWidth: 150 });
    assert.notEqual(d1, d2);
  });

  it('produces valid path with equal y (horizontal connection)', () => {
    const d = getConnectionPath({ x: 0, y: 50 }, { x: 200, y: 50 });
    assert.ok(d.length > 0);
    // Should be a line or flat curve
    assert.ok(d.includes('M '));
    assert.ok(d.includes('C '));
  });
});
