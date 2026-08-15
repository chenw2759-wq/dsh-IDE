/**
 * Standalone build config for the dsh-easyssh plugin.
 *
 * Uses the repo's shared client-bundle preset (shared/tsdown.client.ts):
 * node-half lib/ (host mode store + routes + tools) plus the browser bundle
 * lib/client.js (closure-factory artifact for the GUI's __ModuleLoader__,
 * CSS Modules inlined with auto-injected <style data-plugin>). The client
 * entry is auto-detected at src/client/index.ts by the preset.
 *
 * The host half imports SshEngine/HostStore from the workspace sibling
 * @deepseek-ai/dsh-ssh (a declared dependency, so tsdown keeps it external
 * and the dsh profile tree answers it at runtime).
 */
import { clientBundle } from '../../shared/tsdown.client.ts'

export default clientBundle('dsh-easyssh', ['src/index.ts', 'src/fs.ts', 'src/subprocess.ts'], {
  libExternal: [
    '@deepseek-ai/dsh-host-webserver',
    '@deepseek-ai/dsh-system-prompt',
    '@deepseek-ai/dsh-tools',
  ],
})
