// @vitest-environment node
import { ModelProvider } from 'model-bank';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { testProvider } from '../../providerTestUtils';
import { LobeDeepSeekAI, params } from './index';

const provider = ModelProvider.DeepSeek;
const defaultBaseURL = 'https://api.deepseek.com/v1';

testProvider({
  Runtime: LobeDeepSeekAI,
  provider,
  defaultBaseURL,
  chatDebugEnv: 'DEBUG_DEEPSEEK_CHAT_COMPLETION',
  chatModel: 'deepseek-r1',
  test: {
    skipAPICall: true,
  },
});

describe('LobeDeepSeekAI - custom features', () => {
  describe('Debug Configuration', () => {
    it('should disable debug by default', () => {
      delete process.env.DEBUG_DEEPSEEK_CHAT_COMPLETION;
      const result = params.debug.chatCompletion();
      expect(result).toBe(false);
    });

    it('should enable debug when env is set', () => {
      process.env.DEBUG_DEEPSEEK_CHAT_COMPLETION = '1';
      const result = params.debug.chatCompletion();
      expect(result).toBe(true);
      delete process.env.DEBUG_DEEPSEEK_CHAT_COMPLETION;
    });
  });

  describe('generateObject configuration', () => {
    it('should use tools calling for generateObject', () => {
      expect(params.generateObject).toBeDefined();
      expect(params.generateObject?.useToolsCalling).toBe(true);
    });
  });

  describe('models', () => {
    const mockClient = {
      models: {
        list: vi.fn(),
      },
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should fetch and process models successfully', async () => {
      mockClient.models.list.mockResolvedValue({
        data: [{ id: 'deepseek-chat' }, { id: 'deepseek-coder' }, { id: 'deepseek-r1' }],
      });

      const models = await params.models({ client: mockClient as any });

      expect(mockClient.models.list).toHaveBeenCalledTimes(1);
      expect(models).toHaveLength(3);
      expect(models[0].id).toBe('deepseek-chat');
      expect(models[1].id).toBe('deepseek-coder');
      expect(models[2].id).toBe('deepseek-r1');
    });

    it('should handle single model', async () => {
      mockClient.models.list.mockResolvedValue({
        data: [{ id: 'deepseek-chat' }],
      });

      const models = await params.models({ client: mockClient as any });

      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('deepseek-chat');
    });

    it('should handle empty model list', async () => {
      mockClient.models.list.mockResolvedValue({
        data: [],
      });

      const models = await params.models({ client: mockClient as any });

      expect(models).toEqual([]);
    });

    it('should process models with MODEL_LIST_CONFIGS', async () => {
      mockClient.models.list.mockResolvedValue({
        data: [{ id: 'deepseek-chat' }],
      });

      const models = await params.models({ client: mockClient as any });

      // The processModelList function should merge with known model list
      expect(models[0]).toHaveProperty('id');
      expect(models[0].id).toBe('deepseek-chat');
    });

    it('should preserve model properties from API response', async () => {
      mockClient.models.list.mockResolvedValue({
        data: [
          { id: 'deepseek-chat', extra_field: 'value' },
          { id: 'deepseek-coder', another_field: 123 },
        ],
      });

      const models = await params.models({ client: mockClient as any });

      expect(models).toHaveLength(2);
      expect(models[0].id).toBe('deepseek-chat');
      expect(models[1].id).toBe('deepseek-coder');
    });

    it('should handle models with different id patterns', async () => {
      mockClient.models.list.mockResolvedValue({
        data: [
          { id: 'deepseek-chat' },
          { id: 'deepseek-r1' },
          { id: 'deepseek-reasoner' },
          { id: 'deepseek-v3' },
        ],
      });

      const models = await params.models({ client: mockClient as any });

      expect(models).toHaveLength(4);
      expect(models.every((m) => typeof m.id === 'string')).toBe(true);
    });
  });
});
