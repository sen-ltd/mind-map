# Mind Map

SVG-based mind map editor with keyboard-first workflow. Zero dependencies, no build step.

**Live demo:** https://sen.ltd/portfolio/mind-map/

## Features

- SVG rendering of nodes and connections with bezier curves
- Central root node with child nodes branching outward
- Auto-layout (horizontal tree, left-to-right)
- Inline text editing
- Expand/collapse subtrees
- Drag to pan, scroll to zoom
- Dark/light theme
- Japanese/English UI

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Tab | Add child node |
| Enter | Add sibling node |
| Del / Backspace | Delete node and subtree |
| F2 | Edit node text |
| Space | Collapse/Expand subtree |
| ← ↑ ↓ → | Navigate between nodes |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Double-click | Edit node text |
| + / − | Zoom in/out |
| Ctrl+0 | Reset view |

## Export / Import

**Export:** SVG, PNG, Markdown outline, OPML, JSON

**Import:** Markdown outline, OPML, JSON

## Usage

Open `index.html` in a browser, or serve locally:

```bash
npm run serve
# http://localhost:8080
```

## Development

```bash
npm test
```

Node.js 18+ required (uses `node:test`).

## License

MIT © 2026 SEN LLC (SEN 合同会社)
