/* eslint-disable sort-keys-fix/sort-keys-fix */
import { z } from 'zod';

// Define a union type for feature flag values: either boolean or array of user IDs
const FeatureFlagValue = z.union([z.boolean(), z.array(z.string())]);

export const FeatureFlagsSchema = z.object({
  check_updates: FeatureFlagValue.optional(),
  pin_list: FeatureFlagValue.optional(),

  // settings
  language_model_settings: FeatureFlagValue.optional(),
  provider_settings: FeatureFlagValue.optional(),

  openai_api_key: FeatureFlagValue.optional(),
  openai_proxy_url: FeatureFlagValue.optional(),

  // profile
  api_key_manage: FeatureFlagValue.optional(),

  create_session: FeatureFlagValue.optional(),
  edit_agent: FeatureFlagValue.optional(),

  plugins: FeatureFlagValue.optional(),
  dalle: FeatureFlagValue.optional(),
  ai_image: FeatureFlagValue.optional(),
  speech_to_text: FeatureFlagValue.optional(),
  token_counter: FeatureFlagValue.optional(),

  welcome_suggest: FeatureFlagValue.optional(),
  changelog: FeatureFlagValue.optional(),

  clerk_sign_up: FeatureFlagValue.optional(),

  market: FeatureFlagValue.optional(),
  knowledge_base: FeatureFlagValue.optional(),

  rag_eval: FeatureFlagValue.optional(),

  // internal flag
  cloud_promotion: FeatureFlagValue.optional(),

  group_chat: FeatureFlagValue.optional(),

  // the flags below can only be used with commercial license
  // if you want to use it in the commercial usage
  // please contact us for more information: hello@lobehub.com
  commercial_hide_github: FeatureFlagValue.optional(),
  commercial_hide_docs: FeatureFlagValue.optional(),
});

export type IFeatureFlags = z.infer<typeof FeatureFlagsSchema>;

/**
 * Evaluate a feature flag value against a user ID
 * @param flagValue - The feature flag value (boolean or array of user IDs)
 * @param userId - The current user ID
 * @returns boolean indicating if the feature is enabled for the user
 */
export const evaluateFeatureFlag = (
  flagValue: boolean | string[] | undefined,
  userId?: string,
): boolean | undefined => {
  if (typeof flagValue === 'boolean') return flagValue;

  if (Array.isArray(flagValue)) {
    return userId ? flagValue.includes(userId) : false;
  }
};

export const DEFAULT_FEATURE_FLAGS: IFeatureFlags = {
  pin_list: false,

  language_model_settings: true,
  provider_settings: true,

  openai_api_key: true,
  openai_proxy_url: true,

  api_key_manage: false,

  create_session: true,
  edit_agent: true,

  plugins: true,
  dalle: true,
  ai_image: true,

  check_updates: true,
  welcome_suggest: true,
  token_counter: true,

  knowledge_base: true,
  rag_eval: false,

  clerk_sign_up: true,

  cloud_promotion: false,

  market: true,
  speech_to_text: true,
  changelog: true,

  group_chat: false,

  // the flags below can only be used with commercial license
  // if you want to use it in the commercial usage
  // please contact us for more information: hello@lobehub.com
  commercial_hide_github: false,
  commercial_hide_docs: false,
};

export const mapFeatureFlagsEnvToState = (config: IFeatureFlags, userId?: string) => {
  return {
    isAgentEditable: evaluateFeatureFlag(config.edit_agent, userId),

    showCreateSession: evaluateFeatureFlag(config.create_session, userId),
    enableGroupChat: evaluateFeatureFlag(config.group_chat, userId),
    showLLM: evaluateFeatureFlag(config.language_model_settings, userId),
    showProvider: evaluateFeatureFlag(config.provider_settings, userId),
    showPinList: evaluateFeatureFlag(config.pin_list, userId),

    showOpenAIApiKey: evaluateFeatureFlag(config.openai_api_key, userId),
    showOpenAIProxyUrl: evaluateFeatureFlag(config.openai_proxy_url, userId),

    showApiKeyManage: evaluateFeatureFlag(config.api_key_manage, userId),

    enablePlugins: evaluateFeatureFlag(config.plugins, userId),
    showDalle: evaluateFeatureFlag(config.dalle, userId),
    showAiImage: evaluateFeatureFlag(config.ai_image, userId),
    showChangelog: evaluateFeatureFlag(config.changelog, userId),

    enableCheckUpdates: evaluateFeatureFlag(config.check_updates, userId),
    showWelcomeSuggest: evaluateFeatureFlag(config.welcome_suggest, userId),

    enableClerkSignUp: evaluateFeatureFlag(config.clerk_sign_up, userId),

    enableKnowledgeBase: evaluateFeatureFlag(config.knowledge_base, userId),
    enableRAGEval: evaluateFeatureFlag(config.rag_eval, userId),

    showCloudPromotion: evaluateFeatureFlag(config.cloud_promotion, userId),

    showMarket: evaluateFeatureFlag(config.market, userId),
    enableSTT: evaluateFeatureFlag(config.speech_to_text, userId),

    hideGitHub: evaluateFeatureFlag(config.commercial_hide_github, userId),
    hideDocs: evaluateFeatureFlag(config.commercial_hide_docs, userId),
  };
};

export type IFeatureFlagsState = ReturnType<typeof mapFeatureFlagsEnvToState>;
