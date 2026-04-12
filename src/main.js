/**
 * main.js - DOM, SVG rendering, events, keyboard shortcuts
 */

import {
  createNode,
  addChild,
  addSibling,
  removeNode,
  updateText,
  toggleCollapse,
  findNode,
  traverseDFS,
  countNodes,
  getDepth,
} from './tree.js';
import { layoutTree, getBoundingBox, getConnectionPath } from './layout.js';
import {
  toMarkdown,
  toOPML,
  toJSON,
  fromMarkdown,
  fromOPML,
} from './export.js';
import { t, setLang, getLang } from './i18n.js';

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────

const STORAGE_KEY = 'mindmap_tree';
const THEME_KEY = 'mindmap_theme';
const LANG_KEY = 'mindmap_lang';
const MAX_HISTORY = 50;

let tree = null;
let selectedId = null;
let history = [];
let historyIndex = -1;
let viewTransform = { x: 60, y: 40, scale: 1 };
let isPanning = false;
let panStart = { x: 0, y: 0 };
let editingId = null;

// ─────────────────────────────────────────────
// DOM refs (set after DOMContentLoaded)
// ─────────────────────────────────────────────

let svg, svgGroup, statusNodes, statusDepth, statusSaved;
let helpModal, importModal, importTextarea, importFormatSelect;

// ─────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────

function init() {
  // Restore lang
  const savedLang = localStorage.getItem(LANG_KEY);
  if (savedLang) setLang(savedLang);
  document.documentElement.lang = getLang();

  // Restore theme
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.dataset.theme = savedTheme;

  // DOM refs
  svg = document.getElementById('mind-map-svg');
  svgGroup = document.getElementById('svg-group');
  statusNodes = document.getElementById('status-nodes');
  statusDepth = document.getElementById('status-depth');
  statusSaved = document.getElementById('status-saved');
  helpModal = document.getElementById('help-modal');
  importModal = document.getElementById('import-modal');
  importTextarea = document.getElementById('import-textarea');
  importFormatSelect = document.getElementById('import-format');

  // Restore or create tree
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      tree = JSON.parse(saved);
    } catch {
      tree = buildDefaultTree();
    }
  } else {
    tree = buildDefaultTree();
  }

  pushHistory(tree);
  selectedId = tree.id;
  applyTransform();
  render();
  bindEvents();
  applyI18n();
}

function buildDefaultTree() {
  const root = createNode(t('rootNodeText'));
  const c1 = createNode('Topic 1', root.id);
  const c2 = createNode('Topic 2', root.id);
  const c3 = createNode('Topic 3', root.id);
  root.children.push(c1, c2, c3);
  const gc1 = createNode('Subtopic', c1.id);
  c1.children.push(gc1);
  return root;
}

// ─────────────────────────────────────────────
// History (undo/redo)
// ─────────────────────────────────────────────

function pushHistory(t) {
  if (historyIndex < history.length - 1) {
    history = history.slice(0, historyIndex + 1);
  }
  history.push(JSON.parse(JSON.stringify(t)));
  if (history.length > MAX_HISTORY) history.shift();
  historyIndex = history.length - 1;
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    tree = JSON.parse(JSON.stringify(history[historyIndex]));
    render();
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    tree = JSON.parse(JSON.stringify(history[historyIndex]));
    render();
  }
}

// ─────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────

function saveTree() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
  if (statusSaved) {
    statusSaved.textContent = t('autoSaved') + ' ' + new Date().toLocaleTimeString();
  }
}

// ─────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────

const NODE_W = 140;
const NODE_H = 36;
const NODE_R = 8;

function render() {
  if (!svg || !svgGroup) return;
  svgGroup.innerHTML = '';

  const laid = layoutTree(tree, {
    horizontalSpacing: 220,
    verticalSpacing: 20,
    nodeWidth: NODE_W,
    nodeHeight: NODE_H,
  });

  // Draw edges first (under nodes)
  const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  edgesGroup.setAttribute('class', 'edges');
  svgGroup.appendChild(edgesGroup);

  // Draw nodes
  const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  nodesGroup.setAttribute('class', 'nodes');
  svgGroup.appendChild(nodesGroup);

  traverseDFS(laid, (node) => {
    renderNode(node, nodesGroup, edgesGroup, laid);
  });

  // Update status bar
  if (statusNodes) statusNodes.textContent = `${countNodes(tree)} ${t('nodes')}`;
  if (statusDepth) statusDepth.textContent = `${t('depth')}: ${getDepth(tree)}`;

  saveTree();
}

