/**
 * export.js - Multi-format export and import for mind map trees
 */

import { createNode, traverseDFS } from './tree.js';

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

/**
 * Export tree to indented Markdown outline.
 * @param {object} root
 * @returns {string}
 */
export function toMarkdown(root) {
  const lines = [];
  function visit(node, depth) {
    const indent = '  '.repeat(depth);
    lines.push(`${indent}- ${node.text}`);
    for (const child of node.children) {
      visit(child, depth + 1);
    }
  }
  visit(root, 0);
  return lines.join('\n');
}

/**
 * Export tree to OPML XML.
 * @param {object} root
 * @returns {string}
 */
export function toOPML(root) {
  function escape(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function nodeToXml(node, indent) {
    const pad = '  '.repeat(indent);
    if (node.children.length === 0) {
      return `${pad}<outline text="${escape(node.text)}"/>`;
    }
    const childrenXml = node.children
      .map((c) => nodeToXml(c, indent + 1))
      .join('\n');
    return `${pad}<outline text="${escape(node.text)}">\n${childrenXml}\n${pad}</outline>`;
  }

  const body = nodeToXml(root, 2);
  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>${root.text}</title></head>
  <body>
${body}
  </body>
</opml>`;
}

/**
 * Export tree to JSON string (serialised tree).
 * @param {object} root
 * @returns {string}
 */
export function toJSON(root) {
  return JSON.stringify(root, null, 2);
}

// ─────────────────────────────────────────────
// IMPORT
// ─────────────────────────────────────────────

/**
 * Parse indented Markdown outline to tree.
 * @param {string} text
 * @returns {object}
 */
export function fromMarkdown(text) {
  const lines = text.split('\n').filter((l) => l.trim().startsWith('-'));
  if (lines.length === 0) {
    return createNode('Root');
  }

  function getDepth(line) {
    const match = line.match(/^(\s*)-/);
    if (!match) return 0;
    return Math.floor(match[1].length / 2);
  }

  function getText(line) {
    return line.replace(/^\s*-\s*/, '').trim();
  }

  const root = createNode(getText(lines[0]));
  const stack = [{ node: root, depth: 0 }];

  for (let i = 1; i < lines.length; i++) {
    const depth = getDepth(lines[i]);
    const text = getText(lines[i]);
    const node = createNode(text);

    // Find parent: last stack entry with depth < current depth
    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].node;
    node.parentId = parent.id;
    parent.children.push(node);
    stack.push({ node, depth });
  }

  return root;
}

/**
 * Parse OPML XML to tree.
 * @param {string} xmlText
 * @returns {object}
 */
export function fromOPML(xmlText) {
  // Parse using DOMParser if available, else minimal regex fallback
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const outlines = doc.querySelectorAll('body > outline');
    if (outlines.length === 0) {
      return createNode('Root');
    }
    // Wrap in a virtual root if multiple top-level outlines
    const topText =
      outlines.length === 1
        ? outlines[0].getAttribute('text') || 'Root'
        : 'Root';
    const root = createNode(topText);

    function parseOutline(el, parent) {
      const children =
        outlines.length > 1 && el === null
          ? Array.from(outlines)
          : Array.from(el ? el.children : []);

      for (const child of children) {
        if (child.tagName !== 'outline') continue;
        const text = child.getAttribute('text') || '';
        const node = createNode(text, parent.id);
        parent.children.push(node);
        parseOutline(child, node);
      }
    }

    if (outlines.length === 1) {
      parseOutline(outlines[0], root);
    } else {
      parseOutline(null, root);
    }
    return root;
  }

  // Minimal regex fallback (Node.js test environment)
  const matches = [...xmlText.matchAll(/<outline\s[^>]*text="([^"]*)"[^>]*>/g)];
  if (matches.length === 0) return createNode('Root');
  const root = createNode(matches[0][1]);
  for (let i = 1; i < matches.length; i++) {
    const node = createNode(matches[i][1], root.id);
    root.children.push(node);
  }
  return root;
}
