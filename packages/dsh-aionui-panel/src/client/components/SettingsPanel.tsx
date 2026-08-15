/**
 * SettingsPanel: the "右边栏工作区" mode panel — toggles whole features on/off
 * and picks which editing tools the edit-mode toolbar shows. A modal card over
 * a dimming overlay; click outside to close.
 * @module dsh-aionui-panel/client/components/SettingsPanel
 */

import type { JSX } from 'react'
import { t } from '../locales.ts'
import { useStore } from '../hooks/useStore.ts'
import { EDITOR_TOOL_IDS, FEATURE_IDS, type WorkspaceEditorTools, type WorkspaceFeatures } from '../settings.ts'
import type { PanelStores } from '../store.ts'
import settingsCss from '../styles/settings.module.css'

/** The settings modal. */
export function SettingsPanel({ stores, onClose }: { stores: PanelStores; onClose: () => void }): JSX.Element {
  const settings = useStore(stores.settings)

  const setFeature = (key: keyof WorkspaceFeatures, value: boolean): void => {
    stores.settings.set({ features: { [key]: value } })
  }
  const setTool = (key: keyof WorkspaceEditorTools, value: boolean): void => {
    stores.settings.set({ editorTools: { [key]: value } })
  }

  return (
    <div className={settingsCss.overlay} onMouseDown={onClose}>
      <div className={settingsCss.panel} onMouseDown={(event) => event.stopPropagation()}>
        <div className={settingsCss.header}>
          <span className={settingsCss.title}>{t('settings.title')}</span>
          <button type="button" className={settingsCss.close} onClick={onClose} aria-label={t('common.close')}>✕</button>
        </div>

        <div className={settingsCss.section}>
          <div className={settingsCss.sectionTitle}>{t('settings.features')}</div>
          {FEATURE_IDS.map((id) => (
            <label key={id} className={settingsCss.row}>
              <input
                type="checkbox"
                checked={settings.features[id]}
                onChange={(event) => setFeature(id, event.target.checked)}
              />
              <span className={settingsCss.rowLabel}>{t(`settings.feature.${id}`)}</span>
            </label>
          ))}
        </div>

        <div className={settingsCss.section}>
          <div className={settingsCss.sectionTitle}>{t('settings.editorTools')}</div>
          {EDITOR_TOOL_IDS.map((id) => (
            <label key={id} className={settingsCss.row}>
              <input
                type="checkbox"
                checked={settings.editorTools[id]}
                onChange={(event) => setTool(id, event.target.checked)}
              />
              <span className={settingsCss.rowLabel}>{t(`settings.tool.${id}`)}</span>
            </label>
          ))}
        </div>

        <div className={settingsCss.footer}>
          <button type="button" className={settingsCss.reset} onClick={() => stores.settings.reset()}>
            {t('settings.reset')}
          </button>
        </div>
      </div>
    </div>
  )
}
