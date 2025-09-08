import { StateCreator } from 'zustand/vanilla';

import { PublicState, State, initialState } from './initialState';

export interface Action {
  getJSONState: () => any;
  getMarkdownContent: () => string;
  handleSendButton: () => void;
  handleStop: () => void;
  setExpand: (expend: boolean) => void;
  setJSONState: (content: any) => void;
  setShowTypoBar: (show: boolean) => void;
  updateMarkdownContent: () => void;
}

export type Store = Action & State;

// const t = setNamespace('ChatInput');

type CreateStore = (
  initState?: Partial<PublicState>,
) => StateCreator<Store, [['zustand/devtools', never]]>;

export const store: CreateStore = (publicState) => (set, get) => ({
  ...initialState,
  ...publicState,

  getJSONState: () => {
    return get().editor?.getDocument('json');
  },
  getMarkdownContent: () => {
    return String(get().editor?.getDocument('markdown') || '').trimEnd();
  },
  handleSendButton: () => {
    if (!get().editor) return;

    const editor = get().editor;

    get().onSend?.({
      clearContent: () => editor?.cleanDocument(),
      editor: editor!,
      getMarkdownContent: get().getMarkdownContent,
    });
  },

  handleStop: () => {
    if (!get().editor) return;

    get().sendButtonProps?.onStop?.({ editor: get().editor! });
  },

  setExpand: (expand) => {
    set({ expand });
  },

  setJSONState: (content) => {
    get().editor?.setDocument('json', content);
  },

  setShowTypoBar: (showTypoBar) => {
    set({ showTypoBar });
  },

  updateMarkdownContent: () => {
    if (!get().onMarkdownContentChange) return;

    const content = get().getMarkdownContent();

    if (content === get().markdownContent) return;

    get().onMarkdownContentChange?.(content);

    set({ markdownContent: content });
  },
});
