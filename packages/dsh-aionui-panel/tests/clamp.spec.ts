/**
 * Width-clamp contract tests: the explorer clamp must keep the chat area
 * >= 360px whenever the frame is wide enough for the contract floor
 * (220 explorer + 360 chat). The preview region now lives BELOW the file
 * tree (a stacked panel column), so it consumes no horizontal space and the
 * clamp reserves only the chat floor.
 */
import { describe, expect, it } from 'vitest'
import {
  clampExplorerWidth, clampPreviewWidth,
  DEFAULT_WORKSPACE_PANEL_PX, DEFAULT_PREVIEW_REGION_PX,
  MAX_WORKSPACE_PANEL_PX, MAX_PREVIEW_REGION_PX,
  MIN_WORKSPACE_PANEL_PX, MIN_PREVIEW_PANEL_PX, MIN_CHAT_PANEL_PX,
  PREVIEW_REGION_CHROME_PX,
} from '../src/client/store.ts'

/** Simulate the ordered clamp pair; returns chat width. */
function solve(requestedExplorer: number, requestedPreview: number, available: number, previewOpen: boolean): {
  explorer: number
  preview: number
  chat: number
} {
  const explorer = clampExplorerWidth(requestedExplorer, available, previewOpen)
  const preview = previewOpen ? clampPreviewWidth(requestedPreview, available, explorer) : 0
  return { explorer, preview, chat: available - explorer - preview }
}

describe('clampExplorerWidth', () => {
  it('keeps the requested width when the row fits (the layout clamp only shrinks)', () => {
    expect(clampExplorerWidth(260, 1400, false)).toBe(DEFAULT_WORKSPACE_PANEL_PX)
    // The drag engine guarantees 220..500; the layout clamp preserves any
    // requested value the row can host.
    expect(clampExplorerWidth(50, 1400, false)).toBe(50)
  })

  it('reserves only the chat floor (the preview stacks below, not beside)', () => {
    // A requested 500 cannot fit with chat floor at available = 700:
    // maxByContainer = 700 - 360 = 340.
    expect(clampExplorerWidth(500, 700, true)).toBe(340)
    expect(clampExplorerWidth(260, 700, true)).toBe(260)
    // Narrow container: floor at the explorer minimum.
    expect(clampExplorerWidth(260, 500, true)).toBe(MIN_WORKSPACE_PANEL_PX)
  })
})

describe('clampPreviewWidth', () => {
  it('shrinks toward the chat reserve and respects the explorer width', () => {
    expect(clampPreviewWidth(480, 1400, 260)).toBe(480)
    // A 500px explorer leaves less room: maxByContainer = 1400-360-500-24,
    // and the requested 480 still fits inside it.
    expect(clampPreviewWidth(480, 1400, 500)).toBe(480)
    expect(clampPreviewWidth(800, 1400, 300)).toBe(1400 - MIN_CHAT_PANEL_PX - 300 - PREVIEW_REGION_CHROME_PX)
    // When the row is generous the full 1200 fits.
    expect(clampPreviewWidth(1200, 1844, 260)).toBe(MAX_PREVIEW_REGION_PX)
  })
})

describe('ordered clamp pair (chat >= 360)', () => {
  it('gives the whole row to chat when the preview is closed', () => {
    const solved = solve(260, 480, 1000, false)
    expect(solved.explorer).toBe(260)
    expect(solved.preview).toBe(0)
    expect(solved.chat).toBe(740)
  })
})
