import debug from 'debug';

import {
  FunctionCallChecker,
  GenerateToolsParams,
  LobeChatPluginManifest,
  PluginEnableChecker,
  ToolsEngineOptions,
  ToolsGenerationContext,
  ToolsGenerationResult,
  UniformTool,
} from './types';
import { generateToolName } from './utils';

const log = debug('context-engine:tools-engine');

/**
 * Tools Engine - Unified processing of tools array construction and transformation
 */
export class ToolsEngine {
  private manifestSchemas: Map<string, LobeChatPluginManifest>;
  private enableChecker?: PluginEnableChecker;
  private functionCallChecker?: FunctionCallChecker;
  private defaultToolIds: string[];
  private options: ToolsEngineOptions;

  constructor(options: ToolsEngineOptions) {
    this.options = options;
    this.defaultToolIds = options.defaultToolIds || [];
    log(
      'Initializing ToolsEngine with %d manifest schemas and %d default tools',
      options.manifestSchemas.length,
      this.defaultToolIds.length,
    );

    // Convert manifest schemas to Map for improved lookup performance
    this.manifestSchemas = new Map(
      options.manifestSchemas.map((schema) => [schema.identifier, schema]),
    );
    this.enableChecker = options.enableChecker;
    this.functionCallChecker = options.functionCallChecker;

    log(
      'ToolsEngine initialized with plugins: %o, default tools: %o',
      Array.from(this.manifestSchemas.keys()),
      this.defaultToolIds,
    );
  }

  /**
   * Generate tools array
   * @param params Tools generation parameters
   * @returns Processed tools array, or undefined if tools should not be enabled
   */
  generateTools(params: GenerateToolsParams): UniformTool[] | undefined {
    const { toolIds = [], model, provider, context } = params;

    // Merge user-provided tool IDs with default tool IDs
    const allToolIds = [...toolIds, ...this.defaultToolIds];

    log(
      'Generating tools for model=%s, provider=%s, pluginIds=%o (includes %d default tools)',
      model,
      provider,
      allToolIds,
      this.defaultToolIds.length,
    );

    // 1. Check if model supports Function Calling
    if (!this.checkFunctionCallSupport(model, provider)) {
      log('Function calling not supported for model=%s, provider=%s', model, provider);
      return undefined;
    }

    // 2. Filter and validate plugins
    const { enabledManifests } = this.filterEnabledPlugins(allToolIds, model, provider, context);

    // 3. If no tools available, return undefined
    if (enabledManifests.length === 0) {
      log('No enabled manifests found, returning undefined');
      return undefined;
    }

    // 4. Convert to UniformTool format
    const tools = this.convertManifestsToTools(enabledManifests);
    log('Generated %d tools from %d manifests', tools.length, enabledManifests.length);

    return tools;
  }

  /**
   * Generate tools array (detailed version)
   * @param params Tools generation parameters
   * @returns Detailed tools generation result
   */
  generateToolsDetailed(params: GenerateToolsParams): ToolsGenerationResult {
    const { toolIds = [], model, provider, context } = params;

    // Merge user-provided tool IDs with default tool IDs
    const allToolIds = [...toolIds, ...this.defaultToolIds];

    log(
      'Generating detailed tools for model=%s, provider=%s, pluginIds=%o (includes %d default tools)',
      model,
      provider,
      allToolIds,
      this.defaultToolIds.length,
    );

    // Filter and validate plugins
    const { enabledManifests, filteredPlugins } = this.filterEnabledPlugins(
      allToolIds,
      model,
      provider,
      context,
    );

    // Convert to UniformTool format
    const tools = this.convertManifestsToTools(enabledManifests);

    log(
      'Generated detailed result: enabled=%d, filtered=%d, tools=%d',
      enabledManifests.length,
      filteredPlugins.length,
      tools.length,
    );

    return {
      enabledToolIds: enabledManifests.map((m) => m.identifier),
      filteredTools: filteredPlugins,
      tools: tools.length > 0 ? tools : undefined,
    };
  }