function renderNode(node, nodesGroup, edgesGroup, rootLaid) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;

  // Draw edge to each visible child
  if (!node.collapsed) {
    for (const child of node.children) {
      if (child.x === undefined) continue;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = getConnectionPath(node, child, { nodeWidth: NODE_W, nodeHeight: NODE_H });
      path.setAttribute('d', d);
      path.setAttribute('class', 'edge');
      edgesGroup.appendChild(path);
    }
  }

  // Node group
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'node-group');
  g.setAttribute('data-id', node.id);
  g.setAttribute('transform', `translate(${x}, ${y})`);

  // Background rect
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', NODE_W);
  rect.setAttribute('height', NODE_H);
  rect.setAttribute('rx', NODE_R);
  rect.setAttribute('ry', NODE_R);
  const isRoot = node.id === tree.id;
  const isSelected = node.id === selectedId;
  rect.setAttribute(
    'class',
    `node-rect ${isRoot ? 'root' : ''} ${isSelected ? 'selected' : ''}`
  );
  g.appendChild(rect);

  if (editingId !== node.id) {
    // Text label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', NODE_W / 2);
    text.setAttribute('y', NODE_H / 2);
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'node-text');
    text.textContent = truncate(node.text, 16);
    g.appendChild(text);
  } else {
    // Inline foreignObject editor
    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    fo.setAttribute('x', 4);
    fo.setAttribute('y', 4);
    fo.setAttribute('width', NODE_W - 8);
    fo.setAttribute('height', NODE_H - 8);
    const input = document.createElement('input');
    input.type = 'text';
    input.value = node.text;
    input.className = 'node-editor';
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        commitEdit(node.id, input.value);
        e.preventDefault();
        e.stopPropagation();
      }
    });
    input.addEventListener('blur', () => commitEdit(node.id, input.value));
    fo.appendChild(input);
    g.appendChild(fo);
    // Defer focus
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  // Collapse toggle indicator
  if (node.children.length > 0) {
    const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    indicator.setAttribute('cx', NODE_W + 8);
    indicator.setAttribute('cy', NODE_H / 2);
    indicator.setAttribute('r', 6);
    indicator.setAttribute('class', 'collapse-toggle');
    indicator.setAttribute('data-id', node.id);
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    arrow.setAttribute('x', NODE_W + 8);
    arrow.setAttribute('y', NODE_H / 2);
    arrow.setAttribute('dominant-baseline', 'middle');
    arrow.setAttribute('text-anchor', 'middle');
    arrow.setAttribute('class', 'collapse-arrow');
    arrow.textContent = node.collapsed ? '+' : '−';
    g.appendChild(indicator);
    g.appendChild(arrow);
  }

  // Click to select
  g.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('collapse-toggle') ||
        e.target.classList.contains('collapse-arrow')) {
      doToggleCollapse(node.id);
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    if (selectedId !== node.id) {
      selectedId = node.id;
      render();
    }
  });

  // Double-click to edit
  g.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    startEdit(node.id);
  });

  nodesGroup.appendChild(g);
}

function truncate(text, maxLen) {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
}

// ─────────────────────────────────────────────
// Node operations
// ─────────────────────────────────────────────

function mutate(newTree, newSelectedId) {
  tree = newTree;
  if (newSelectedId !== undefined) selectedId = newSelectedId;
  pushHistory(tree);
  render();
}

function doAddChild() {
  if (!selectedId) return;
  const result = findNode(tree, selectedId);
  if (!result) return;
  const newTree = addChild(tree, selectedId);
  // Find new child id
  const newChild = findNewNode(tree, newTree);
  mutate(newTree, newChild ? newChild.id : selectedId);
}

function doAddSibling() {
  if (!selectedId) return;
  if (selectedId === tree.id) {
    doAddChild();
    return;
  }
  const newTree = addSibling(tree, selectedId);
  const newSibling = findNewNode(tree, newTree);
  mutate(newTree, newSibling ? newSibling.id : selectedId);
}

function doDeleteNode() {
  if (!selectedId || selectedId === tree.id) return;
  const result = findNode(tree, selectedId);
  if (!result) return;
  const parentId = result.parent ? result.parent.id : null;
  const newTree = removeNode(tree, selectedId);
  if (!newTree) return;
  mutate(newTree, parentId || newTree.id);
}

function doToggleCollapse(nodeId) {
  const newTree = toggleCollapse(tree, nodeId || selectedId);
  mutate(newTree, selectedId);
}

function startEdit(nodeId) {
  editingId = nodeId;
  render();
}

