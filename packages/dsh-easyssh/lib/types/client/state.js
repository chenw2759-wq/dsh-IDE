const POLL_MS = 3_000;
export class ModeState {
    api;
    state = { mode: 'local' };
    listeners = new Set();
    timer;
    constructor(api) {
        this.api = api;
    }
    getSnapshot() {
        return this.state;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    emit() {
        for (const listener of [...this.listeners])
            listener();
    }
    /** Re-fetch the host state (no-op on network failure — keep the last view). */
    async refresh() {
        try {
            this.state = await this.api.getState();
            this.emit();
        }
        catch {
            // transient network hiccup: keep the previous snapshot
        }
    }
    start() {
        void this.refresh();
        this.timer = window.setInterval(() => void this.refresh(), POLL_MS);
    }
    stop() {
        if (this.timer !== undefined) {
            window.clearInterval(this.timer);
            this.timer = undefined;
        }
    }
    async setLocal() {
        this.state = await this.api.setModeLocal();
        this.emit();
    }
    async setRemote(alias, remoteRoot) {
        this.state = await this.api.setModeRemote(alias, remoteRoot);
        this.emit();
    }
}
