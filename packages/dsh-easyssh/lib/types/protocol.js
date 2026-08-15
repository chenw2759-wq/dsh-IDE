/**
 * Wire contract between the host half (routes.ts) and the browser half
 * (client/api.ts). Pure types only — imported by both halves, bundled into
 * each, no runtime identity to share.
 */
/** Route paths the client calls (shared literals). */
export const WORKSPACE_API_BASE = '/api/dsh-easyssh';
export const WORKSPACE_API = {
    state: WORKSPACE_API_BASE + '/state',
    tree: WORKSPACE_API_BASE + '/tree',
    file: WORKSPACE_API_BASE + '/file',
    search: WORKSPACE_API_BASE + '/search',
};
