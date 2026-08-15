/**
 * SettingsSection: the "右边栏工作区" settings page rendered inside the SHELL's
 * settings panel (the bottom-left gear → a new nav column). Replaces the old
 * in-panel ⚙ modal: the same feature toggles and editor-tool pickers, styled
 * as rounded boxes with text only (no emoji), sharing ONE settings store with
 * the panel wiring so every toggle is live immediately.
 *
 * Props are the settings.section slot contract: `t` (locale seat for the
 * aionui-panel namespace) and `close` (the shell's one affordance).
 * @module dsh-aionui-panel/client/components/SettingsSection
 */

import type { JSX } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { useStore } from '../hooks/useStore.ts'
import { EDITOR_TOOL_IDS, FEATURE_IDS, getSettingsStore, type WorkspaceEditorTools, type WorkspaceFeatures } from '../settings.ts'
import settingsCss from '../styles/settings-section.module.css'

/** Locale seat type of the aionui-panel namespace (framework-synthesized). */
export interface SettingsSectionProps {
  /** Translate a key of the aionui-panel dictionary. */
  t: TranslateNS<'aionui-panel'>
  /** Close the settings panel (the shell owns the open state). */
  close: () => void
}

/** The settings section content column. */
export function SettingsSection({ t }: SettingsSectionProps): JSX.Element {
  const settings = useStore(getSettingsStore())

  const setFeature = (key: keyof WorkspaceFeatures, value: boolean): void => {
    getSettingsStore().set({ features: { [key]: value } })
  }
  const setTool = (key: keyof WorkspaceEditorTools, value: boolean): void => {
    getSettingsStore().set({ editorTools: { [key]: value } })
  }

  return (
    <div className={settingsCss.section}>
      <div className={settingsCss.group}>
        <div className={settingsCss.groupTitle}>{t('settings.features')}</div>
        <div className={settingsCss.cards}>
          {FEATURE_IDS.map((id) => (
            <label key={id} className={settingsCss.card}>
              <span className={settingsCss.cardText}>{t(`settings.feature.${id}`)}</span>
              <span className={settingsCss.switchWrap}>
                <input
                  type="checkbox"
                  className={settingsCss.switchInput}
                  checked={settings.features[id]}
                  onChange={(event) => setFeature(id, event.target.checked)}
                />
                <span className={settingsCss.switchTrack} aria-hidden="true">
                  <span className={settingsCss.switchThumb} />
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className={settingsCss.group}>
        <div className={settingsCss.groupTitle}>{t('settings.editorTools')}</div>
        <div className={settingsCss.cards}>
          {EDITOR_TOOL_IDS.map((id) => (
            <label key={id} className={settingsCss.card}>
              <span className={settingsCss.cardText}>{t(`settings.tool.${id}`)}</span>
              <span className={settingsCss.switchWrap}>
                <input
                  type="checkbox"
                  className={settingsCss.switchInput}
                  checked={settings.editorTools[id]}
                  onChange={(event) => setTool(id, event.target.checked)}
                />
                <span className={settingsCss.switchTrack} aria-hidden="true">
                  <span className={settingsCss.switchThumb} />
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className={settingsCss.footer}>
        <button type="button" className={settingsCss.reset} onClick={() => getSettingsStore().reset()}>
          {t('settings.reset')}
        </button>
      </div>
    </div>
  )
}
