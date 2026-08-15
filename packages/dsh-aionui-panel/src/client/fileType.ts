/**
 * Preview content-type detection from a file name — the router's single
 * source of truth for what a file becomes when opened (mirrors AionUi's
 * getFileTypeInfo table, re-derived for the panel's format set).
 * @module dsh-aionui-panel/client/fileType
 */

import type { PreviewContentType } from '../core/types.ts'

/** Markdown extensions. */
const MARKDOWN_EXT = new Set(['md', 'markdown', 'mdx', 'rmd'])
/** HTML extensions. */
const HTML_EXT = new Set(['html', 'htm', 'xhtml'])
/** Diff extensions. */
const DIFF_EXT = new Set(['diff', 'patch'])
/** CSV. */
const CSV_EXT = new Set(['csv'])
/** PDF. */
const PDF_EXT = new Set(['pdf'])
/** Office documents. */
const WORD_EXT = new Set(['doc', 'docx', 'odt', 'rtf'])
const EXCEL_EXT = new Set(['xls', 'xlsx', 'ods'])
const PPT_EXT = new Set(['ppt', 'pptx', 'odp'])
/** Images. */
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'avif'])
/** Extensions treated as editable code/text. */
const CODE_EXT = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'jsonc', 'css', 'scss', 'less',
  'yml', 'yaml', 'toml', 'xml', 'sh', 'bash', 'zsh', 'fish', 'rs', 'py', 'go',
  'java', 'c', 'h', 'cpp', 'hpp', 'cc', 'cs', 'sql', 'php', 'rb', 'swift', 'kt',
  'vue', 'svelte', 'astro', 'txt', 'log', 'ini', 'env', 'conf', 'cfg', 'gitignore',
  'dockerfile', 'makefile', 'graphql', 'proto', 'prisma', 'zig', 'lua', 'r', 'dart',
  'ex', 'exs', 'erl', 'hs', 'clj', 'scala', 'groovy', 'vb', 'ps1', 'bat', 'cmd',
  'pl', 'pm', 'tcl', 'asm', 's', 'f', 'f90', 'jl', 'nim', 'ml', 'elm', 'purs',
  'solidity', 'sol', 'tf', 'hcl', 'dockerignore', 'editorconfig', 'prettierrc',
  'eslintrc', 'babelrc', 'npmrc', 'nix', 'lock', 'map',
])
/** No-extension names that are plain text. */
const TEXT_NAMES = new Set([
  'license', 'licence', 'readme', 'changelog', 'contributing', 'authors', 'notice',
  'makefile', 'dockerfile', 'justfile', 'gemfile', 'rakefile', 'procfile',
])
/**
 * Leading-dot config dotfiles whose full (dotted) basename is plain text. The
 * de-dot rule below maps most single-dot files (`.gitignore` -> ext `gitignore`)
 * into CODE_EXT; these multi-suffix / uncommon ones have no useful extension
 * (`.env.local` -> `local`), so we match them by their whole dotted name.
 */
const DOTFILE_TEXT_NAMES = new Set([
  '.gitignore', '.gitattributes', '.gitmodules', '.env', '.env.local',
  '.env.production', '.env.development', '.env.test', '.npmrc', '.npmrc.template',
  '.prettierrc', '.prettierrc.json', '.prettierrc.yaml', '.babelrc', '.babelrc.json',
  '.eslintrc', '.eslintrc.json', '.eslintrc.js', '.editorconfig', '.dockerignore',
  '.eslintignore', '.prettierignore', '.gitignore.local', '.hgignore',
])

/** Detect the preview content type of a file by name (lowercased). */
export function detectContentType(name: string): PreviewContentType {
  const base = name.split('/').pop() ?? name
  const lower = base.toLowerCase()
  const dot = lower.lastIndexOf('.')
  // Leading-dot files: the first dot is the hidden-file marker, not a
  // separator — take the text after it (`.gitignore` -> `gitignore`).
  const ext = lower[0] === '.'
    ? (dot > 0 ? lower.slice(dot + 1) : lower.slice(1))
    : (dot > 0 ? lower.slice(dot + 1) : '')
  const stem = dot > 0 ? lower.slice(0, dot) : lower
  if (lower[0] === '.' && DOTFILE_TEXT_NAMES.has(lower)) return 'text'
  if (ext === '' && TEXT_NAMES.has(stem)) return 'text'
  if (ext === '') return 'unsupported'
  if (MARKDOWN_EXT.has(ext)) return 'markdown'
  if (HTML_EXT.has(ext)) return 'html'
  if (DIFF_EXT.has(ext)) return 'diff'
  if (CSV_EXT.has(ext)) return 'csv'
  if (PDF_EXT.has(ext)) return 'pdf'
  if (WORD_EXT.has(ext)) return 'word'
  if (EXCEL_EXT.has(ext)) return 'excel'
  if (PPT_EXT.has(ext)) return 'ppt'
  if (IMAGE_EXT.has(ext)) return 'image'
  if (CODE_EXT.has(ext)) return 'code'
  return 'unsupported'
}

