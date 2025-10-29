import { ReactNode } from 'react';
import { z } from 'zod';

import { HumanInterventionConfigSchema, HumanInterventionPolicySchema } from './intervention';
import type { HumanInterventionConfig, HumanInterventionPolicy } from './intervention';

interface Meta {
  /**
   * avatar
   * @desc Avatar of the plugin
   * @nameCN 头像
   * @descCN 插件的头像
   */
  avatar?: string;
  /**
   * description
   * @desc Description of the plugin
   * @nameCN 描述
   * @descCN 插件的描述
   */
  description?: string;
  /**
   * tags
   * @desc Tags of the plugin
   * @nameCN 标签
   * @descCN 插件的标签
   */
  tags?: string[];
  title: string;
}

const MetaSchema = z.object({
  avatar: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  title: z.string(),
});

export interface LobeChatPluginApi {
  description: string;
  /**
   * Human intervention configuration
   * Controls when and how the tool requires human approval/selection
   *
   * Can be either:
   * - Simple: A policy string ('never', 'always', 'first')
   * - Complex: Array of rules for parameter-level control
   *
   * Examples:
   * - 'always' - always require intervention
   * - [{ match: { command: "git add:*" }, policy: "never" }, { policy: "always" }]
   */
  humanIntervention?: HumanInterventionConfig;
  name: string;
  parameters: Record<string, any>;
  url?: string;
}

export const LobeChatPluginApiSchema = z.object({
  description: z.string(),
  humanIntervention: HumanInterventionConfigSchema.optional(),
  name: z.string(),
  parameters: z.record(z.string(), z.any()),
  url: z.string().optional(),
});

export interface BuiltinToolManifest {
  api: LobeChatPluginApi[];

  /**
   * Tool-level default human intervention policy
   * This policy applies to all APIs that don't specify their own policy
   *
   * @default 'never'
   */
  humanIntervention?: HumanInterventionPolicy;

  /**
   * Plugin name
   */
  identifier: string;
  /**
   * metadata
   * @desc Meta data of the plugin
   */
  meta: Meta;
  systemRole: string;
  /**
   * plugin runtime type
   * @default default
   */
  type?: 'builtin';
}

export const BuiltinToolManifestSchema = z.object({
  api: z.array(LobeChatPluginApiSchema),
  humanIntervention: HumanInterventionPolicySchema.optional(),
  identifier: z.string(),
  meta: MetaSchema,
  systemRole: z.string(),
  type: z.literal('builtin').optional(),
});

export interface LobeBuiltinTool {
  hidden?: boolean;
  identifier: string;
  manifest: BuiltinToolManifest;
  type: 'builtin';
}

export const LobeBuiltinToolSchema = z.object({
  hidden: z.boolean().optional(),
  identifier: z.string(),
  manifest: BuiltinToolManifestSchema,
  type: z.literal('builtin'),
});

export interface BuiltinRenderProps<Content = any, Arguments = any, State = any> {
  apiName?: string;
  args: Arguments;
  content: Content;
  identifier?: string;
  messageId: string;
  pluginError?: any;
  pluginState?: State;
}

export type BuiltinRender = <T = any>(props: BuiltinRenderProps<T>) => ReactNode;

export interface BuiltinPortalProps<Arguments = Record<string, any>, State = any> {
  apiName?: string;
  arguments: Arguments;
  identifier: string;
  messageId: string;
  state: State;
}

export type BuiltinPortal = <T = any>(props: BuiltinPortalProps<T>) => ReactNode;

export interface BuiltinPlaceholderProps {
  apiName: string;
  args?: Record<string, any>;
  identifier: string;
}

export type BuiltinPlaceholder = (props: BuiltinPlaceholderProps) => ReactNode;

export interface BuiltinServerRuntimeOutput {
  content: string;
  error?: any;
  state?: any;
  success: boolean;
}
