/**
 * Locale dictionaries for the dsh-easyssh surface (zh/en).
 * The key union derives from the zh dictionary (mirrors the dsh-ssh locale
 * pattern), so the LocaleNamespaceMap augmentation types the `t` seat and
 * the register call against exactly the shipped keys.
 */
/** Locale namespace this plugin owns. */
export declare const NS = "dsh-easyssh";
/** The zh dictionary (the key union source). */
export declare const zh: {
    'connect.label': string;
    'connect.tooltip': string;
    'connect.remoteTooltip': string;
    'toggle.tooltipLocal': string;
    'toggle.tooltipRemote': string;
    'toggle.labelLocal': string;
    'toggle.labelRemote': string;
    'panel.exitRemote': string;
    'settings.label': string;
    'settings.hint': string;
    'dialog.title': string;
    'dialog.subtitle': string;
    'dialog.alias': string;
    'dialog.host': string;
    'dialog.port': string;
    'dialog.user': string;
    'dialog.auth': string;
    'dialog.auth.password': string;
    'dialog.auth.key': string;
    'dialog.password': string;
    'dialog.keyPath': string;
    'dialog.passphrase': string;
    'dialog.remoteRoot': string;
    'dialog.remoteRootHint': string;
    'dialog.saveTest': string;
    'dialog.enter': string;
    'dialog.cancel': string;
    'dialog.testing': string;
    'dialog.testOk': string;
    'dialog.testFail': string;
    'dialog.saved': string;
    'dialog.enterHint': string;
    'panel.empty': string;
    'panel.search': string;
    'panel.loading': string;
    'panel.openFailed': string;
    'panel.save': string;
    'panel.saveFail': string;
    'panel.saved': string;
    'panel.conflictTitle': string;
    'panel.conflictOverwrite': string;
    'panel.conflictAbort': string;
    'panel.close': string;
    'panel.notText': string;
    'panel.rootSwitch': string;
    'panel.rootPlaceholder': string;
    'panel.rootApply': string;
    'panel.collapse': string;
    'panel.expand': string;
    'panel.modeLocal': string;
    'panel.modeRemote': string;
    'panel.searchEmpty': string;
};
/** The key union (used by the LocaleNamespaceMap augmentation). */
export type WorkspaceKey = keyof typeof zh;
/** The en dictionary (same key set). */
export declare const en: Record<WorkspaceKey, string>;
/** The dictionary pair registered into the locale service. */
export declare const dictionaries: {
    readonly zh: {
        'connect.label': string;
        'connect.tooltip': string;
        'connect.remoteTooltip': string;
        'toggle.tooltipLocal': string;
        'toggle.tooltipRemote': string;
        'toggle.labelLocal': string;
        'toggle.labelRemote': string;
        'panel.exitRemote': string;
        'settings.label': string;
        'settings.hint': string;
        'dialog.title': string;
        'dialog.subtitle': string;
        'dialog.alias': string;
        'dialog.host': string;
        'dialog.port': string;
        'dialog.user': string;
        'dialog.auth': string;
        'dialog.auth.password': string;
        'dialog.auth.key': string;
        'dialog.password': string;
        'dialog.keyPath': string;
        'dialog.passphrase': string;
        'dialog.remoteRoot': string;
        'dialog.remoteRootHint': string;
        'dialog.saveTest': string;
        'dialog.enter': string;
        'dialog.cancel': string;
        'dialog.testing': string;
        'dialog.testOk': string;
        'dialog.testFail': string;
        'dialog.saved': string;
        'dialog.enterHint': string;
        'panel.empty': string;
        'panel.search': string;
        'panel.loading': string;
        'panel.openFailed': string;
        'panel.save': string;
        'panel.saveFail': string;
        'panel.saved': string;
        'panel.conflictTitle': string;
        'panel.conflictOverwrite': string;
        'panel.conflictAbort': string;
        'panel.close': string;
        'panel.notText': string;
        'panel.rootSwitch': string;
        'panel.rootPlaceholder': string;
        'panel.rootApply': string;
        'panel.collapse': string;
        'panel.expand': string;
        'panel.modeLocal': string;
        'panel.modeRemote': string;
        'panel.searchEmpty': string;
    };
    readonly en: Record<"connect.label" | "connect.tooltip" | "connect.remoteTooltip" | "toggle.tooltipLocal" | "toggle.tooltipRemote" | "toggle.labelLocal" | "toggle.labelRemote" | "panel.exitRemote" | "settings.label" | "settings.hint" | "dialog.title" | "dialog.subtitle" | "dialog.alias" | "dialog.host" | "dialog.port" | "dialog.user" | "dialog.auth" | "dialog.auth.password" | "dialog.auth.key" | "dialog.password" | "dialog.keyPath" | "dialog.passphrase" | "dialog.remoteRoot" | "dialog.remoteRootHint" | "dialog.saveTest" | "dialog.enter" | "dialog.cancel" | "dialog.testing" | "dialog.testOk" | "dialog.testFail" | "dialog.saved" | "dialog.enterHint" | "panel.empty" | "panel.search" | "panel.loading" | "panel.openFailed" | "panel.save" | "panel.saveFail" | "panel.saved" | "panel.conflictTitle" | "panel.conflictOverwrite" | "panel.conflictAbort" | "panel.close" | "panel.notText" | "panel.rootSwitch" | "panel.rootPlaceholder" | "panel.rootApply" | "panel.collapse" | "panel.expand" | "panel.modeLocal" | "panel.modeRemote" | "panel.searchEmpty", string>;
};
//# sourceMappingURL=locales.d.ts.map