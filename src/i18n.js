/**
 * i18n.js - Japanese/English translations for the mind map UI
 */

export const translations = {
  en: {
    appTitle: 'Mind Map',
    newMap: 'New',
    importBtn: 'Import',
    exportBtn: 'Export',
    themeToggle: 'Theme',
    langToggle: '日本語',
    helpBtn: 'Help',
    shortcutsTitle: 'Keyboard Shortcuts',
    addChild: 'Add Child',
    addSibling: 'Add Sibling',
    deleteNode: 'Delete Node',
    editNode: 'Edit Node',
    collapseExpand: 'Collapse/Expand',
    undo: 'Undo',
    redo: 'Redo',
    navUp: 'Navigate Up',
    navDown: 'Navigate Down',
    navLeft: 'Navigate Left',
    navRight: 'Navigate Right',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    resetView: 'Reset View',
    exportSVG: 'Export SVG',
    exportPNG: 'Export PNG',
    exportMarkdown: 'Export Markdown',
    exportOPML: 'Export OPML',
    exportJSON: 'Export JSON',
    importMarkdown: 'Import Markdown',
    importOPML: 'Import OPML',
    importJSON: 'Import JSON',
    confirmDelete: 'Delete this node and its subtree?',
    confirmNewMap: 'Start a new map? Unsaved changes will be lost.',
    rootNodeText: 'Central Idea',
    shortcutTab: 'Tab',
    shortcutEnter: 'Enter',
    shortcutDelete: 'Del / Backspace',
    shortcutF2: 'F2',
    shortcutArrows: '← ↑ ↓ →',
    shortcutCtrlZ: 'Ctrl+Z',
    shortcutCtrlShiftZ: 'Ctrl+Shift+Z',
    shortcutSpace: 'Space',
    close: 'Close',
    nodes: 'nodes',
    depth: 'depth',
    autoSaved: 'Auto-saved',
  },
  ja: {
    appTitle: 'マインドマップ',
    newMap: '新規',
    importBtn: 'インポート',
    exportBtn: 'エクスポート',
    themeToggle: 'テーマ',
    langToggle: 'English',
    helpBtn: 'ヘルプ',
    shortcutsTitle: 'キーボードショートカット',
    addChild: '子ノードを追加',
    addSibling: '兄弟ノードを追加',
    deleteNode: 'ノードを削除',
    editNode: 'テキストを編集',
    collapseExpand: '折りたたみ/展開',
    undo: '元に戻す',
    redo: 'やり直し',
    navUp: '上に移動',
    navDown: '下に移動',
    navLeft: '左に移動',
    navRight: '右に移動',
    zoomIn: 'ズームイン',
    zoomOut: 'ズームアウト',
    resetView: 'ビューをリセット',
    exportSVG: 'SVG エクスポート',
    exportPNG: 'PNG エクスポート',
    exportMarkdown: 'Markdown エクスポート',
    exportOPML: 'OPML エクスポート',
    exportJSON: 'JSON エクスポート',
    importMarkdown: 'Markdown インポート',
    importOPML: 'OPML インポート',
    importJSON: 'JSON インポート',
    confirmDelete: 'このノードとサブツリーを削除しますか？',
    confirmNewMap: '新しいマップを開始しますか？保存されていない変更は失われます。',
    rootNodeText: '中心のアイデア',
    shortcutTab: 'Tab',
    shortcutEnter: 'Enter',
    shortcutDelete: 'Del / Backspace',
    shortcutF2: 'F2',
    shortcutArrows: '← ↑ ↓ →',
    shortcutCtrlZ: 'Ctrl+Z',
    shortcutCtrlShiftZ: 'Ctrl+Shift+Z',
    shortcutSpace: 'Space',
    close: '閉じる',
    nodes: 'ノード',
    depth: '深さ',
    autoSaved: '自動保存',
  },
};

let _lang = 'en';

export function setLang(lang) {
  _lang = lang === 'ja' ? 'ja' : 'en';
}

export function getLang() {
  return _lang;
}

export function t(key) {
  return (translations[_lang] || translations.en)[key] || key;
}
