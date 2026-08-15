/** The default remote root: the login user's home, resolved on connect. */
export const DEFAULT_REMOTE_ROOT = '~';
export class RemoteModeStore {
    state = { mode: 'local' };
    listeners = new Set();
    /** The current state (routes/tools read this per request). */
    getSnapshot() {
        return this.state;
    }
    /** Subscribe to state changes; returns the disposer. */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    /** Replace the whole state (routes are the only writers). */
    set(state) {
        this.state = state;
        for (const listener of [...this.listeners])
            listener();
    }
}