function commitEdit(nodeId, text) {
  editingId = null;
  if (text.trim() === '') {
    render();
    return;
  }
  const newTree = updateText(tree, nodeId, text.trim());
  mutate(newTree, selectedId);
}

/** Find the node in newTree that doesn't exist in oldTree */
function findNewNode(oldTree, newTree) {
  const oldIds = new Set();
  traverseDFS(oldTree, (n) => oldIds.add(n.id));
  let found = null;
  traverseDFS(newTree, (n) => {
    if (!oldIds.has(n.id)) found = n;
  });
  return found;
}

// ─────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────

function navigate(direction) {
  if (!selectedId) return;
  const result = findNode(tree, selectedId);
  if (!result) return;
  const { node, parent, index } = result;

  const laid = layoutTree(tree, {
    horizontalSpacing: 220,
    verticalSpacing: 20,
    nodeWidth: NODE_W,
    nodeHeight: NODE_H,
  });

  // Build flat sorted list
  const allNodes = [];
  traverseDFS(laid, (n) => allNodes.push(n));

  // For the laid-out version, find current node's position
  const laidResult = findNode(laid, selectedId);
  if (!laidResult) return;

  switch (direction) {
    case 'right': {
      // Go to first child
      if (node.children.length > 0 && !node.collapsed) {
        selectedId = node.children[0].id;
      }
      break;
    }
    case 'left': {
      // Go to parent
      if (parent) selectedId = parent.id;
      break;
    }
    case 'up': {
      // Previous sibling or nearest above
      if (parent && index > 0) {
        selectedId = parent.children[index - 1].id;
      } else {
        // Find the node above in y-sorted list
        const sorted = [...allNodes].sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
        const curr = sorted.find((n) => n.id === selectedId);
        const ci = sorted.indexOf(curr);
        if (ci > 0) selectedId = sorted[ci - 1].id;
      }
      break;
    }
    case 'down': {
      // Next sibling or nearest below
      if (parent && index < parent.children.length - 1) {
        selectedId = parent.children[index + 1].id;
      } else {
        const sorted = [...allNodes].sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
        const curr = sorted.find((n) => n.id === selectedId);
        const ci = sorted.indexOf(curr);
        if (ci < sorted.length - 1) selectedId = sorted[ci + 1].id;
      }
      break;
    }
  }
  render();
  scrollToSelected();
}

function scrollToSelected() {
  if (!selectedId) return;
  const el = svgGroup.querySelector(`[data-id="${selectedId}"]`);
  if (el) {
    // No-op: view is adjusted by panning
  }
}

// ─────────────────────────────────────────────
// Pan & Zoom
// ─────────────────────────────────────────────

function applyTransform() {
  if (!svgGroup) return;
  svgGroup.setAttribute(
    'transform',
    `translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`
  );
}

function zoom(delta) {
  const factor = delta > 0 ? 1.1 : 0.9;
  viewTransform.scale = Math.min(3, Math.max(0.2, viewTransform.scale * factor));
  applyTransform();
}

function resetView() {
  viewTransform = { x: 60, y: 40, scale: 1 };
  applyTransform();
}

// ─────────────────────────────────────────────
// Export helpers
// ─────────────────────────────────────────────