/**
 * A per-type accent color for tabs (JupyterLab-style visual grouping): every
 * file kind gets a distinguishable hue so a busy tab strip stays readable at
 * a glance — orange for images, green for CSV/data tables, blue for Python,
 * yellow for JS/TS, purple for JSON, cyan for docs, red for diffs, grey
 * otherwise. Returns an RGB string usable in CSS `color`/`border`/`background`.
 */
export function typeColor(contentType: PreviewContentType, name?: string): string {
  const base = name?.split('/').pop()?.toLowerCase() ?? ''
  const ext = base.includes('.') ? base.slice(base.lastIndexOf('.') + 1) : ''
  if (contentType === 'image') return '#f59e0b' // orange: png/jpg/gif/webp
  if (contentType === 'csv') return '#22c55e' // green: data tables
  if (contentType === 'diff') return '#f43f5e' // red: change views
  if (contentType === 'pdf') return '#ef4444'
  if (contentType === 'markdown') return '#06b6d4' // cyan: docs
  if (contentType === 'html') return '#fb923c'
  if (contentType === 'word' || contentType === 'excel' || contentType === 'ppt') return '#0ea5e9'
  if (ext === 'py') return '#3b82f6' // blue: python
  if (ext === 'r' || ext === 'rmd') return '#276dc3' // R blue
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs' || ext === 'ts' || ext === 'tsx') return '#eab308' // yellow
  if (ext === 'json' || ext === 'jsonc') return '#a855f7' // purple
  if (ext === 'rs') return '#d97706'
  if (ext === 'go') return '#38bdf8'
  if (ext === 'sql') return '#f97316'
  if (ext === 'log' || ext === 'txt') return '#94a3b8' // grey: plain logs
  return '#64748b' // default slate
}

/** Whether the type can be edited and saved back. */
export function isEditableType(type: PreviewContentType): boolean {
  return type === 'markdown' || type === 'html' || type === 'code' || type === 'csv' || type === 'text'
}

/** Whether the type reads its content as text (vs image data URL). */
export function isTextType(type: PreviewContentType): boolean {
  return type !== 'image' && type !== 'pdf' && type !== 'word' && type !== 'excel'
    && type !== 'ppt' && type !== 'unsupported' && type !== 'url'
}

/** A stable tab id from the file identity (root + path + type). */
export function tabIdOf(root: string, path: string, type: PreviewContentType): string {
  return `${root}\u0000${path}\u0000${type}`
}

/** The language hint for code tabs (extension without the dot). */
export function languageOf(name: string): string {
  const base = name.split('/').pop() ?? name
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(dot + 1) : ''
}

/** The highlight.js language id for a file (undefined = no highlighting). */
export function hljsLanguageOf(name: string): string | undefined {
  const ext = languageOf(name).toLowerCase()
  const map: Record<string, string> = {
    py: 'python', js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', tsx: 'typescript', json: 'json', jsonc: 'json',
    css: 'css', scss: 'scss', less: 'less',
    html: 'xml', htm: 'xml', xml: 'xml', svg: 'xml',
    md: 'markdown', markdown: 'markdown', rmd: 'markdown',
    sh: 'bash', bash: 'bash', zsh: 'bash', fish: 'bash',
    r: 'r', sql: 'sql', go: 'go', rs: 'rust', java: 'java', c: 'c', h: 'c',
    cpp: 'cpp', hpp: 'cpp', cc: 'cpp', cs: 'csharp', php: 'php', rb: 'ruby',
    yml: 'yaml', yaml: 'yaml', toml: 'ini', ini: 'ini', env: 'ini', conf: 'ini',
    kt: 'kotlin', swift: 'swift', dart: 'dart', lua: 'lua', ex: 'elixir', exs: 'elixir',
    erl: 'erlang', hs: 'haskell', clj: 'clojure', scala: 'scala', ps1: 'powershell',
    bat: 'dos', cmd: 'dos', pl: 'perl', pm: 'perl', jl: 'julia', groovy: 'groovy',
    proto: 'protobuf', graphql: 'graphql', zig: 'zig', nix: 'nix', elm: 'elm',
  }
  return map[ext]
}

/** The title for a tab: the basename. */
export function basenameOf(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] ?? path
}

/** The parent relative path of a path ('' for a root-level item). */
export function parentRel(path: string): string {
  const idx = path.lastIndexOf('/')
  return idx > 0 ? path.slice(0, idx) : ''
}
