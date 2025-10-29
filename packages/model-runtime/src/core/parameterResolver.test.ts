import { describe, expect, it } from 'vitest';

import {
  MODEL_PARAMETER_CONFLICTS,
  createParameterResolver,
  resolveParameters,
} from './parameterResolver';

describe('resolveParameters', () => {
  describe('Basic functionality', () => {
    it('should return empty object when no parameters are provided', () => {
      const result = resolveParameters({}, {});
      expect(result).toEqual({});
    });

    it('should normalize temperature by dividing by 2 by default', () => {
      const result = resolveParameters({ temperature: 1 }, {});
      expect(result).toEqual({ temperature: 0.5 });
    });

    it('should not normalize temperature when normalizeTemperature is false', () => {
      const result = resolveParameters({ temperature: 1 }, { normalizeTemperature: false });
      expect(result).toEqual({ temperature: 1 });
    });

    it('should pass through top_p unchanged', () => {
      const result = resolveParameters({ top_p: 0.9 }, {});
      expect(result).toEqual({ top_p: 0.9 });
    });

    it('should return both parameters when no conflict', () => {
      const result = resolveParameters({ temperature: 1, top_p: 0.9 }, { hasConflict: false });
      expect(result).toEqual({ temperature: 0.5, top_p: 0.9 });
    });
  });

  describe('Conflict handling', () => {
    it('should prefer temperature over top_p when hasConflict is true', () => {
      const result = resolveParameters(
        { temperature: 1, top_p: 0.9 },
        { hasConflict: true, preferTemperature: true },
      );
      expect(result).toEqual({ temperature: 0.5 });
    });

    it('should prefer top_p over temperature when preferTemperature is false', () => {
      const result = resolveParameters(
        { temperature: 1, top_p: 0.9 },
        { hasConflict: true, preferTemperature: false },
      );
      expect(result).toEqual({ top_p: 0.9 });
    });

    it('should return temperature when only temperature is provided with conflict', () => {
      const result = resolveParameters({ temperature: 1 }, { hasConflict: true });
      expect(result).toEqual({ temperature: 0.5 });
    });

    it('should return top_p when only top_p is provided with conflict', () => {
      const result = resolveParameters({ top_p: 0.9 }, { hasConflict: true });
      expect(result).toEqual({ top_p: 0.9 });
    });
  });

  describe('Range constraints', () => {
    it('should apply temperature min constraint', () => {
      const result = resolveParameters(
        { temperature: 0.02 }, // 0.02 / 2 = 0.01
        { temperatureRange: { min: 0.05 } },
      );
      expect(result).toEqual({ temperature: 0.05 });
    });

    it('should apply temperature max constraint', () => {
      const result = resolveParameters(
        { temperature: 2 }, // 2 / 2 = 1
        { temperatureRange: { max: 0.99 } },
      );
      expect(result).toEqual({ temperature: 0.99 });
    });

    it('should apply top_p min constraint', () => {
      const result = resolveParameters({ top_p: 0.005 }, { topPRange: { min: 0.01 } });
      expect(result).toEqual({ top_p: 0.01 });
    });

    it('should apply top_p max constraint', () => {
      const result = resolveParameters({ top_p: 1.5 }, { topPRange: { max: 0.99 } });
      expect(result).toEqual({ top_p: 0.99 });
    });

    it('should apply both min and max constraints', () => {
      const result = resolveParameters(
        { temperature: 0.02, top_p: 0.005 },
        {
          temperatureRange: { max: 0.99, min: 0.01 },
          topPRange: { max: 0.99, min: 0.01 },
        },
      );
      expect(result).toEqual({ temperature: 0.01, top_p: 0.01 });
    });
  });

  describe('Additional parameters', () => {
    it('should handle frequency_penalty', () => {
      const result = resolveParameters({ frequency_penalty: 0.5 }, {});
      expect(result).toEqual({ frequency_penalty: 0.5 });
    });

    it('should handle presence_penalty', () => {
      const result = resolveParameters({ presence_penalty: 0.5 }, {});
      expect(result).toEqual({ presence_penalty: 0.5 });
    });

    it('should handle max_tokens', () => {
      const result = resolveParameters({ max_tokens: 1000 }, {});
      expect(result).toEqual({ max_tokens: 1000 });
    });

    it('should apply frequency_penalty range constraints', () => {
      const result = resolveParameters(
        { frequency_penalty: 3 },
        { frequencyPenaltyRange: { max: 2, min: -2 } },
      );
      expect(result).toEqual({ frequency_penalty: 2 });
    });

    it('should apply presence_penalty range constraints', () => {
      const result = resolveParameters(
        { presence_penalty: -3 },
        { presencePenaltyRange: { max: 2, min: -2 } },
      );
      expect(result).toEqual({ presence_penalty: -2 });
    });

    it('should apply max_tokens range constraints', () => {
      const result = resolveParameters({ max_tokens: 100_000 }, { maxTokensRange: { max: 8192 } });
      expect(result).toEqual({ max_tokens: 8192 });
    });

    it('should handle all parameters together', () => {
      const result = resolveParameters(
        {
          frequency_penalty: 0.5,
          max_tokens: 2000,
          presence_penalty: 0.5,
          temperature: 1,
          top_p: 0.9,
        },
        {},
      );
      expect(result).toEqual({
        frequency_penalty: 0.5,
        max_tokens: 2000,
        presence_penalty: 0.5,
        temperature: 0.5,
        top_p: 0.9,
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle Claude Opus 4.1 scenario (conflict with normalization)', () => {
      const result = resolveParameters(
        { temperature: 1, top_p: 0.9 },
        { hasConflict: true, normalizeTemperature: true, preferTemperature: true },
      );
      expect(result).toEqual({ temperature: 0.5 });
    });

    it('should handle Zhipu glm-4-alltools scenario (range constraints)', () => {
      const result = resolveParameters(
        { temperature: 1, top_p: 0.5 },
        {
          normalizeTemperature: true,
          temperatureRange: { max: 0.99, min: 0.01 },
          topPRange: { max: 0.99, min: 0.01 },
        },
      );
      expect(result).toEqual({ temperature: 0.5, top_p: 0.5 });
    });

    it('should handle Groq scenario (temperature <= 0 becomes undefined)', () => {
      // In Groq's case, they handle this in their own logic, but we can test the parameter resolver
      const result = resolveParameters({ temperature: 0 }, { normalizeTemperature: false });
      expect(result.temperature).toBe(0);
    });

    it('should handle Qwen range constraint scenario with multiple parameters', () => {
      const result = resolveParameters(
        { presence_penalty: 1.5, temperature: 1.5, top_p: 0.8 },
        {
          normalizeTemperature: false,
          presencePenaltyRange: { max: 2, min: -2 },
          temperatureRange: { max: 2, min: 0 },
          topPRange: { max: 1, min: 0 },
        },
      );
      expect(result).toEqual({ presence_penalty: 1.5, temperature: 1.5, top_p: 0.8 });
    });
  });

  describe('Edge cases', () => {
    it('should handle temperature = 0', () => {
      const result = resolveParameters({ temperature: 0 }, {});
      expect(result).toEqual({ temperature: 0 });
    });

    it('should handle top_p = 0', () => {
      const result = resolveParameters({ top_p: 0 }, {});
      expect(result).toEqual({ top_p: 0 });
    });

    it('should handle temperature = undefined explicitly', () => {
      const result = resolveParameters({ temperature: undefined, top_p: 0.9 }, {});
      expect(result).toEqual({ top_p: 0.9 });
    });

    it('should handle both parameters undefined with conflict', () => {
      const result = resolveParameters({}, { hasConflict: true });
      expect(result).toEqual({});
    });
  });
});

describe('createParameterResolver', () => {
  it('should create a resolver with predefined options', () => {
    const resolver = createParameterResolver({
      hasConflict: true,
      normalizeTemperature: true,
      preferTemperature: true,
    });

    const result = resolver({ temperature: 1, top_p: 0.9 });
    expect(result).toEqual({ temperature: 0.5 });
  });

  it('should create a resolver with range constraints', () => {
    const resolver = createParameterResolver({
      normalizeTemperature: true,
      temperatureRange: { max: 0.99, min: 0.01 },
      topPRange: { max: 0.99, min: 0.01 },
    });

    const result = resolver({ temperature: 0.02, top_p: 0.005 });
    expect(result).toEqual({ temperature: 0.01, top_p: 0.01 });
  });
});

describe('MODEL_PARAMETER_CONFLICTS', () => {
  describe('ANTHROPIC_CLAUDE_4_PLUS', () => {
    it('should contain expected Claude 4+ models', () => {
      expect(MODEL_PARAMETER_CONFLICTS.ANTHROPIC_CLAUDE_4_PLUS.has('claude-opus-4-1')).toBe(true);
      expect(
        MODEL_PARAMETER_CONFLICTS.ANTHROPIC_CLAUDE_4_PLUS.has('claude-opus-4-1-20250805'),
      ).toBe(true);
      expect(
        MODEL_PARAMETER_CONFLICTS.ANTHROPIC_CLAUDE_4_PLUS.has('claude-sonnet-4-5-20250929'),
      ).toBe(true);
    });

    it('should not contain Claude 3.x models', () => {
      expect(MODEL_PARAMETER_CONFLICTS.ANTHROPIC_CLAUDE_4_PLUS.has('claude-3-opus-20240229')).toBe(
        false,
      );
      expect(
        MODEL_PARAMETER_CONFLICTS.ANTHROPIC_CLAUDE_4_PLUS.has('claude-3.5-sonnet-20240620'),
      ).toBe(false);
    });
  });

  describe('BEDROCK_CLAUDE_4_PLUS', () => {
    it('should contain both standard and Bedrock-specific model IDs', () => {
      expect(MODEL_PARAMETER_CONFLICTS.BEDROCK_CLAUDE_4_PLUS.has('claude-opus-4-1')).toBe(true);
      expect(
        MODEL_PARAMETER_CONFLICTS.BEDROCK_CLAUDE_4_PLUS.has(
          'anthropic.claude-opus-4-1-20250805-v1:0',
        ),
      ).toBe(true);
      expect(
        MODEL_PARAMETER_CONFLICTS.BEDROCK_CLAUDE_4_PLUS.has(
          'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
        ),
      ).toBe(true);
    });

    it('should contain all Bedrock regional variants', () => {
      expect(
        MODEL_PARAMETER_CONFLICTS.BEDROCK_CLAUDE_4_PLUS.has(
          'anthropic.claude-opus-4-20250514-v1:0',
        ),
      ).toBe(true);
      expect(
        MODEL_PARAMETER_CONFLICTS.BEDROCK_CLAUDE_4_PLUS.has(
          'us.anthropic.claude-opus-4-20250514-v1:0',
        ),
      ).toBe(true);
    });
  });
});