function downloadText(content, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function doExportSVG() {
  const serializer = new XMLSerializer();
  const svgEl = document.getElementById('mind-map-svg');
  const clone = svgEl.cloneNode(true);
  // Embed styles
  const styles = [...document.styleSheets]
    .map((s) => {
      try {
        return [...s.cssRules].map((r) => r.cssText).join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');
  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleEl.textContent = styles;
  clone.insertBefore(styleEl, clone.firstChild);
  const svgStr = serializer.serializeToString(clone);
  downloadText(svgStr, 'mindmap.svg');
}

function doExportPNG() {
  const svgEl = document.getElementById('mind-map-svg');
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl);
  const canvas = document.createElement('canvas');
  const rect = svgEl.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0);
    const a = document.createElement('a');
    a.download = 'mindmap.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
}

function doExportMarkdown() {
  downloadText(toMarkdown(tree), 'mindmap.md');
}

function doExportOPML() {
  downloadText(toOPML(tree), 'mindmap.opml');
}

function doExportJSON() {
  downloadText(toJSON(tree), 'mindmap.json');
}

// ─────────────────────────────────────────────
// Import
// ─────────────────────────────────────────────

function doImport() {
  const format = importFormatSelect.value;
  const text = importTextarea.value.trim();
  if (!text) return;

  let newTree;
  try {
    if (format === 'markdown') {
      newTree = fromMarkdown(text);
    } else if (format === 'opml') {
      newTree = fromOPML(text);
    } else {
      newTree = JSON.parse(text);
    }
  } catch (err) {
    alert('Import failed: ' + err.message);
    return;
  }

  mutate(newTree, newTree.id);
  closeImportModal();
}

function closeImportModal() {
  importModal.hidden = true;
  importTextarea.value = '';
}

// ─────────────────────────────────────────────
// i18n
// ─────────────────────────────────────────────

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
}

// ─────────────────────────────────────────────
// Event binding
// ─────────────────────────────────────────────

function bindEvents() {
  // Toolbar buttons
  document.getElementById('btn-new')?.addEventListener('click', () => {
    if (confirm(t('confirmNewMap'))) {
      tree = buildDefaultTree();
      selectedId = tree.id;
      history = [];
      historyIndex = -1;
      pushHistory(tree);
      render();
    }
  });

  document.getElementById('btn-import')?.addEventListener('click', () => {
    importModal.hidden = false;
    importTextarea.focus();
  });

  document.getElementById('btn-export-svg')?.addEventListener('click', doExportSVG);
  document.getElementById('btn-export-png')?.addEventListener('click', doExportPNG);
  document.getElementById('btn-export-md')?.addEventListener('click', doExportMarkdown);
  document.getElementById('btn-export-opml')?.addEventListener('click', doExportOPML);
  document.getElementById('btn-export-json')?.addEventListener('click', doExportJSON);

  document.getElementById('btn-theme')?.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
  });

  document.getElementById('btn-lang')?.addEventListener('click', () => {
    const next = getLang() === 'en' ? 'ja' : 'en';
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
    document.documentElement.lang = next;
    applyI18n();
    render();
  });

  document.getElementById('btn-help')?.addEventListener('click', () => {
    helpModal.hidden = false;
  });

  document.getElementById('help-close')?.addEventListener('click', () => {
    helpModal.hidden = true;
  });

  document.getElementById('import-cancel')?.addEventListener('click', closeImportModal);
  document.getElementById('import-confirm')?.addEventListener('click', doImport);

  // Zoom buttons
  document.getElementById('btn-zoom-in')?.addEventListener('click', () => zoom(1));
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => zoom(-1));
  document.getElementById('btn-zoom-reset')?.addEventListener('click', resetView);

  // SVG pan & zoom
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom(-e.deltaY);
    applyTransform();
  }, { passive: false });

  svg.addEventListener('mousedown', (e) => {
    if (e.target === svg || e.target === svgGroup) {
      isPanning = true;
      panStart = { x: e.clientX - viewTransform.x, y: e.clientY - viewTransform.y };
      svg.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    viewTransform.x = e.clientX - panStart.x;
    viewTransform.y = e.clientY - panStart.y;
    applyTransform();
  });

  window.addEventListener('mouseup', () => {
    isPanning = false;
    svg.style.cursor = '';
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeydown);
}

function handleKeydown(e) {
  // Skip if typing in an input outside of SVG editor
  if (e.target.tagName === 'INPUT' && !e.target.classList.contains('node-editor')) return;
  if (e.target.tagName === 'TEXTAREA') return;

  const ctrl = e.ctrlKey || e.metaKey;
  const shift = e.shiftKey;

  if (ctrl && shift && e.key === 'Z') {
    e.preventDefault();
    redo();
    return;
  }
  if (ctrl && e.key === 'z') {
    e.preventDefault();
    undo();
    return;
  }

  // Don't capture when editing
  if (editingId !== null) return;

  switch (e.key) {
    case 'Tab':
      e.preventDefault();
      doAddChild();
      break;
    case 'Enter':
      e.preventDefault();
      doAddSibling();
      break;
    case 'Delete':
    case 'Backspace':
      if (selectedId && selectedId !== tree.id) {
        e.preventDefault();
        doDeleteNode();
      }
      break;
    case 'F2':
      e.preventDefault();
      if (selectedId) startEdit(selectedId);
      break;
    case ' ':
      e.preventDefault();
      if (selectedId) doToggleCollapse(selectedId);
      break;
    case 'ArrowLeft':
      e.preventDefault();
      navigate('left');
      break;
    case 'ArrowRight':
      e.preventDefault();
      navigate('right');
      break;
    case 'ArrowUp':
      e.preventDefault();
      navigate('up');
      break;
    case 'ArrowDown':
      e.preventDefault();
      navigate('down');
      break;
    case '+':
      if (!ctrl) zoom(1);
      break;
    case '-':
      if (!ctrl) zoom(-1);
      break;
    case '0':
      if (ctrl) { e.preventDefault(); resetView(); }
      break;
  }
}

// ─────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
