import { ModelProvider, openrouter as OpenRouterModels } from 'model-bank';

import {
  OpenAICompatibleFactoryOptions,
  createOpenAICompatibleRuntime,
} from '../../core/openaiCompatibleFactory';
import { processMultiProviderModelList } from '../../utils/modelParse';
import { OpenRouterModelCard, OpenRouterReasoning } from './type';

const formatPrice = (price?: string) => {
  if (price === undefined || price === '-1') return undefined;
  return Number((Number(price) * 1e6).toPrecision(5));
};

export const params = {
  baseURL: 'https://openrouter.ai/api/v1',
  chatCompletion: {
    handlePayload: (payload) => {
      const { thinking, model, max_tokens } = payload;

      let reasoning: OpenRouterReasoning = {};

      if (thinking?.type === 'enabled') {
        const modelConfig = OpenRouterModels.find((m) => m.id === model);
        const defaultMaxOutput = modelConfig?.maxOutput;

        // 配置优先级：用户设置 > 模型配置 > 硬编码默认值
        const getMaxTokens = () => {
          if (max_tokens) return max_tokens;
          if (defaultMaxOutput) return defaultMaxOutput;
          return undefined;
        };

        const maxTokens = getMaxTokens() || 32_000; // Claude Opus 4 has minimum maxOutput

        reasoning = {
          max_tokens: thinking?.budget_tokens
            ? Math.min(thinking.budget_tokens, maxTokens - 1)
            : 1024,
        };
      }

      return {
        ...payload,
        model: payload.enabledSearch ? `${payload.model}:online` : payload.model,
        reasoning,
        stream: payload.stream ?? true,
      } as any;
    },
  },
  constructorOptions: {
    defaultHeaders: {
      'HTTP-Referer': 'https://lobehub.com',
      'X-Title': 'LobeHub',
    },
  },
  debug: {
    chatCompletion: () => process.env.DEBUG_OPENROUTER_CHAT_COMPLETION === '1',
  },
  models: async () => {
    let modelList: OpenRouterModelCard[] = [];

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models');
      if (response.ok) {
        const data = await response.json();
        modelList = data['data'];
      }
    } catch (error) {
      console.error('Failed to fetch OpenRouter frontend models:', error);
      return [];
    }

    // 处理前端获取的模型信息，转换为标准格式
    const formattedModels = modelList.map((model) => {
      const { top_provider, architecture, pricing, supported_parameters } = model;

      const inputModalities = architecture.input_modalities || [];

      // 处理 name，默认去除冒号及其前面的内容
      let displayName = model.name;
      const colonIndex = displayName.indexOf(':');
      if (colonIndex !== -1) {
        const prefix = displayName.slice(0, Math.max(0, colonIndex)).trim();
        const suffix = displayName.slice(Math.max(0, colonIndex + 1)).trim();

        const isDeepSeekPrefix = prefix.toLowerCase() === 'deepseek';
        const suffixHasDeepSeek = suffix.toLowerCase().includes('deepseek');

        if (isDeepSeekPrefix && !suffixHasDeepSeek) {
          displayName = model.name;
        } else {
          displayName = suffix;
        }
      }

      const inputPrice = formatPrice(pricing.prompt);
      const outputPrice = formatPrice(pricing.completion);
      const cachedInputPrice = formatPrice(pricing.input_cache_read);
      const writeCacheInputPrice = formatPrice(pricing.input_cache_write);

      const isFree = (inputPrice === 0 || outputPrice === 0) && !displayName.endsWith('(free)');
      if (isFree) {
        displayName += ' (free)';
      }

      return {
        contextWindowTokens: top_provider.context_length || model.context_length,
        description: model.description,
        displayName,
        functionCall: supported_parameters.includes('tools'),
        id: model.id,
        maxOutput:
          typeof top_provider.max_completion_tokens === 'number'
            ? top_provider.max_completion_tokens
            : undefined,
        pricing: {
          cachedInput: cachedInputPrice,
          input: inputPrice,
          output: outputPrice,
          writeCacheInput: writeCacheInputPrice,
        },
        reasoning: supported_parameters.includes('reasoning'),
        releasedAt: new Date(model.created * 1000).toISOString().split('T')[0],
        vision: inputModalities.includes('image'),
      };
    });

    return await processMultiProviderModelList(formattedModels, 'openrouter');
  },
  provider: ModelProvider.OpenRouter,
} satisfies OpenAICompatibleFactoryOptions;

export const LobeOpenRouterAI = createOpenAICompatibleRuntime(params);
