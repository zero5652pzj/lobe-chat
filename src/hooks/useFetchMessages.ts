import { useEffect } from 'react';

import { useChatStore } from '@/store/chat';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';

export const useFetchMessages = () => {
  const isDBInited = useGlobalStore(systemStatusSelectors.isDBInited);
  const sessionId = useSessionStore((s) => s.activeId);
  const [activeTopicId, useFetchMessages, internal_updateActiveSessionType] = useChatStore((s) => [
    s.activeTopicId,
    s.useFetchMessages,
    s.internal_updateActiveSessionType,
  ]);

  const [currentSession, isGroupSession] = useSessionStore((s) => [
    sessionSelectors.currentSession(s),
    sessionSelectors.isCurrentSessionGroupSession(s),
  ]);

  // Update active session type when session changes
  useEffect(() => {
    if (currentSession?.type) {
      internal_updateActiveSessionType(currentSession.type as 'agent' | 'group');
    } else {
      internal_updateActiveSessionType(undefined);
    }
  }, [currentSession?.id, currentSession?.type, internal_updateActiveSessionType]);

  useFetchMessages(isDBInited, sessionId, activeTopicId, isGroupSession ? 'group' : 'session');
};
