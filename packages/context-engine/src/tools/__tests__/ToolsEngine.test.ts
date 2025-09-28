import { describe, expect, it, vi } from 'vitest';

import { ToolsEngine } from '../ToolsEngine';
import type { LobeChatPluginManifest } from '../types';

// Mock manifest schemas for testing
const mockWebBrowsingManifest: LobeChatPluginManifest = {
  api: [
    {
      description: 'Search the web',
      name: 'search',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
  ],
  identifier: 'lobe-web-browsing',
  meta: {
    title: 'Web Browsing',
    description: 'Browse the web',
  },
  type: 'builtin',
};

const mockDalleManifest: LobeChatPluginManifest = {
  api: [
    {
      description: 'Generate images',
      name: 'generateImage',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Image prompt' },
        },
        required: ['prompt'],
      },
    },
  ],
  identifier: 'dalle',
  meta: {
    title: 'DALL-E',
    description: 'Generate images',
  },
  type: 'builtin',
};

describe('ToolsEngine', () => {
  describe('constructor', () => {
    it('should initialize with manifest schemas', () => {
      const engine = new ToolsEngine({
        manifestSchemas: [mockWebBrowsingManifest, mockDalleManifest],
      });

      expect(engine.hasPlugin('lobe-web-browsing')).toBe(true);
      expect(engine.hasPlugin('dalle')).toBe(true);
      expect(engine.hasPlugin('non-existent')).toBe(false);
    });

    it('should store available plugins', () => {
      const engine = new ToolsEngine({
        manifestSchemas: [mockWebBrowsingManifest, mockDalleManifest],
      });

      const availablePlugins = engine.getAvailablePlugins();
      expect(availablePlugins).toEqual(['lobe-web-browsing', 'dalle']);
    });
  });

  describe('generateTools', () => {
    it('should return undefined when function calling is not supported', () => {
      const mockFunctionCallChecker = vi.fn().mockReturnValue(false);
      const engine = new ToolsEngine({
        manifestSchemas: [mockWebBrowsingManifest],
        functionCallChecker: mockFunctionCallChecker,
      });

      const result = engine.generateTools({
        toolIds: ['lobe-web-browsing'],
        model: 'gpt-3.5-turbo',
        provider: 'openai',
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when no plugins are enabled', () => {
      const mockEnableChecker = vi.fn().mockReturnValue(false);
      const engine = new ToolsEngine({
        manifestSchemas: [mockWebBrowsingManifest],
        enableChecker: mockEnableChecker,
        functionCallChecker: () => true,
      });

      const result = engine.generateTools({
        toolIds: ['lobe-web-browsing'],
        model: 'gpt-4',
        provider: 'openai',
      });

      expect(result).toBeUndefined();
      expect(mockEnableChecker).toHaveBeenCalledWith({
        pluginId: 'lobe-web-browsing',
        manifest: mockWebBrowsingManifest,
        model: 'gpt-4',
        provider: 'openai',
        context: undefined,
      });
    });

    it('should generate tools when plugins are enabled', () => {
      const engine = new ToolsEngine({
        manifestSchemas: [mockWebBrowsingManifest],
        enableChecker: () => true,
        functionCallChecker: () => true,
      });

      const result = engine.generateTools({
        toolIds: ['lobe-web-browsing'],
        model: 'gpt-4',
        provider: 'openai',
      });

      expect(result).toEqual([
        {
          type: 'function',
          function: {
            name: 'lobe-web-browsing____search____builtin',
            description: 'Search the web',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
              },
              required: ['query'],
            },
          },
        },
      ]);
    });

    it('should pass context to enable checker', () => {
      const mockEnableChecker = vi.fn().mockReturnValue(true);
      const engine = new ToolsEngine({
        manifestSchemas: [mockWebBrowsingManifest],
        enableChecker: mockEnableChecker,
        functionCallChecker: () => true,
      });

      const context = { isSearchEnabled: true };
      engine.generateTools({
        toolIds: ['lobe-web-browsing'],
        model: 'gpt-4',
        provider: 'openai',
        context,
      });

      expect(mockEnableChecker).toHaveBeenCalledWith({
        pluginId: 'lobe-web-browsing',
        manifest: mockWebBrowsingManifest,
        model: 'gpt-4',
        provider: 'openai',
        context,
      });
    });

    it('should handle non-existent plugins gracefully', () => {
      const engine = new ToolsEngine({
        manifestSchemas: [mockWebBrowsingManifest],
        enableChecker: () => true,
        functionCallChecker: () => true,
      });

      const result = engine.generateTools({
        toolIds: ['lobe-web-browsing', 'non-existent'],
        model: 'gpt-4',
        provider: 'openai',
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });
  });

  describe('generateToolsDetailed', () => {
    it('should return detailed results with filtered plugins', () => {
      const engine = new ToolsEngine({
        manifestSchemas: [mockWebBrowsingManifest, mockDalleManifest],
        enableChecker: ({ pluginId }) => pluginId === 'lobe-web-browsing',
        functionCallChecker: () => true,
      });

      const result = engine.generateToolsDetailed({
        toolIds: ['lobe-web-browsing', 'dalle', 'non-existent'],
        model: 'gpt-4',
        provider: 'openai',
      });

      expect(result.tools).toHaveLength(1);
      expect(result.enabledToolIds).toEqual(['lobe-web-browsing']);
      expect(result.filteredTools).toEqual([
        { id: 'dalle', reason: 'disabled' },
        { id: 'non-existent', reason: 'not_found' },
      ]);
    });
  });

  describe('plugin management', () => {
    it('should allow adding new plugin manifest', () => {
      const engine = new ToolsEngine({
        manifestSchemas: [mockWebBrowsingManifest],
      });

      expect(engine.hasPlugin('dalle')).toBe(false);

      engine.addPluginManifest(mockDalleManifest);

      expect(engine.hasPlugin('dalle')).toBe(true);
      expect(engine.getPluginManifest('dalle')).toBe(mockDalleManifest);
    });

    it('should allow removing plugin manifest', () => {
      const engine = new ToolsEngine({
        manifestSchemas: [mockWebBrowsingManifest, mockDalleManifest],
      });

      expect(engine.hasPlugin('dalle')).toBe(true);

      const removed = engine.removePluginManifest('dalle');

      expect(removed).toBe(true);
      expect(engine.hasPlugin('dalle')).toBe(false);
    });

    it('should allow updating all manifest schemas', () => {
      const engine = new ToolsEngine({
        manifestSchemas: [mockWebBrowsingManifest],
      });

      expect(engine.getAvailablePlugins()).toEqual(['lobe-web-browsing']);

      engine.updateManifestSchemas([mockDalleManifest]);

      expect(engine.getAvailablePlugins()).toEqual(['dalle']);
    });
  });

  describe('default behavior', () => {
    it('should use default enable checker when none provided', () => {
      const engine = new ToolsEngine({
        manifestSchemas: [mockWebBrowsingManifest],
        functionCallChecker: () => true,
      });

      const result = engine.generateTools({
        toolIds: ['lobe-web-browsing'],
        model: 'gpt-4',
        provider: 'openai',
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });

    it('should use default function call checker when none provided', () => {
      const engine = new ToolsEngine({
        manifestSchemas: [mockWebBrowsingManifest],
        enableChecker: () => true,
      });

      const result = engine.generateTools({
        toolIds: ['lobe-web-browsing'],
        model: 'gpt-4',
        provider: 'openai',
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });
  });

  describe('ToolsEngine Integration Tests (migrated from enabledSchema)', () => {
    // Mock manifest data similar to the original tool selector tests
    const mockManifests: LobeChatPluginManifest[] = [
      {
        identifier: 'plugin-1',
        api: [{ name: 'api-1', description: 'API 1', parameters: {} }],
        meta: {
          title: 'Plugin 1',
          description: 'Plugin 1 description',
          avatar: '🔧',
        },
        type: 'default',
      },
      {
        identifier: 'plugin-2',
        api: [{ name: 'api-2', description: 'API 2', parameters: {} }],
        meta: {
          title: 'Plugin 2',
          description: 'Plugin 2 description',
          avatar: '⚙️',
        },
        type: 'default',
      },
      {
        identifier: 'plugin-3',
        api: [
          {
            name: 'api-3',
            description: '123123',
            parameters: {
              type: 'object',
              properties: { a: { type: 'string' } },
            },
            // This should not appear in the final result
            url: 'bac',
          },
        ],
        meta: {
          title: 'Plugin 3',
          description: 'Plugin 3 description',
          avatar: '🛠️',
        },
        type: 'default',
      },
      {
        identifier: 'plugin-4',
        api: [{ name: 'api-4', description: 'API 4', parameters: {} }],
        meta: {
          title: 'Plugin 4',
          description: 'Plugin 4 description',
          avatar: '🔩',
        },
        type: 'standalone',
      },
      {
        identifier: 'long-long-plugin-with-id',
        api: [
          {
            name: 'long-long-manifest-long-long-apiName',
            description: 'Long API',
            parameters: {},
          },
        ],
        meta: {
          title: 'Long Plugin',
          description: 'Long plugin description',
          avatar: '📏',
        },
        type: 'default',
      },
      {
        identifier: 'builtin-1',
        api: [{ name: 'builtin-api-1', description: 'Builtin API 1', parameters: {} }],
        meta: {
          title: 'Builtin 1',
          description: 'Builtin 1 description',
          avatar: '🏗️',
        },
        type: 'builtin',
      },
    ];

    const createTestEngine = () => {
      return new ToolsEngine({
        manifestSchemas: mockManifests,
        functionCallChecker: () => true, // Always allow function calls for tests
      });
    };

    describe('basic tool generation', () => {
      it('should return correct tools array for multiple plugins', () => {
        const engine = createTestEngine();
        const result = engine.generateTools({
          toolIds: ['plugin-1', 'plugin-2'],
          model: 'gpt-4',
          provider: 'openai',
        });

        expect(result).toEqual([
          {
            type: 'function',
            function: {
              name: 'plugin-1____api-1',
              description: 'API 1',
              parameters: {},
            },
          },
          {
            type: 'function',
            function: {
              name: 'plugin-2____api-2',
              description: 'API 2',
              parameters: {},
            },
          },
        ]);
      });

      it('should handle standalone plugin type correctly', () => {
        const engine = createTestEngine();
        const result = engine.generateTools({
          toolIds: ['plugin-4'],
          model: 'gpt-4',
          provider: 'openai',
        });

        expect(result).toEqual([
          {
            type: 'function',
            function: {
              name: 'plugin-4____api-4____standalone',
              description: 'API 4',
              parameters: {},
            },
          },
        ]);
      });

      it('should handle builtin plugin type correctly', () => {
        const engine = createTestEngine();
        const result = engine.generateTools({
          toolIds: ['builtin-1'],
          model: 'gpt-4',
          provider: 'openai',
        });

        expect(result).toEqual([
          {
            type: 'function',
            function: {
              name: 'builtin-1____builtin-api-1____builtin',
              description: 'Builtin API 1',
              parameters: {},
            },
          },
        ]);
      });

      it('should return empty array when no plugins match', () => {
        const engine = createTestEngine();
        const result = engine.generateTools({
          toolIds: [],
          model: 'gpt-4',
          provider: 'openai',
        });

        expect(result).toBeUndefined();
      });

      it('should handle non-existent plugins gracefully', () => {
        const engine = createTestEngine();
        const result = engine.generateTools({
          toolIds: ['non-existent-plugin'],
          model: 'gpt-4',
          provider: 'openai',
        });

        expect(result).toBeUndefined();
      });
    });

    describe('long name handling (MD5 hash)', () => {
      it('should return MD5 hash for long API names', () => {
        const engine = createTestEngine();
        const result = engine.generateTools({
          toolIds: ['long-long-plugin-with-id'],
          model: 'gpt-4',
          provider: 'openai',
        });

        expect(result).toHaveLength(1);
        expect(result![0]).toEqual({
          type: 'function',
          function: {
            // The long action name should be hashed
            name: expect.stringMatching(/^long-long-plugin-with-id____MD5HASH_[a-f0-9]+$/),
            description: 'Long API',
            parameters: {},
          },
        });

        // Verify the specific hash matches expected value from original test
        expect(result![0].function.name).toContain('MD5HASH_');
      });
    });

    describe('parameter handling and filtering', () => {
      // fix https://github.com/lobehub/lobe-chat/issues/2036
      it('should not include URL field in function parameters', () => {
        const engine = createTestEngine();
        const result = engine.generateTools({
          toolIds: ['plugin-3'],
          model: 'gpt-4',
          provider: 'openai',
        });

        expect(result).toHaveLength(1);
        expect(result![0].function).toEqual({
          description: '123123',
          name: 'plugin-3____api-3',
          parameters: {
            properties: {
              a: {
                type: 'string',
              },
            },
            type: 'object',
          },
        });

        // Ensure URL is not included
        expect(result![0].function).not.toHaveProperty('url');
      });

      it('should preserve all other API properties correctly', () => {
        const engine = createTestEngine();
        const result = engine.generateTools({
          toolIds: ['plugin-3'],
          model: 'gpt-4',
          provider: 'openai',
        });

        const func = result![0].function;
        expect(func.description).toBe('123123');
        expect(func.name).toBe('plugin-3____api-3');
        expect(func.parameters).toEqual({
          type: 'object',
          properties: { a: { type: 'string' } },
        });
      });
    });

    describe('function calling support', () => {
      it('should return undefined when function calling is not supported', () => {
        const engine = new ToolsEngine({
          manifestSchemas: mockManifests,
          functionCallChecker: () => false, // Disable function calls
        });

        const result = engine.generateTools({
          toolIds: ['plugin-1'],
          model: 'gpt-3.5-turbo',
          provider: 'openai',
        });

        expect(result).toBeUndefined();
      });

      it('should respect function calling checker logic', () => {
        const engine = new ToolsEngine({
          manifestSchemas: mockManifests,
          functionCallChecker: (model: string) => model.includes('gpt-4'), // Only allow GPT-4
        });

        // Should work with GPT-4
        const result1 = engine.generateTools({
          toolIds: ['plugin-1'],
          model: 'gpt-4',
          provider: 'openai',
        });
        expect(result1).toBeDefined();
        expect(result1).toHaveLength(1);

        // Should not work with GPT-3.5
        const result2 = engine.generateTools({
          toolIds: ['plugin-1'],
          model: 'gpt-3.5-turbo',
          provider: 'openai',
        });
        expect(result2).toBeUndefined();
      });
    });

    describe('plugin enable filtering', () => {
      it('should respect enable checker logic', () => {
        const engine = new ToolsEngine({
          manifestSchemas: mockManifests,
          functionCallChecker: () => true,
          enableChecker: ({ pluginId }) => pluginId === 'plugin-1', // Only enable plugin-1
        });

        const result = engine.generateTools({
          toolIds: ['plugin-1', 'plugin-2'],
          model: 'gpt-4',
          provider: 'openai',
        });

        expect(result).toHaveLength(1);
        expect(result![0].function.name).toBe('plugin-1____api-1');
      });

      it('should return undefined when no plugins are enabled', () => {
        const engine = new ToolsEngine({
          manifestSchemas: mockManifests,
          functionCallChecker: () => true,
          enableChecker: () => false, // Disable all plugins
        });

        const result = engine.generateTools({
          toolIds: ['plugin-1', 'plugin-2'],
          model: 'gpt-4',
          provider: 'openai',
        });

        expect(result).toBeUndefined();
      });
    });

    describe('detailed generation results', () => {
      it('should provide detailed filtering information', () => {
        const engine = new ToolsEngine({
          manifestSchemas: mockManifests,
          functionCallChecker: () => true,
          enableChecker: ({ pluginId }) => pluginId === 'plugin-1',
        });

        const result = engine.generateToolsDetailed({
          toolIds: ['plugin-1', 'plugin-2', 'non-existent'],
          model: 'gpt-4',
          provider: 'openai',
        });

        expect(result.tools).toHaveLength(1);
        expect(result.enabledToolIds).toEqual(['plugin-1']);
        expect(result.filteredTools).toEqual([
          { id: 'plugin-2', reason: 'disabled' },
          { id: 'non-existent', reason: 'not_found' },
        ]);
      });
    });
  });

  /**
   * Migration tests: Demonstrating that ToolsEngine can replace enabledSchema
   * These tests show the equivalence between the old selector-based approach
   * and the new ToolsEngine-based approach
   */
  describe('enabledSchema Migration to ToolsEngine', () => {
    // Sample manifest data that mimics the old toolSelectors test data
    const sampleManifests: LobeChatPluginManifest[] = [
      {
        identifier: 'plugin-1',
        api: [{ name: 'api-1', description: 'API 1', parameters: {} }],
        meta: {
          title: 'Plugin 1',
          description: 'Plugin 1 description',
          avatar: '🔧',
        },
        type: 'default',
      },
      {
        identifier: 'plugin-2',
        api: [{ name: 'api-2', description: 'API 2', parameters: {} }],
        meta: {
          title: 'Plugin 2',
          description: 'Plugin 2 description',
          avatar: '⚙️',
        },
        type: 'default',
      },
      {
        identifier: 'standalone-plugin',
        api: [{ name: 'standalone-api', description: 'Standalone API', parameters: {} }],
        meta: {
          title: 'Standalone Plugin',
          description: 'Standalone plugin description',
          avatar: '🔩',
        },
        type: 'standalone',
      },
    ];

    describe('basic functionality comparison', () => {
      it('should generate the same tool names as enabledSchema did', () => {
        const engine = new ToolsEngine({
          manifestSchemas: sampleManifests,
          functionCallChecker: () => true,
        });

        const result = engine.generateTools({
          toolIds: ['plugin-1', 'plugin-2'],
          model: 'gpt-4',
          provider: 'openai',
        });

        // These should match the format that enabledSchema produced
        expect(result).toEqual([
          {
            type: 'function',
            function: {
              name: 'plugin-1____api-1',
              description: 'API 1',
              parameters: {},
            },
          },
          {
            type: 'function',
            function: {
              name: 'plugin-2____api-2',
              description: 'API 2',
              parameters: {},
            },
          },
        ]);
      });

      it('should handle type suffixes the same way enabledSchema did', () => {
        const engine = new ToolsEngine({
          manifestSchemas: sampleManifests,
          functionCallChecker: () => true,
        });

        const result = engine.generateTools({
          toolIds: ['standalone-plugin'],
          model: 'gpt-4',
          provider: 'openai',
        });

        expect(result![0].function.name).toBe('standalone-plugin____standalone-api____standalone');
      });
    });

    describe('advantages of ToolsEngine over enabledSchema', () => {
      it('provides detailed filtering information that enabledSchema could not', () => {
        const engine = new ToolsEngine({
          manifestSchemas: sampleManifests,
          functionCallChecker: () => true,
          enableChecker: ({ pluginId }) => pluginId === 'plugin-1',
        });

        const result = engine.generateToolsDetailed({
          toolIds: ['plugin-1', 'plugin-2', 'non-existent'],
          model: 'gpt-4',
          provider: 'openai',
        });

        expect(result).toEqual({
          tools: [
            {
              type: 'function',
              function: {
                name: 'plugin-1____api-1',
                description: 'API 1',
                parameters: {},
              },
            },
          ],
          enabledToolIds: ['plugin-1'],
          filteredTools: [
            { id: 'plugin-2', reason: 'disabled' },
            { id: 'non-existent', reason: 'not_found' },
          ],
        });
      });

      it('supports function calling checks that enabledSchema relied on external logic for', () => {
        const engine = new ToolsEngine({
          manifestSchemas: sampleManifests,
          functionCallChecker: (model: string) => model.includes('gpt-4'),
        });

        // Should work with GPT-4
        const result1 = engine.generateTools({
          toolIds: ['plugin-1'],
          model: 'gpt-4',
          provider: 'openai',
        });
        expect(result1).toBeDefined();

        // Should not work with older models
        const result2 = engine.generateTools({
          toolIds: ['plugin-1'],
          model: 'gpt-3.5-turbo',
          provider: 'openai',
        });
        expect(result2).toBeUndefined();
      });

      it('encapsulates all tool generation logic in one place', () => {
        // This demonstrates that ToolsEngine combines:
        // 1. Manifest filtering (what enabledSchema did)
        // 2. Function calling support checks (what prepareTools did)
        // 3. Tool name generation (what genToolCallingName did)
        // 4. Plugin enable checking (custom logic)

        const engine = new ToolsEngine({
          manifestSchemas: sampleManifests,
          functionCallChecker: (model: string, provider: string) => {
            return model.includes('gpt') && provider === 'openai';
          },
          enableChecker: ({ pluginId, model }) => {
            // Custom business logic that was scattered before
            if (model === 'gpt-3.5-turbo') return false;
            return pluginId !== 'plugin-2'; // Skip plugin-2 for demo
          },
        });

        const result = engine.generateTools({
          toolIds: ['plugin-1', 'plugin-2'],
          model: 'gpt-4',
          provider: 'openai',
        });

        // Only plugin-1 should be enabled due to custom logic
        expect(result).toHaveLength(1);
        expect(result![0].function.name).toBe('plugin-1____api-1');
      });
    });
  });
});
