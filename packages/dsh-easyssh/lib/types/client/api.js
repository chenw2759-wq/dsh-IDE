/**
 * Browser-side API clients: the /api/dsh-easyssh route family plus the
 * two /api/dsh-ssh endpoints the config dialog needs (host create + test).
 * Plain fetch, same origin — the only data path the panel components use.
 */
import { WORKSPACE_API, } from "../protocol.js";
/** Error carrying the route's JSON error message. */
export class WorkspaceApiError extends Error {
    constructor(message) {
        super(message);
        this.name = 'WorkspaceApiError';
    }
}
/** Parse a JSON response or throw a WorkspaceApiError. */
async function readJson(response) {
    let body;
    try {
        body = await response.json();
    }
    catch {
        throw new WorkspaceApiError(`HTTP ${response.status}: invalid JSON response`);
    }
    if (!response.ok) {
        const message = typeof body === 'object' && body !== null && typeof body.error === 'string'
            ? body.error
            : `HTTP ${response.status}`;
        throw new WorkspaceApiError(message);
    }
    return body;
}
/** Query-string helper. */
function query(params) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '')
            search.set(key, String(value));
    }
    const text = search.toString();
    return text === '' ? '' : '?' + text;
}
/** The workspace route family client. */
export class WorkspaceApi {
    async getState() {
        const response = await fetch(WORKSPACE_API.state);
        const body = await readJson(response);
        return body.state;
    }
    async setModeLocal() {
        const response = await fetch(WORKSPACE_API.state, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ mode: 'local' }),
        });
        const body = await readJson(response);
        return body.state;
    }
    async setModeRemote(alias, remoteRoot) {
        const response = await fetch(WORKSPACE_API.state, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ mode: 'remote', alias, remoteRoot }),
        });
        const body = await readJson(response);
        return body.state;
    }
    async list(root, path) {
        const response = await fetch(WORKSPACE_API.tree + query({ root, path }));
        const body = await readJson(response);
        return body.listing;
    }
    async read(root, path) {
        const response = await fetch(WORKSPACE_API.file + query({ root, path }));
        const body = await readJson(response);
        return body.file;
    }
    async write(root, path, content, expectedMtime) {
        const response = await fetch(WORKSPACE_API.file, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ root, path, content, expectedMtime }),
        });
        const body = await readJson(response);
        return body.result;
    }
    async search(root, queryText) {
        const response = await fetch(WORKSPACE_API.search + query({ root, query: queryText }));
        const body = await readJson(response);
        return body.search;
    }
}
const HOSTS_API = '/api/dsh-ssh/hosts';
const TEST_API = '/api/dsh-ssh/test';
export class SshHostsApi {
    async list() {
        const response = await fetch(HOSTS_API);
        const body = await readJson(response);
        return body.hosts;
    }
    async create(payload) {
        const response = await fetch(HOSTS_API, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const body = await readJson(response);
        return body.host;
    }
    async test(alias) {
        const response = await fetch(TEST_API, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ alias }),
        });
        const body = await readJson(response);
        return body.result;
    }
}
