import { FC } from 'react';

import { ARTIFACT_TAG } from '@/const/plugin';

import { MarkdownElement, MarkdownElementProps } from '../type';
import Component from './Render';
import rehypePlugin from './rehypePlugin';

const AntArtifactElement: MarkdownElement = {
  Component: Component as unknown as FC<MarkdownElementProps>,
  rehypePlugin,
  scope: 'assistant',
  tag: ARTIFACT_TAG,
};

export default AntArtifactElement;
