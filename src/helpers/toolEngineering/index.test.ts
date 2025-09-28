import { LobeChatPluginManifest } from '@lobehub/chat-plugin-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createChatToolsEngine, createToolsEngine, getEnabledTools } from './index';

// Mock the store and helper dependencies
vi.mock('@/store/tool', () => ({
  getToolStoreState: () => ({
    builtinTools: [
      {
        identifier: 'search',
        manifest: {
          api: [
            {
              description: 'Search the web',
              name: 'search',
              parameters: {
                properties: {
                  query: { description: 'Search query', type: 'string' },
                },
                required: ['query'],
                type: 'object',
              },
            },
          ],
          identifier: 'search',
          meta: {
            title: 'Web Search',
            description: 'Search tool',
            avatar: '🔍',
          },
          type: 'builtin',
        } as unknown as LobeChatPluginManifest,
        type: 'builtin' as const,
      },
      {
        identifier: 'lobe-web-browsing',
        manifest: {
          api: [
            {
              description:
                'a search service. Useful for when you need to answer questions about current events. Input should be a search query. Output is a JSON array of the query results',
              name: 'search',
              parameters: {
                properties: {
                  query: { description: 'The search query', type: 'string' },
                },
                required: ['query'],
                type: 'object',
              },
            },
          ],
          identifier: 'lobe-web-browsing',
          meta: {
            title: 'Web Browsing',
            avatar: '🌐',
          },
          type: 'builtin',
        } as unknown as LobeChatPluginManifest,
        type: 'builtin' as const,
      },
    ],
  }),
}));

vi.mock('@/store/tool/selectors', () => ({
  pluginSelectors: {
    installedPluginManifestList: () => [],
  },
}));

vi.mock('../isCanUseFC', () => ({
  isCanUseFC: () => true,
}));

vi.mock('@/helpers/getSearchConfig', () => ({
  getSearchConfig: () => ({
    useApplicationBuiltinSearchTool: true,
  }),
}));

describe('toolEngineering', () => {
  describe('createToolsEngine', () => {
    it('should generate tools array for enabled plugins', () => {
      const toolsEngine = createToolsEngine();
      const result = toolsEngine.generateTools({
        toolIds: ['search'],
        model: 'gpt-4',
        provider: 'openai',
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result![0]).toMatchObject({
        function: {
          description: 'Search the web',
          name: 'search____search____builtin',
          parameters: {
            properties: {
              query: { description: 'Search query', type: 'string' },
            },
            required: ['query'],
            type: 'object',
          },
        },
        type: 'function',
      });
    });

    it('should return undefined when no plugins match', () => {
      const toolsEngine = createToolsEngine();
      const result = toolsEngine.generateTools({
        toolIds: ['non-existent'],
        model: 'gpt-4',
        provider: 'openai',
      });

      expect(result).toBeUndefined();
    });

    it('should return detailed result with correct field names', () => {
      const toolsEngine = createToolsEngine();
      const result = toolsEngine.generateToolsDetailed({
        toolIds: ['search'],
        model: 'gpt-4',
        provider: 'openai',
      });

      expect(result).toHaveProperty('enabledToolIds');
      expect(result).toHaveProperty('filteredTools');
      expect(result).toHaveProperty('tools');
      expect(result.enabledToolIds).toEqual(['search']);
      expect(result.filteredTools).toEqual([]);
      expect(result.tools).toHaveLength(1);
    });
  });

  describe('createChatToolsEngine', () => {
    it('should include web browsing tool as default when no tools are provided', () => {
      const toolsEngine = createChatToolsEngine({
        model: 'gpt-4',
        provider: 'openai',
      });

      const result = toolsEngine.generateToolsDetailed({
        toolIds: [], // No explicitly enabled tools
        model: 'gpt-4',
        provider: 'openai',
      });

      expect(result.enabledToolIds).toContain('lobe-web-browsing');
    });

    it('should include web browsing tool alongside user-provided tools', () => {
      const toolsEngine = createChatToolsEngine({
        model: 'gpt-4',
        provider: 'openai',
      });

      const result = toolsEngine.generateToolsDetailed({
        toolIds: ['search'], // User explicitly enables search tool
        model: 'gpt-4',
        provider: 'openai',
      });

      expect(result.enabledToolIds).toEqual(['search', 'lobe-web-browsing']);
      expect(result.enabledToolIds).toHaveLength(2);
    });
  });

  describe('Migration functions', () => {
    describe('getEnabledTools', () => {
      it('should return empty array when no tool IDs provided', () => {
        const result = getEnabledTools([], 'gpt-4', 'openai');
        expect(result).toEqual([]);
      });

      it('should return tools for valid tool IDs', () => {
        const result = getEnabledTools(['search'], 'gpt-4', 'openai');
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('type', 'function');
        expect(result[0].function).toHaveProperty('name', 'search____search____builtin');
      });

      it('should use provided model and provider', () => {
        const result = getEnabledTools(['search'], 'gpt-3.5-turbo', 'anthropic');
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should return empty array for non-existent tools', () => {
        const result = getEnabledTools(['non-existent-tool'], 'gpt-4', 'openai');
        expect(result).toEqual([]);
      });
    });
  });
});
