/**
 * Agent tools: the DSH-native counterpart of ssh-skill's CLI. Every tool
 * talks to the same engine the web UI uses, so a host configured in the GUI
 * is immediately operable by any agent, and vice versa.
 */
import type { SshEngine } from './engine.ts';
/** The host-list tool. */
export declare function sshListTool(engine: SshEngine): import("@deepseek-ai/dsh-tools").ToolDefinition;
/** The command-execution tool. */
export declare function sshExecTool(engine: SshEngine): import("@deepseek-ai/dsh-tools").ToolDefinition;
/** The upload tool. */
export declare function sshUploadTool(engine: SshEngine): import("@deepseek-ai/dsh-tools").ToolDefinition;
/** The download tool. */
export declare function sshDownloadTool(engine: SshEngine): import("@deepseek-ai/dsh-tools").ToolDefinition;
/** The tunnel tool. */
export declare function sshTunnelTool(engine: SshEngine): import("@deepseek-ai/dsh-tools").ToolDefinition;
/** The cluster tool. */
export declare function sshClusterTool(engine: SshEngine): import("@deepseek-ai/dsh-tools").ToolDefinition;
