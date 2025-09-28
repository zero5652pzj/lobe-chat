import { getAgentStoreState } from '@/store/agent';
import { agentChatConfigSelectors } from '@/store/agent/selectors';
import { getAiInfraStoreState } from '@/store/aiInfra';
import { aiModelSelectors, aiProviderSelectors } from '@/store/aiInfra/selectors';

/**
 * Search configuration result
 */
export interface SearchConfig {
  /** Whether search is enabled in chat config */
  enabledSearch: boolean;
  /** Whether model has builtin search capability */
  isModelHasBuiltinSearch: boolean;
  /** Whether provider has builtin search capability */
  isProviderHasBuiltinSearch: boolean;
  /** Whether to use application's builtin search tool */
  useApplicationBuiltinSearchTool: boolean;
  /** Whether to use model's builtin search */
  useModelSearch: boolean;
}

/**
 * Get search configuration for given model and provider
 * This centralizes the search logic that was duplicated across multiple places
 */
export const getSearchConfig = (model: string, provider: string): SearchConfig => {
  const chatConfig = agentChatConfigSelectors.currentChatConfig(getAgentStoreState());
  const aiInfraStoreState = getAiInfraStoreState();

  const enabledSearch = chatConfig.searchMode !== 'off';
  const isProviderHasBuiltinSearch =
    aiProviderSelectors.isProviderHasBuiltinSearch(provider)(aiInfraStoreState);
  const isModelHasBuiltinSearch = aiModelSelectors.isModelHasBuiltinSearch(
    model,
    provider,
  )(aiInfraStoreState);

  const useModelSearch =
    ((isProviderHasBuiltinSearch || isModelHasBuiltinSearch) && chatConfig.useModelBuiltinSearch) ||
    false;

  const useApplicationBuiltinSearchTool = enabledSearch && !useModelSearch;

  return {
    enabledSearch,
    isModelHasBuiltinSearch,
    isProviderHasBuiltinSearch,
    useApplicationBuiltinSearchTool,
    useModelSearch,
  };
};