  /**
   * Check if model supports Function Calling
   */
  private checkFunctionCallSupport(model: string, provider: string): boolean {
    if (this.functionCallChecker) {
      const result = this.functionCallChecker(model, provider);
      log('Function calling check result for %s/%s: %s', model, provider, result);
      return result;
    }

    // Default to assuming Function Calling is supported
    log('No function calling checker provided, defaulting to true');
    return true;
  }

  /**
   * Filter enabled plugins
   */
  private filterEnabledPlugins(
    pluginIds: string[],
    model: string,
    provider: string,
    context?: ToolsGenerationContext,
  ): {
    enabledManifests: LobeChatPluginManifest[];
    filteredPlugins: Array<{
      id: string;
      reason: 'not_found' | 'disabled' | 'incompatible';
    }>;
  } {
    const enabledManifests: LobeChatPluginManifest[] = [];
    const filteredPlugins: Array<{
      id: string;
      reason: 'not_found' | 'disabled' | 'incompatible';
    }> = [];

    log('Filtering plugins: %o', pluginIds);

    for (const pluginId of pluginIds) {
      const manifest = this.manifestSchemas.get(pluginId);

      if (!manifest) {
        log('Plugin not found: %s', pluginId);
        filteredPlugins.push({ id: pluginId, reason: 'not_found' });
        continue;
      }

      // Use injected checker function or default check logic
      const isEnabled = this.enableChecker
        ? this.enableChecker({
            context,
            manifest,
            model,
            pluginId,
            provider,
          })
        : this.defaultEnabledCheck();

      if (isEnabled) {
        log('Plugin enabled: %s', pluginId);
        enabledManifests.push(manifest);
      } else {
        log('Plugin disabled: %s', pluginId);
        filteredPlugins.push({ id: pluginId, reason: 'disabled' });
      }
    }

    log(
      'Filtering complete: enabled=%d, filtered=%d',
      enabledManifests.length,
      filteredPlugins.length,
    );
    return { enabledManifests, filteredPlugins };
  }

  /**
   * Default enabled check logic
   */
  private defaultEnabledCheck(): boolean {
    // Default to enabling all tools
    return true;
  }

  /**
   * Convert manifests to UniformTool array
   */
  private convertManifestsToTools(manifests: LobeChatPluginManifest[]): UniformTool[] {
    log('Converting %d manifests to tools', manifests.length);

    // Use simplified conversion logic to avoid external package dependencies
    const tools = manifests.flatMap((manifest) =>
      manifest.api.map((api) => ({
        function: {
          description: api.description,
          name: this.generateToolName(manifest.identifier, api.name, manifest.type),
          parameters: api.parameters,
        },
        type: 'function' as const,
      })),
    );

    log('Converted to %d tools', tools.length);
    return tools;
  }

  /**
   * Generate tool calling name
   * Uses external generator if provided, otherwise uses default logic from utils
   */
  private generateToolName(identifier: string, apiName: string, type?: string): string {
    // If external name generator is provided, use it
    if (this.options.generateToolName) {
      return this.options.generateToolName(identifier, apiName, type);
    }

    // Use default tool name generation logic from utils
    return generateToolName(identifier, apiName, type);
  }

  /**
   * 获取可用的插件列表（用于调试和监控）
   */
  getAvailablePlugins(): string[] {
    return Array.from(this.manifestSchemas.keys());
  }

  /**
   * 检查特定插件是否可用
   */
  hasPlugin(pluginId: string): boolean {
    return this.manifestSchemas.has(pluginId);
  }

  /**
   * 获取插件的 manifest
   */
  getPluginManifest(pluginId: string): LobeChatPluginManifest | undefined {
    return this.manifestSchemas.get(pluginId);
  }

  /**
   * 更新插件 manifest schemas（用于动态添加插件）
   */
  updateManifestSchemas(manifestSchemas: LobeChatPluginManifest[]): void {
    this.manifestSchemas.clear();
    for (const schema of manifestSchemas) {
      this.manifestSchemas.set(schema.identifier, schema);
    }
  }

  /**
   * 添加单个插件 manifest
   */
  addPluginManifest(manifest: LobeChatPluginManifest): void {
    this.manifestSchemas.set(manifest.identifier, manifest);
  }

  /**
   * 移除插件 manifest
   */
  removePluginManifest(pluginId: string): boolean {
    return this.manifestSchemas.delete(pluginId);
  }
}
